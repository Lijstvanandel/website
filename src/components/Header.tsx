import { useState } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { Menu, X, Phone, Sun, Moon, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BelafspraakDialog } from "./BelafspraakDialog";
import { useTheme } from "@/hooks/use-theme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logo from "@/assets/logo.png";

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
  const location = useLocation();
  const partijActive = partijItems.some(i => location.pathname === i.to);

  return (
    <>
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/85 border-b border-accent/20">
        <div className="container flex items-center justify-between h-28">
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src={logo}
              alt="Lijst van Andel logo"
              className="w-24 h-24 rounded-full object-cover transition-all group-hover:scale-105"
            />
            <div className="leading-none">
              <div className="font-display text-xl tracking-wide">Lijst van Andel</div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-accent">Steenwijkerland</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger
                className={`px-4 py-2 text-sm uppercase tracking-wider font-medium transition-colors relative inline-flex items-center gap-1 outline-none ${
                  partijActive ? "text-accent" : "text-foreground/80 hover:text-accent"
                }`}
              >
                Partij
                <ChevronDown className="w-3.5 h-3.5" />
                {partijActive && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-accent" />}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[160px] bg-background border-accent/30">
                {partijItems.map(item => (
                  <DropdownMenuItem key={item.to} asChild>
                    <NavLink
                      to={item.to}
                      className={({ isActive }) =>
                        `w-full px-3 py-2 text-sm uppercase tracking-wider font-medium cursor-pointer ${
                          isActive ? "text-accent" : "text-foreground/90 hover:text-accent"
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `px-4 py-2 text-sm uppercase tracking-wider font-medium transition-colors relative ${
                    isActive ? "text-accent" : "text-foreground/80 hover:text-accent"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {item.label}
                    {isActive && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-accent" />}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              aria-label="Wissel thema"
              className="hidden sm:inline-flex w-10 h-10 items-center justify-center rounded-sm border border-accent/40 text-accent hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Button
              onClick={() => setBelOpen(true)}
              className="hidden sm:flex bg-primary hover:bg-primary/90 text-primary-foreground border border-accent/40 uppercase tracking-wider text-xs font-semibold px-5"
            >
              <Phone className="w-4 h-4" />
              Plan een belafspraak
            </Button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-foreground"
              aria-label="Menu"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-accent/20 bg-background">
            <nav className="container py-4 flex flex-col gap-1">
              <button
                onClick={() => setPartijMobileOpen(o => !o)}
                className={`px-3 py-3 text-sm uppercase tracking-wider font-medium border-l-2 flex items-center justify-between ${
                  partijActive ? "text-accent border-accent" : "text-foreground/80 border-transparent"
                }`}
              >
                Partij
                <ChevronDown className={`w-4 h-4 transition-transform ${partijMobileOpen ? "rotate-180" : ""}`} />
              </button>
              {partijMobileOpen && partijItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `pl-8 pr-3 py-2 text-xs uppercase tracking-wider font-medium border-l-2 ${
                      isActive ? "text-accent border-accent" : "text-foreground/70 border-transparent"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              {navItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `px-3 py-3 text-sm uppercase tracking-wider font-medium border-l-2 ${
                      isActive ? "text-accent border-accent" : "text-foreground/80 border-transparent"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <Button
                onClick={() => { setBelOpen(true); setMobileOpen(false); }}
                className="mt-3 bg-primary hover:bg-primary/90 uppercase tracking-wider text-xs font-semibold"
              >
                <Phone className="w-4 h-4" /> Plan een belafspraak
              </Button>
              <button
                onClick={toggle}
                className="mt-2 px-3 py-3 flex items-center gap-2 text-sm uppercase tracking-wider border border-accent/40 text-accent"
              >
                {theme === "dark" ? <><Sun className="w-4 h-4" /> Lightmode</> : <><Moon className="w-4 h-4" /> Darkmode</>}
              </button>
            </nav>
          </div>
        )}
      </header>
      <BelafspraakDialog open={belOpen} onOpenChange={setBelOpen} />
    </>
  );
};
