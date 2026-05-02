import { z } from "zod";

/**
 * Form schema for step 2.
 *
 * Editable subset of the Anfrage. We don't validate strictly here —
 * commercial fields like incoterms can be empty, names can have any
 * shape — we just want type-safety on the form values.
 */
export const customerFormSchema = z.object({
  kunde_firma: z.string().nullable().optional(),
  kunde_ansprechpartner: z.string().nullable().optional(),
  kunde_email: z.string().nullable().optional(),
  kundennummer: z.string().nullable().optional(),
  belegnummer: z.string().nullable().optional(),
  datum: z.string().nullable().optional(),
  incoterms: z.string().nullable().optional(),
  zahlungsbedingungen: z.string().nullable().optional(),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;
