import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin } from "lucide-react";
import { BUURTKAART_PATHS, BuurtPath } from "@/data/buurtkaartPaths";

const OUTER_MASK_PATH =
  "M915 1433L-53 1433L-53 -133L915 -133zM441 881L445 884L456 899L458 901L459 900L464 906L468 905L490 886L513 885L518 880L523 878L558 853L575 850L579 859L582 854L589 848L602 843L610 842L612 838L614 838L620 832L625 833L625 831L631 826L630 822L634 818L639 817L647 811L655 803L659 793L658 788L665 784L664 783L661 785L659 780L650 747L643 733L624 681L608 644L608 641L610 635L616 629L623 625L635 623L661 615L672 605L678 604L686 588L702 573L717 556L717 554L727 540L693 493L685 487L682 488L667 469L661 463L650 456L654 455L623 419L620 408L608 395L599 399L572 416L559 422L555 429L552 431L521 430L510 435L513 450L520 461L515 465L510 466L501 476L496 477L479 489L469 470L444 476L429 485L417 471L414 472L412 470L410 461L406 455L407 454L398 441L394 429L394 422L391 422L375 427L369 434L370 443L368 445L355 434L346 439L335 439L327 443L326 444L332 447L332 449L322 449L320 451L321 454L323 454L326 457L321 458L323 468L317 471L307 480L305 487L300 492L290 495L287 498L286 504L284 506L280 507L278 510L264 514L261 516L257 523L253 523L247 519L241 518L237 513L228 514L227 510L224 507L222 511L212 510L207 511L205 513L203 507L195 511L194 510L196 504L192 500L192 498L184 492L177 493L171 485L171 483L165 485L156 491L135 509L150 537L169 554L169 562L183 559L194 559L196 561L202 560L204 562L214 561L218 564L230 568L252 586L258 589L266 599L279 609L284 616L288 618L297 618L321 644L331 668L341 698L349 729L363 738L368 748L367 755L373 756L382 769L382 781L378 788L375 789L364 801L359 800L353 807L354 808L337 824L335 830L338 838L345 840L346 836L348 836L366 843L378 844L382 847L385 846L391 849L411 869L432 874L440 880z";

const slugify = (s: string) =>
  s.toLowerCase().replace(/[,]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export const HeroBuurtkaart: React.FC = () => {
  const [isInteractive, setIsInteractive] = useState(false);
  const [hoveredName, setHoveredName] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleActivate = () => {
    if (!isInteractive) {
      setIsInteractive(true);
    }
  };

  const handleWijkClick = (slug: string) => {
    navigate(`/wijken-en-kernen/${slugify(slug)}`);
  };

  return (
    <div
      className="relative w-full h-full min-h-[460px] lg:min-h-[520px] xl:min-h-[580px] rounded-xl overflow-hidden group select-none transition-all"
      onMouseEnter={handleActivate}
      onTouchStart={handleActivate}
      onFocus={handleActivate}
    >
      {/* Dynamic interactive Leaflet map (loaded only on hover/interaction for SEO) */}
      {isInteractive ? (
        <iframe
          src="/maps/buurtkaart-hero.html"
          title="Interactieve buurtkaart Steenwijkerland met alle 43 wijken en kernen"
          className="w-full h-full block border-0 animate-fade-in"
          style={{ background: "transparent" }}
          loading="eager"
        />
      ) : (
        /* Static SEO-friendly Folium map representation (initial load) */
        <div
          className="folium-map leaflet-container leaflet-touch leaflet-fade-anim leaflet-grab leaflet-touch-drag leaflet-touch-zoom w-full h-full relative cursor-pointer"
          id="map_0a1492a009545e0880401bb18576ecce"
          tabIndex={0}
          style={{ outline: "none", background: "transparent" }}
          role="region"
          aria-label="Kaart van Steenwijkerland met alle wijken en kernen"
        >
          <div className="leaflet-pane leaflet-map-pane w-full h-full" style={{ transform: "translate3d(0px, 0px, 0px)" }}>
            <div className="leaflet-pane leaflet-tile-pane" />
            <div className="leaflet-pane leaflet-overlay-pane w-full h-full flex items-center justify-center">
              <svg
                pointerEvents="auto"
                className="leaflet-zoom-animated w-full h-full object-contain filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)]"
                viewBox="100 370 650 550"
                preserveAspectRatio="xMidYMid meet"
                aria-label="Overzichtskaart van de wijken en dorpen in Gemeente Steenwijkerland"
              >
                <title>Buurtkaart Gemeente Steenwijkerland - Lijst van Andel</title>
                <desc>
                  Kaart met alle 43 wijken en kernen van Steenwijkerland: Steenwijk, Blokzijl, Giethoorn, Vollenhove,
                  Oldemarkt, Tuk, Willemsoord, Kuinre, Wanneperveen, Sint Jansklooster en omgeving.
                </desc>
                <g>
                  {/* Outer boundary mask */}
                  <path
                    stroke="none"
                    strokeOpacity={1}
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="transparent"
                    fillOpacity={0}
                    fillRule="evenodd"
                    d={OUTER_MASK_PATH}
                  />

                  {/* 42 individual neighborhoods in Steenwijkerland */}
                  {BUURTKAART_PATHS.map((buurt: BuurtPath) => {
                    const isCurrentHover = hoveredName === buurt.name;
                    return (
                      <path
                        key={buurt.id}
                        id={`wijk-${buurt.id}`}
                        d={buurt.d}
                        stroke="#D4AF37"
                        strokeWidth={isCurrentHover ? 3 : buurt.weight}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="#D4AF37"
                        fillOpacity={isCurrentHover ? 0.45 : buurt.opacity}
                        fillRule="evenodd"
                        className="leaflet-interactive transition-all duration-200 cursor-pointer"
                        onMouseEnter={() => setHoveredName(buurt.name)}
                        onMouseLeave={() => setHoveredName(null)}
                        onClick={() => handleWijkClick(buurt.slug)}
                        tabIndex={0}
                        role="button"
                        aria-label={`Bekijk wijk ${buurt.name}`}
                      >
                        <title>{buurt.name}</title>
                      </path>
                    );
                  })}
                </g>
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Floating status & interaction prompt badge */}
      <div className="absolute top-3 right-3 z-20 pointer-events-none flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-twente-black/85 border border-accent/40 text-accent text-xs font-medium backdrop-blur-md shadow-lg transition-opacity duration-300">
        <MapPin className="w-3.5 h-3.5 text-accent animate-pulse" />
        <span className="font-sans">
          {hoveredName ? hoveredName : isInteractive ? "Interactieve wijkkaart" : "Beweeg over de kaart"}
        </span>
      </div>

      {/* Hover tooltip in static mode */}
      {!isInteractive && hoveredName && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none px-4 py-2 rounded-lg bg-twente-black/90 border border-accent text-foreground text-xs font-semibold backdrop-blur shadow-xl animate-fade-in flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
          <span>{hoveredName}</span>
          <span className="text-[10px] text-muted-foreground ml-1">· Klik om te bekijken</span>
        </div>
      )}
    </div>
  );
};

export default HeroBuurtkaart;
