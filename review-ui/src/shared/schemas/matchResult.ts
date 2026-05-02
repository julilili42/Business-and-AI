import { z } from "zod";

/**
 * Mirrors `quoting/matching/matcher.py::MatchResult.to_dict`.
 */

export const matchStatusSchema = z.enum(["exact", "fuzzy", "semantic", "no_match"]);
export type MatchStatus = z.infer<typeof matchStatusSchema>;

export const matchResultSchema = z
  .object({
    pos_nr: z.number().int(),
    status: matchStatusSchema,
    score: z.number(),
    matched_artikelnr: z.string().nullable().optional(),
    matched_bezeichnung: z.string().nullable().optional(),
    matched_row: z.record(z.unknown()).nullable().optional(),
  })
  .passthrough();

export type MatchResult = z.infer<typeof matchResultSchema>;
