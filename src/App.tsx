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

// Self-healing lazy loading helper to prevent blank pages or chunk loading failures.
// Retries the import once if a transient network/compile hiccup occurred.
// If it still fails, reloads the page once to pull fresh Vite bundles.
function safeLazy<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      return await importFn();
    } catch (firstError) {
      console.warn("Eerste poging tot laden module mislukt, opnieuw proberen...", firstError);
      try {
        await new Promise((r) => setTimeout(r, 400));
        return await importFn();
      } catch (secondError) {
        console.error("Fout bij laden van pagina-onderdeel:", secondError);
        if (typeof window !== "undefined" && typeof sessionStorage !== "undefined") {
          const reloadKey = "chunk_reload_" + window.location.pathname;
          if (!sessionStorage.getItem(reloadKey)) {
            sessionStorage.setItem(reloadKey, "1");
            window.location.reload();
            return new Promise<{ default: T }>(() => {});
          }
        }
        throw secondError;
      }
    }
  });
}

// Lazy-load sub-routes with self-healing capabilities
const Raadsleden = safeLazy(() => import("./pages/Raadsleden"));
const FractielidVideos = safeLazy(() => import("./pages/FractielidVideos"));
const VideoRedirect = safeLazy(() => import("./pages/VideoRedirect"));
const Bestuur = safeLazy(() => import("./pages/Bestuur"));
const Steunfractie = safeLazy(() => import("./pages/Steunfractie"));
const Standpunten = safeLazy(() => import("./pages/Standpunten"));
const Contact = safeLazy(() => import("./pages/Contact"));
const Agenda = safeLazy(() => import("./pages/Agenda"));
const AgendaDetail = safeLazy(() => import("./pages/AgendaDetail"));
const Nieuws = safeLazy(() => import("./pages/Nieuws"));
const NieuwsDetail = safeLazy(() => import("./pages/NieuwsDetail"));
const NotFound = safeLazy(() => import("./pages/NotFound"));
const Login = safeLazy(() => import("./pages/Login"));
const Register = safeLazy(() => import("./pages/Register"));
const Doneren = safeLazy(() => import("./pages/Doneren"));
const ResetPassword = safeLazy(() => import("./pages/ResetPassword"));
const Dashboard = safeLazy(() => import("./pages/Dashboard"));
const AdminDashboard = safeLazy(() => import("./pages/AdminDashboard"));
const Raadspaneel = safeLazy(() => import("./pages/Raadspaneel"));
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

