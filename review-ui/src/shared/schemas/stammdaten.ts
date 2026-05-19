import { z } from "zod";

import type { components } from "@/shared/api-types";

/**
 * One row from the stammdaten table — trimmed shape returned by
 * `GET /api/stammdaten/search`. Type comes from the OpenAPI schema;
 * the Zod schema below is kept for any future runtime validation.
 */
export type StammdatenRow = components["schemas"]["StammdatenHit"];

export const stammdatenRowSchema = z
  .object({
    artikel_nr: z.string(),
    bezeichnung: z.string(),
    werkstoff: z.string().nullable().optional(),
    abmessungen: z.string().nullable().optional(),
    einheit: z.string().default("ST"),
    basispreis_eur: z.number().default(0),
    preis_min_eur: z.number().default(0),
    preis_max_eur: z.number().default(0),
    n_offers: z.number().int().default(0),
    sales_group: z.string().nullable().optional(),
    material_group: z.string().nullable().optional(),
    score: z.number().default(1),
  })
  .passthrough();
