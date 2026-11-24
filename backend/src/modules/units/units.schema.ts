import { z } from "zod";

export const createUnitSchema = z.object({
  block: z
    .string({ error: "O bloco é obrigatório." })
    .trim()
    .min(1, "Informe o bloco ou torre.")
    .max(20, "Máximo de 20 caracteres."),
  number: z
    .string({ error: "O número da unidade é obrigatório." })
    .trim()
    .min(1, "Informe o número da unidade.")
    .max(20, "Máximo de 20 caracteres."),
});

export const unitIdParamSchema = z.object({
  id: z.string().uuid("ID de unidade inválido."),
});

export type CreateUnitInput = z.infer<typeof createUnitSchema>;
