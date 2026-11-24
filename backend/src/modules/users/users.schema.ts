import { z } from "zod";

export const createUserSchema = z
  .object({
    name: z
      .string({ error: "O nome é obrigatório." })
      .trim()
      .min(3, "O nome deve ter no mínimo 3 caracteres.")
      .max(120),
    email: z
      .string({ error: "O e-mail é obrigatório." })
      .trim()
      .toLowerCase()
      .email("Formato de e-mail inválido.")
      .max(150),
    password: z
      .string({ error: "A senha é obrigatória." })
      .min(8, "A senha deve ter no mínimo 8 caracteres."),
    role: z.enum(["ADMIN", "CONCIERGE", "RESIDENT"]),
    unitId: z.string().uuid("ID de unidade inválido.").nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.role === "RESIDENT" && !data.unitId) {
        return false;
      }
      return true;
    },
    {
      message: "Moradores devem estar vinculados a uma unidade.",
      path: ["unitId"],
    },
  );

export const updateUserStatusSchema = z.object({
  isActive: z.boolean({ error: "O campo isActive deve ser booleano." }),
});

export const userIdParamSchema = z.object({
  id: z.string().uuid("ID de usuário inválido."),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
