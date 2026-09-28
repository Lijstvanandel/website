import { Suspense, lazy, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "./components/Layout";
import { ThemeProvider } from "./hooks/use-theme";
import { AuthProvider } from "./context/AuthContext";
import { AccessibilityProvider } from "./context/AccessibilityContext";
import { PWARedirectHandler } from "./components/PWARedirectHandler";
import { PwaUpdatePrompt } from "./components/PwaUpdatePrompt";
import { ScrollToTop } from "./components/ScrollToTop";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { getPortalConfig } from "./utils/portalConfig";

// Eager load primary public pages for instant FCP / LCP and zero chunk-loading failures
import Home from "./pages/Home";
import WijkenEnKernen from "./pages/WijkenEnKernen";
import WijkDetail from "./pages/WijkDetail";
import Nieuws from "./pages/Nieuws";
import NieuwsDetail from "./pages/NieuwsDetail";
import Standpunten from "./pages/Standpunten";
import Agenda from "./pages/Agenda";
import AgendaDetail from "./pages/AgendaDetail";
import Raadsleden from "./pages/Raadsleden";
import Contact from "./pages/Contact";
import Bestuur from "./pages/Bestuur";
import Steunfractie from "./pages/Steunfractie";
import Doneren from "./pages/Doneren";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Raadspaneel from "./pages/Raadspaneel";

// Self-healing lazy loading helper to prevent blank pages or chunk loading failures for heavy admin modules.
// Retries the import with exponential backoff if a transient network/compile hiccup occurred.
// If it still fails, reloads the page once to pull fresh Vite bundles.
function safeLazy<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    let lastError: any = null;
    const delays = [300, 800, 1500];

    for (let attempt = 0; attempt <= delays.length; attempt++) {
      try {
        return await importFn();
      } catch (err) {
        lastError = err;
        if (attempt < delays.length) {
          console.warn(`[safeLazy] Poging ${attempt + 1} tot laden module mislukt, opnieuw proberen over ${delays[attempt]}ms...`, err);
          await new Promise((r) => setTimeout(r, delays[attempt]));
        }
      }
    }

    console.error("Fout bij laden van pagina-onderdeel na herhaalde pogingen:", lastError);
    if (typeof window !== "undefined" && typeof sessionStorage !== "undefined") {
      const reloadKey = "chunk_reload_" + window.location.pathname;
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, "1");
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }
    }
    throw lastError;
  });
}

// Lazy-load heavier administrative, dashboard and portal sub-routes with self-healing capabilities
const FractielidVideos = safeLazy(() => import("./pages/FractielidVideos"));
const VideoRedirect = safeLazy(() => import("./pages/VideoRedirect"));
const ResetPassword = safeLazy(() => import("./pages/ResetPassword"));
const Dashboard = safeLazy(() => import("./pages/Dashboard"));
const AdminDashboard = safeLazy(() => import("./pages/AdminDashboard"));
const NieuwsbriefAfmelden = safeLazy(() => import("./pages/NieuwsbriefAfmelden"));
const TicketView = safeLazy(() => import("./pages/TicketView"));
const Polls = safeLazy(() => import("./pages/Polls"));

const queryClient = new QueryClient();

const PageLoadingFallback = () => (
  <div className="min-h-[40vh] flex items-center justify-center p-8">
    <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
  </div>
);

const AppRoutes = () => {
  const location = useLocation();
  const portalConfig = getPortalConfig(location.pathname);

  useEffect(() => {
    if (portalConfig.isPortalMode) {
      document.title = `${portalConfig.portalTitle} — Gemeente ${portalConfig.municipalityName}`;
    }
  }, [portalConfig]);

  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <Routes>
        <Route element={<Layout />}>
          {portalConfig.isPortalMode ? (
            // Portal Mode (Hoogeveen): Only council workspace & user account routes are exposed
            <>
              <Route path="/" element={<Navigate to="/raadspaneel" replace />} />
              <Route path="/raadspaneel" element={<Raadspaneel />} />
              <Route path="/dossiers" element={<Raadspaneel />} />
              <Route path="/dossiers/:slug" element={<Raadspaneel />} />
              <Route path="/login" element={<Login />} />
              <Route path="/reset-wachtwoord" element={<ResetPassword />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/secretaris" element={<AdminDashboard />} />
              <Route path="/penningmeester" element={<AdminDashboard />} />
              <Route path="/voorzitter" element={<AdminDashboard />} />
              {/* All party campaign / general content routes redirect cleanly to raadspaneel */}
              <Route path="/standpunten" element={<Navigate to="/raadspaneel" replace />} />
              <Route path="/agenda" element={<Navigate to="/raadspaneel" replace />} />
              <Route path="/agenda/:id" element={<Navigate to="/raadspaneel" replace />} />
              <Route path="/fractie" element={<Navigate to="/raadspaneel" replace />} />
              <Route path="/fractie/*" element={<Navigate to="/raadspaneel" replace />} />
              <Route path="/raadsleden" element={<Navigate to="/raadspaneel" replace />} />
              <Route path="/raadsleden/*" element={<Navigate to="/raadspaneel" replace />} />
              <Route path="/bestuur" element={<Navigate to="/raadspaneel" replace />} />
              <Route path="/steunfractie" element={<Navigate to="/raadspaneel" replace />} />
              <Route path="/nieuws" element={<Navigate to="/raadspaneel" replace />} />
              <Route path="/nieuws/*" element={<Navigate to="/raadspaneel" replace />} />
              <Route path="/wijken-en-kernen" element={<WijkenEnKernen />} />
              <Route path="/wijken-en-kernen/:slug" element={<WijkDetail />} />
              <Route path="/wijk-en-kernen" element={<WijkenEnKernen />} />
              <Route path="/wijk-en-kernen/:slug" element={<WijkDetail />} />
              <Route path="/wijken-en/kernen" element={<WijkenEnKernen />} />
              <Route path="/wijken-en/kernen/:slug" element={<WijkDetail />} />
              <Route path="/wijk-en/kernen" element={<WijkenEnKernen />} />
              <Route path="/wijk-en/kernen/:slug" element={<WijkDetail />} />
              <Route path="/wijken" element={<WijkenEnKernen />} />
              <Route path="/wijken/:slug" element={<WijkDetail />} />
              <Route path="/wijk" element={<WijkenEnKernen />} />
              <Route path="/wijk/:slug" element={<WijkDetail />} />
              <Route path="/contact" element={<Navigate to="/raadspaneel" replace />} />
              <Route path="/doneren" element={<Navigate to="/raadspaneel" replace />} />
              <Route path="/doneren/*" element={<Navigate to="/raadspaneel" replace />} />
              <Route path="/doneer" element={<Navigate to="/raadspaneel" replace />} />
              <Route path="/registreren" element={<Register />} />
              <Route path="/register" element={<Register />} />
              <Route path="/word-lid" element={<Register />} />
              <Route path="/wordlid" element={<Register />} />
              <Route path="/peilingen" element={<Navigate to="/raadspaneel" replace />} />
              <Route path="/polls" element={<Navigate to="/raadspaneel" replace />} />
            </>
          ) : (
            // Full Party Website (Steenwijkerland - Lijst van Andel)
            <>
              <Route path="/" element={<Home />} />
              <Route path="/fractie" element={<Raadsleden />} />
              <Route path="/fractie/:id/videos" element={<FractielidVideos />} />
              <Route path="/raadsleden/:id/videos" element={<FractielidVideos />} />
              <Route path="/video/:id" element={<VideoRedirect />} />
              <Route path="/videos/:id" element={<VideoRedirect />} />
              <Route path="/bestuur" element={<Bestuur />} />
              <Route path="/steunfractie" element={<Steunfractie />} />
              <Route path="/raadsleden" element={<Raadsleden />} />
              <Route path="/standpunten" element={<Standpunten />} />
              <Route path="/agenda" element={<Agenda />} />
              <Route path="/agenda/:id" element={<AgendaDetail />} />
              <Route path="/ticket/:code" element={<TicketView />} />
              <Route path="/nieuws" element={<Nieuws />} />
              <Route path="/nieuws/:id" element={<NieuwsDetail />} />
              <Route path="/wijken-en-kernen" element={<WijkenEnKernen />} />
              <Route path="/wijken-en-kernen/:slug" element={<WijkDetail />} />
              <Route path="/wijk-en-kernen" element={<WijkenEnKernen />} />
              <Route path="/wijk-en-kernen/:slug" element={<WijkDetail />} />
              <Route path="/wijken-en/kernen" element={<WijkenEnKernen />} />
              <Route path="/wijken-en/kernen/:slug" element={<WijkDetail />} />
              <Route path="/wijk-en/kernen" element={<WijkenEnKernen />} />
              <Route path="/wijk-en/kernen/:slug" element={<WijkDetail />} />
              <Route path="/wijken" element={<WijkenEnKernen />} />
              <Route path="/wijken/:slug" element={<WijkDetail />} />
              <Route path="/wijk" element={<WijkenEnKernen />} />
              <Route path="/wijk/:slug" element={<WijkDetail />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/doneren" element={<Doneren />} />
              <Route path="/doneren/*" element={<Doneren />} />
              <Route path="/doneer" element={<Doneren />} />
              <Route path="/reset-wachtwoord" element={<ResetPassword />} />
              <Route path="/login" element={<Login />} />
              <Route path="/registreren" element={<Register />} />
              <Route path="/word-lid" element={<Register />} />
              <Route path="/wordlid" element={<Register />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/peilingen" element={<Polls />} />
              <Route path="/polls" element={<Polls />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/secretaris" element={<AdminDashboard />} />
              <Route path="/penningmeester" element={<AdminDashboard />} />
              <Route path="/voorzitter" element={<AdminDashboard />} />
              <Route path="/raadspaneel" element={<Raadspaneel />} />
              <Route path="/dossiers" element={<Raadspaneel />} />
              <Route path="/dossiers/:slug" element={<Raadspaneel />} />
              <Route path="/nieuwsbrief/afmelden" element={<NieuwsbriefAfmelden />} />
            </>
          )}
        </Route>
        <Route path="*" element={portalConfig.isPortalMode ? <Navigate to="/raadspaneel" replace /> : <NotFound />} />
      </Routes>
    </Suspense>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AccessibilityProvider>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <ErrorBoundary>
                <BrowserRouter>
                  <ScrollToTop />
                  <PWARedirectHandler />
                  <PwaUpdatePrompt />
                  <AppRoutes />
                </BrowserRouter>
              </ErrorBoundary>
            </TooltipProvider>
          </AuthProvider>
        </AccessibilityProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;

