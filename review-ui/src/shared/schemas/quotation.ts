import { z } from "zod";

import type { components } from "@/shared/api-types";

export type QuotationItem = components["schemas"]["QuotationItemModel"];
export type Quotation = components["schemas"]["QuotationModel"];

export const quotationItemSchema = z
  .object({
    pos_nr: z.number().int(),
    artikel_nr: z.string(),
    bezeichnung: z.string(),
    menge: z.number(),
    einheit: z.string(),
    einzelpreis: z.number(),
    rabatt_prozent: z.number().optional().default(0),
    gesamtpreis: z.number(),
    bemerkung: z.string().default(""),
    basispreis_eur: z.number().default(0),
    margin_eur: z.number().default(0),
    margin_pct: z.number().default(0),
  })
  .passthrough();

export const quotationSchema = z
  .object({
    kunde_firma: z.string().nullable(),
    kunde_ansprechpartner: z.string().nullable(),
    kunde_email: z.string().nullable(),
    kundennummer: z.string().nullable(),
    belegnummer: z.string().nullable(),
    incoterms: z.string().nullable(),
    zahlungsbedingungen: z.string().nullable(),
    items: z.array(quotationItemSchema),
    gesamtsumme: z.number(),
    waehrung: z.string().default("EUR"),
    warnungen: z.array(z.string()).default([]),
  })
  .passthrough();

/**
 * Manual override applied between pricing and rendering.
 *
 * Backend persists these as opaque dicts (see api/response_models.py); the
 * discriminated union here is the UI's contract and what the form layer
 * validates against.
 */
export const manualOverrideSchema = z.union([
  z.object({
    target: z.literal("pos"),
    pos_nr: z.number().int(),
    mode: z.literal("unit_price_eur"),
    unit_price_eur: z.number(),
  }),

  z.object({
    target: z.literal("pos"),
    pos_nr: z.number().int(),
    mode: z.literal("total_price_eur"),
    total_price_eur: z.number(),
  }),

  z.object({
    target: z.literal("pos"),
    pos_nr: z.number().int(),
    mode: z.literal("discount_pct"),
    discount_pct: z.number(),
  }),

  z.object({
    target: z.literal("pos"),
    pos_nr: z.number().int(),
    mode: z.literal("disable_volume_discount"),
  }),

  z.object({
    target: z.literal("artikel"),
    artikel_nr: z.string(),
    mode: z.literal("unit_price_eur"),
    unit_price_eur: z.number(),
  }),

  z.object({
    target: z.literal("artikel"),
    artikel_nr: z.string(),
    mode: z.literal("total_price_eur"),
    total_price_eur: z.number(),
  }),

  z.object({
    target: z.literal("artikel"),
    artikel_nr: z.string(),
    mode: z.literal("discount_pct"),
    discount_pct: z.number(),
  }),
]);

export type ManualOverride = z.infer<typeof manualOverrideSchema>;
