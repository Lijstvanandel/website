import React from "react";
import { Phone, Mail, Instagram, Facebook, Linkedin, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export interface FractielidItem {
  id: string;
  name: string;
  role: string;
  type: string;
  bio?: string;
  speerpunten?: string[];
  email?: string;
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  socials?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
  };
  imgUrl?: string;
  linkedUserId?: string | null;
  linkedUsername?: string | null;
}

interface FractielidWidgetProps {
  lid: FractielidItem;
  videoCount?: number;
  onPlanBelafspraak?: (lid: FractielidItem) => void;
  showVideoButton?: boolean;
  className?: string;
}

export const FractielidWidget: React.FC<FractielidWidgetProps> = ({
  lid,
  videoCount,
  onPlanBelafspraak,
  showVideoButton = true,
  className = "",
}) => {
  return (
    <article
      id={`fractielid-${lid.id}`}
      className={`group relative bg-card border border-border overflow-hidden hover-lift flex flex-col rounded-sm shadow-sm ${className}`}
    >
      <div className="absolute top-3 left-3 z-10 px-3 py-1 bg-twente-black/80 backdrop-blur border border-accent text-[10px] uppercase tracking-widest text-accent font-semibold rounded-sm">
        {lid.role}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] md:grid-cols-[180px_1fr] lg:grid-cols-[220px_1fr]">
        <div className="aspect-[4/5] overflow-hidden bg-muted flex items-center justify-center">
          {lid.imgUrl ? (
            <img
              src={lid.imgUrl}
              alt={lid.name}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="text-muted-foreground text-xs uppercase tracking-wider">Geen foto</div>
          )}
        </div>

        <div className="p-5 md:p-6 flex flex-col justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-accent mb-1 font-medium">{lid.type}</div>
            <h3 className="font-display text-2xl sm:text-3xl mb-3 text-foreground">{lid.name}</h3>
            {lid.bio && <p className="text-sm text-muted-foreground leading-relaxed mb-4">{lid.bio}</p>}

            {lid.speerpunten && lid.speerpunten.length > 0 && (
              <ul className="space-y-1.5 mb-4">
                {lid.speerpunten.map((s: string) => (
                  <li key={s} className="flex items-start gap-2 text-xs text-foreground/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            )}

            {lid.email && (
              <a
                href={`mailto:${lid.email}`}
                className="inline-flex items-center gap-2 text-xs text-accent hover:text-accent/80 mb-3 break-all font-medium"
              >
                <Mail className="w-3.5 h-3.5 shrink-0" />
                {lid.email}
              </a>
            )}

            {lid.socials && (lid.socials.instagram || lid.socials.facebook || lid.socials.linkedin) && (
              <div className="flex items-center gap-2 mb-4">
                {lid.socials?.instagram && (
                  <a
                    href={lid.socials.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Instagram van ${lid.name}`}
                    className="w-8 h-8 flex items-center justify-center border border-accent/40 text-accent hover:bg-accent hover:text-accent-foreground transition-colors rounded-sm"
                  >
                    <Instagram className="w-4 h-4" />
                  </a>
                )}
                {lid.socials?.facebook && (
                  <a
                    href={lid.socials.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Facebook van ${lid.name}`}
                    className="w-8 h-8 flex items-center justify-center border border-accent/40 text-accent hover:bg-accent hover:text-accent-foreground transition-colors rounded-sm"
                  >
                    <Facebook className="w-4 h-4" />
                  </a>
                )}
                {lid.socials?.linkedin && (
                  <a
                    href={lid.socials.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`LinkedIn van ${lid.name}`}
                    className="w-8 h-8 flex items-center justify-center border border-accent/40 text-accent hover:bg-accent hover:text-accent-foreground transition-colors rounded-sm"
                  >
                    <Linkedin className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Knoppen naast elkaar in plaats van onder elkaar */}
          <div className="mt-4 pt-4 border-t border-border/60 flex flex-row items-center gap-2 w-full">
            {onPlanBelafspraak && (
              <Button
                id={`btn-belafspraak-${lid.id}`}
                onClick={() => onPlanBelafspraak(lid)}
                variant="outline"
                size="sm"
                className="flex-1 w-full border-accent text-accent hover:bg-accent hover:text-accent-foreground uppercase tracking-wider text-[11px] sm:text-xs font-semibold px-2 sm:px-3 py-2 h-9 inline-flex items-center justify-center whitespace-nowrap min-w-0"
              >
                <Phone className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                <span className="truncate">Belafspraak inplannen</span>
              </Button>
            )}

            {showVideoButton && (
              <Button
                asChild
                id={`btn-videos-${lid.id}`}
                size="sm"
                className="flex-1 w-full bg-primary hover:bg-primary/90 text-primary-foreground uppercase tracking-wider text-[11px] sm:text-xs font-semibold shadow-sm px-2 sm:px-3 py-2 h-9 inline-flex items-center justify-center whitespace-nowrap min-w-0"
              >
                <Link to={`/fractie/${lid.id}/videos`} className="inline-flex items-center justify-center w-full">
                  <Video className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                  <span className="truncate">
                    Bekijk video's{typeof videoCount === "number" && videoCount > 0 ? ` (${videoCount})` : ""}
                  </span>
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};
