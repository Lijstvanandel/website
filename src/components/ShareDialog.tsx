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
  Instagram
} from "lucide-react";
import { toast } from "sonner";

export interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  url?: string;
}

export function ShareDialog({
  open,
  onOpenChange,
  title,
  description,
  url,
}: ShareDialogProps) {
  const [copied, setCopied] = useState(false);

  // Fallback to current browser location if no specific URL is provided
  const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");
  const encodedUrl = encodeURIComponent(shareUrl);
  const shareText = description ? `${title} — ${description}` : title;
  const encodedTitle = encodeURIComponent(title);
  const encodedText = encodeURIComponent(shareText);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        toast.success("Link gekopieerd naar klembord!");
        setTimeout(() => setCopied(false), 2500);
      } else {
        // Fallback for older browsers / webviews
        const input = document.createElement("input");
        input.value = shareUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
        setCopied(true);
        toast.success("Link gekopieerd naar klembord!");
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      toast.error("Kon link niet automatisch kopiëren.");
    }
  };

  const shareOptions = [
    {
      name: "WhatsApp",
      icon: MessageCircle,
      href: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`,
      bgColor: "bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 border-[#25D366]/30",
      description: "Direct in chat of status",
    },
    {
      name: "Facebook",
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      bgColor: "bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2]/20 border-[#1877F2]/30",
      description: "Tijdlijn of groep",
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
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
      bgColor: "bg-[#229ED9]/10 text-[#229ED9] hover:bg-[#229ED9]/20 border-[#229ED9]/30",
      description: "Kanaal of privéchat",
    },
    {
      name: "Instagram / TikTok",
      icon: Instagram,
      onClick: () => {
        handleCopy();
        toast.info("Link gekopieerd! Plak deze in je Instagram Story of Bio.");
      },
      bgColor: "bg-[#E1306C]/10 text-[#E1306C] hover:bg-[#E1306C]/20 border-[#E1306C]/30",
      description: "Kopieer link voor Story of Bio",
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

        {/* Direct Link Copier */}
        <div className="pt-3 border-t border-border/80 w-full min-w-0">
          <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">
            Directe link naar dit onderdeel:
          </label>
          <div className="flex items-center gap-2 w-full min-w-0">
            <div className="flex-1 min-w-0 px-3 py-2 bg-muted/60 border border-border rounded-md text-xs text-foreground/90 font-mono truncate select-all">
              {shareUrl}
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold transition-all shrink-0 ${
                copied
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Gekopieerd!
                </>
              ) : (
                <>
                  <Link2 className="w-3.5 h-3.5" /> Kopiëren
                </>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
