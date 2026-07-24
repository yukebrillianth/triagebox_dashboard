import { z } from 'zod/v4';

/** Empty age from HTML number input → null for UpdateVictimDto. */
const ageField = z
  .union([
    z.number().int().min(0).max(150),
    z.null(),
    z.undefined(),
    z.nan().transform(() => null),
    z.literal('').transform(() => null),
    z
      .string()
      .trim()
      .regex(/^\d+$/, 'Usia tidak valid')
      .transform((s) => Number(s))
      .pipe(z.number().int().min(0).max(150)),
  ])
  .transform((v) => (v === undefined ? null : v))
  .optional()
  .nullable();

const genderField = z
  .union([
    z.enum(['M', 'F', 'U']),
    z.null(),
    z.undefined(),
    z.literal('').transform(() => null),
  ])
  .transform((v) => (v === undefined ? null : v))
  .optional()
  .nullable();

const notesField = z
  .union([z.string().max(1024), z.null(), z.undefined()])
  .transform((v) => (v === undefined ? null : v))
  .optional()
  .nullable();

export const registrasiSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').max(128),
  age: ageField,
  gender: genderField,
  notes: notesField,
});

/** Output after zod (API payload shape). */
export type RegistrasiForm = z.output<typeof registrasiSchema>;
/** RHF field values before/while editing. */
export type RegistrasiFormValues = z.input<typeof registrasiSchema>;
