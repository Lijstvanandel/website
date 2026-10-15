import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Newspaper,
  MapPin,
  Tag,
  Share2,
  Clock,
  Headphones,
  Video,
  Eye,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Globe,
  Radio,
  Building2,
  ShieldAlert
} from "lucide-react";
import { NewsItem } from "@/data/news";
import { NewsCategory } from "@/components/CategoryManager";
import { ShareDialog } from "@/components/ShareDialog";
import { useAuth } from "@/context/AuthContext";

export interface ExternalNewsItem {
  id: string;
  title: string;
  sourceName: string;
  sourceLogo?: string;
  url: string;
  publishedAt?: string;
  summary?: string;
}

function getReadingTime(item: NewsItem): number {
  const text = `${item.title || ""} ${item.description || item.excerpt || ""} ${item.content || ""}`;
  const clean = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const words = clean ? clean.split(/\s+/).length : 0;
  return Math.max(1, Math.ceil(words / 200));
}

function renderSourceLogo(sourceLogo?: string, sourceName?: string) {
  if (sourceLogo && (sourceLogo.startsWith("http://") || sourceLogo.startsWith("https://") || sourceLogo.startsWith("/"))) {
    return (
      <img
        src={sourceLogo}
        alt={sourceName || "Media logo"}
        className="w-5 h-5 object-contain shrink-0"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
    );
  }
  const nameLower = (sourceName || "").toLowerCase();
  if (nameLower.includes("tv") || nameLower.includes("rtv") || sourceLogo === "tv") {
    return <Radio className="w-4 h-4 text-accent shrink-0" />;
  }
  if (nameLower.includes("gemeente") || nameLower.includes("provincie") || sourceLogo === "building") {
    return <Building2 className="w-4 h-4 text-accent shrink-0" />;
  }
  return <Newspaper className="w-4 h-4 text-accent shrink-0" />;
}

export default function Nieuws() {
  const { user, isAuthenticated } = useAuth();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [externalNews, setExternalNews] = useState<ExternalNewsItem[]>([]);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 6;

  const [shareArticle, setShareArticle] = useState<NewsItem | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState<boolean>(false);

  const isAdmin = Boolean(
    isAuthenticated &&
      user &&
      (user.role === "admin" ||
        user.role === "voorzitter" ||
        user.role === "secretaris" ||
        user.role === "penningmeester")
  );

  useEffect(() => {
    fetch("/api/news")
      .then((res) => (res.ok ? res.json().catch(() => []) : []))
      .then((data: NewsItem[]) => {
        if (Array.isArray(data)) setNews(data);
      })
      .catch(console.error);

    fetch("/api/categories")
      .then((res) => (res.ok ? res.json().catch(() => []) : []))
      .then((data: NewsCategory[]) => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch(console.error);

    fetch("/api/external-news")
      .then((res) => (res.ok ? res.json().catch(() => []) : []))
      .then((data: ExternalNewsItem[]) => {
        if (Array.isArray(data)) setExternalNews(data);
      })
      .catch(console.error);
  }, []);

  // When category changes, reset page to 1
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory]);

  const filteredNews =
    selectedCategory === "all"
      ? news
      : news.filter(
          (n) => n.category?.toLowerCase() === selectedCategory.toLowerCase()
        );

  const totalPages = Math.ceil(filteredNews.length / itemsPerPage) || 1;
  const paginatedNews = filteredNews.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    window.scrollTo({ top: 220, behavior: "smooth" });
  };

  return (
    <div className="pt-32 pb-24">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="text-center mb-12 animate-fade-up">
          <div className="text-xs uppercase tracking-[0.3em] text-accent font-semibold mb-2">
            Laatste Updates
          </div>
          <h1 className="text-4xl md:text-6xl font-display text-zinc-950 dark:text-white mb-4">Actueel Nieuws</h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Blijf op de hoogte van onze laatste initiativeren, moties, wijkbezoeken en standpunten in Steenwijkerland.
          </p>
        </div>

        {/* Categorie Filter Knoppen */}
        {categories.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${
                selectedCategory === "all"
                  ? "bg-primary text-primary-foreground shadow-sm scale-105"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              Alle Berichten ({news.length})
            </button>
            {categories.map((cat) => {
              const catName = String(cat?.name || "");
              const count = news.filter(
                (n) => String(n.category || "").toLowerCase() === catName.toLowerCase()
              ).length;
              return (
                <button
                  key={cat.id || catName}
                  onClick={() => setSelectedCategory(catName)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                    String(selectedCategory || "").toLowerCase() === catName.toLowerCase()
                      ? "bg-primary text-primary-foreground shadow-sm scale-105"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: cat.color || "#c6a858" }}
                  />
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Nieuws Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredNews.length === 0 && (
            <div className="col-span-full text-center py-16 text-muted-foreground bg-card rounded-xl border border-border">
              <Newspaper className="w-12 h-12 mx-auto mb-3 opacity-30 text-accent" />
              <p className="text-base font-semibold text-foreground mb-1">Geen berichten gevonden</p>
              <p className="text-xs">Er zijn momenteel geen nieuwsberichten in deze selectie.</p>
            </div>
          )}

          {paginatedNews.map((item, index) => (
            <Link
              to={`/nieuws/${item.id}`}
              key={item.id}
              className="group bg-card rounded-xl border border-border overflow-hidden hover-lift animate-fade-up flex flex-col transition-all hover:border-accent/50"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="aspect-[16/10] bg-muted relative overflow-hidden">
                <img
                  src={item.thumbnailUrl || item.headerUrl || item.image || "/assets/steenwijk-aerial.webp"}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/assets/steenwijk-aerial.webp";
                  }}
                />
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[90%]">
                  <span className="px-2.5 py-1 bg-background/90 backdrop-blur-sm text-foreground text-[11px] font-semibold uppercase tracking-wider rounded-full shadow-sm flex items-center gap-1 border border-border/50">
                    <Tag className="w-2.5 h-2.5 text-accent" />
                    {item.category || "Algemeen"}
                  </span>
                  {(item.isPodcast || item.podcastAudioUrl) && (
                    <span className="px-2.5 py-1 bg-purple-600/95 backdrop-blur-sm text-white text-[11px] font-semibold rounded-full shadow-sm flex items-center gap-1 border border-purple-400/40">
                      <Headphones className="w-2.5 h-2.5" /> Podcast
                      {isAdmin && (
                        <span className="ml-1 pl-1 border-l border-white/40 flex items-center gap-1 text-[10px]" title="Live weergaven (zichtbaar voor beheerder)">
                          <Eye className="w-2.5 h-2.5" /> {item.podcastViews || 0}
                        </span>
                      )}
                    </span>
                  )}
                  {item.videoUrl && (
                    <span className="px-2.5 py-1 bg-blue-600/95 backdrop-blur-sm text-white text-[11px] font-semibold rounded-full shadow-sm flex items-center gap-1 border border-blue-400/40">
                      <Video className="w-2.5 h-2.5" /> Video
                    </span>
                  )}
                  {item.wijkNaam && (
                    <span className="px-2.5 py-1 bg-accent/90 backdrop-blur-sm text-accent-foreground text-[11px] font-semibold rounded-full shadow-sm flex items-center gap-1">
                      <MapPin className="w-2.5 h-2.5" />
                      {item.wijkNaam}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 font-medium">
                  <span>
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleDateString("nl-NL", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : ""}
                  </span>
                  <span className="flex items-center gap-1 text-[11px]">
                    <Clock className="w-3 h-3 text-accent" />
                    {getReadingTime(item)} min
                  </span>
                </div>
                <h3 className="text-xl font-display mb-3 leading-snug group-hover:text-accent transition-colors">
                  {item.title}
                </h3>
                <p className="text-muted-foreground text-sm line-clamp-3 mb-4 flex-1 leading-relaxed">
                  {item.description || item.excerpt}
                </p>

                {(item.authorName || (item.author && item.author !== "Redactie" && item.author !== "Lijst van Andel")) && (
                  <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-3 text-xs mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full overflow-hidden bg-muted shrink-0 border border-accent/30">
                        {item.authorAvatar ? (
                          <img
                            src={item.authorAvatar}
                            alt={item.authorName || item.author}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/assets/silhouette.png";
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-accent/20 text-accent font-semibold text-[10px]">
                            {(item.authorName || item.author || "A").charAt(0)}
                          </div>
                        )}
                      </div>
                      <span className="font-medium text-foreground truncate">
                        {item.authorName || item.author}
                      </span>
                    </div>
                    {item.authorRole && (
                      <span className="text-[11px] text-muted-foreground shrink-0 truncate max-w-[120px]">
                        {item.authorRole}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/60">
                  <span className="inline-flex items-center text-sm font-semibold text-primary group-hover:text-accent transition-colors">
                    Lees meer <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShareArticle(item);
                      setShareDialogOpen(true);
                    }}
                    className="p-1.5 rounded-full text-muted-foreground hover:text-accent hover:bg-accent/15 transition-all"
                    title="Deel dit nieuwsbericht"
                    aria-label="Deel dit nieuwsbericht"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Paginering (per 6) */}
        {totalPages > 1 && (
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border pt-8">
            <div className="text-xs text-muted-foreground font-medium">
              Toont <span className="font-semibold text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span> tot{" "}
              <span className="font-semibold text-foreground">
                {Math.min(currentPage * itemsPerPage, filteredNews.length)}
              </span>{" "}
              van <span className="font-semibold text-foreground">{filteredNews.length}</span> nieuwsberichten
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-border text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Vorige pagina"
                aria-label="Vorige pagina"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`w-9 h-9 text-xs font-semibold rounded-lg transition-all ${
                    currentPage === page
                      ? "bg-primary text-primary-foreground shadow-sm scale-105"
                      : "border border-border text-foreground hover:bg-muted"
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-border text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Volgende pagina"
                aria-label="Volgende pagina"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Sectie: In de Media (Nieuws Extern) */}
        <div className="mt-24 border-t border-border/80 pt-16">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-semibold uppercase tracking-wider mb-3">
              <Globe className="w-3.5 h-3.5" />
              In de Media
            </div>
            <h2 className="text-3xl md:text-4xl font-display text-zinc-950 dark:text-white mb-3">
              Lijst van Andel in het Nieuws
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
              Wat landelijke, regionale en lokale media schrijven over onze partij en initiatieven in Steenwijkerland.
            </p>
            <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>In verband met auteursrecht worden hier geen afbeeldings-thumbnails weergegeven, uitsluitend officiële titels en bronlinks.</span>
            </div>
          </div>

          {externalNews.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-xl border border-border text-muted-foreground text-sm">
              <Globe className="w-10 h-10 mx-auto mb-2 opacity-30 text-accent" />
              <p className="font-semibold text-foreground">Momenteel geen externe media-artikelen beschikbaar.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {externalNews.map((item) => (
                <div
                  key={item.id}
                  className="bg-card rounded-xl border border-border/80 p-6 flex flex-col justify-between hover:border-accent/50 transition-all hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2 bg-muted/60 px-3 py-1 rounded-full border border-border/60">
                        {renderSourceLogo(item.sourceLogo, item.sourceName)}
                        <span className="text-xs font-semibold text-foreground">
                          {item.sourceName}
                        </span>
                      </div>
                      {item.publishedAt && (
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {new Date(item.publishedAt).toLocaleDateString("nl-NL", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          })}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-display text-foreground leading-snug mb-2 hover:text-accent transition-colors">
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {item.title}
                      </a>
                    </h3>

                    {item.summary && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-4">
                        {item.summary}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-border/50 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground font-medium">
                      Origineel bronartikel
                    </span>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary hover:text-primary-foreground text-primary text-xs font-semibold transition-all group"
                    >
                      Lees op {item.sourceName}
                      <ExternalLink className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        title={shareArticle?.title || "Lijst van Andel Nieuws"}
        description={shareArticle?.description || shareArticle?.excerpt}
        url={shareArticle ? `${window.location.origin}/nieuws/${shareArticle.id}` : undefined}
        imageUrl={shareArticle?.thumbnailUrl || shareArticle?.headerUrl || shareArticle?.image}
      />
    </div>
  );
}
