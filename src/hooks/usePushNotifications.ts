import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications(token?: string | null) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkExistingSubscription = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(Boolean(sub));
    } catch (_err) {
      // ignore
    }
  }, []);

  // Check support on mount
  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      checkExistingSubscription();
    }
  }, [token, checkExistingSubscription]);

  const subscribe = async () => {
    if (!isSupported) {
      toast.error("Push notificaties worden niet ondersteund door deze browser");
      return false;
    }

    if (!token) {
      toast.error("U moet ingelogd zijn om notificaties in te schakelen");
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Request notification permission
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        toast.error("Toestemming voor notificaties is geweigerd of geblokkeerd");
        setIsLoading(false);
        return false;
      }

      // 2. Fetch VAPID public key
      const keyRes = await fetch("/api/push/vapid-public-key");
      const keyData = await keyRes.json();
      if (!keyRes.ok || !keyData.publicKey) {
        throw new Error(keyData.error || "Kon push-sleutel niet ophalen");
      }

      // 3. Register push subscription with service worker
      const reg = await navigator.serviceWorker.ready;
      let subscription = await reg.pushManager.getSubscription();

      if (!subscription) {
        const convertedKey = urlBase64ToUint8Array(keyData.publicKey);
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey,
        });
      }

      // 4. Send subscription to server
      const saveRes = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subscription,
          userAgent: navigator.userAgent,
        }),
      });

      const saveData = await saveRes.json();
      if (!saveRes.ok) {
        throw new Error(saveData.error || "Kon notificaties niet registreren op server");
      }

      setIsSubscribed(true);
      toast.success("Notificaties succesvol ingeschakeld!", {
        description: "U ontvangt direct een melding bij een nieuwe belafspraak.",
      });
      return true;
    } catch (err: unknown) {
      const e = err as Error;
      console.error("Push subscribe error:", e);
      setError(e.message || "Fout bij inschakelen");
      toast.error(e.message || "Fout bij inschakelen van push notificaties");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async () => {
    if (!isSupported) return false;
    setIsLoading(true);

    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }

      if (token) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            endpoint: subscription?.endpoint,
          }),
        });
      }

      setIsSubscribed(false);
      toast.info("Notificaties zijn uitgeschakeld voor dit apparaat.");
      return true;
    } catch (err: unknown) {
      const e = err as Error;
      toast.error(e.message || "Fout bij uitschakelen");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestNotification = async () => {
    if (!token) return false;
    setIsLoading(true);

    try {
      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Kon testnotificatie niet verzenden");
      }

      toast.success("Testnotificatie verzonden!", {
        description: "Controleer of het bericht direct op uw scherm verschijnt.",
      });
      return true;
    } catch (err: unknown) {
      const e = err as Error;
      toast.error(e.message || "Fout bij verzenden van testnotificatie");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    sendTestNotification,
    checkExistingSubscription,
  };
}
