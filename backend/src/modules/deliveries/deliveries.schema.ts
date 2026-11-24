import { z } from "zod";

export const createDeliverySchema = z.object({
  unitId: z
    .string({ error: "A unidade é obrigatória." })
    .uuid("ID de unidade inválido."),
  carrier: z
    .string({ error: "A transportadora ou origem é obrigatória." })
    .trim()
    .min(2, "Informe o nome da transportadora (ex: Correios, Mercado Livre).")
    .max(80),
  trackingCode: z.string().trim().max(100).optional().nullable(),
  description: z.string().trim().max(255).optional().nullable(),
});

export const pickupDeliverySchema = z.object({
  pin: z
    .string({ error: "O PIN de retirada é obrigatório." })
    .trim()
    .regex(/^\d{4}$/, "O PIN deve conter exatamente 4 dígitos numéricos."),
  pickedUpBy: z
    .string({ error: "O nome de quem retirou é obrigatório." })
    .trim()
    .min(3, "Informe o nome completo de quem está retirando.")
    .max(120),
});

export const deliveryIdParamSchema = z.object({
  id: z.string().uuid("ID de encomenda inválido."),
});

export const listDeliveriesQuerySchema = z.object({
  status: z.enum(["PENDING", "PICKED_UP"]).optional(),
});

export type CreateDeliveryInput = z.infer<typeof createDeliverySchema>;
export type PickupDeliveryInput = z.infer<typeof pickupDeliverySchema>;
