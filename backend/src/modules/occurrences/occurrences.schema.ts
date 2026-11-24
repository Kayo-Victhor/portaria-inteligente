import { z } from "zod";

export const createOccurrenceSchema = z.object({
  category: z
    .enum(["SHIFT_HANDOFF", "MAINTENANCE", "INCIDENT", "GENERAL"])
    .default("GENERAL"),
  title: z
    .string({ error: "O título da ocorrência é obrigatório." })
    .trim()
    .min(3, "O título deve ter no mínimo 3 caracteres.")
    .max(120),
  description: z
    .string({ error: "A descrição é obrigatória." })
    .trim()
    .min(5, "Descreva a ocorrência com mais detalhes.")
    .max(2000),
});

export const occurrenceIdParamSchema = z.object({
  id: z.string().uuid("ID de ocorrência inválido."),
});

export type CreateOccurrenceInput = z.infer<typeof createOccurrenceSchema>;
