import webpush from "web-push";

export interface PushSubscriptionItem {
  id: string;
  userId: string;
  username: string;
  role: string;
  subscription: {
    endpoint: string;
    expirationTime?: number | null;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  userAgent?: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
}

let vapidConfigured = false;

/**
 * Ensures VAPID keys exist (either in env or in db) and sets VAPID details on webpush
 */
export function ensureVapidKeys(db: any, saveDbCallback?: (db: any) => void): { publicKey: string; privateKey: string } {
  const envPublicKey = process.env.VAPID_PUBLIC_KEY;
  const envPrivateKey = process.env.VAPID_PRIVATE_KEY;

  let publicKey = envPublicKey;
  let privateKey = envPrivateKey;

  if (!publicKey || !privateKey) {
    if (db.vapidKeys && db.vapidKeys.publicKey && db.vapidKeys.privateKey) {
      publicKey = db.vapidKeys.publicKey;
      privateKey = db.vapidKeys.privateKey;
    } else {
      // Generate persistent VAPID keys and save in DB
      const generated = webpush.generateVAPIDKeys();
      publicKey = generated.publicKey;
      privateKey = generated.privateKey;
      db.vapidKeys = {
        publicKey,
        privateKey,
        createdAt: new Date().toISOString(),
      };
      if (saveDbCallback) {
        saveDbCallback(db);
      }
    }
  }

  if (!vapidConfigured && publicKey && privateKey) {
    try {
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || "mailto:info@lijstvanandel.nl",
        publicKey,
        privateKey
      );
      vapidConfigured = true;
    } catch (err) {
      console.error("Fout bij configureren van VAPID details:", err);
    }
  }

  return { publicKey: publicKey || "", privateKey: privateKey || "" };
}

/**
 * Register or update a user's push subscription
 */
export function savePushSubscription(
  db: any,
  user: { id: string; username: string; role: string },
  subscription: any,
  userAgent?: string,
  saveDbCallback?: (db: any) => void
): boolean {
  if (!db.pushSubscriptions) {
    db.pushSubscriptions = [];
  }

  if (!subscription || !subscription.endpoint || !subscription.keys) {
    return false;
  }

  // Remove existing subscription with same endpoint to avoid duplicates
  db.pushSubscriptions = db.pushSubscriptions.filter(
    (s: PushSubscriptionItem) => s.subscription?.endpoint !== subscription.endpoint
  );

  const newSub: PushSubscriptionItem = {
    id: "sub-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
    userId: user.id,
    username: user.username,
    role: user.role,
    subscription,
    userAgent: userAgent || "",
    createdAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString(),
  };

  db.pushSubscriptions.push(newSub);

  if (saveDbCallback) {
    saveDbCallback(db);
  }

  return true;
}

/**
 * Remove a subscription by endpoint or user
 */
export function removePushSubscription(
  db: any,
  userId: string,
  endpoint?: string,
  saveDbCallback?: (db: any) => void
): boolean {
  if (!db.pushSubscriptions) return false;

  const initialCount = db.pushSubscriptions.length;
  if (endpoint) {
    db.pushSubscriptions = db.pushSubscriptions.filter(
      (s: PushSubscriptionItem) => s.subscription?.endpoint !== endpoint
    );
  } else {
    db.pushSubscriptions = db.pushSubscriptions.filter(
      (s: PushSubscriptionItem) => s.userId !== userId
    );
  }

  const changed = db.pushSubscriptions.length !== initialCount;
  if (changed && saveDbCallback) {
    saveDbCallback(db);
  }
  return changed;
}

/**
 * Send push notification to a specific user's active device subscriptions
 */
export async function sendPushNotificationToUser(
  db: any,
  userId: string,
  payload: PushPayload,
  saveDbCallback?: (db: any) => void
): Promise<{ sent: number; failed: number }> {
  ensureVapidKeys(db, saveDbCallback);

  if (!db.pushSubscriptions || db.pushSubscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const userSubs = db.pushSubscriptions.filter((s: PushSubscriptionItem) => s.userId === userId);
  if (userSubs.length === 0) {
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;
  const deadEndpoints: string[] = [];

  const messageString = JSON.stringify({
    title: payload.title || "Lijst van Andel",
    body: payload.body || "Nieuw bericht",
    url: payload.url || "/dashboard",
    tag: payload.tag || "lva-belafspraak",
    icon: payload.icon || "/pwa-192x192.png",
    badge: payload.badge || "/pwa-192x192.png",
  });

  for (const subItem of userSubs) {
    try {
      await webpush.sendNotification(subItem.subscription, messageString);
      sent++;
      subItem.lastUsedAt = new Date().toISOString();
    } catch (err: any) {
      console.warn(`Kon push notificatie niet sturen naar sub ${subItem.id}:`, err?.message || err);
      failed++;
      // If subscription is 404 or 410 (expired/unregistered), mark for deletion
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        deadEndpoints.push(subItem.subscription.endpoint);
      }
    }
  }

  if (deadEndpoints.length > 0) {
    db.pushSubscriptions = db.pushSubscriptions.filter(
      (s: PushSubscriptionItem) => !deadEndpoints.includes(s.subscription.endpoint)
    );
  }

  if ((sent > 0 || deadEndpoints.length > 0) && saveDbCallback) {
    saveDbCallback(db);
  }

  return { sent, failed };
}

/**
 * Send push notification to all users matching a fractielid or role
 */
export async function notifyRaadslidForBelafspraak(
  db: any,
  appt: {
    id: string;
    name: string;
    phone: string;
    fractielidId?: string;
    fractielidNaam?: string;
    datum: string;
    startTijd: string;
    eindTijd: string;
    onderwerp?: string;
    linkedUserId?: string | null;
    linkedUsername?: string | null;
  },
  saveDbCallback?: (db: any) => void
): Promise<{ recipients: number; sent: number }> {
  ensureVapidKeys(db, saveDbCallback);

  if (!db.pushSubscriptions || db.pushSubscriptions.length === 0) {
    return { recipients: 0, sent: 0 };
  }

  // Find recipient user IDs:
  const recipientUserIds = new Set<string>();

  // 1. Direct linked user ID on appointment
  if (appt.linkedUserId) {
    recipientUserIds.add(appt.linkedUserId);
  }

  // 2. Direct linked username on appointment
  if (appt.linkedUsername && db.users) {
    const u = db.users.find(
      (usr: any) => usr.username.toLowerCase() === appt.linkedUsername?.toLowerCase()
    );
    if (u) recipientUserIds.add(u.id);
  }

  // 3. Look up fractielid in db.fractieleden
  if (appt.fractielidId && db.fractieleden) {
    const f = db.fractieleden.find((item: any) => item.id === String(appt.fractielidId));
    if (f) {
      if (f.linkedUserId) recipientUserIds.add(f.linkedUserId);
      if (f.linkedUsername && db.users) {
        const u = db.users.find(
          (usr: any) => usr.username.toLowerCase() === f.linkedUsername.toLowerCase()
        );
        if (u) recipientUserIds.add(u.id);
      }
    }
  }

  // 4. If fractielid has a matching username or full name among users with role "raadslid" or "admin"
  if (recipientUserIds.size === 0 && db.users && appt.fractielidNaam) {
    const lowerName = appt.fractielidNaam.toLowerCase();
    for (const usr of db.users) {
      if (usr.role === "raadslid" || usr.role === "admin") {
        if (
          lowerName.includes(usr.username.toLowerCase()) ||
          (usr.fullName && lowerName.includes(usr.fullName.toLowerCase())) ||
          (usr.fullName && usr.fullName.toLowerCase().includes(lowerName))
        ) {
          recipientUserIds.add(usr.id);
        }
      }
    }
  }

  // 5. Fallback: If still no recipient identified, notify all raadsleden & admins who have push enabled
  if (recipientUserIds.size === 0 && db.users) {
    for (const usr of db.users) {
      if (usr.role === "raadslid" || usr.role === "admin") {
        recipientUserIds.add(usr.id);
      }
    }
  }

  const payload: PushPayload = {
    title: "📞 Nieuwe belafspraak ingepland!",
    body: `${appt.name} heeft een belafspraak geboekt voor ${appt.datum} (${appt.startTijd} - ${appt.eindTijd}). Tel: ${appt.phone}`,
    url: "/dashboard",
    tag: `belafspraak-${appt.id}`,
  };

  let totalSent = 0;
  for (const uid of recipientUserIds) {
    const res = await sendPushNotificationToUser(db, uid, payload, saveDbCallback);
    totalSent += res.sent;
  }

  return { recipients: recipientUserIds.size, sent: totalSent };
}
