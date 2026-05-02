import { apiClient } from "./client";
import { appSettingsSchema, type AppSettings } from "../schemas/settings";

export const settingsApi = {
  get: async (): Promise<AppSettings> => {
    const data = await apiClient.get<unknown>("/api/settings");
    return appSettingsSchema.parse(data);
  },

  save: async (settings: AppSettings): Promise<AppSettings> => {
    const data = await apiClient.put<unknown>("/api/settings", settings);
    return appSettingsSchema.parse(data);
  },
};
