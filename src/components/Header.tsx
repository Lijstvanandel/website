import { useState, useEffect, useMemo } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { Menu, X, Phone, Sun, Moon, ChevronDown, User, LogOut } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { BelafspraakDialog } from "./BelafspraakDialog";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logo from "@/assets/logo.png";
import { BUURTKAART_43_WIJKEN, LEGACY_SLUG_MAP } from "@/data/defaultWijken";

const navItems = [
  { to: "/standpunten", label: "Standpunten" },
  { to: "/agenda", label: "Agenda" },
  { to: "/nieuws", label: "Nieuws" },
  { to: "/wijken-en-kernen", label: "Wijken en kernen" },
  { to: "/contact", label: "Contact" },
];

const partijItems = [
  { to: "/bestuur", label: "Bestuur" },
  { to: "/fractie", label: "Fractie" },
  { to: "/steunfractie", label: "Steunfractie" },
];

export const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [partijMobileOpen, setPartijMobileOpen] = useState(false);
  const [belOpen, setBelOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const { isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const partijActive = partijItems.some((i) => location.pathname === i.to);

  // Dynamic wijk lookup for custom titles saved in database
  const [apiWijkenMap, setApiWijkenMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/wijken")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          const map: Record<string, string> = {};
          data.forEach((item) => {
            if (item && item.slug && item.naam) {
              map[item.slug.toLowerCase()] = item.naam;
            }
          });
          setApiWijkenMap(map);
        }
      })
      .catch(() => {});
  }, []);

  // Determine current active subtitle based on route
  const currentSubtitle = useMemo(() => {
    const pathname = location.pathname;

    // Check for single wijk/kern detail page: e.g. /wijken-en-kernen/:slug or /wijken-en/kernen/:slug
    const detailMatch = pathname.match(/^\/wijken-en(?:-|\/)kernen\/([^/?#]+)/);
    if (detailMatch && detailMatch[1]) {
      const rawSlug = decodeURIComponent(detailMatch[1]).toLowerCase();
      const mappedSlug = LEGACY_SLUG_MAP[rawSlug] || rawSlug;

      // Check API dynamically loaded name first
      if (apiWijkenMap[mappedSlug]) return apiWijkenMap[mappedSlug];
      if (apiWijkenMap[rawSlug]) return apiWijkenMap[rawSlug];

      // Check static official 43-unit list
      const staticFound = BUURTKAART_43_WIJKEN.find(
        (w) => w.slug.toLowerCase() === mappedSlug || w.slug.toLowerCase() === rawSlug
      );
      if (staticFound) return staticFound.naam;

      // Fallback: capitalize slug words nicely
      return rawSlug
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }

    // Overview page
    if (pathname === "/wijken-en-kernen" || pathname === "/wijken-en/kernen") {
      return "Wijken & Kernen";
    }

    // Default for all general pages
    return "Steenwijkerland";
  }, [location.pathname, apiWijkenMap]);

  return (
    <>
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/90 border-b border-accent/20 w-full transition-colors">
        {/* Full-width responsive container giving maximum room to nav and buttons */}
        <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 flex items-center justify-between h-24 lg:h-28 gap-3 sm:gap-6">
          
          {/* Logo & Brand Name with animated wijk/kern subtitle */}
          <Link to="/" className="flex items-center gap-3 sm:gap-4 group shrink-0 select-none">
            <img
              src={logo}
              alt="Lijst van Andel logo"
              className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full object-cover transition-transform duration-300 group-hover:scale-105 shrink-0 shadow-sm"
            />
            <div className="leading-none shrink-0">
              <div className="font-display text-lg sm:text-2xl tracking-wide text-foreground">
                Lijst van Andel
              </div>
              <div className="h-5 overflow-hidden flex items-center mt-1">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={currentSubtitle}
                    initial={{ opacity: 0, y: 7, filter: "blur(2px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -7, filter: "blur(2px)" }}
                    transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                    className="text-[10px] sm:text-[11px] uppercase tracking-[0.22em] font-semibold text-accent whitespace-nowrap truncate max-w-[160px] sm:max-w-[240px] md:max-w-[320px]"
                    title={currentSubtitle}
                  >
                    {currentSubtitle}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation with whitespace-nowrap to prevent squished text */}
          <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1.5 2xl:gap-2 shrink">
            {/* Partij Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className={`px-3 xl:px-4 py-2 text-xs xl:text-sm uppercase tracking-wider font-medium transition-colors relative inline-flex items-center gap-1 outline-none whitespace-nowrap ${
                  partijActive ? "text-accent" : "text-foreground/85 hover:text-accent"
                }`}
              >
                <span>Partij</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                {partijActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-accent" />
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[170px] bg-background border-accent/30 shadow-lg z-50">
                {partijItems.map((item) => (
                  <DropdownMenuItem key={item.to} asChild>
                    <NavLink
                      to={item.to}
                      className={({ isActive }) =>
                        `w-full px-3 py-2 text-xs xl:text-sm uppercase tracking-wider font-medium cursor-pointer whitespace-nowrap ${
                          isActive ? "text-accent font-semibold" : "text-foreground/90 hover:text-accent"
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Standard Nav Items */}
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `px-3 xl:px-4 py-2 text-xs xl:text-sm uppercase tracking-wider font-medium transition-colors relative whitespace-nowrap ${
                    isActive ? "text-accent font-semibold" : "text-foreground/85 hover:text-accent"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-accent" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Right-side Actions & Authentication Controls */}
          <div className="flex items-center gap-2 lg:gap-2.5 xl:gap-3 shrink-0">
            {/* Theme Toggle */}
            <button
              onClick={toggle}
              aria-label="Wissel thema"
              className="w-9 h-9 sm:w-10 sm:h-10 inline-flex items-center justify-center rounded-sm border border-accent/40 text-accent hover:bg-accent hover:text-accent-foreground transition-colors shrink-0"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Belafspraak Button */}
            <Button
              onClick={() => setBelOpen(true)}
              className="hidden sm:inline-flex bg-primary hover:bg-primary/90 text-primary-foreground border border-accent/40 uppercase tracking-wider text-xs font-semibold px-3.5 xl:px-4 h-9 sm:h-10 whitespace-nowrap shrink-0 shadow-sm"
            >
              <Phone className="w-3.5 h-3.5 mr-1.5" />
              <span className="hidden xl:inline">Plan belafspraak</span>
              <span className="xl:hidden">Belafspraak</span>
            </Button>

            {/* Authentication Buttons (Logged in vs Guest) */}
            {isAuthenticated ? (
              <div className="hidden sm:flex items-center gap-1.5 lg:gap-2 shrink-0">
                <Link to="/dashboard">
                  <Button
                    variant="outline"
                    className="border-accent text-accent hover:bg-accent hover:text-accent-foreground uppercase tracking-wider text-xs font-semibold px-3 h-9 sm:h-10 whitespace-nowrap"
                  >
                    <User className="w-3.5 h-3.5 mr-1.5" />
                    <span>Dashboard</span>
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  onClick={logout}
                  className="uppercase tracking-wider text-xs font-semibold text-foreground/80 hover:text-foreground hover:bg-accent/15 px-2.5 h-9 sm:h-10 whitespace-nowrap"
                  title="Uitloggen"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1" />
                  <span className="hidden xl:inline">Uitloggen</span>
                </Button>
              </div>
            ) : (
              <Link to="/login" className="hidden sm:inline-flex shrink-0">
                <Button
                  variant="outline"
                  className="border-accent text-accent hover:bg-accent hover:text-accent-foreground uppercase tracking-wider text-xs font-semibold px-4 h-9 sm:h-10 whitespace-nowrap"
                >
                  Inloggen
                </Button>
              </Link>
            )}

            {/* Mobile Hamburger Menu Button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 text-foreground rounded-md hover:bg-accent/10 transition-colors"
              aria-label="Menu"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation Drawer */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-accent/20 bg-background/98 backdrop-blur-md shadow-2xl animate-in slide-in-from-top-2 duration-200">
            <nav className="max-w-[1720px] mx-auto px-5 py-5 flex flex-col gap-1.5">
              {/* Current Active Location Indicator if on a wijk page */}
              {currentSubtitle !== "Steenwijkerland" && (
                <div className="px-3 py-1.5 mb-2 rounded bg-accent/10 border border-accent/20 text-accent text-xs font-semibold uppercase tracking-wider flex items-center justify-between">
                  <span>Huidige locatie:</span>
                  <span className="font-bold">{currentSubtitle}</span>
                </div>
              )}

              {/* Partij Accordion in Mobile */}
              <button
                onClick={() => setPartijMobileOpen((o) => !o)}
                className={`px-3 py-3 text-sm uppercase tracking-wider font-medium border-l-2 flex items-center justify-between transition-colors ${
                  partijActive ? "text-accent border-accent font-semibold" : "text-foreground/80 border-transparent"
                }`}
              >
                <span>Partij</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${partijMobileOpen ? "rotate-180" : ""}`} />
              </button>
              {partijMobileOpen &&
                partijItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `pl-8 pr-3 py-2.5 text-xs uppercase tracking-wider font-medium border-l-2 transition-colors ${
                        isActive ? "text-accent border-accent font-bold" : "text-foreground/75 border-transparent"
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}

              {/* Nav Items in Mobile */}
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `px-3 py-3 text-sm uppercase tracking-wider font-medium border-l-2 transition-colors ${
                      isActive ? "text-accent border-accent font-bold" : "text-foreground/80 border-transparent"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}

              {/* Mobile Plan Belafspraak */}
              <Button
                onClick={() => {
                  setBelOpen(true);
                  setMobileOpen(false);
                }}
                className="mt-3 bg-primary hover:bg-primary/90 text-primary-foreground border border-accent/40 uppercase tracking-wider text-xs font-semibold py-2.5 w-full flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4" />
                <span>Plan een belafspraak</span>
              </Button>

              {/* Mobile Auth actions */}
              {isAuthenticated ? (
                <div className="pt-2 flex flex-col gap-2">
                  <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
                    <Button
                      variant="outline"
                      className="w-full border-accent text-accent hover:bg-accent hover:text-accent-foreground uppercase tracking-wider text-xs font-semibold justify-center"
                    >
                      <User className="w-4 h-4 mr-2" />
                      Dashboard
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      logout();
                      setMobileOpen(false);
                    }}
                    className="w-full uppercase tracking-wider text-xs font-semibold text-foreground/80 hover:text-foreground justify-center px-3"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Uitloggen
                  </Button>
                </div>
              ) : (
                <Link to="/login" onClick={() => setMobileOpen(false)} className="pt-2">
                  <Button
                    variant="outline"
                    className="w-full border-accent text-accent hover:bg-accent hover:text-accent-foreground uppercase tracking-wider text-xs font-semibold justify-center"
                  >
                    Inloggen
                  </Button>
                </Link>
              )}

              {/* Mobile Theme Switcher */}
              <button
                onClick={toggle}
                className="mt-3 px-3 py-2.5 flex items-center justify-center gap-2 text-xs uppercase tracking-wider font-semibold border border-accent/40 text-accent rounded-sm hover:bg-accent/10 transition-colors"
              >
                {theme === "dark" ? (
                  <>
                    <Sun className="w-4 h-4" /> Licht thema
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4" /> Donker thema
                  </>
                )}
              </button>
            </nav>
          </div>
        )}
      </header>

      <BelafspraakDialog open={belOpen} onOpenChange={setBelOpen} />
    </>
  );
};
