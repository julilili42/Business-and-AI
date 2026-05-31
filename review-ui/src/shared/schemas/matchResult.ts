import { z } from "zod";

import type { components } from "@/shared/api-types";

export type MatchResult = components["schemas"]["MatchResultModel"];
export type MatchStatus = MatchResult["status"];

export const matchStatusSchema = z.enum(["exact", "fuzzy", "semantic", "no_match"]);

export const matchResultSchema = z
  .object({
    pos_nr: z.number().int(),
    status: matchStatusSchema,
    score: z.number(),
    matched_artikelnr: z.string().nullable().optional(),
    matched_bezeichnung: z.string().nullable().optional(),
    matched_row: z.record(z.unknown()).nullable().optional(),
    manual: z.boolean().default(false),
  })
  .passthrough();
