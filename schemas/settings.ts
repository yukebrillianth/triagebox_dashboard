import { z } from 'zod/v4';

export const settingsFormSchema = z.object({
  hospital_name: z.string().min(1, 'Wajib').max(200),
  disaster_name: z.string().min(1, 'Wajib').max(200),
  operator: z.string().max(200).optional().or(z.literal('')),
});

export type SettingsForm = z.output<typeof settingsFormSchema>;
export type SettingsFormValues = z.input<typeof settingsFormSchema>;
