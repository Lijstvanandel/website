import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Calendar,
  UserCheck,
  Eye,
  MessageSquare,
  Send,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Download,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  User,
  Shield,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CouncilDocument } from "@/types/council";

export interface MemberCouncilTopic {
  id: string;
  title: string;
  description: string;
  meetingDate: string;
  meetingDateDisplay: string;
  meetingTitle: string;
  category: string;
  status?: string;
  assignedTo?: string | null;
  assignedName?: string | null;
  documents: CouncilDocument[];
  memberNotesCount?: number;
  fractieNotesCount?: number;
  hamerstukAfgehandeldAt?: string | null;
  hamerstukAfgehandeldBy?: string | null;
  myFeedback?: {
    id: string;
    note: string;
    documentTitle?: string | null;
    createdAt: string;
  }[];
}

interface MemberCouncilTopicsWidgetProps {
  token: string | null;
  currentUser: any;
}

export function MemberCouncilTopicsWidget({ token, currentUser }: MemberCouncilTopicsWidgetProps) {
  const [topics, setTopics] = useState<MemberCouncilTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAssigned, setFilterAssigned] = useState<string>("all"); // "all" | "assigned" | "unassigned"

  // Active topic for feedback modal
  const [feedbackTopic, setFeedbackTopic] = useState<MemberCouncilTopic | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackDocId, setFeedbackDocId] = useState<string | null>(null);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Document Viewer Modal
  const [activeDoc, setActiveDoc] = useState<{ doc: CouncilDocument; topicTitle: string; topicId: string } | null>(null);

  // Expanded topics state
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);

  const fetchTopics = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch("/api/council/member-topics", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error("Kon raadsonderwerpen niet ophalen");
      }
      const data = await res.json();
      setTopics(data.topics || []);
      
      // Auto expand first topic if available
      if (data.topics && data.topics.length > 0 && !expandedTopicId) {
        setExpandedTopicId(data.topics[0].id);
      }
    } catch (err: any) {
      console.warn("Fout bij laden van raadsonderwerpen voor leden:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, [token]);

  // Submit Feedback Handler
  const handleSubmitFeedback = async () => {
    if (!token || !feedbackTopic || !feedbackText.trim()) return;
    setSubmittingFeedback(true);
    try {
      let docTitle: string | null = null;
      if (feedbackDocId) {
        const found = feedbackTopic.documents.find((d) => d.id === feedbackDocId);
        docTitle = found ? found.title : null;
      }

      const res = await fetch(`/api/council/topics/${feedbackTopic.id}/member-feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          feedback: feedbackText.trim(),
          documentId: feedbackDocId || null,
          documentTitle: docTitle,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kon feedback niet verzenden");

      toast.success(data.message || "Uw inbreng is direct naar de fractie gestuurd!");
      setFeedbackText("");
      setFeedbackDocId(null);
      setFeedbackTopic(null);

      // Refresh list
      await fetchTopics();
    } catch (err: any) {
      toast.error(err.message || "Fout bij verzenden inbreng");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const filteredTopics = useMemo(() => {
    return topics.filter((t) => {
      if (filterAssigned === "assigned" && !t.assignedTo) return false;
      if (filterAssigned === "unassigned" && t.assignedTo) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchDesc = (t.description || "").toLowerCase().includes(q);
        const matchAssigned = (t.assignedName || "").toLowerCase().includes(q);
        const matchDocs = t.documents.some((d) => d.title.toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchAssigned && !matchDocs) return false;
      }
      return true;
    });
  }, [topics, searchQuery, filterAssigned]);

  if (loading) {
    return (
      <div className="bg-card rounded-2xl p-6 border border-border space-y-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/20 animate-pulse" />
          <div className="space-y-1.5 flex-1">
            <div className="h-4 bg-muted rounded w-1/3 animate-pulse" />
            <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (topics.length === 0) {
    return null; // Geen actuele onderwerpen beschikbaar
  }

  return (
    <section className="bg-card rounded-2xl p-6 sm:p-8 border border-border/80 shadow-md space-y-6">
      {/* Widget Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-5">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-accent/15 text-accent flex items-center justify-center shrink-0 border border-accent/30 shadow-sm">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-accent/20 text-accent border border-accent/40">
                Raad & Fractie
              </span>
              <span className="text-xs text-muted-foreground">
                {topics.length} actuele raadsonderwerpen
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-display font-bold text-foreground">
              Actuele Onderwerpen in de Gemeenteraad
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 max-w-2xl leading-relaxed">
              Bekijk welke onderwerpen op de raadsagenda staan, wie van onze (burger)raadsleden het dossier behandelt, bekijk de officiële documenten en geef uw directe inbreng of feedback aan de fractie.
            </p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Zoek in actuele onderwerpen, raadsleden of stukken..."
            className="text-xs pl-9 bg-muted/20"
          />
          <FileText className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
        </div>
        <div className="w-full sm:w-48 shrink-0">
          <Select value={filterAssigned} onValueChange={setFilterAssigned}>
            <SelectTrigger className="text-xs bg-muted/20">
              <SelectValue placeholder="Toewijzing" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="all">Alle onderwerpen ({topics.length})</SelectItem>
              <SelectItem value="assigned">Opgepakt door fractielid</SelectItem>
              <SelectItem value="unassigned">Nog onverdeeld</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Topics List */}
      <div className="space-y-3">
        {filteredTopics.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-muted/20 border border-dashed border-border text-xs text-muted-foreground">
            Geen raadsonderwerpen gevonden die voldoen aan uw zoekopdracht.
          </div>
        ) : (
          filteredTopics.map((topic) => {
            const isExpanded = expandedTopicId === topic.id;
            const hasAssigned = !!topic.assignedTo;
            const isHamerstuk = topic.status === "hamerstuk_afgehandeld";
            const myFeedbackCount = topic.myFeedback?.length || 0;

            return (
              <div
                key={topic.id}
                className={`rounded-xl border transition-all overflow-hidden ${
                  isExpanded
                    ? "bg-card border-accent/40 shadow-sm"
                    : "bg-muted/15 border-border/70 hover:border-accent/30"
                }`}
              >
                {/* Topic Item Header / Summary */}
                <div
                  onClick={() => setExpandedTopicId(isExpanded ? null : topic.id)}
                  className="p-4 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded-full font-bold text-[10.5px] uppercase tracking-wider bg-accent/10 text-accent border border-accent/20">
                        {topic.category || "Oordeelvorming"}
                      </span>
                      {topic.meetingDateDisplay && (
                        <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                          <Calendar className="w-3 h-3 text-accent" />
                          {topic.meetingDateDisplay}
                        </span>
                      )}
                      {isHamerstuk && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Hamerstuk
                        </span>
                      )}
                      {myFeedbackCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                          {myFeedbackCount}x uw inbreng geplaatst
                        </span>
                      )}
                    </div>

                    <h3 className="font-display font-bold text-sm sm:text-base text-foreground leading-snug">
                      {topic.title}
                    </h3>

                    {/* Who handles it badge */}
                    <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                      <div className="inline-flex items-center gap-1.5 text-xs">
                        <span className="text-muted-foreground font-medium">Behandeling fractie:</span>
                        {hasAssigned ? (
                          <span className="inline-flex items-center gap-1 font-bold text-foreground bg-accent/15 text-accent px-2.5 py-0.5 rounded-full text-xs border border-accent/30">
                            <UserCheck className="w-3.5 h-3.5" />
                            {topic.assignedName || topic.assignedTo}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic text-xs bg-muted px-2 py-0.5 rounded-full">
                            Nog in fractieberaad (onverdeeld)
                          </span>
                        )}
                      </div>
                      <span className="text-muted-foreground text-xs">• {topic.documents.length} bijlage(n)</span>
                    </div>
                  </div>

                  {/* Actions right */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFeedbackTopic(topic);
                      }}
                      className="h-8 text-xs px-3 border-accent/40 text-accent hover:bg-accent/10 rounded-lg gap-1.5 font-semibold"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Inbreng leveren
                    </Button>

                    <button
                      type="button"
                      className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
                      aria-label="Details openen"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Section: Documents & Existing Feedback */}
                {isExpanded && (
                  <div className="p-4 pt-0 border-t border-border/70 space-y-4 bg-muted/5 mt-2">
                    {topic.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed pt-3">
                        {topic.description}
                      </p>
                    )}

                    {/* Documentenlijst */}
                    <div className="space-y-2 pt-2">
                      <div className="text-xs font-bold text-foreground flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-accent" />
                          Bijbehorende Officiële Stukken ({topic.documents.length})
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Klik op 'Inzien' voor de beveiligde PDF-viewer
                        </span>
                      </div>

                      {topic.documents.length === 0 ? (
                        <div className="p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground text-center">
                          Geen losse PDF-bijlagen gekoppeld.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {topic.documents.map((doc) => (
                            <div
                              key={doc.id}
                              className="p-2.5 rounded-lg border border-border/80 bg-background flex items-center justify-between gap-2 shadow-2xs hover:border-accent/40 transition-colors"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold text-foreground truncate" title={doc.title}>
                                  {doc.title}
                                </div>
                                <span className="text-[10px] text-muted-foreground uppercase font-mono">
                                  {doc.fileType || "PDF"}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setActiveDoc({ doc, topicTitle: topic.title, topicId: topic.id })}
                                  className="h-7 text-[11px] px-2.5 border-accent/40 text-accent hover:bg-accent/10 rounded-md"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  Inzien
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Member's previously submitted feedback on this topic */}
                    {topic.myFeedback && topic.myFeedback.length > 0 && (
                      <div className="pt-2 border-t border-border/60 space-y-2">
                        <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Uw Eerdere Inbreng aan de Fractie ({topic.myFeedback.length})</span>
                        </div>
                        <div className="space-y-2">
                          {topic.myFeedback.map((fb) => (
                            <div
                              key={fb.id}
                              className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                <span className="font-semibold text-foreground">
                                  {fb.documentTitle ? `Bij stuk: ${fb.documentTitle}` : "Algemene inbreng"}
                                </span>
                                <span>
                                  {new Date(fb.createdAt).toLocaleString("nl-NL", {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">
                                {fb.note}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Bottom Action */}
                    <div className="pt-2 flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setFeedbackTopic(topic)}
                        className="text-xs h-8 px-4 rounded-lg bg-accent text-accent-foreground font-semibold"
                      >
                        <Send className="w-3.5 h-3.5 mr-1.5" />
                        Nieuwe inbreng achterlaten over dit onderwerp
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Member Feedback Dialog */}
      {feedbackTopic && (
        <Dialog open={!!feedbackTopic} onOpenChange={(open) => !open && setFeedbackTopic(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-accent/15 text-accent border border-accent/30">
                  Leden Inbreng & Vragen
                </span>
                {feedbackTopic.assignedName && (
                  <span className="text-xs text-muted-foreground">
                    Behandelaar: {feedbackTopic.assignedName}
                  </span>
                )}
              </div>
              <DialogTitle className="text-base sm:text-lg font-display font-bold leading-snug">
                Inbreng leveren: {feedbackTopic.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Uw opmerkingen, lokale ervaringen of vragen worden direct doorgestuurd naar het behandelend (burger)raadslid en zijn zichtbaar in het Raadspaneel van de fractie.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Optional Document linkage */}
              {feedbackTopic.documents.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Koppelen aan specifiek vergaderstuk (optioneel):
                  </label>
                  <Select
                    value={feedbackDocId || "none"}
                    onValueChange={(val) => setFeedbackDocId(val === "none" ? null : val)}
                  >
                    <SelectTrigger className="text-xs bg-muted/20">
                      <SelectValue placeholder="Algemeen over dit agendapunt" />
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                      <SelectItem value="none">Algemeen over dit agendapunt</SelectItem>
                      {feedbackTopic.documents.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Feedback text input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Uw inbreng, vraag of suggestie voor de fractie:
                </label>
                <Textarea
                  rows={5}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Bijv. Als inwoner van dit dorp merk ik dat... Let op de verkeersveiligheid bij punt 2..."
                  className="text-xs bg-muted/20"
                />
              </div>

              <div className="p-3 rounded-xl bg-accent/10 border border-accent/20 text-xs text-muted-foreground flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span>
                  Uw inbreng wordt onder uw naam (<strong>{currentUser?.fullName || currentUser?.username}</strong>) ingediend en direct genotificeerd aan de fractie.
                </span>
              </div>
            </div>

            <DialogFooter className="flex items-center justify-between gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFeedbackTopic(null)}
                disabled={submittingFeedback}
                className="text-xs"
              >
                Annuleren
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={submittingFeedback || !feedbackText.trim()}
                onClick={handleSubmitFeedback}
                className="text-xs bg-accent text-accent-foreground font-semibold"
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                {submittingFeedback ? "Verzenden..." : "Inbreng Versturen"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Document Viewer Modal */}
      {activeDoc && (() => {
        const proxyUrl = `/api/council/document-proxy?url=${encodeURIComponent(activeDoc.doc.url)}`;

        return (
          <Dialog open={!!activeDoc} onOpenChange={(open) => !open && setActiveDoc(null)}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-4 sm:p-6 overflow-hidden">
              <DialogHeader className="border-b border-border pb-3 shrink-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-accent">
                      {activeDoc.topicTitle}
                    </span>
                    <DialogTitle className="text-base sm:text-lg font-display font-bold text-foreground truncate mt-0.5">
                      {activeDoc.doc.title}
                    </DialogTitle>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                    className="text-xs h-8 px-3 border-accent/40 text-accent shrink-0 rounded-lg"
                  >
                    <a href={activeDoc.doc.url} target="_blank" rel="noreferrer" title="Open originele bronlink">
                      <ExternalLink className="w-3.5 h-3.5 mr-1" />
                      Origineel
                    </a>
                  </Button>
                </div>
              </DialogHeader>

              <div className="flex-1 min-h-[350px] bg-muted/30 rounded-xl overflow-hidden border border-border relative flex flex-col mt-3">
                <div className="px-3 py-1.5 bg-background/80 border-b border-border text-[11px] text-muted-foreground flex items-center justify-between">
                  <span className="truncate">Beveiligde viewer • Steenwijkerland Raadsstuk</span>
                  <a
                    href={activeDoc.doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent hover:underline inline-flex items-center gap-1 font-semibold shrink-0 ml-2"
                  >
                    Direct downloaden <Download className="w-3 h-3" />
                  </a>
                </div>
                <iframe
                  src={proxyUrl}
                  className="w-full flex-1 border-0 bg-white"
                  title={activeDoc.doc.title}
                />
              </div>

              <DialogFooter className="pt-3 border-t border-border flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const foundTopic = topics.find((t) => t.id === activeDoc.topicId);
                    if (foundTopic) {
                      setFeedbackDocId(activeDoc.doc.id);
                      setFeedbackTopic(foundTopic);
                      setActiveDoc(null);
                    }
                  }}
                  className="text-xs text-accent border-accent/40 hover:bg-accent/10"
                >
                  <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                  Inbreng leveren bij dit document
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveDoc(null)}
                  className="text-xs"
                >
                  Sluiten
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}
    </section>
  );
}
