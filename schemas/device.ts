import { z } from 'zod/v4';

/** MQTT port: number, empty string → null, optional. */
const mqttPortField = z
  .union([
    z.coerce.number().int().min(1).max(65535),
    z.null(),
    z.undefined(),
    z.literal('').transform(() => null),
  ])
  .transform((v) => (v === undefined ? null : v))
  .optional()
  .nullable();

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

export const createStationSchema = z.object({
  id: z.string().min(1, 'ID wajib').max(64),
  name: z.string().min(1, 'Nama wajib').max(128),
  firmware: optionalText(64),
  ipAddress: optionalText(64),
  mqttBrokerHost: optionalText(255),
  mqttBrokerPort: mqttPortField,
  notes: optionalText(1024),
});

export const editStationSchema = z.object({
  name: z.string().min(1, 'Nama wajib').max(128),
  firmware: optionalText(64),
  ipAddress: optionalText(64),
  mqttBrokerHost: optionalText(255),
  mqttBrokerPort: mqttPortField,
  notes: optionalText(1024),
});

/** Combined for forms that may include id (create) or not (edit). */
export const stationFormSchema = createStationSchema;

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

export const createNodeSchema = z.object({
  id: z.string().min(1, 'ID wajib').max(64),
  stationId: z.string().min(1, 'Station wajib'),
  name: z.string().min(1, 'Nama wajib').max(128),
  firmware: optionalText(64),
});

export const editNodeSchema = z.object({
  stationId: z.string().min(1, 'Station wajib'),
  name: z.string().min(1, 'Nama wajib').max(128),
  firmware: optionalText(64),
});

export const nodeFormSchema = createNodeSchema;

export type CreateStationForm = z.output<typeof createStationSchema>;
export type CreateStationFormValues = z.input<typeof createStationSchema>;
export type EditStationForm = z.output<typeof editStationSchema>;
export type EditStationFormValues = z.input<typeof editStationSchema>;
export type AdoptStationForm = z.output<typeof adoptStationSchema>;
export type AdoptStationFormValues = z.input<typeof adoptStationSchema>;

export type CreateNodeForm = z.output<typeof createNodeSchema>;
export type CreateNodeFormValues = z.input<typeof createNodeSchema>;
export type EditNodeForm = z.output<typeof editNodeSchema>;
export type EditNodeFormValues = z.input<typeof editNodeSchema>;
