import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { 
  Mail, 
  Instagram, 
  Facebook, 
  Linkedin, 
  FileText, 
  Download, 
  ExternalLink, 
  ShieldCheck, 
  Gavel, 
  Settings, 
  FileCheck2,
  Calendar,
  HardDrive,
  Eye
} from "lucide-react";
import placeholder from "@/assets/silhouette.png";
import sammyImg from "@/assets/sammy.png";
import stefImg from "@/assets/stef-mars.jpg";
import { useAuth } from "@/context/AuthContext";
import { safeJson } from "@/lib/api";
import { BestuurDocumentViewer, BestuurDocViewerItem } from "@/components/BestuurDocumentViewer";
import { getSafeDocumentUrl } from "@/lib/documentUrl";

export interface BestuurslidItem {
  id: string;
  naam: string;
  voornaam?: string;
  rol: string;
  img: string;
  bio: string;
  email?: string;
  socials?: {
    instagram?: string;
    facebook?: string;
    linkedin?: string;
  };
}

export interface OrganisatieDoc {
  id: string;
  titel: string;
  beschrijving?: string;
  category?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  datum?: string;
  href?: string;
}

export interface BestuurData {
  partyName?: string;
  boardTitle?: string;
  boardSubtitle?: string;
  pageIntro?: string;
  status?: string;
  chairman?: {
    roleTitle?: string;
    name?: string;
    description?: string;
    bio?: string;
    email?: string;
    img?: string;
    socials?: { instagram?: string; facebook?: string; linkedin?: string };
  };
  secretary?: {
    roleTitle?: string;
    name?: string;
    description?: string;
    bio?: string;
    email?: string;
    img?: string;
    socials?: { instagram?: string; facebook?: string; linkedin?: string };
  };
  treasurer?: {
    roleTitle?: string;
    name?: string;
    description?: string;
    bio?: string;
    email?: string;
    img?: string;
    socials?: { instagram?: string; facebook?: string; linkedin?: string };
  };
  additionalMembers?: Array<{
    id: string;
    roleTitle?: string;
    name?: string;
    description?: string;
    bio?: string;
    email?: string;
    img?: string;
    socials?: { instagram?: string; facebook?: string; linkedin?: string };
  }>;
  organisatieDocs?: OrganisatieDoc[];
}

const defaultDocs: OrganisatieDoc[] = [
  { 
    id: "doc-statuten", 
    titel: "Statuten", 
    beschrijving: "Officiële verenigingsstatuten conform de Wet bestuur en toezicht rechtspersonen (WBTR).",
    category: "Statutair",
    fileName: "statuten_lijstvanandel.pdf",
    fileUrl: "/api/document/view?file=statuten_lijstvanandel.pdf",
    fileSize: "1.2 MB",
    datum: "2026-01-15"
  },
  { 
    id: "doc-huishoudelijk", 
    titel: "Huishoudelijk Reglement", 
    beschrijving: "Interne werkwijzen, rechten van leden, contributiebepalingen en vergaderordes.",
    category: "Reglement",
    fileName: "huishoudelijk_reglement.pdf",
    fileUrl: "/api/document/view?file=huishoudelijk_reglement.pdf",
    fileSize: "850 KB",
    datum: "2026-02-01"
  },
  { 
    id: "doc-integriteit", 
    titel: "Integriteitscode", 
    beschrijving: "Gedragscode en integriteitsprotocol voor bestuursleden, fractieleden en kandidaten.",
    category: "Integriteit",
    fileName: "integriteitscode_lijstvanandel.pdf",
    fileUrl: "/api/document/view?file=integriteitscode_lijstvanandel.pdf",
    fileSize: "420 KB",
    datum: "2026-02-20"
  },
  { 
    id: "doc-bestuursreglement", 
    titel: "Bestuursreglement", 
    beschrijving: "Bevoegdhedenverdeling, besluitvorming, volmachten en protocol tegenstrijdig belang.",
    category: "Bestuurlijk",
    fileName: "bestuursreglement.pdf",
    fileUrl: "/api/document/view?file=bestuursreglement.pdf",
    fileSize: "620 KB",
    datum: "2026-03-05"
  },
  { 
    id: "doc-kandidaatstelling", 
    titel: "Kandidaatstellingsreglement", 
    beschrijving: "Procedure, selectiecriteria en profielschetsen voor de kieslijst gemeenteraadsverkiezingen.",
    category: "Verkiezingen",
    fileName: "kandidaatstellingsreglement.pdf",
    fileUrl: "/api/document/view?file=kandidaatstellingsreglement.pdf",
    fileSize: "510 KB",
    datum: "2026-04-10"
  },
];

const Bestuur = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [boardData, setBoardData] = useState<BestuurData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedViewerDoc, setSelectedViewerDoc] = useState<BestuurDocViewerItem | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const handleOpenDocViewer = (doc: OrganisatieDoc) => {
    let resolvedUrl = getSafeDocumentUrl(doc.fileUrl, doc.fileName, doc.href);
    if (!resolvedUrl && doc.fileName) {
      resolvedUrl = `/api/document/view?file=${encodeURIComponent(doc.fileName)}`;
    }
    if (!resolvedUrl && (doc.id === "doc-statuten" || doc.titel?.toLowerCase().includes("statut"))) {
      resolvedUrl = "/api/document/view?file=statuten_lijstvanandel.pdf";
    }

    setSelectedViewerDoc({
      id: doc.id,
      titel: doc.titel,
      beschrijving: doc.beschrijving,
      category: doc.category,
      fileUrl: resolvedUrl || doc.fileUrl,
      fileName: doc.fileName || (doc.titel ? `${doc.titel.toLowerCase().replace(/\s+/g, "_")}.pdf` : "document.pdf"),
      fileSize: doc.fileSize,
      datum: doc.datum,
      href: doc.href,
    });
    setIsViewerOpen(true);
  };

  const canManage = user?.role === "admin" || 
                    user?.role === "voorzitter" || 
                    user?.role === "secretaris" || 
                    user?.role === "penningmeester" || 
                    user?.role === "bestuur";

  useEffect(() => {
    const fetchBoardData = async () => {
      try {
        const res = await fetch("/api/public/bestuur");
        if (res.ok) {
          const data = await safeJson(res, null);
          if (data) {
            setBoardData(data);

            const docParam = searchParams.get("doc");
            if (docParam) {
              const allDocs = (data.organisatieDocs && data.organisatieDocs.length > 0)
                ? data.organisatieDocs
                : defaultDocs;
              const matched = allDocs.find((d: OrganisatieDoc) => 
                d.id === docParam || 
                d.titel.toLowerCase().includes(docParam.toLowerCase()) ||
                (docParam.toLowerCase().includes("statut") && d.titel.toLowerCase().includes("statut"))
              );
              if (matched) {
                handleOpenDocViewer(matched);
              }
            }
          }
        }
      } catch (err) {
        console.error("Fout bij ophalen bestuursgegevens:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBoardData();
  }, [searchParams]);

  // Build members list dynamically
  const members: BestuurslidItem[] = [];

  // Chairman
  if (boardData?.chairman) {
    const c = boardData.chairman;
    members.push({
      id: "voorzitter",
      naam: c.name || "Sammy van Andel",
      voornaam: c.name?.split(" ")[0] || "Sammy",
      rol: c.roleTitle || "Partijvoorzitter",
      img: c.img || sammyImg,
      bio: c.bio || c.description || "Voorzitter van het bestuur van Lijst van Andel. Bewaakt koers, samenhang en verbinding tussen bestuur en fractie.",
      email: c.email || "voorzitter@lijstvanandel.nl",
      socials: c.socials || { instagram: "", facebook: "", linkedin: "" }
    });
  } else {
    members.push({
      id: "voorzitter",
      naam: "Sammy van Andel",
      voornaam: "Sammy",
      rol: "Partijvoorzitter",
      img: sammyImg,
      bio: "Voorzitter van het bestuur van Lijst van Andel. Bewaakt koers, samenhang en verbinding tussen bestuur en fractie.",
      email: "voorzitter@lijstvanandel.nl",
      socials: { instagram: "#", facebook: "#", linkedin: "#" }
    });
  }

  // Secretary
  if (boardData?.secretary) {
    const s = boardData.secretary;
    members.push({
      id: "secretaris",
      naam: s.name || "Anja ter Horst",
      voornaam: s.name?.split(" ")[0] || "Anja",
      rol: s.roleTitle || "Secretaris",
      img: s.img || placeholder,
      bio: s.bio || s.description || "Bestuurslid van Lijst van Andel. Betrokken bij organisatie, leden en lokale verankering van de partij.",
      email: s.email || "secretariaat@lijstvanandel.nl",
      socials: s.socials || { instagram: "", facebook: "", linkedin: "" }
    });
  } else {
    members.push({
      id: "secretaris",
      naam: "Anja ter Horst",
      voornaam: "Anja",
      rol: "Secretaris",
      img: placeholder,
      bio: "Bestuurslid van Lijst van Andel. Betrokken bij organisatie, leden en lokale verankering van de partij.",
      email: "secretariaat@lijstvanandel.nl",
      socials: { instagram: "#", facebook: "#", linkedin: "#" }
    });
  }

  // Treasurer
  if (boardData?.treasurer) {
    const t = boardData.treasurer;
    members.push({
      id: "penningmeester",
      naam: t.name || "Stef Mars",
      voornaam: t.name?.split(" ")[0] || "Stef",
      rol: t.roleTitle || "Penningmeester",
      img: t.img || stefImg,
      bio: t.bio || t.description || "Bestuurslid van Lijst van Andel. Met een nuchtere blik en oog voor detail draagt hij bij aan een gezonde partijorganisatie.",
      email: t.email || "penningmeester@lijstvanandel.nl",
      socials: t.socials || { instagram: "", facebook: "", linkedin: "" }
    });
  } else {
    members.push({
      id: "penningmeester",
      naam: "Stef Mars",
      voornaam: "Stef",
      rol: "Penningmeester",
      img: stefImg,
      bio: "Bestuurslid van Lijst van Andel. Met een nuchtere blik en oog voor detail draagt hij bij aan een gezonde partijorganisatie.",
      email: "penningmeester@lijstvanandel.nl",
      socials: { instagram: "#", facebook: "#", linkedin: "#" }
    });
  }

  // Additional members
  if (boardData?.additionalMembers && Array.isArray(boardData.additionalMembers)) {
    boardData.additionalMembers.forEach((m, idx) => {
      members.push({
        id: m.id || `extra-lid-${idx}`,
        naam: m.name || "Bestuurslid",
        voornaam: m.name?.split(" ")[0] || "",
        rol: m.roleTitle || "Algemeen bestuurslid",
        img: m.img || placeholder,
        bio: m.bio || m.description || "Betrokken bij verenigingszaken, communicatie en het contact met inwoners in Steenwijkerland.",
        email: m.email || "bestuur@lijstvanandel.nl",
        socials: m.socials || { instagram: "", facebook: "", linkedin: "" }
      });
    });
  }

  const docs = (boardData?.organisatieDocs && boardData.organisatieDocs.length > 0)
    ? boardData.organisatieDocs
    : defaultDocs;

  const pageTitle = boardData?.boardTitle || "Bestuur";
  const pageIntro = boardData?.pageIntro || boardData?.boardSubtitle || "Het bestuur bewaakt de koers van Lijst van Andel, zorgt voor een gezonde organisatie en vormt de schakel tussen leden, fractie en samenleving.";

  return (
    <div className="container py-16 md:py-24">
      {/* Admin / Chairman Quick Management Bar */}
      {canManage && (
        <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-amber-800 dark:text-amber-300">
            <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">Beheerders- / Bestuurstoegang actief:</span>{" "}
              U kunt de samenstelling van het bestuur, biografieën en organisatie-documenten direct aanpassen.
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/admin?tab=voorzitter"
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium flex items-center gap-1.5 transition-colors"
            >
              <Gavel className="w-3.5 h-3.5" />
              <span>Voorzitterspaneel</span>
            </Link>
            <Link
              to="/admin?tab=bestuur"
              className="px-3 py-1.5 bg-card hover:bg-muted border border-border text-foreground rounded-lg font-medium flex items-center gap-1.5 transition-colors"
            >
              <Settings className="w-3.5 h-3.5 text-accent" />
              <span>Beheerderspaneel</span>
            </Link>
          </div>
        </div>
      )}

      <div className="max-w-3xl mb-16">
        <div className="text-xs uppercase tracking-[0.3em] text-accent mb-3">Onze partij</div>
        <h1 className="font-display text-6xl md:text-7xl mb-6 border-gold-line pb-5">{pageTitle}</h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          {pageIntro}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Bestuursleden Grid */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {members.map((p) => (
            <article
              key={p.id}
              className="group relative bg-card border border-border rounded-xl overflow-hidden hover-lift flex flex-col shadow-sm"
            >
              <div className="absolute top-3 left-3 z-10 px-3 py-1 bg-twente-black/85 backdrop-blur border border-accent/70 text-[10px] uppercase tracking-widest text-accent font-semibold rounded-md shadow-sm">
                {p.rol}
              </div>
              <div className="aspect-[4/5] overflow-hidden bg-muted relative">
                <img
                  src={p.img || placeholder}
                  alt={`${p.naam} - ${p.rol}`}
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = placeholder;
                  }}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="p-5 md:p-6 flex flex-col flex-1">
                <div className="text-[10px] uppercase tracking-widest text-accent mb-1 font-semibold">{p.rol}</div>
                <h3 className="font-display text-2xl mb-3 text-foreground">{p.naam}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">{p.bio}</p>

                {p.email ? (
                  <a
                    href={`mailto:${p.email}`}
                    className="flex items-center gap-2 text-xs text-accent hover:text-accent/80 mb-4 break-all font-medium transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    {p.email}
                  </a>
                ) : p.voornaam && p.voornaam !== "?" ? (
                  <a
                    href={`mailto:${p.voornaam.toLowerCase()}@lijstvanandel.nl`}
                    className="flex items-center gap-2 text-xs text-accent hover:text-accent/80 mb-4 break-all font-medium transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    {p.voornaam.toLowerCase()}@lijstvanandel.nl
                  </a>
                ) : (
                  <a
                    href="mailto:bestuur@lijstvanandel.nl"
                    className="flex items-center gap-2 text-xs text-accent hover:text-accent/80 mb-4 break-all font-medium transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    bestuur@lijstvanandel.nl
                  </a>
                )}

                {/* Social links */}
                <div className="flex items-center gap-2 mt-auto pt-2 border-t border-border/50">
                  {p.socials?.instagram ? (
                    <a
                      href={p.socials.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Instagram van ${p.naam}`}
                      className="w-8 h-8 rounded-lg flex items-center justify-center border border-accent/40 text-accent hover:bg-accent hover:text-accent-foreground transition-all"
                    >
                      <Instagram className="w-4 h-4" />
                    </a>
                  ) : null}
                  {p.socials?.facebook ? (
                    <a
                      href={p.socials.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Facebook van ${p.naam}`}
                      className="w-8 h-8 rounded-lg flex items-center justify-center border border-accent/40 text-accent hover:bg-accent hover:text-accent-foreground transition-all"
                    >
                      <Facebook className="w-4 h-4" />
                    </a>
                  ) : null}
                  {p.socials?.linkedin ? (
                    <a
                      href={p.socials.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`LinkedIn van ${p.naam}`}
                      className="w-8 h-8 rounded-lg flex items-center justify-center border border-accent/40 text-accent hover:bg-accent hover:text-accent-foreground transition-all"
                    >
                      <Linkedin className="w-4 h-4" />
                    </a>
                  ) : null}
                  <span className="text-[11px] text-muted-foreground ml-auto flex items-center gap-1">
                    <FileCheck2 className="w-3 h-3 text-accent" /> Lijst van Andel
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Organisatie-informatie / Documenten Sidebar */}
        <aside className="bg-card border border-accent/30 rounded-xl p-6 md:p-8 h-fit lg:sticky lg:top-32 shadow-sm space-y-6">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-accent mb-2 font-semibold">Documenten</div>
            <h2 className="font-display text-2xl border-gold-line pb-3">Organisatie-informatie</h2>
            <p className="text-xs text-muted-foreground mt-2">
              Statutaire kaders, verenigingsreglementen en gedragscodes van Lijst van Andel.
            </p>
          </div>

          <div className="space-y-2.5">
            {docs.map((doc) => {
              const targetUrl = getSafeDocumentUrl(doc.fileUrl, doc.fileName, doc.href);
              const hasDownload = Boolean(
                doc.fileUrl ||
                (doc.fileName && doc.fileName.toLowerCase().endsWith(".pdf")) ||
                (doc.href && doc.href !== "#")
              );

              return (
                <div
                  key={doc.id || doc.titel}
                  className="group rounded-lg border border-border/80 hover:border-accent/60 bg-background/50 hover:bg-accent/5 p-3.5 transition-all cursor-pointer"
                  onClick={() => handleOpenDocViewer(doc)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-accent/10 border border-accent/30 flex items-center justify-center text-accent shrink-0 mt-0.5">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-medium text-sm text-foreground group-hover:text-accent transition-colors leading-snug flex items-center gap-1.5">
                          <span>{doc.titel}</span>
                        </div>
                        {doc.beschrijving && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                            {doc.beschrijving}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                          {doc.category && (
                            <span className="px-1.5 py-0.5 rounded bg-muted font-medium border border-border/60">
                              {doc.category}
                            </span>
                          )}
                          {doc.fileSize && (
                            <span className="flex items-center gap-1">
                              <HardDrive className="w-3 h-3 text-accent" /> {doc.fileSize}
                            </span>
                          )}
                          {doc.datum && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {doc.datum}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleOpenDocViewer(doc)}
                        className="p-2 rounded-md bg-accent/10 text-accent hover:bg-accent hover:text-accent-foreground transition-all cursor-pointer"
                        title={`Bekijk ${doc.titel} in PDF-viewer`}
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {hasDownload && targetUrl ? (
                        <a
                          href={targetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={doc.fileName || `${doc.titel}.pdf`}
                          className="p-2 rounded-md bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all"
                          title={`Download ${doc.titel}`}
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      ) : (
                        <span className="text-[10px] text-muted-foreground px-2 py-1 rounded bg-muted/60">
                          Binnenkort
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3.5 rounded-lg bg-muted/30 border border-border/60 text-xs text-muted-foreground space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-accent" />
              <span>Transparante Verenigingsstructuur</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Alle reglementen zijn getoetst aan de Wet bestuur en toezicht rechtspersonen (WBTR) en vastgesteld door de Algemene Ledenvergadering.
            </p>
          </div>
        </aside>
      </div>

      {/* PDF Document Viewer Modal */}
      <BestuurDocumentViewer
        document={selectedViewerDoc}
        isOpen={isViewerOpen}
        onClose={() => {
          setIsViewerOpen(false);
          setSelectedViewerDoc(null);
        }}
      />
    </div>
  );
};

export default Bestuur;
