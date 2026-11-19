import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

export default function SsoLogout() {
  const [searchParams] = useSearchParams();
  const { logout } = useAuth();
  const [done, setDone] = useState(false);

  const redirectUri = searchParams.get("redirect_uri") || searchParams.get("post_logout_redirect_uri") || "";

  useEffect(() => {
    let active = true;
    // Clear local central session cleanly
    logout();

    const finish = async () => {
      if (redirectUri) {
        try {
          const check = await fetch(`/api/sso/client-info?redirect_uri=${encodeURIComponent(redirectUri)}`);
          const data = await check.json().catch(() => ({}));
          if (check.ok && data?.allowed) {
            window.location.replace(redirectUri);
            return;
          }
        } catch {
          // ignore and render confirmation state
        }
      }
      if (active) setDone(true);
    };

    finish();
    return () => {
      active = false;
    };
  }, [logout, redirectUri]);

  return (
    <div className="min-h-screen stadium-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-card border border-accent/25 rounded-xl p-6 text-center space-y-4 shadow-xl">
        {!done ? (
          <>
            <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto" />
            <p className="text-sm text-muted-foreground">Centrale OSL-sessie wordt beëindigd...</p>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-9 h-9 text-emerald-500 mx-auto" />
            <h1 className="font-display text-2xl text-foreground">Uitgelogd</h1>
            <p className="text-xs text-muted-foreground">
              Uw centrale OSL-inlogsessie is succesvol beëindigd.
            </p>
            <Link to="/login" className="block">
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                Opnieuw inloggen
              </Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
