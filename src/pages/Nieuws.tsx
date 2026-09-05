import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Newspaper, MapPin, Tag, Share2, Clock } from "lucide-react";
import { NewsItem } from "@/data/news";
import { NewsCategory } from "@/components/CategoryManager";
import { ShareDialog } from "@/components/ShareDialog";

function getReadingTime(item: NewsItem): number {
  const text = `${item.title || ""} ${item.description || item.excerpt || ""} ${item.content || ""}`;
  const clean = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const words = clean ? clean.split(/\s+/).length : 0;
  return Math.max(1, Math.ceil(words / 200));
}

export default function Nieuws() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [shareArticle, setShareArticle] = useState<NewsItem | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState<boolean>(false);

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
  }, []);

  const filteredNews =
    selectedCategory === "all"
      ? news
      : news.filter(
          (n) => n.category?.toLowerCase() === selectedCategory.toLowerCase()
        );

  return (
    <div className="pt-32 pb-24">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="text-center mb-12 animate-fade-up">
          <div className="text-xs uppercase tracking-[0.3em] text-accent font-semibold mb-2">
            Laatste Updates
          </div>
          <h1 className="text-4xl md:text-6xl font-display text-primary mb-4">Actueel Nieuws</h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Blijf op de hoogte van onze laatste initiatieven, moties, wijkbezoeken en standpunten in Steenwijkerland.
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
              const count = news.filter(
                (n) => n.category?.toLowerCase() === cat.name.toLowerCase()
              ).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                    selectedCategory.toLowerCase() === cat.name.toLowerCase()
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

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredNews.length === 0 && (
            <div className="col-span-full text-center py-16 text-muted-foreground bg-card rounded-xl border border-border">
              <Newspaper className="w-12 h-12 mx-auto mb-3 opacity-30 text-accent" />
              <p className="text-base font-semibold text-foreground mb-1">Geen berichten gevonden</p>
              <p className="text-xs">Er zijn momenteel geen nieuwsberichten in deze selectie.</p>
            </div>
          )}

          {filteredNews.map((item, index) => (
            <Link
              to={`/nieuws/${item.id}`}
              key={item.id}
              className="group bg-card rounded-xl border border-border overflow-hidden hover-lift animate-fade-up flex flex-col transition-all hover:border-accent/50"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="aspect-[16/10] bg-muted relative overflow-hidden">
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted/50">
                    <Newspaper className="w-12 h-12 opacity-20" />
                  </div>
                )}
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[85%]">
                  <span className="px-2.5 py-1 bg-background/90 backdrop-blur-sm text-foreground text-[11px] font-semibold uppercase tracking-wider rounded-full shadow-sm flex items-center gap-1 border border-border/50">
                    <Tag className="w-2.5 h-2.5 text-accent" />
                    {item.category || "Algemeen"}
                  </span>
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

                {/* Optioneel: Auteur / (Burger)raadslid snippet */}
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
      </div>

      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        title={shareArticle?.title || "Lijst van Andel Nieuws"}
        description={shareArticle?.description || shareArticle?.excerpt}
        url={shareArticle ? `${window.location.origin}/nieuws/${shareArticle.id}` : undefined}
      />
    </div>
  );
}
