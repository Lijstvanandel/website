import { useState, useEffect, useMemo } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  Phone,
  Sun,
  Moon,
  ChevronDown,
  User,
  LogOut,
  Contrast,
  Check,
  Heart,
  UserPlus,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { BelafspraakDialog } from "./BelafspraakDialog";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/context/AuthContext";
import { ColorBlindMode } from "@/context/AccessibilityContext";
import { useAccessibility } from "@/hooks/use-accessibility";
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

const colorBlindOptions: { id: ColorBlindMode; label: string; desc: string }[] = [
  { id: "none", label: "Standaard (Geen filter)", desc: "Normale partijkleuren" },
  { id: "deuteranopia", label: "Deuteranopie", desc: "Rood-groen (groen-zwakte, meest voorkomend)" },
  { id: "protanopia", label: "Protanopie", desc: "Rood-groen (rood-zwakte)" },
  { id: "tritanopia", label: "Tritanopie", desc: "Blauw-geel afwijking" },
  { id: "monochrome", label: "Monochroom", desc: "Zwart-wit / hoog contrast grijswaarden" },
];

export const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [partijMobileOpen, setPartijMobileOpen] = useState(false);
  const [belOpen, setBelOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const { isAuthenticated, logout } = useAuth();
  const {
    fontSize,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
    setFontSize,
    contrastMode,
    toggleHighContrast,
    colorBlindMode,
    setColorBlindMode,
    setContrastMode,
  } = useAccessibility();

  const location = useLocation();
  const partijActive = partijItems.some((i) => location.pathname === i.to);

  // Dynamic wijk lookup for custom titles saved in database
  const [apiWijkenMap, setApiWijkenMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/wijken")
      .then((res) => (res.ok ? res.json().catch(() => []) : []))
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
        <div className="w-full max-w-[1720px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-12 flex items-center justify-between h-24 lg:h-28 gap-2 sm:gap-4 lg:gap-6">
          
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
                    className="text-[10px] sm:text-[11px] uppercase tracking-[0.22em] font-semibold text-accent whitespace-nowrap truncate max-w-[150px] sm:max-w-[220px] md:max-w-[320px]"
                    title={currentSubtitle}
                  >
                    {currentSubtitle}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
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
          <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-2.5 xl:gap-3 shrink-0">
            {/* 1. Plan belafspraak Button */}
            <Button
              onClick={() => setBelOpen(true)}
              className="hidden sm:inline-flex bg-primary hover:bg-primary/90 text-primary-foreground border border-accent/40 uppercase tracking-wider text-xs font-semibold px-2.5 xl:px-3.5 h-9 sm:h-10 whitespace-nowrap shrink-0 shadow-sm"
            >
              <Phone className="w-3.5 h-3.5 mr-1.5" />
              <span className="hidden xl:inline">Plan belafspraak</span>
              <span className="xl:hidden">Afspraak</span>
            </Button>

            {/* 2. Lid worden Button */}
            <Link to="/registreren" className="hidden md:inline-flex">
              <Button
                variant="outline"
                className="border-accent/40 text-accent hover:bg-accent/15 uppercase tracking-wider text-xs font-semibold px-2.5 xl:px-3.5 h-9 sm:h-10 whitespace-nowrap shrink-0 shadow-2xs"
              >
                <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                <span>Lid worden</span>
              </Button>
            </Link>

            {/* 3. Doneren Button */}
            <Link to="/doneren" className="inline-flex">
              <Button
                variant="outline"
                className="border-rose-400/50 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 uppercase tracking-wider text-xs font-semibold px-2.5 xl:px-3.5 h-9 sm:h-10 whitespace-nowrap shrink-0 shadow-2xs"
              >
                <Heart className="w-3.5 h-3.5 mr-1.5 fill-rose-600 text-rose-600" />
                <span>Doneren</span>
              </Button>
            </Link>

            {/* 2. Tekstgrootte vergroten & verkleinen knoppen (tussen belafspraak en dark/lightmode) */}
            <div
              className="inline-flex items-center rounded-sm border border-accent/40 bg-background/60 h-9 sm:h-10 p-0.5 shrink-0 shadow-2xs"
              title="Tekstgrootte aanpassen voor de hele website"
            >
              <button
                type="button"
                onClick={decreaseFontSize}
                disabled={fontSize <= 85}
                className="h-full px-1.5 sm:px-2 flex items-center justify-center text-accent hover:bg-accent hover:text-accent-foreground disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-accent rounded-xs transition-colors font-bold text-xs"
                title="Tekstgrootte verkleinen (A-)"
                aria-label="Tekstgrootte verkleinen"
              >
                <span className="font-display text-xs tracking-tight">A-</span>
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={`h-full px-1.5 sm:px-2 flex items-center gap-0.5 text-[11px] font-semibold transition-colors rounded-xs hover:bg-accent/15 border-x border-accent/20 ${
                      fontSize !== 100 ? "text-accent font-bold" : "text-foreground/80"
                    }`}
                    title={`Huidige tekstgrootte: ${fontSize}%. Klik voor opties.`}
                    aria-label={`Huidige tekstgrootte: ${fontSize}%. Klik voor overzicht.`}
                  >
                    <span>{fontSize}%</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-56 bg-background border-accent/30 shadow-xl p-2 z-50">
                  <div className="px-2 py-1.5 border-b border-border/60 mb-1.5">
                    <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span>Tekstgrootte</span>
                      {fontSize !== 100 && (
                        <button
                          onClick={resetFontSize}
                          className="text-[10px] text-accent hover:underline uppercase tracking-wider font-semibold"
                        >
                          Herstel
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Geldt direct voor de volledige website.
                    </p>
                  </div>
                  <div className="space-y-1">
                    {[
                      { size: 85, label: "Compact (85%)" },
                      { size: 100, label: "Standaard (100%)" },
                      { size: 115, label: "Groot (115%)" },
                      { size: 130, label: "Extra groot (130%)" },
                      { size: 145, label: "Maximaal (145%)" },
                    ].map((item) => (
                      <button
                        key={item.size}
                        type="button"
                        onClick={() => setFontSize(item.size)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-colors ${
                          fontSize === item.size
                            ? "bg-accent/20 text-accent font-semibold"
                            : "hover:bg-accent/10 text-foreground"
                        }`}
                      >
                        <span>{item.label}</span>
                        {fontSize === item.size && <Check className="w-3.5 h-3.5 text-accent" />}
                      </button>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <button
                type="button"
                onClick={increaseFontSize}
                disabled={fontSize >= 145}
                className="h-full px-1.5 sm:px-2 flex items-center justify-center text-accent hover:bg-accent hover:text-accent-foreground disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-accent rounded-xs transition-colors font-bold text-xs"
                title="Tekstgrootte vergroten (A+)"
                aria-label="Tekstgrootte vergroten"
              >
                <span className="font-display text-base leading-none tracking-tight">A+</span>
              </button>
            </div>

            {/* 3. Kleurcontrast voor kleurenblindheid knop (tussen belafspraak en dark/lightmode) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Kleurcontrast en kleurenblindheid instellingen"
                  title="Kleurcontrast voor kleurenblindheid (WCAG)"
                  className={`w-9 h-9 sm:w-10 sm:h-10 inline-flex items-center justify-center rounded-sm border transition-all shrink-0 relative ${
                    contrastMode === "high" || colorBlindMode !== "none"
                      ? "border-accent bg-accent text-accent-foreground shadow-sm ring-1 ring-accent"
                      : "border-accent/40 text-accent hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <Contrast className="w-4 h-4" />
                  {(contrastMode === "high" || colorBlindMode !== "none") && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-accent-foreground border-2 border-background rounded-full" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 bg-background border-accent/30 shadow-2xl p-2.5 z-50">
                <div className="px-2 py-1.5 border-b border-border/60 mb-2">
                  <div className="font-display text-sm text-foreground flex items-center justify-between">
                    <span>Contrast & Kleurenblindheid</span>
                    {(contrastMode === "high" || colorBlindMode !== "none") && (
                      <button
                        onClick={() => {
                          setContrastMode("normal");
                          setColorBlindMode("none");
                        }}
                        className="text-[10px] text-accent hover:underline font-semibold uppercase tracking-wider"
                      >
                        Herstel
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Optimaliseer kleurcontrasten en kleurenfilters voor de gehele website.
                  </p>
                </div>

                {/* Hoog contrast toggle */}
                <div className="mb-2.5">
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground px-2 mb-1">
                    Kleurcontrast
                  </div>
                  <button
                    type="button"
                    onClick={toggleHighContrast}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded text-xs font-medium transition-colors border ${
                      contrastMode === "high"
                        ? "bg-accent/20 border-accent/40 text-accent font-semibold"
                        : "border-transparent hover:bg-accent/10 text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Contrast className="w-3.5 h-3.5 text-accent" />
                      <span>Hoog Contrast (WCAG AAA)</span>
                    </div>
                    {contrastMode === "high" && <Check className="w-3.5 h-3.5 text-accent" />}
                  </button>
                </div>

                {/* Kleurenblindheid opties */}
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground px-2 mb-1">
                    Kleurenblindheid weergave
                  </div>
                  <div className="space-y-1">
                    {colorBlindOptions.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setColorBlindMode(opt.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-colors ${
                          colorBlindMode === opt.id
                            ? "bg-accent/20 text-accent font-semibold"
                            : "hover:bg-accent/10 text-foreground"
                        }`}
                      >
                        <div className="flex flex-col text-left">
                          <span className="font-medium">{opt.label}</span>
                          <span className="text-[10px] text-muted-foreground leading-tight">
                            {opt.desc}
                          </span>
                        </div>
                        {colorBlindMode === opt.id && (
                          <Check className="w-3.5 h-3.5 text-accent shrink-0 ml-2" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 4. Theme Toggle (dark/lightmode) */}
            <button
              onClick={toggle}
              aria-label="Wissel thema"
              title={theme === "dark" ? "Schakel naar licht thema" : "Schakel naar donker thema"}
              className="w-9 h-9 sm:w-10 sm:h-10 inline-flex items-center justify-center rounded-sm border border-accent/40 text-accent hover:bg-accent hover:text-accent-foreground transition-colors shrink-0"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* 5. Authentication Buttons (Logged in vs Guest) */}
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

              {/* Mobile Action Buttons */}
              <div className="mt-3 flex flex-col gap-2">
                <Button
                  onClick={() => {
                    setBelOpen(true);
                    setMobileOpen(false);
                  }}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground border border-accent/40 uppercase tracking-wider text-xs font-semibold py-2.5 w-full flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4" />
                  <span>Plan een belafspraak</span>
                </Button>

                <Link
                  to="/registreren"
                  onClick={() => setMobileOpen(false)}
                  className="w-full"
                >
                  <Button
                    variant="outline"
                    className="w-full border-accent/40 text-accent hover:bg-accent/15 uppercase tracking-wider text-xs font-semibold py-2.5 flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Lid worden</span>
                  </Button>
                </Link>

                <Link
                  to="/doneren"
                  onClick={() => setMobileOpen(false)}
                  className="w-full"
                >
                  <Button
                    variant="outline"
                    className="w-full border-rose-400/50 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 uppercase tracking-wider text-xs font-semibold py-2.5 flex items-center justify-center gap-2"
                  >
                    <Heart className="w-4 h-4 fill-rose-600 text-rose-600" />
                    <span>Doneren aan de partij</span>
                  </Button>
                </Link>
              </div>

              {/* Mobile Toegankelijkheid Sectie (Tekstgrootte & Kleurcontrast) */}
              <div className="mt-3 p-3 bg-muted/30 border border-accent/20 rounded-md space-y-3">
                <div className="text-[11px] uppercase tracking-wider font-semibold text-accent flex items-center justify-between">
                  <span>Toegankelijkheid & Weergave</span>
                  {(fontSize !== 100 || contrastMode === "high" || colorBlindMode !== "none") && (
                    <button
                      onClick={() => {
                        resetFontSize();
                        setContrastMode("normal");
                        setColorBlindMode("none");
                      }}
                      className="text-[10px] text-muted-foreground hover:text-accent underline uppercase tracking-wider"
                    >
                      Herstel alles
                    </button>
                  )}
                </div>

                {/* Tekstgrootte regelaar */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-foreground font-medium">Tekstgrootte:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={decreaseFontSize}
                      disabled={fontSize <= 85}
                      className="px-2.5 py-1 rounded bg-background border border-border text-xs font-bold text-accent disabled:opacity-40"
                      title="Tekst verkleinen"
                    >
                      A-
                    </button>
                    <button
                      onClick={resetFontSize}
                      className="px-2 py-1 text-xs font-semibold text-foreground/80 hover:text-accent"
                      title="Herstel naar 100%"
                    >
                      {fontSize}%
                    </button>
                    <button
                      onClick={increaseFontSize}
                      disabled={fontSize >= 145}
                      className="px-2.5 py-1 rounded bg-background border border-border text-xs font-bold text-accent disabled:opacity-40"
                      title="Tekst vergroten"
                    >
                      A+
                    </button>
                  </div>
                </div>

                {/* Hoog contrast toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-foreground font-medium">Hoog contrast:</span>
                  <button
                    onClick={toggleHighContrast}
                    className={`px-3 py-1 text-xs font-semibold rounded border transition-colors ${
                      contrastMode === "high"
                        ? "bg-accent text-accent-foreground border-accent"
                        : "bg-background text-muted-foreground border-border hover:text-foreground"
                    }`}
                  >
                    {contrastMode === "high" ? "Aan (WCAG AAA)" : "Uit"}
                  </button>
                </div>

                {/* Kleurenblindheid dropdown */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-foreground font-medium">Kleurenblindheid filter:</span>
                  <select
                    value={colorBlindMode}
                    onChange={(e) => setColorBlindMode(e.target.value as ColorBlindMode)}
                    className="w-full text-xs px-2.5 py-1.5 rounded bg-background border border-border text-foreground outline-none focus:border-accent"
                  >
                    <option value="none">Standaard (Geen filter)</option>
                    <option value="deuteranopia">Deuteranopie (Rood-Groen)</option>
                    <option value="protanopia">Protanopie (Rood-zwakte)</option>
                    <option value="tritanopia">Tritanopie (Blauw-Geel)</option>
                    <option value="monochrome">Monochroom (Zwart-wit)</option>
                  </select>
                </div>
              </div>

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
                className="mt-2 px-3 py-2.5 flex items-center justify-center gap-2 text-xs uppercase tracking-wider font-semibold border border-accent/40 text-accent rounded-sm hover:bg-accent/10 transition-colors"
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
