import crypto from "node:crypto";
import { DeliveryStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../errors/AppError";
import { hashSecret, verifySecret } from "../../utils/hash";
import { CreateDeliveryInput, PickupDeliveryInput } from "./deliveries.schema";

function generateFourDigitPin(): string {
  // Gera número criptograficamente aleatório entre 1000 e 9999
  return crypto.randomInt(1000, 10000).toString();
}

const safeDeliverySelect = {
  id: true,
  trackingCode: true,
  carrier: true,
  description: true,
  status: true,
  receivedAt: true,
  pickedUpAt: true,
  pickedUpBy: true,
  unit: {
    select: { id: true, block: true, number: true },
  },
  receivedBy: {
    select: { id: true, name: true },
  },
};

export class DeliveriesService {
  async create(data: CreateDeliveryInput, conciergeId: string) {
    const unit = await prisma.unit.findUnique({
      where: { id: data.unitId },
    });

    if (!unit) {
      throw new AppError("Unidade habitacional não encontrada.", 404);
    }

    const plainPin = generateFourDigitPin();
    const pickupPinHash = await hashSecret(plainPin);

    const delivery = await prisma.delivery.create({
      data: {
        unitId: data.unitId,
        carrier: data.carrier,
        trackingCode: data.trackingCode || null,
        description: data.description || null,
        pickupPinHash,
        receivedById: conciergeId,
      },
      select: safeDeliverySelect,
    });

    // Retorna o PIN em texto plano apenas no momento da criação para notificação ao morador
    return {
      delivery,
      pickupPin: plainPin,
    };
  }

  async listAll(status?: DeliveryStatus) {
    return prisma.delivery.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ status: "asc" }, { receivedAt: "desc" }],
      select: safeDeliverySelect,
    });
  }

  async listByUnit(unitId: string, status?: DeliveryStatus) {
    return prisma.delivery.findMany({
      where: {
        unitId,
        ...(status ? { status } : {}),
      },
      orderBy: [{ status: "asc" }, { receivedAt: "desc" }],
      select: safeDeliverySelect,
    });
  }

  // Permite ao morador gerar um novo PIN caso tenha perdido o código original
  async regeneratePin(deliveryId: string, unitId: string) {
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery) {
      throw new AppError("Encomenda não encontrada.", 404);
    }

    if (delivery.unitId !== unitId) {
      throw new AppError(
        "Acesso negado: esta encomenda pertence a outra unidade.",
        403,
      );
    }

    if (delivery.status !== "PENDING") {
      throw new AppError("Esta encomenda já foi retirada.", 400);
    }

    const newPlainPin = generateFourDigitPin();
    const newHash = await hashSecret(newPlainPin);

    await prisma.delivery.update({
      where: { id: deliveryId },
      data: { pickupPinHash: newHash },
    });

    return {
      deliveryId: delivery.id,
      pickupPin: newPlainPin,
    };
  }

  // Valida o PIN com Argon2id e dá baixa na encomenda
  async confirmPickup(deliveryId: string, data: PickupDeliveryInput) {
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery) {
      throw new AppError("Encomenda não encontrada.", 404);
    }

    if (delivery.status === "PICKED_UP") {
      throw new AppError("Esta encomenda já foi retirada anteriormente.", 400);
    }

    const isPinValid = await verifySecret(delivery.pickupPinHash, data.pin);
    if (!isPinValid) {
      throw new AppError("PIN de retirada inválido.", 401);
    }

    return prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        status: "PICKED_UP",
        pickedUpAt: new Date(),
        pickedUpBy: data.pickedUpBy,
      },
      select: safeDeliverySelect,
    });
  }
}
