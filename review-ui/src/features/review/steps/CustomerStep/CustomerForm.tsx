import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { useReviewUiStore } from "@/features/review/stores/reviewUiStore";
import type { Anfrage } from "@/shared/schemas/anfrage";

import { useSaveAndRegenerate } from "../../hooks/useReviewMutations";
import { customerFormSchema, type CustomerFormValues } from "./schemas";

interface CustomerFormProps {
  reviewId: string;
  anfrage: Anfrage;
}

/**
 * Customer header + commercial terms form.
 *
 * Edits are committed on **blur** rather than on every keystroke —
 * a price/PDF rebuild is expensive enough that per-keystroke commits
 * would make the UI feel sluggish. react-hook-form takes care of
 * controlled input wiring; the actual save delegates to the same
 * `saveAndRegenerate` mutation as the positions step.
 */
export function CustomerForm({ reviewId, anfrage }: CustomerFormProps) {
  const trackChange = useReviewUiStore((s) => s.trackChange);
  const saveAndRegenerate = useSaveAndRegenerate(reviewId);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: pickCustomerFields(anfrage),
  });

  // Keep form values in sync with upstream changes (e.g. another step
  // saved Anfrage edits and we re-rendered from a fresh detail).
  useEffect(() => {
    form.reset(pickCustomerFields(anfrage));
  }, [anfrage, form]);

  const commitField = (field: keyof CustomerFormValues) => {
    const fieldPath = field;
    trackChange(fieldPath);

    const next: Anfrage = {
      ...anfrage,
      ...form.getValues(),
    };
    if (
      JSON.stringify(pickCustomerFields(next)) ===
      JSON.stringify(pickCustomerFields(anfrage))
    ) {
      return; // nothing changed
    }
    saveAndRegenerate.mutate({ anfrage: next });
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="section-label mb-2">Kundendaten prüfen</h2>
        {saveAndRegenerate.isPending && (
          <span className="text-xs font-semibold text-info">
            PDF wird neu berechnet…
          </span>
        )}
      </div>

      <div className="rounded-lg border border-border bg-surface p-5 shadow-card">
        <h3 className="mb-4 font-display text-base font-bold tracking-tight">
          Kunde &amp; Anfrage-Header
        </h3>
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2">
          <Field label="Firma">
            <Input
              {...form.register("kunde_firma")}
              onBlur={() => commitField("kunde_firma")}
              placeholder="z. B. Musterfirma GmbH"
            />
          </Field>
          <Field label="Ansprechpartner">
            <Input
              {...form.register("kunde_ansprechpartner")}
              onBlur={() => commitField("kunde_ansprechpartner")}
              placeholder="z. B. Frau Müller"
            />
          </Field>
          <Field label="E-Mail">
            <Input
              type="email"
              {...form.register("kunde_email")}
              onBlur={() => commitField("kunde_email")}
              placeholder="kontakt@firma.de"
            />
          </Field>
          <Field label="Kunden-Nr.">
            <Input
              {...form.register("kundennummer")}
              onBlur={() => commitField("kundennummer")}
              placeholder="z. B. 1234"
            />
          </Field>
          <Field label="Anfrage / Beleg-Nr.">
            <Input
              {...form.register("belegnummer")}
              onBlur={() => commitField("belegnummer")}
              placeholder="z. B. ANF-2024-001"
            />
          </Field>
          <Field label="Datum">
            <Input
              {...form.register("datum")}
              onBlur={() => commitField("datum")}
              placeholder="z. B. 15.03.2024"
            />
          </Field>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-5 shadow-card">
        <h3 className="mb-4 font-display text-base font-bold tracking-tight">
          Kommerzielle Bedingungen
        </h3>
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2">
          <Field label="Lieferbedingung / Incoterms">
            <Input
              {...form.register("incoterms")}
              onBlur={() => commitField("incoterms")}
              placeholder="z. B. EXW Werk"
            />
          </Field>
          <Field label="Zahlungsbedingung">
            <Input
              {...form.register("zahlungsbedingungen")}
              onBlur={() => commitField("zahlungsbedingungen")}
              placeholder="z. B. 30 Tage netto"
            />
          </Field>
        </div>
      </div>
    </section>
  );
}

function pickCustomerFields(a: Anfrage): CustomerFormValues {
  return {
    kunde_firma: a.kunde_firma ?? "",
    kunde_ansprechpartner: a.kunde_ansprechpartner ?? "",
    kunde_email: a.kunde_email ?? "",
    kundennummer: a.kundennummer ?? "",
    belegnummer: a.belegnummer ?? "",
    datum: a.datum ?? "",
    incoterms: a.incoterms ?? "",
    zahlungsbedingungen: a.zahlungsbedingungen ?? "",
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
