import { z } from "zod";

import {
  stammdatenRowSchema,
  type StammdatenRow,
} from "@/shared/schemas/stammdaten";

import { apiClient } from "./client";

export interface CustomArticlePayload {
  pos_nr: number;
  artikel_nr: string;
  bezeichnung: string;
  einheit: string;
  unit_price_eur: number;
  werkstoff?: string | null;
  abmessungen?: string | null;
}

/**
 * Stammdaten search + manual match-override.
 *
 * Both endpoints are new in the React migration — see
 * `backend-patches/frontend_router.py` for the wire format.
 */
export const stammdatenApi = {
  search: async (query: string, limit = 25): Promise<StammdatenRow[]> => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    params.set("limit", String(limit));
    const data = await apiClient.get<unknown>(
      `/api/stammdaten/search?${params.toString()}`,
    );
    return z.array(stammdatenRowSchema).parse(data);
  },

  overrideMatch: async (
    reviewId: string,
    posNr: number,
    artikelNr: string,
  ): Promise<{
    pos_nr: number;
    matched_artikelnr: string;
    matched_bezeichnung: string;
  }> => {
    const data = await apiClient.post<unknown>(
      `/api/reviews/${encodeURIComponent(reviewId)}/match-override`,
      { pos_nr: posNr, artikel_nr: artikelNr },
    );
    return z
      .object({
        pos_nr: z.number(),
        matched_artikelnr: z.string(),
        matched_bezeichnung: z.string(),
      })
      .parse(data);
  },

  createCustomArticle: async (
    reviewId: string,
    payload: CustomArticlePayload,
  ): Promise<{
    pos_nr: number;
    matched_artikelnr: string;
    matched_bezeichnung: string;
    unit_price_eur: number;
  }> => {
    const data = await apiClient.post<unknown>(
      `/api/reviews/${encodeURIComponent(reviewId)}/custom-article`,
      payload,
    );
    return z
      .object({
        pos_nr: z.number(),
        matched_artikelnr: z.string(),
        matched_bezeichnung: z.string(),
        unit_price_eur: z.number(),
      })
      .parse(data);
  },
};
