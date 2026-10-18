import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
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
import { VisitorPerformanceTracker } from "./components/telemetry/VisitorPerformanceTracker";

// Self-healing lazy loading helper to prevent blank pages or chunk loading failures
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

// Core public pages imported directly for 0ms route rendering without JS chunk waterfalls
import Home from "./pages/Home";
import Raadsleden from "./pages/Raadsleden";
import FractielidVideos from "./pages/FractielidVideos";
import VideoDetail from "./pages/VideoDetail";
import Nieuws from "./pages/Nieuws";
import NieuwsDetail from "./pages/NieuwsDetail";
import Standpunten from "./pages/Standpunten";
import Contact from "./pages/Contact";

// Lazy-load secondary & heavy interactive/admin/portal sub-routes to keep initial public bundle lean
const WijkenEnKernen = safeLazy(() => import("./pages/WijkenEnKernen"));
const WijkDetail = safeLazy(() => import("./pages/WijkDetail"));
const Agenda = safeLazy(() => import("./pages/Agenda"));
const AgendaDetail = safeLazy(() => import("./pages/AgendaDetail"));
const Bestuur = safeLazy(() => import("./pages/Bestuur"));
const Steunfractie = safeLazy(() => import("./pages/Steunfractie"));
const Doneren = safeLazy(() => import("./pages/Doneren"));
const NotFound = safeLazy(() => import("./pages/NotFound"));
const Login = safeLazy(() => import("./pages/Login"));
const Register = safeLazy(() => import("./pages/Register"));
const Raadspaneel = safeLazy(() => import("./pages/Raadspaneel"));
const ResetPassword = safeLazy(() => import("./pages/ResetPassword"));
const Dashboard = safeLazy(() => import("./pages/Dashboard"));
const AdminDashboard = safeLazy(() => import("./pages/AdminDashboard"));
const NieuwsbriefAfmelden = safeLazy(() => import("./pages/NieuwsbriefAfmelden"));
const TicketView = safeLazy(() => import("./pages/TicketView"));
const Polls = safeLazy(() => import("./pages/Polls"));
const Privacyverklaring = safeLazy(() => import("./pages/Privacyverklaring"));
const AlgemeneVoorwaarden = safeLazy(() => import("./pages/AlgemeneVoorwaarden"));
const Verwerkingsreglement = safeLazy(() => import("./pages/Verwerkingsreglement"));

const queryClient = new QueryClient();

const PageLoadingFallback = () => (
  <div className="min-h-[40vh] flex items-center justify-center p-8">
    <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
  </div>
);

const AppRoutes = () => {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/fractie" element={<Raadsleden />} />
          <Route path="/fractie/:id" element={<FractielidVideos />} />
          <Route path="/fractie/:id/videos" element={<FractielidVideos />} />
          <Route path="/raadsleden" element={<Raadsleden />} />
          <Route path="/raadsleden/:id" element={<FractielidVideos />} />
          <Route path="/raadsleden/:id/videos" element={<FractielidVideos />} />
          <Route path="/video/:id" element={<VideoDetail />} />
          <Route path="/videos/:id" element={<VideoDetail />} />
          <Route path="/bestuur" element={<Bestuur />} />
          <Route path="/steunfractie" element={<Steunfractie />} />
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
          <Route path="/privacyverklaring" element={<Privacyverklaring />} />
          <Route path="/privacy" element={<Privacyverklaring />} />
          <Route path="/algemene-voorwaarden" element={<AlgemeneVoorwaarden />} />
          <Route path="/voorwaarden" element={<AlgemeneVoorwaarden />} />
          <Route path="/verwerkingsreglement" element={<Verwerkingsreglement />} />
        </Route>
        <Route path="*" element={<NotFound />} />
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
                  <VisitorPerformanceTracker />
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

