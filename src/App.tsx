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
import { ScrollToTop } from "./components/ScrollToTop";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Eager load primary landing page for instant FCP / LCP
import Home from "./pages/Home";

// Lazy-load all sub-routes to dramatically reduce initial JavaScript bundle on mobile
const Raadsleden = lazy(() => import("./pages/Raadsleden"));
const FractielidVideos = lazy(() => import("./pages/FractielidVideos"));
const VideoRedirect = lazy(() => import("./pages/VideoRedirect"));
const Bestuur = lazy(() => import("./pages/Bestuur"));
const Steunfractie = lazy(() => import("./pages/Steunfractie"));
const Standpunten = lazy(() => import("./pages/Standpunten"));
const Contact = lazy(() => import("./pages/Contact"));
const Agenda = lazy(() => import("./pages/Agenda"));
const AgendaDetail = lazy(() => import("./pages/AgendaDetail"));
const Nieuws = lazy(() => import("./pages/Nieuws"));
const NieuwsDetail = lazy(() => import("./pages/NieuwsDetail"));
const WijkenEnKernen = lazy(() => import("./pages/WijkenEnKernen"));
const WijkDetail = lazy(() => import("./pages/WijkDetail"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Doneren = lazy(() => import("./pages/Doneren"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Raadspaneel = lazy(() => import("./pages/Raadspaneel"));
const NieuwsbriefAfmelden = lazy(() => import("./pages/NieuwsbriefAfmelden"));
const TicketView = lazy(() => import("./pages/TicketView"));
const Polls = lazy(() => import("./pages/Polls"));

const queryClient = new QueryClient();

const PageLoadingFallback = () => (
  <div className="min-h-[40vh] flex items-center justify-center p-8">
    <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
  </div>
);

const App = () => (
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
                <Suspense fallback={<PageLoadingFallback />}>
                  <Routes>
                    <Route element={<Layout />}>
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
                      <Route path="/wijken-en/kernen" element={<WijkenEnKernen />} />
                      <Route path="/wijken-en/kernen/:slug" element={<WijkDetail />} />
                      <Route path="/contact" element={<Contact />} />
                      <Route path="/doneren" element={<Doneren />} />
                      <Route path="/doneren/*" element={<Doneren />} />
                      <Route path="/doneer" element={<Doneren />} />
                      <Route path="/reset-wachtwoord" element={<ResetPassword />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/registreren" element={<Register />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/peilingen" element={<Polls />} />
                      <Route path="/polls" element={<Polls />} />
                      <Route path="/admin" element={<AdminDashboard />} />
                      <Route path="/raadspaneel" element={<Raadspaneel />} />
                      <Route path="/dossiers" element={<Raadspaneel />} />
                      <Route path="/dossiers/:slug" element={<Raadspaneel />} />
                      <Route path="/nieuwsbrief/afmelden" element={<NieuwsbriefAfmelden />} />
                    </Route>
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </ErrorBoundary>
          </TooltipProvider>
        </AuthProvider>
      </AccessibilityProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
