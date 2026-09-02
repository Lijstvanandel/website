import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "./components/Layout";
import { ThemeProvider } from "./hooks/use-theme";
import Home from "./pages/Home";
import Raadsleden from "./pages/Raadsleden";
import Bestuur from "./pages/Bestuur";
import Steunfractie from "./pages/Steunfractie";
import Standpunten from "./pages/Standpunten";
import Contact from "./pages/Contact";
import Agenda from "./pages/Agenda";
import Nieuws from "./pages/Nieuws";
import NieuwsDetail from "./pages/NieuwsDetail";
import WijkenEnKernen from "./pages/WijkenEnKernen";
import WijkDetail from "./pages/WijkDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/fractie" element={<Raadsleden />} />
              <Route path="/bestuur" element={<Bestuur />} />
              <Route path="/steunfractie" element={<Steunfractie />} />
              <Route path="/raadsleden" element={<Raadsleden />} />
              <Route path="/standpunten" element={<Standpunten />} />
              <Route path="/agenda" element={<Agenda />} />
              <Route path="/nieuws" element={<Nieuws />} />
              <Route path="/nieuws/:id" element={<NieuwsDetail />} />
              <Route path="/wijken-en-kernen" element={<WijkenEnKernen />} />
              <Route path="/wijken-en-kernen/:slug" element={<WijkDetail />} />
              <Route path="/contact" element={<Contact />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
