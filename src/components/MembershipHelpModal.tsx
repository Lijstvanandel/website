import React, { useState } from "react";
import { Copy, Check, HelpCircle, X, Mail, Phone, ArrowRight, Banknote, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface MembershipHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankIban?: string;
  bankAccountName?: string;
  amount?: number;
  customTitle?: string;
  customText?: string;
}

export function MembershipHelpModal({
  isOpen,
  onClose,
  bankIban = "NL91 RBRB 0823 4192 11",
  bankAccountName = "Lijst van Andel",
  amount = 25.0,
  customTitle,
  customText,
}: MembershipHelpModalProps) {
  const [copiedIban, setCopiedIban] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  if (!isOpen) return null;

  const formattedAmount = `€${amount.toFixed(2).replace(".", ",")}`;
  const title = customTitle || "Lukt het lid worden niet?";

  // Replace variables if present in customText, otherwise use standard text
  const defaultText = `U kunt ook ${formattedAmount} overmaken naar ons rekeningnummer ${bankIban} (t.n.v. ${bankAccountName}) en in de omschrijving uw e-mailadres en telefoonnummer zetten. Wij nemen dan contact met u op.`;
  const displayText = customText
    ? customText
        .replace(/{iban}/g, bankIban)
        .replace(/{accountName}/g, bankAccountName)
        .replace(/{amount}/g, formattedAmount)
    : defaultText;

  const handleCopy = (text: string, type: "iban" | "amount" | "ref") => {
    navigator.clipboard.writeText(text);
    if (type === "iban") {
      setCopiedIban(true);
      setTimeout(() => setCopiedIban(false), 2500);
      toast.success("IBAN gekopieerd naar klembord!", {
        description: bankIban,
      });
    } else if (type === "amount") {
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2500);
      toast.success("Bedrag gekopieerd naar klembord!", {
        description: formattedAmount,
      });
    } else {
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2500);
      toast.success("Omschrijvinginstructie gekopieerd!");
    }
  };

  return (
    <div
      id="membership-help-modal-overlay"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="membership-help-modal-card"
        className="bg-card text-card-foreground rounded-2xl border border-border shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-modal-title"
      >
        {/* Header with Warm Accent */}
        <div className="bg-primary/10 border-b border-primary/20 p-5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h3 id="help-modal-title" className="text-lg font-bold font-display text-foreground">
                {title}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Geen probleem, u kunt uw contributie ook eenvoudig handmatig overmaken
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted/80 transition-colors"
            aria-label="Sluiten"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Main instruction message */}
          <div className="bg-muted/40 rounded-xl p-4 border border-border/80 text-sm leading-relaxed text-foreground">
            <p className="font-medium text-foreground">{displayText}</p>
          </div>

          {/* Structured Bank Details Card with 1-click Copy */}
          <div className="space-y-2.5">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Betaalgegevens voor uw bankieren-app:
            </span>

            {/* IBAN */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-border shadow-2xs hover:border-primary/40 transition-colors">
              <div className="space-y-0.5 min-w-0 pr-2">
                <span className="text-[11px] font-medium text-muted-foreground block">Rekeningnummer (IBAN)</span>
                <span className="font-mono font-bold text-sm text-foreground tracking-wide select-all block truncate">
                  {bankIban}
                </span>
                <span className="text-[11px] text-muted-foreground block">t.n.v. {bankAccountName}</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleCopy(bankIban.replace(/\s+/g, ""), "iban")}
                className="h-8 px-3 text-xs gap-1.5 shrink-0 bg-primary/5 hover:bg-primary/15 border-primary/20 text-primary font-semibold"
              >
                {copiedIban ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Gekopieerd
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Kopieer IBAN
                  </>
                )}
              </Button>
            </div>

            {/* Amount */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-border shadow-2xs">
              <div>
                <span className="text-[11px] font-medium text-muted-foreground block">Bedrag</span>
                <span className="font-bold text-base text-foreground font-mono">{formattedAmount}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(amount.toFixed(2), "amount")}
                className="h-8 px-3 text-xs gap-1.5 shrink-0 text-muted-foreground hover:text-foreground"
              >
                {copiedAmount ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Gekopieerd
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Kopieer Bedrag
                  </>
                )}
              </Button>
            </div>

            {/* Omschrijving */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-950 dark:text-amber-100 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-900 dark:text-amber-200">
                <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                Omschrijving bij de overboeking:
              </div>
              <p className="text-[12px] text-amber-900/90 dark:text-amber-200/90 leading-normal">
                Vermeld in de betalingsomschrijving:{" "}
                <span className="font-semibold underline">uw e-mailadres en telefoonnummer</span>. Onze penningmeester
                activeert uw lidmaatschap en stuurt u een bevestiging.
              </p>
            </div>
          </div>

          {/* Quick contact alternatives */}
          <div className="pt-2 border-t border-border/60 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-muted-foreground">Liever direct contact?</span>
            <div className="flex items-center gap-2">
              <a
                href="mailto:info@lijstvanandel.nl?subject=Lid%20worden%20Lijst%20van%20Andel"
                className="text-primary hover:underline flex items-center gap-1 font-semibold"
              >
                <Mail className="w-3.5 h-3.5" /> E-mail sturen
              </a>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-muted/30 border-t border-border flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Ik probeer het formulier opnieuw
          </Button>

          <Button
            type="button"
            onClick={() => {
              handleCopy(
                `Bedrag: ${formattedAmount}\nIBAN: ${bankIban}\nt.n.v. ${bankAccountName}\nOmschrijving: [Uw e-mailadres en telefoonnummer]`,
                "ref"
              );
              onClose();
            }}
            className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4"
          >
            {copiedRef ? "Gegevens Gekopieerd!" : "Kopieer Alles & Sluiten"}
          </Button>
        </div>
      </div>
    </div>
  );
}
