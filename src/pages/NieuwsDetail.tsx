import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Share2,
  Facebook,
  Twitter,
  MessageCircle,
  Link2,
  MapPin,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { NewsItem } from "@/data/news";

export default function NieuwsDetail() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    fetch(`/api/news/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          setNotFound(true);
          return null;
        }
        return res.json();
      })
      .then((data: NewsItem | null) => {
        if (data && data.title) {
          setArticle(data);
        } else {
          setNotFound(true);
        }
      })
      .catch((err) => {
        console.error(err);
        setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[70vh] pt-36 pb-24 flex flex-col items-center justify-center text-center px-4">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground text-sm font-medium">Nieuwsbericht laden...</p>
      </div>
    );
  }

  if (notFound || !article) {
    return (
      <div className="min-h-[70vh] pt-36 pb-24 flex flex-col items-center justify-center text-center px-4">
        <div className="max-w-md bg-card border border-border p-8 rounded-2xl shadow-sm">
          <h2 className="text-2xl font-display mb-3">Bericht niet gevonden</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Het opgevraagde nieuwsbericht bestaat niet (meer) of is verplaatst.
          </p>
          <Link
            to="/nieuws"
            className="inline-flex items-center text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors px-5 py-2.5 rounded-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Terug naar nieuwsoverzicht
          </Link>
        </div>
      </div>
    );
  }

  const currentUrl = window.location.href;
  const encodedUrl = encodeURIComponent(currentUrl);
  const encodedTitle = encodeURIComponent(article.title);

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    whatsapp: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`,
  };

  const handleShare = async (platform: string) => {
    if (platform === "copy" || platform === "instagram" || platform === "tiktok") {
      try {
        await navigator.clipboard.writeText(currentUrl);
        toast.success("Link gekopieerd naar klembord!");
      } catch (err) {
        toast.error("Kon link niet kopiëren");
      }
    } else {
      window.open(shareLinks[platform as keyof typeof shareLinks], "_blank", "width=600,height=400");
    }
  };

  const formattedDate = article.createdAt
    ? new Date(article.createdAt).toLocaleDateString("nl-NL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : article.date
    ? new Date(article.date).toLocaleDateString("nl-NL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <div className="pt-24 pb-24 bg-background min-h-screen">
      {/* Header / Hero */}
      <div className="relative w-full h-[50vh] md:h-[60vh] bg-muted">
        {article.headerUrl || article.thumbnailUrl || article.image ? (
          <img
            src={article.headerUrl || article.thumbnailUrl || article.image}
            alt={article.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-primary/10" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      </div>

      <div className="container mx-auto px-6 max-w-4xl -mt-40 relative z-10">
        <Link
          to="/nieuws"
          className="inline-flex items-center text-sm font-semibold text-muted-foreground hover:text-primary transition-colors mb-8 bg-background/80 backdrop-blur px-4 py-2 rounded-full border border-border shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Terug naar overzicht
        </Link>

        <div className="bg-card rounded-2xl border border-border p-8 md:p-12 shadow-sm animate-fade-up">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent/15 text-accent text-xs font-semibold uppercase tracking-wider rounded-full">
              <Tag className="w-3 h-3" />
              {article.category || "Algemeen"}
            </span>

            {article.wijkNaam && (
              <Link
                to={`/wijken-en-kernen/${article.wijkSlug}`}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-secondary text-foreground text-xs font-semibold rounded-full hover:bg-secondary/80 transition-colors border border-border"
                title={`Bekijk alle informatie over ${article.wijkNaam}`}
              >
                <MapPin className="w-3.5 h-3.5 text-accent" /> {article.wijkNaam}
              </Link>
            )}

            {formattedDate && (
              <div className="flex items-center text-sm text-muted-foreground font-medium ml-auto">
                <Calendar className="w-4 h-4 mr-2" />
                {formattedDate}
              </div>
            )}
          </div>

          <h1 className="text-3xl md:text-5xl font-display leading-tight mb-8">
            {article.title}
          </h1>

          <div className="mb-12">
            {(article.description || article.excerpt) && (
              <p className="lead font-medium text-lg md:text-xl text-foreground mb-8 border-l-4 border-accent pl-4 py-1 leading-relaxed bg-accent/5 rounded-r">
                {article.description || article.excerpt}
              </p>
            )}

            {/* Render formatted HTML content or fallback to text */}
            {article.content?.includes("<") ? (
              <div
                className="prose prose-lg dark:prose-invert max-w-none text-foreground/90 leading-relaxed [&_h2]:font-display [&_h2]:text-2xl [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-foreground [&_h3]:font-display [&_h3]:text-xl [&_h3]:text-accent [&_h3]:mt-6 [&_h3]:mb-2 [&_a]:text-accent [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-accent [&_blockquote]:pl-4 [&_blockquote]:italic [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-4"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />
            ) : (
              <div className="whitespace-pre-wrap text-foreground/90 leading-relaxed text-base md:text-lg">
                {article.content}
              </div>
            )}
          </div>

          <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="font-display text-lg flex items-center">
              <Share2 className="w-5 h-5 mr-3 text-accent" /> Deel dit bericht
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleShare("facebook")}
                className="p-3 bg-[#1877F2]/10 text-[#1877F2] rounded-full hover:bg-[#1877F2]/20 transition-colors"
                title="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleShare("twitter")}
                className="p-3 bg-primary/5 text-primary rounded-full hover:bg-primary/10 transition-colors"
                title="X (Twitter)"
              >
                <Twitter className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleShare("whatsapp")}
                className="p-3 bg-[#25D366]/10 text-[#25D366] rounded-full hover:bg-[#25D366]/20 transition-colors"
                title="WhatsApp"
              >
                <MessageCircle className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleShare("instagram")}
                className="p-3 bg-[#E1306C]/10 text-[#E1306C] rounded-full hover:bg-[#E1306C]/20 transition-colors"
                title="Instagram / TikTok (Kopieer link)"
              >
                <span className="font-bold text-sm">IG/TT</span>
              </button>
              <button
                onClick={() => handleShare("copy")}
                className="p-3 bg-muted text-muted-foreground rounded-full hover:bg-muted/80 transition-colors"
                title="Kopieer link"
              >
                <Link2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
