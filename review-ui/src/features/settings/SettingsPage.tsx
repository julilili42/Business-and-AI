import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { ErrorState } from "@/shared/components/feedback/ErrorState";
import { LoadingState } from "@/shared/components/feedback/LoadingState";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { appSettingsSchema, type AppSettings } from "@/shared/schemas/settings";

import { useSaveSettings, useSettings } from "./hooks/useSettings";

/**
 * Settings page.
 *
 * Form state comes from a single zod schema — the same one the API
 * validates against. There's no client-only validation that the server
 * doesn't already enforce.
 */
export function SettingsPage() {
  const { data, isLoading, isError, error } = useSettings();
  const save = useSaveSettings();

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Lade Einstellungen…" />
      </PageContainer>
    );
  }
  if (isError || !data) {
    return (
      <PageContainer>
        <ErrorState error={error ?? "Einstellungen konnten nicht geladen werden."} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <header className="mb-8">
        <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
          Einstellungen<span className="text-brand">.</span>
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Hinterlege Firmendaten, Kontaktinformationen und allgemeine
          Angebotsstandards. Diese Werte werden automatisch in jedes
          Angebots-PDF übernommen.
        </p>
      </header>
      <SettingsForm initial={data} onSave={(s) => save.mutate(s)} saving={save.isPending} />
      {save.isSuccess && (
        <p className="mt-4 text-sm font-semibold text-success">
          Einstellungen gespeichert.
        </p>
      )}
      {save.isError && <ErrorState className="mt-4" error={save.error} />}
    </PageContainer>
  );
}

interface SettingsFormProps {
  initial: AppSettings;
  saving: boolean;
  onSave: (settings: AppSettings) => void;
}

function SettingsForm({ initial, saving, onSave }: SettingsFormProps) {
  const form = useForm<AppSettings>({
    resolver: zodResolver(appSettingsSchema),
    defaultValues: initial,
  });

  useEffect(() => form.reset(initial), [initial, form]);

  return (
    <form
      className="space-y-8"
      onSubmit={form.handleSubmit((values) => onSave(values))}
    >
      <Section title="Firmendaten (Absender)">
        <Grid>
          <Field label="Firmenname">
            <Input {...form.register("company.company_name")} />
          </Field>
          <Field label="Land">
            <Input {...form.register("company.company_country")} />
          </Field>
          <Field label="Straße & Hausnummer">
            <Input {...form.register("company.company_address")} />
          </Field>
          <Field label="PLZ & Ort">
            <Input {...form.register("company.company_zip_city")} />
          </Field>
        </Grid>
      </Section>

      <Section title="Kontaktperson für Angebote">
        <Grid>
          <Field label="Name">
            <Input {...form.register("company.contact_person")} />
          </Field>
          <Field label="Telefon">
            <Input {...form.register("company.contact_phone")} />
          </Field>
          <Field label="E-Mail">
            <Input type="email" {...form.register("company.contact_email")} />
          </Field>
          <Field label="Angebotsgültigkeit (Tage)">
            <Input
              type="number"
              min={1}
              max={365}
              {...form.register("company.validity_days", { valueAsNumber: true })}
            />
          </Field>
        </Grid>
      </Section>

      <Section title="Kommerzielle Standardwerte">
        <Grid>
          <Field label="Lieferbedingung">
            <Input {...form.register("company.delivery_term")} />
          </Field>
          <Field label="Zahlungsbedingung">
            <Input {...form.register("company.payment_term")} />
          </Field>
        </Grid>
      </Section>

      <Section title="Matching">
        <Grid>
          <Field label="Fuzzy-Schwelle (50–100)">
            <Input
              type="number"
              min={50}
              max={100}
              {...form.register("matching.fuzzy_threshold", { valueAsNumber: true })}
            />
          </Field>
          <Field label="Semantische Schwelle (40–100)">
            <Input
              type="number"
              min={40}
              max={100}
              {...form.register("matching.semantic_threshold", { valueAsNumber: true })}
            />
          </Field>
        </Grid>
      </Section>

      <Section title="Workflow">
        <Toggle
          label="PDF nach jeder Änderung automatisch neu generieren"
          checked={form.watch("workflow.auto_refresh_pdf")}
          onCheckedChange={(v) => form.setValue("workflow.auto_refresh_pdf", v)}
        />
        <Toggle
          label="Vor Pipeline-Reset bestätigen"
          checked={form.watch("workflow.confirm_before_reset")}
          onCheckedChange={(v) => form.setValue("workflow.confirm_before_reset", v)}
        />
      </Section>

      <div className="flex items-center gap-3 border-t border-border pt-6">
        <Button variant="primary" type="submit" disabled={saving}>
          <Save className="h-4 w-4" aria-hidden="true" />
          {saving ? "Speichere…" : "Speichern"}
        </Button>
      </div>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5 shadow-card">
      <h2 className="mb-4 font-display text-base font-bold tracking-tight">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-md border border-border bg-surface px-4 py-3 text-sm">
      <span className="font-medium">{label}</span>
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-input"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
      />
    </label>
  );
}
