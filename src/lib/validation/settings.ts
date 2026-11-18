import { z } from 'zod';

export const settingsSchema = z.object({
  name: z.string().trim().min(2).max(60),
  locale: z.enum(['PT_PT', 'PT_BR', 'EN']),
  theme: z.enum(['LIGHT', 'DARK', 'SYSTEM']),
  timezone: z.string().min(3),
});

export type SettingsInput = z.infer<typeof settingsSchema>;

/** As definições estão em secções (Perfil, Preferências); cada formulário grava só os seus campos. */
export const settingsPatchSchema = settingsSchema.partial();
export type SettingsPatch = z.infer<typeof settingsPatchSchema>;
