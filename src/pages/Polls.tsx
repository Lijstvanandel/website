import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { 
  Sparkles, 
  Check, 
  X, 
  RotateCcw, 
  Calendar, 
  Users, 
  Send, 
  Lock, 
  ArrowRight, 
  CheckCircle2, 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown, 
  ChevronRight, 
  QrCode,
  MapPin,
  Flame
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { fetchWithAuth } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { StellingItem, StellingAnswer, QrLocation } from "@/types/stelling";

// Swipe Card Component with smooth drag & rotation physics across the WHOLE card
interface SwipeCardProps {
  stelling: StellingItem;
  onSwipe: (direction: "eens" | "oneens") => void;
  isTop: boolean;
}

function SwipeCard({ stelling, onSwipe, isTop }: SwipeCardProps) {
  const x = useMotionValue(0);
  // Responsive rotation and visual cues
  const rotate = useTransform(x, [-180, 180], [-14, 14]);
  const opacity = useTransform(x, [-220, -140, 0, 140, 220], [0.6, 1, 1, 1, 0.6]);
  
  // Badge opacities activate early for snappy visual feedback
  const likeOpacity = useTransform(x, [12, 60], [0, 1]);
  const nopeOpacity = useTransform(x, [-12, -60], [0, 1]);

  const handleDragEnd = (_: any, info: any) => {
    // Highly responsive swipe sensitivity for mobile/touch screens & PWA
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    if (offset > 45 || velocity > 300) {
      onSwipe("eens");
    } else if (offset < -45 || velocity < -300) {
      onSwipe("oneens");
    }
  };

  return (
    <motion.div
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        opacity: isTop ? opacity : 0.9,
        zIndex: isTop ? 10 : 1,
        touchAction: "pan-y"
      }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.85}
      dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: isTop ? 1.01 : 1 }}
      initial={{ scale: 0.95, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.85, opacity: 0, transition: { duration: 0.18 } }}
      className="absolute inset-0 bg-card rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col select-none cursor-grab active:cursor-grabbing pointer-events-auto"
    >
      {/* Top Media Image Container */}
      <div className="relative h-60 sm:h-64 w-full bg-muted overflow-hidden shrink-0 pointer-events-none select-none">
        <img
          src={stelling.imageUrl || "/assets/stemmen.jpg"}
          alt={stelling.title}
          className="w-full h-full object-cover pointer-events-none select-none"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/assets/stemmen.jpg";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />

        {/* Category Tag */}
        {stelling.category && (
          <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-accent border border-accent/30 shadow-md">
            {stelling.category}
          </div>
        )}

        {/* Swipe Indicators on Card overlay */}
        {isTop && (
          <>
            <motion.div
              style={{ opacity: likeOpacity }}
              className="absolute top-6 right-6 bg-emerald-600 text-white px-4 py-2 rounded-2xl font-display font-black text-xl tracking-wider border-2 border-white shadow-xl rotate-12 flex items-center gap-1.5 pointer-events-none z-20"
            >
              <ThumbsUp className="w-5 h-5 fill-white" />
              EENS
            </motion.div>

            <motion.div
              style={{ opacity: nopeOpacity }}
              className="absolute top-6 left-6 bg-rose-600 text-white px-4 py-2 rounded-2xl font-display font-black text-xl tracking-wider border-2 border-white shadow-xl -rotate-12 flex items-center gap-1.5 pointer-events-none z-20"
            >
              <ThumbsDown className="w-5 h-5 fill-white" />
              ONEENS
            </motion.div>
          </>
        )}
      </div>

      {/* Card Content - fully draggable area */}
      <div className="p-6 flex-1 flex flex-col justify-between overflow-hidden select-none pointer-events-none">
        <div className="space-y-2 pointer-events-none">
          <h2 className="text-xl sm:text-2xl font-display font-bold text-foreground leading-snug">
            {stelling.title}
          </h2>
          {stelling.description && (
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed line-clamp-4">
              {stelling.description}
            </p>
          )}
        </div>

        {/* Swipe instructions banner */}
        <div className="pt-4 mt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground pointer-events-none select-none">
          <span className="flex items-center text-rose-600 font-semibold">
            <ThumbsDown className="w-3.5 h-3.5 mr-1" />
            Veeg links = Oneens
          </span>
          <span className="flex items-center text-emerald-600 font-semibold">
            Veeg rechts = Eens
            <ThumbsUp className="w-3.5 h-3.5 ml-1" />
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default function Polls() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Check if opened through location QR code query param (e.g. ?location=skatebaan-steenwijk or ?loc=...)
  const locationParam = searchParams.get("location") || searchParams.get("loc") || searchParams.get("qr");

  const [stellingen, setStellingen] = useState<StellingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [deniedReason, setDeniedReason] = useState("");
  const [hasAlreadySubmitted, setHasAlreadySubmitted] = useState(false);
  const [hasSubmittedAllActive, setHasSubmittedAllActive] = useState(false);
  const [totalActiveCount, setTotalActiveCount] = useState(0);
  const [activeQrLocation, setActiveQrLocation] = useState<QrLocation | null>(null);
  const [isAnonymousQr, setIsAnonymousQr] = useState(false);

  // Flow State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<StellingAnswer[]>([]);
  const [scaleValue, setScaleValue] = useState<number>(7);
  const [generalFeedback, setGeneralFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const isPWA = typeof window !== "undefined" && (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    document.referrer.includes("android-app://")
  );

  useEffect(() => {
    // If accessed via QR location parameter, authentication is NOT required (anonymous access allowed)
    if (locationParam) {
      fetchStellingenForLocation(locationParam);
      return;
    }

    if (authLoading) return;

    if (!isAuthenticated) {
      navigate("/login?redirect=/peilingen", { replace: true });
      return;
    }

    // Check paid status for authenticated users
    const isPaid = user?.role === "admin" || user?.billingStatus === "paid";
    if (!isPaid) {
      setAccessDenied(true);
      setDeniedReason("Om deel te nemen aan onze fractiestellingen en peilingen dient uw jaarlijkse partijcontributie te zijn voldaan.");
      setLoading(false);
      return;
    }

    fetchStellingen();
  }, [authLoading, isAuthenticated, user, locationParam]);

  const fetchStellingenForLocation = async (locSlug: string) => {
    setLoading(true);
    try {
      // First fetch location stellingen directly (public access with location param)
      const res = await fetch(`/api/stellingen?location=${encodeURIComponent(locSlug)}`);
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Kon stellingen voor deze locatie niet laden.");
        setLoading(false);
        return;
      }

      setIsAnonymousQr(true);
      setActiveQrLocation(data.activeQrLocation || null);
      const list = (data.stellingen || []).filter((s: StellingItem) => s.active !== false);
      setStellingen(list);
      setTotalActiveCount(data.totalActiveStellingenCount || list.length);
      setHasAlreadySubmitted(!!data.hasSubmitted);
      setHasSubmittedAllActive(!!data.hasSubmittedAllActive);
    } catch (err) {
      console.error(err);
      toast.error("Fout bij laden van stellingen via QR-code.");
    } finally {
      setLoading(false);
    }
  };

  const fetchStellingen = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/stellingen");
      const data = await res.json();

      if (!res.ok) {
        if (data.code === "MEMBERSHIP_DUES_REQUIRED") {
          setAccessDenied(true);
          setDeniedReason(data.message || "Contributie vereist.");
        } else {
          toast.error(data.error || "Kon stellingen niet ophalen.");
        }
        setLoading(false);
        return;
      }

      const list = (data.stellingen || []).filter((s: StellingItem) => s.active !== false);
      setStellingen(list);
      setTotalActiveCount(data.totalActiveStellingenCount || list.length);
      setHasAlreadySubmitted(!!data.hasSubmitted);
      setHasSubmittedAllActive(!!data.hasSubmittedAllActive);
    } catch (err) {
      console.error(err);
      toast.error("Fout bij ophalen van fractiepeilingen.");
    } finally {
      setLoading(false);
    }
  };

  const handleSwipeChoice = (direction: "eens" | "oneens") => {
    const current = stellingen[currentIndex];
    if (!current) return;

    // Record answer
    setAnswers((prev) => [
      ...prev.filter((a) => a.stellingId !== current.id),
      { stellingId: current.id, value: direction }
    ]);

    // Haptic feedback if available in PWA / mobile
    if (typeof window !== "undefined" && window.navigator && "vibrate" in window.navigator) {
      try {
        window.navigator.vibrate(20);
      } catch {
        // ignore vibrate errors
      }
    }

    // Move to next card
    if (currentIndex + 1 < stellingen.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Finished cards, go to optional feedback / thank you note step
      setCurrentIndex(stellingen.length);
    }
  };

  const handleScaleChoice = () => {
    const current = stellingen[currentIndex];
    if (!current) return;

    // Record scale answer (number 1..10)
    setAnswers((prev) => [
      ...prev.filter((a) => a.stellingId !== current.id),
      { stellingId: current.id, value: scaleValue }
    ]);

    if (currentIndex + 1 < stellingen.length) {
      setCurrentIndex(currentIndex + 1);
      setScaleValue(7); // reset default for next
    } else {
      setCurrentIndex(stellingen.length);
    }
  };

  const handleFinalSubmit = async () => {
    if (answers.length === 0) {
      toast.error("Beantwoord alstublieft eerst de stellingen.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        answers,
        generalFeedback: generalFeedback.trim(),
        isPWA
      };

      if (isAnonymousQr && activeQrLocation) {
        payload.qrLocationSlug = activeQrLocation.slug;
        payload.qrLocationId = activeQrLocation.id;
      }

      let res: Response;
      if (isAnonymousQr) {
        res = await fetch("/api/stellingen/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetchWithAuth("/api/stellingen/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Fout bij opslaan van uw stemmen.");
      }

      setIsFinished(true);
      toast.success("Stem succesvol opgeslagen!");
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Er is een fout opgetreden bij het verzenden.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. Loading State
  if (authLoading || loading) {
    return (
      <div className="pt-28 pb-20 min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 border-4 border-accent/20 border-t-accent rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground font-medium text-sm animate-pulse">
          Laden van actuele fractiestellingen...
        </p>
      </div>
    );
  }

  // 2. Access Denied (Geen betaalde contributie)
  if (accessDenied && !isAnonymousQr) {
    return (
      <div className="pt-32 pb-24 min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-card p-8 rounded-3xl border border-border shadow-xl text-center space-y-6 animate-fade-up">
          <div className="w-16 h-16 bg-amber-500/10 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/30">
            <Lock className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              Exclusief voor Leden
            </h1>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {deniedReason}
            </p>
          </div>

          <div className="bg-muted/50 p-4 rounded-2xl border border-border text-xs text-muted-foreground space-y-1 text-left">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-accent" /> Waarom deze stellingen?
            </p>
            <p>
              Als betalend partijlid heeft u direct invloed op het standpunt van Lijst van Andel in de gemeenteraad van Steenwijkerland.
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-3">
            <Link to="/dashboard">
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-full">
                Contributie voldoen via Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/">
              <Button variant="ghost" className="w-full text-muted-foreground hover:text-foreground">
                Terug naar homepage
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Geen actieve stellingen beschikbaar of reeds alles beantwoord
  if (stellingen.length === 0) {
    return (
      <div className="pt-32 pb-24 min-h-screen bg-background flex items-center justify-center px-4 animate-fade-up">
        <div className="max-w-md w-full bg-card p-8 sm:p-10 rounded-3xl border border-border shadow-xl text-center space-y-6 relative overflow-hidden">
          <div className="w-20 h-20 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-500/20 shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-accent/15 text-accent border border-accent/30">
              {isAnonymousQr ? `Locatie: ${activeQrLocation?.name || "QR Locatie"}` : "Fractie Peilingen"}
            </span>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
              {hasAlreadySubmitted ? "Hartelijk dank voor uw deelname!" : "Geen openstaande stellingen"}
            </h2>
          </div>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {hasAlreadySubmitted ? (
              <>
                U heeft uw mening al succesvol doorgegeven voor alle actieve fractiestellingen. Binnenkort staat er weer een nieuwe peiling open zodra onze fractie nieuwe stellingen en voorstellen formuleert!
              </>
            ) : activeQrLocation ? (
              <>
                Voor de locatie <strong>{activeQrLocation.name}</strong> zijn momenteel alle stellingen afgerond of is het maximaal aantal respondenten behaald.
              </>
            ) : (
              <>
                Er zijn op dit moment geen openstaande stellingen die uw input vereisen. Zodra er een nieuwe stelling of peiling actief wordt, kunt u hier direct weer uw stem laten horen.
              </>
            )}
          </p>

          <div className="pt-3 flex flex-col gap-3">
            <Link to="/dashboard">
              <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-3 rounded-full shadow-md">
                Terug naar Ledendashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/">
              <Button variant="outline" className="w-full rounded-full border-border text-muted-foreground hover:text-foreground">
                Naar Homepage
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 4. Bedankt Scherm (Finished / Direct na afronden van de huidige sessie)
  if (isFinished) {
    return (
      <div className="pt-32 pb-24 min-h-screen bg-background flex items-center justify-center px-4 animate-fade-up">
        <div className="max-w-md w-full bg-card p-8 sm:p-10 rounded-3xl border border-accent/40 shadow-2xl text-center space-y-6 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-accent/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="w-20 h-20 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-500/30 shadow-inner">
            <Check className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-accent/15 text-accent border border-accent/30">
              {isAnonymousQr ? `Locatie: ${activeQrLocation?.name || "QR Locatie"}` : "Meningspeiling Afgerond"}
            </span>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
              Hartelijk dank voor uw mening!
            </h1>
          </div>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Wij nemen alle uitslagen en opmerkingen rechtstreeks mee ter voorbereiding op onze <strong className="text-foreground">fractievergadering</strong>. Binnenkort staat er weer een nieuwe peiling voor u open zodra er nieuwe vraagstukken zijn!
          </p>

          <div className="pt-4 flex flex-col gap-3">
            <Link to="/dashboard">
              <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-3.5 rounded-full shadow-md">
                Terug naar Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/">
              <Button variant="outline" className="w-full rounded-full border-border text-muted-foreground hover:text-foreground">
                Bekijk onze website & standpunten
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentStelling = stellingen[currentIndex];
  const isFinalFeedbackStep = currentIndex >= stellingen.length;

  return (
    <div className="pt-28 sm:pt-32 pb-24 min-h-screen bg-background flex flex-col items-center justify-start px-4">
      <div className="max-w-md w-full flex flex-col items-center">
        
        {/* QR LOCATION STICKER HEADER BANNER */}
        {activeQrLocation && (
          <div className="w-full bg-gradient-to-r from-accent/15 via-accent/25 to-accent/15 border border-accent/40 rounded-2xl p-4 mb-4 text-center shadow-md animate-fade-up">
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-accent uppercase tracking-wider mb-1">
              <QrCode className="w-4 h-4" />
              <MapPin className="w-3.5 h-3.5" />
              <span>{activeQrLocation.name}</span>
            </div>
            <p className="text-base font-display font-bold text-foreground">
              "{activeQrLocation.stickerText}"
            </p>
            <span className="inline-block mt-1 text-[11px] text-muted-foreground">
              Anonieme peiling voor fractie Lijst van Andel
            </span>
          </div>
        )}

        {/* Top Header & Progress */}
        <div className="w-full mb-6 text-center">
          <div className="flex items-center justify-between gap-2 mb-2 px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              {isAnonymousQr ? "Locatie Peiling" : "Fractie Peilingen"}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              {isFinalFeedbackStep ? "Afronding" : `${currentIndex + 1} van de ${stellingen.length}`}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden border border-border/50">
            <div
              className="h-full bg-accent transition-all duration-300 ease-out"
              style={{
                width: isFinalFeedbackStep
                  ? "100%"
                  : `${((currentIndex + 1) / (stellingen.length + 1)) * 100}%`
              }}
            />
          </div>
        </div>

        {/* NEW UNVOTED STELLINGEN NOTIFICATION BANNER */}
        {hasAlreadySubmitted && !isAnonymousQr && (
          <div className="w-full bg-accent/10 border border-accent/30 text-foreground p-3.5 rounded-2xl text-xs mb-5 flex items-center justify-between gap-3 shadow-xs animate-fade-up">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0 text-accent" />
              <span>Er zijn <strong>{stellingen.length}</strong> nieuwe stelling(en) toegevoegd waarop u nog niet heeft gestemd!</span>
            </div>
          </div>
        )}

        {/* STEP 1: INTERACTIVE SWIPE / SCALE VIEW */}
        {!isFinalFeedbackStep && currentStelling && (
          <div className="w-full flex flex-col items-center">
            
            {/* SWIPE CARD MODE */}
            {currentStelling.type === "swipe" && (
              <div className="w-full flex flex-col items-center">
                {/* Tinder Card Container (Fixed Aspect Ratio) */}
                <div className="relative w-full h-[470px] sm:h-[500px]">
                  <AnimatePresence>
                    {stellingen.slice(currentIndex, currentIndex + 2).reverse().map((stelling) => {
                      const isTop = stelling.id === currentStelling.id;
                      return (
                        <SwipeCard
                          key={stelling.id}
                          stelling={stelling}
                          onSwipe={handleSwipeChoice}
                          isTop={isTop}
                        />
                      );
                    })}
                  </AnimatePresence>
                </div>

                {/* Bottom Interactive Swipe Buttons */}
                <div className="flex items-center justify-center gap-6 mt-6 w-full px-4">
                  <button
                    onClick={() => handleSwipeChoice("oneens")}
                    className="w-16 h-16 rounded-full bg-card border-2 border-rose-500/40 text-rose-600 hover:bg-rose-500/10 active:scale-90 transition-all flex items-center justify-center shadow-lg shadow-rose-500/10 cursor-pointer"
                    title="Oneens (Swipe links)"
                  >
                    <X className="w-8 h-8 stroke-[3]" />
                  </button>

                  <div className="text-center text-xs text-muted-foreground font-medium select-none">
                    Druk op een knop<br />of veeg de kaart
                  </div>

                  <button
                    onClick={() => handleSwipeChoice("eens")}
                    className="w-16 h-16 rounded-full bg-card border-2 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 active:scale-90 transition-all flex items-center justify-center shadow-lg shadow-emerald-500/10 cursor-pointer"
                    title="Eens (Swipe rechts)"
                  >
                    <Check className="w-8 h-8 stroke-[3]" />
                  </button>
                </div>
              </div>
            )}

            {/* SCALE 1-10 MODE */}
            {currentStelling.type === "scale" && (
              <div className="w-full bg-card rounded-3xl border border-border shadow-xl p-6 sm:p-7 flex flex-col space-y-6">
                <div className="relative h-48 w-full rounded-2xl overflow-hidden bg-muted">
                  <img
                    src={currentStelling.imageUrl || "/assets/dorpen-leefbaarheid.jpg"}
                    alt={currentStelling.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/assets/stemmen.jpg";
                    }}
                  />
                  {currentStelling.category && (
                    <div className="absolute top-3 left-3 bg-background/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-accent border border-accent/30">
                      {currentStelling.category}
                    </div>
                  )}
                </div>

                <div>
                  <h2 className="text-xl sm:text-2xl font-display font-bold text-foreground leading-snug">
                    {currentStelling.title}
                  </h2>
                  {currentStelling.description && (
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                      {currentStelling.description}
                    </p>
                  )}
                </div>

                {/* 1-10 Scale Selector */}
                <div className="space-y-4 pt-2 border-t border-border/60">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {currentStelling.scaleMinLabel || "1 - Helemaal oneens"}
                    </span>
                    <span className="text-2xl font-display font-black text-accent">
                      {scaleValue} / 10
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground text-right">
                      {currentStelling.scaleMaxLabel || "10 - Volledig eens"}
                    </span>
                  </div>

                  {/* Range Slider */}
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={scaleValue}
                    onChange={(e) => setScaleValue(parseInt(e.target.value, 10))}
                    className="w-full h-3 bg-muted rounded-lg appearance-none cursor-pointer accent-accent"
                  />

                  {/* 10 Individual Buttons for Touch & Mobile */}
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 pt-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setScaleValue(num)}
                        className={`h-10 rounded-xl text-sm font-bold font-display transition-all border ${
                          scaleValue === num
                            ? "bg-accent text-accent-foreground border-accent shadow-md scale-105"
                            : "bg-card text-muted-foreground border-border hover:border-accent/40"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleScaleChoice}
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-3.5 rounded-full shadow-md mt-2 flex items-center justify-center gap-2 text-base"
                >
                  <span>Volgende vraag</span>
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            )}

            {/* Context Info Below Card */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
              {currentStelling.deadlineDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-accent" />
                  Mening geven kan t/m: <strong className="text-foreground">{currentStelling.deadlineDate}</strong>
                </span>
              )}
              {currentStelling.maxParticipants && (
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-accent" />
                  Max: <strong className="text-foreground">{currentStelling.maxParticipants}</strong>
                </span>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: FINAL REMARKS & FRACTIEVERGADERING FEEDBACK */}
        {isFinalFeedbackStep && (
          <div className="w-full bg-card rounded-3xl border border-border shadow-xl p-6 sm:p-8 space-y-6 animate-fade-up">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-accent/15 text-accent rounded-2xl flex items-center justify-center mx-auto border border-accent/30 shadow-inner">
                <MessageSquare className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-display font-bold text-foreground">
                Heeft u nog een opmerking?
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                Wilt u nog een toelichting, suggestie of persoonlijke ervaring meegeven over een van deze stellingen voor onze fractie?
              </p>
            </div>

            {/* Overview of Selected Answers */}
            <div className="bg-muted/40 rounded-2xl p-4 border border-border/80 space-y-2.5 max-h-48 overflow-y-auto">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Uw gekozen antwoorden:
              </div>
              {stellingen.map((s, idx) => {
                const ans = answers.find((a) => a.stellingId === s.id);
                return (
                  <div key={s.id} className="flex items-center justify-between text-xs py-1 border-b border-border/40 last:border-0">
                    <span className="text-foreground truncate max-w-[200px] font-medium">
                      {idx + 1}. {s.title}
                    </span>
                    {ans?.value === "eens" && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold">
                        Eens
                      </span>
                    )}
                    {ans?.value === "oneens" && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 font-bold">
                        Oneens
                      </span>
                    )}
                    {typeof ans?.value === "number" && (
                      <span className="px-2 py-0.5 rounded-full bg-accent/15 text-accent font-bold">
                        {ans.value} / 10
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Remarks Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground block">
                Opmerking voor de fractie (optioneel)
              </label>
              <Textarea
                placeholder="Laat hier gerust uw toelichting achter. Zo niet, klik dan direct op 'Verzenden'..."
                value={generalFeedback}
                onChange={(e) => setGeneralFeedback(e.target.value)}
                rows={4}
                className="resize-none rounded-xl text-sm"
              />
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <Button
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-3.5 rounded-full shadow-md text-base"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Stemmen verzenden...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Send className="w-4 h-4" />
                    Verzend mijn mening naar de fractie
                  </span>
                )}
              </Button>

              <button
                type="button"
                onClick={() => setCurrentIndex(0)}
                className="text-xs text-muted-foreground hover:text-foreground text-center py-1 transition-colors"
              >
                Stellingen opnieuw langslopen
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
