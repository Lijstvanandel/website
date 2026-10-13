import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Share2,
  Facebook,
  Twitter,
  MessageCircle,
  Send,
  Link2,
  Check,
  ExternalLink,
  Instagram,
  Linkedin,
  Mail,
  Copy
} from "lucide-react";
import { toast } from "sonner";

export interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  url?: string;
  imageUrl?: string;
}

export function toCanonicalShareUrl(rawUrl?: string): string {
  if (!rawUrl && typeof window === "undefined") return "https://lijstvanandel.nl";
  const urlToParse = rawUrl || (typeof window !== "undefined" ? window.location.href : "https://lijstvanandel.nl");
  try {
    const parsed = new URL(urlToParse, typeof window !== "undefined" ? window.location.origin : "https://lijstvanandel.nl");
    const host = parsed.hostname.toLowerCase();
    const isLocal = host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0";
    
    // In local development, social crawlers need the canonical public domain
    if (isLocal) {
      return `https://lijstvanandel.nl${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    return parsed.href;
  } catch {
    return rawUrl || "https://lijstvanandel.nl";
  }
}

export function ShareDialog({
  open,
  onOpenChange,
  title,
  description,
  url,
  imageUrl,
}: ShareDialogProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  // Normalize URL to public canonical domain
  const shareUrl = toCanonicalShareUrl(url);
  const encodedUrl = encodeURIComponent(shareUrl);
  const shareText = description ? `${title} — ${description}` : title;
  const encodedTitle = encodeURIComponent(title);
  const fullMessage = `${title}${description ? `\n\n${description}` : ""}\n\n${shareUrl}`;
  const encodedFullMessage = encodeURIComponent(fullMessage);

  // Resolved thumbnail image for preview card
  const previewThumbnail = imageUrl || "/assets/news-kopwijzer.jpg";

  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const handleNativeShare = async () => {
    if (!canNativeShare) return;
    try {
      await navigator.share({
        title,
        text: description ? `${title}\n\n${description}` : title,
        url: shareUrl,
      });
      onOpenChange(false);
    } catch (_err) {
      // User cancelled share dialog
    }
  };

  const handleCopyLinkOnly = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const input = document.createElement("input");
        input.value = shareUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }
      setCopiedLink(true);
      toast.success("Link gekopieerd naar klembord!");
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      toast.error("Kon link niet automatisch kopiëren.");
    }
  };

  const handleCopyFullMessage = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(fullMessage);
      } else {
        const input = document.createElement("textarea");
        input.value = fullMessage;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }
      setCopiedMessage(true);
      toast.success("Compleet bericht met titel, tekst en link gekopieerd!");
      setTimeout(() => setCopiedMessage(false), 2500);
    } catch {
      toast.error("Kon bericht niet kopiëren.");
    }
  };

  const shareOptions = [
    {
      name: "WhatsApp",
      icon: MessageCircle,
      // Formatting text with bold title + description + link ensures the user never loses the thumbnail, title and excerpt
      href: `https://api.whatsapp.com/send?text=${encodedFullMessage}`,
      bgColor: "bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 border-[#25D366]/30",
      description: "Direct in chat met titel, tekst en preview",
    },
    {
      name: "Facebook",
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      bgColor: "bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2]/20 border-[#1877F2]/30",
      description: "Tijdlijn of groep",
    },
    {
      name: "LinkedIn",
      icon: Linkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      bgColor: "bg-[#0A66C2]/10 text-[#0A66C2] hover:bg-[#0A66C2]/20 border-[#0A66C2]/30",
      description: "Zakelijk netwerk & tijdlijn",
    },
    {
      name: "X (Twitter)",
      icon: Twitter,
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      bgColor: "bg-foreground/10 text-foreground hover:bg-foreground/20 border-border",
      description: "Bericht op X",
    },
    {
      name: "Telegram",
      icon: Send,
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(shareText)}`,
      bgColor: "bg-[#229ED9]/10 text-[#229ED9] hover:bg-[#229ED9]/20 border-[#229ED9]/30",
      description: "Kanaal of privéchat",
    },
    {
      name: "E-mail",
      icon: Mail,
      href: `mailto:?subject=${encodedTitle}&body=${encodedFullMessage}`,
      bgColor: "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/30",
      description: "Verstuur per e-mail",
    },
    {
      name: "Instagram / TikTok",
      icon: Instagram,
      onClick: () => {
        handleCopyFullMessage();
        toast.info("Bericht en link gekopieerd! Plak deze in je Instagram Story of Bio.");
      },
      bgColor: "bg-[#E1306C]/10 text-[#E1306C] hover:bg-[#E1306C]/20 border-[#E1306C]/30",
      description: "Kopieer voor Story of Bio",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-lg p-5 sm:p-6 overflow-hidden">
        <DialogHeader className="text-left space-y-1.5">
          <div className="flex items-center gap-2 text-accent text-xs font-semibold uppercase tracking-wider">
            <Share2 className="w-4 h-4" /> Deel met je netwerk
          </div>
          <DialogTitle className="font-display text-xl leading-snug break-words">
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed break-words">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Visual Link Preview Card (Thumbnail, Title, Description, Domain) */}
        <div className="my-1 p-3 rounded-xl bg-card border border-border shadow-xs flex items-center gap-3">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-muted shrink-0 border border-border/80">
            <img
              src={previewThumbnail}
              alt={title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/assets/logo.png";
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-semibold text-accent uppercase tracking-wider block mb-0.5">
              lijstvanandel.nl
            </span>
            <div className="text-xs font-semibold text-foreground line-clamp-1 leading-tight">
              {title}
            </div>
            {description && (
              <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Social Buttons Grid - Always contained with min-w-0 and responsive columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 py-3 w-full">
          {shareOptions.map((opt) => {
            const Icon = opt.icon;
            if (opt.onClick) {
              return (
                <button
                  key={opt.name}
                  type="button"
                  onClick={opt.onClick}
                  className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all w-full min-w-0 ${opt.bgColor}`}
                >
                  <div className="p-2 rounded-full bg-background/80 shadow-xs shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="text-xs font-semibold leading-tight truncate">{opt.name}</div>
                    <div className="text-[10px] opacity-80 mt-0.5 truncate">{opt.description}</div>
                  </div>
                </button>
              );
            }

            return (
              <a
                key={opt.name}
                href={opt.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onOpenChange(false)}
                className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all w-full min-w-0 ${opt.bgColor}`}
              >
                <div className="p-2 rounded-full bg-background/80 shadow-xs shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="text-xs font-semibold leading-tight flex items-center gap-1">
                    <span className="truncate">{opt.name}</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-60 shrink-0" />
                  </div>
                  <div className="text-[10px] opacity-80 mt-0.5 truncate">{opt.description}</div>
                </div>
              </a>
            );
          })}
        </div>

        {/* Native Mobile Share Button when supported by browser / OS */}
        {canNativeShare && (
          <button
            type="button"
            onClick={handleNativeShare}
            className="w-full my-1.5 py-2.5 px-4 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-lg text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <Share2 className="w-4 h-4" /> Open mobiele deelopties (WhatsApp, Berichten, etc.)
          </button>
        )}

        {/* Direct Link & Full Message Copier */}
        <div className="pt-3 border-t border-border/80 w-full min-w-0 space-y-2.5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-medium text-muted-foreground block">
                Directe link:
              </label>
              <button
                type="button"
                onClick={handleCopyFullMessage}
                className="text-[11px] font-semibold text-accent hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedMessage ? "Berichttekst gekopieerd!" : "Kopieer compleet bericht"}</span>
              </button>
            </div>
            <div className="flex items-center gap-2 w-full min-w-0">
              <div className="flex-1 min-w-0 px-3 py-2 bg-muted/60 border border-border rounded-md text-xs text-foreground/90 font-mono truncate select-all">
                {shareUrl}
              </div>
              <button
                type="button"
                onClick={handleCopyLinkOnly}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  copiedLink
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
                }`}
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Gekopieerd!
                  </>
                ) : (
                  <>
                    <Link2 className="w-3.5 h-3.5" /> Link kopiëren
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
