import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email());
export const invitationCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9-]{8,40}$/);
export const emailLoginSchema = z.object({
  email: emailSchema,
  name: z.string().trim().min(1).max(150).optional(),
  invitationCode: invitationCodeSchema.optional(),
  locale: z.enum(["fa", "en"]).default("fa"),
});
export const emailVerifySchema = z.object({
  challengeId: z.uuid(),
  code: z
    .string()
    .trim()
    .transform((value) =>
      value.replace(/[۰-۹٠-٩]/g, (digit) => String(digit.charCodeAt(0) % 16)),
    )
    .pipe(z.string().regex(/^\d{6}$/)),
});
export const invitationSchema = z.object({
  email: emailSchema,
  days: z
    .union([
      z.literal(1),
      z.literal(3),
      z.literal(7),
      z.literal(14),
      z.literal(30),
    ])
    .default(7),
});
