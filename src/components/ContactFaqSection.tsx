import { useState, useEffect } from "react";
import { FaqItem } from "@/types/faq";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { HelpCircle, Search, Sparkles, Tag, MessageSquare, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ContactFaqSectionProps {
  onOpenBelafspraak?: () => void;
  onScrollToForm?: () => void;
}

export function ContactFaqSection({
  onOpenBelafspraak,
  onScrollToForm,
}: ContactFaqSectionProps) {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("alle");

  useEffect(() => {
    fetch("/api/faqs")
      .then((res) => (res.ok ? res.json().catch(() => []) : []))
      .then((data: FaqItem[]) => {
        if (Array.isArray(data)) {
          setFaqs(data);
        }
      })
      .catch((err) => {
        console.error("Fout bij ophalen FAQ:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Handle hash scrolling if #faq is present
  useEffect(() => {
    if (window.location.hash === "#faq") {
      const timer = setTimeout(() => {
        const el = document.getElementById("faq");
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, []);

  const categories = Array.from(new Set(faqs.map((f) => f.category))).filter(Boolean);

  const filteredFaqs = faqs.filter((item) => {
    const matchesSearch =
      search === "" ||
      item.question.toLowerCase().includes(search.toLowerCase()) ||
      item.answer.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      selectedCategory === "alle" || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <section id="faq" className="mt-20 pt-16 border-t border-border/80 scroll-mt-24">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 border border-accent/40 rounded-full mb-4 bg-accent/5">
          <HelpCircle className="w-3.5 h-3.5 text-accent" />
          <span className="text-xs uppercase tracking-[0.25em] text-accent font-semibold">
            Veelgestelde vragen
          </span>
        </div>
        <h2 className="font-display text-3xl md:text-5xl text-foreground mb-3">
          Vragen & Antwoorden
        </h2>
        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
          Vind snel een helder antwoord op de meest gestelde vragen over onze standpunten, fractie en werkwijze in Steenwijkerland.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="max-w-3xl mx-auto mb-8 space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoek in veelgestelde vragen..."
            className="pl-10 text-sm rounded-xl h-11 bg-card border-border shadow-xs"
          />
        </div>

        {categories.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory("alle")}
              className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors ${
                selectedCategory === "alle"
                  ? "bg-accent text-accent-foreground font-semibold"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Alle onderwerpen ({faqs.length})
            </button>
            {categories.map((cat) => {
              const count = faqs.filter((f) => f.category === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? "bg-accent text-accent-foreground font-semibold"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* FAQs List */}
      <div className="max-w-3xl mx-auto">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-16 bg-muted/40 animate-pulse rounded-2xl border border-border"
              />
            ))}
          </div>
        ) : filteredFaqs.length === 0 ? (
          <div className="text-center py-12 px-6 bg-card border border-border rounded-2xl">
            <HelpCircle className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="font-display text-lg text-foreground mb-1">Geen resultaten gevonden</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
              We vonden geen antwoord dat past bij uw zoekopdracht. Stel uw vraag gerust rechtstreeks aan onze fractie.
            </p>
            {onScrollToForm && (
              <Button
                onClick={onScrollToForm}
                size="sm"
                variant="outline"
                className="rounded-xl text-xs gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5 text-accent" /> Stel uw vraag
              </Button>
            )}
          </div>
        ) : (
          <Accordion type="single" collapsible className="space-y-3">
            {filteredFaqs.map((faq, index) => (
              <AccordionItem
                key={faq.id}
                value={faq.id}
                className="bg-card border border-border rounded-2xl px-5 transition-colors hover:border-accent/40 data-[state=open]:border-accent/60 data-[state=open]:shadow-sm"
              >
                <AccordionTrigger className="py-4 hover:no-underline text-left group">
                  <div className="flex items-start gap-3.5 pr-2">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-accent/10 text-accent font-mono text-xs font-bold flex items-center justify-center mt-0.5 group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                      {index + 1}
                    </span>
                    <div>
                      <div className="text-[11px] text-accent uppercase tracking-wider font-semibold mb-0.5 flex items-center gap-1.5">
                        <Tag className="w-3 h-3" />
                        {faq.category}
                      </div>
                      <span className="font-display text-base md:text-lg text-foreground group-hover:text-accent transition-colors leading-snug">
                        {faq.question}
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-1 pb-5 text-sm text-foreground/85 leading-relaxed pl-9 border-t border-border/40 whitespace-pre-line">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        {/* Still have questions banner */}
        <div className="mt-10 p-6 md:p-8 bg-secondary/40 border border-border rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="space-y-1 max-w-md">
            <h4 className="font-display text-xl text-foreground">
              Staat uw vraag er niet tussen?
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Onze fractieleden staan altijd klaar om u te woord te staan. Stuur direct een bericht of plan een persoonlijke belafspraak.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
            {onOpenBelafspraak && (
              <Button
                onClick={onOpenBelafspraak}
                variant="outline"
                className="rounded-xl text-xs font-semibold gap-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                Belafspraak inplannen
              </Button>
            )}
            {onScrollToForm && (
              <Button
                onClick={onScrollToForm}
                className="bg-primary hover:bg-primary/90 rounded-xl text-xs font-semibold gap-2"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Bericht sturen
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
