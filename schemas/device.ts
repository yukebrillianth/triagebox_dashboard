import { z } from 'zod/v4';

const optionalText = (max: number) =>
  z
    .union([z.string().max(max), z.null(), z.undefined()])
    .transform((v) => {
      if (v === undefined || v === null) return null;
      const t = v.trim();
      return t === '' ? null : t;
    })
    .optional()
    .nullable();

/**
 * Edit only. A station's id, IP, firmware and broker are not the operator's to
 * type: adoption assigns the id, the station announces its own IP/firmware, and
 * the broker comes from the backend's `MQTT_URL`. Name and notes are the two
 * fields a human owns.
 */
export const editStationSchema = z.object({
  name: z.string().min(1, 'Nama wajib').max(128),
  notes: optionalText(1024),
});

/**
 * Adoption: the operator names the station and says how many nodes it polls.
 * `nodeIdBase` offsets the generated ids so a second station gets node-21..
 * rather than colliding with the first station's node-01.
 */
export const adoptStationSchema = z.object({
  id: z.string().min(1, 'ID wajib').max(64),
  name: z.string().min(1, 'Nama wajib').max(128),
  nodeCount: z.coerce.number().int().min(0, 'Minimal 0').max(255),
  nodeIdBase: z.coerce.number().int().min(0, 'Minimal 0').max(255),
});

export type EditStationForm = z.output<typeof editStationSchema>;
export type EditStationFormValues = z.input<typeof editStationSchema>;
export type AdoptStationForm = z.output<typeof adoptStationSchema>;
export type AdoptStationFormValues = z.input<typeof adoptStationSchema>;
