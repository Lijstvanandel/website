import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

/**
 * PWARedirectHandler:
 * Requirement: "Waarbij je bij het openen van de PWA gelijk naar de inlogpagina gaat."
 * When the app is opened as an installed PWA (display-mode: standalone) and is at the root '/',
 * if the user is not authenticated, it automatically redirects them directly to '/login'.
 * If already authenticated, they can proceed smoothly to '/dashboard'.
 */
export function PWARedirectHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    const isStandalone =
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes("android-app://"));

    // If launched as standalone PWA and currently landing on root '/' or '/login'
    if (isStandalone && location.pathname === "/") {
      if (isAuthenticated) {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/login", { replace: true });
      }
    }
  }, [isAuthenticated, loading, location.pathname, navigate]);

  return null;
}
