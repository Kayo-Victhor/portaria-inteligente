import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string({ error: "O e-mail é obrigatório." })
    .trim()
    .toLowerCase()
    .email("Formato de e-mail inválido."),
  password: z
    .string({ error: "A senha é obrigatória." })
    .min(6, "A senha deve ter no mínimo 6 caracteres."),
});

export type LoginInput = z.infer<typeof loginSchema>;
