import { z } from "zod";

export const createPassSchema = z
  .object({
    visitorName: z
      .string({ error: "O nome do visitante é obrigatório." })
      .trim()
      .min(3, "O nome deve ter no mínimo 3 caracteres.")
      .max(120),
    visitorType: z
      .enum(["GUEST", "SERVICE_PROVIDER", "DELIVERY_COURIER"])
      .default("GUEST"),
    visitorDocument: z
      .string()
      .trim()
      .max(30, "Documento muito longo.")
      .optional()
      .nullable(),
    singleUse: z.boolean().default(true),
    validFrom: z.coerce.date({ error: "Data/hora de início inválida." }),
    validUntil: z.coerce.date({ error: "Data/hora de expiração inválida." }),
  })
  .refine((data) => data.validUntil > data.validFrom, {
    message: "A data de expiração deve ser posterior à data de início.",
    path: ["validUntil"],
  });

export const passIdParamSchema = z.object({
  id: z.string().uuid("ID de convite inválido."),
});

export const passCodeParamSchema = z.object({
  code: z.string().trim().toUpperCase().min(6, "Código inválido.").max(12),
});

export const registerAccessSchema = z.object({
  code: z
    .string({ error: "O código do convite é obrigatório." })
    .trim()
    .toUpperCase()
    .min(6)
    .max(12),
  direction: z.enum(["ENTRY", "EXIT"]),
  visitorDocument: z
    .string()
    .trim()
    .max(30, "Documento muito longo.")
    .optional()
    .nullable(),
  notes: z.string().trim().max(255).optional().nullable(),
});

export type CreatePassInput = z.infer<typeof createPassSchema>;
export type RegisterAccessInput = z.infer<typeof registerAccessSchema>;
