import { Bell, BellOff, CheckCircle2, AlertCircle, Send, Loader2, Smartphone, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface PushNotificationManagerProps {
  token?: string | null;
  compact?: boolean;
}

export function PushNotificationManager({ token, compact = false }: PushNotificationManagerProps) {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    sendTestNotification,
  } = usePushNotifications(token);

  if (!isSupported) {
    return (
      <div className="p-4 rounded-xl bg-muted/40 border border-border/60 text-xs text-muted-foreground flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
        <span>Push notificaties worden niet ondersteund in deze browser (vereist Safari op iOS 16.4+ via &apos;Zet op beginscherm&apos; of Chrome/Edge).</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {isSubscribed ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" /> Notificaties actief
            </span>
            <Button
              id="test-push-compact-btn"
              variant="outline"
              size="sm"
              onClick={sendTestNotification}
              disabled={isLoading}
              className="h-7 text-xs px-2.5 gap-1 border-border/70 text-foreground"
            >
              {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              Test
            </Button>
            <Button
              id="disable-push-compact-btn"
              variant="ghost"
              size="sm"
              onClick={unsubscribe}
              disabled={isLoading}
              className="h-7 text-xs px-2 text-muted-foreground hover:text-destructive"
              title="Notificaties uitschakelen"
            >
              <BellOff className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : (
          <Button
            id="enable-push-compact-btn"
            variant="outline"
            size="sm"
            onClick={subscribe}
            disabled={isLoading}
            className="h-7 text-xs px-3 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border-primary/30 font-medium gap-1.5"
          >
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
            Notificaties inschakelen
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl bg-gradient-to-br from-card to-card/70 border border-border/80 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl shrink-0 ${isSubscribed ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-primary/10 text-primary border border-primary/20"}`}>
            {isSubscribed ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5 text-muted-foreground" />}
          </div>
          <div>
            <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <span>PWA Notificaties voor Belafspraken</span>
              {isSubscribed ? (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Ingeschakeld
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border">
                  Niet actief
                </span>
              )}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-lg">
              Ontvang direct een pushmelding op uw telefoon of computer zodra een inwoner een nieuwe belafspraak met u inplant.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
          {isSubscribed ? (
            <>
              <Button
                id="send-push-test-btn"
                variant="outline"
                size="sm"
                onClick={sendTestNotification}
                disabled={isLoading}
                className="h-8 text-xs gap-1.5 border-border/70 hover:bg-muted font-medium"
              >
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 text-primary" />}
                Stuur testnotificatie
              </Button>
              <Button
                id="disable-push-full-btn"
                variant="outline"
                size="sm"
                onClick={unsubscribe}
                disabled={isLoading}
                className="h-8 text-xs text-muted-foreground hover:text-destructive border-border/70"
              >
                Uitschakelen
              </Button>
            </>
          ) : (
            <Button
              id="enable-push-full-btn"
              size="sm"
              onClick={subscribe}
              disabled={isLoading}
              className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 gap-1.5 shadow-sm"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
              Notificaties inschakelen
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-border/50 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-primary shrink-0" />
          <span>Werkt binnen de PWA App en mobiele browsers</span>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Veilige end-to-end VAPID versleuteling</span>
        </div>
      </div>
    </div>
  );
}
