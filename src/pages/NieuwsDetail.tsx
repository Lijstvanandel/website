import { useParams, Link, Navigate } from "react-router-dom";
import { ArrowLeft, Facebook, Instagram, Linkedin, Twitter, Calendar as CalIcon } from "lucide-react";
import { news } from "@/data/news";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";

const NieuwsDetail = () => {
  const { id } = useParams();
  const item = news.find(n => n.id === id);
  if (!item) return <Navigate to="/nieuws" replace />;

  const url = typeof window !== "undefined" ? window.location.href : "";
  const text = encodeURIComponent(item.title);
  const shares = [
    { icon: Facebook, label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
    { icon: Twitter, label: "X", href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${text}` },
    { icon: Linkedin, label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` },
    { icon: Instagram, label: "Instagram", href: `https://www.instagram.com/` },
  ];

  return (
    <article className="container py-16 md:py-24 max-w-3xl">
      <Link to="/nieuws" className="text-xs uppercase tracking-widest text-accent inline-flex items-center gap-2 mb-8 hover:gap-3 transition-all">
        <ArrowLeft className="w-3 h-3" /> Terug naar nieuws
      </Link>

      <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-accent mb-4">
        <span>{item.category}</span>
        <span className="text-muted-foreground flex items-center gap-1">
          <CalIcon className="w-3 h-3" /> {format(parseISO(item.date), "d MMMM yyyy", { locale: nl })}
        </span>
        <span className="text-muted-foreground">· {item.author}</span>
      </div>

      <h1 className="font-display text-5xl md:text-6xl mb-8 border-gold-line pb-5 leading-[1]">{item.title}</h1>

      <img src={item.image} alt={item.title} className="w-full aspect-[16/9] object-cover mb-8 border border-accent/20" />

      <p className="text-lg text-foreground/85 leading-relaxed mb-6">{item.excerpt}</p>
      <p className="text-base text-muted-foreground leading-relaxed mb-12 whitespace-pre-line">{item.content}</p>

      <div className="border-t border-accent/20 pt-6">
        <div className="text-xs uppercase tracking-widest text-accent mb-3">Deel dit bericht</div>
        <div className="flex gap-2">
          {shares.map(s => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Delen via ${s.label}`}
              className="w-10 h-10 inline-flex items-center justify-center border border-accent/40 text-accent hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <s.icon className="w-4 h-4" />
            </a>
          ))}
        </div>
      </div>
    </article>
  );
};

export default NieuwsDetail;
