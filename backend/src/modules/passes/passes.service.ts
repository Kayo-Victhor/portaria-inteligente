import crypto from "node:crypto";
import { prisma } from "../../config/prisma";
import { AppError } from "../../errors/AppError";
import { CreatePassInput, RegisterAccessInput } from "./passes.schema";

// Tolerância de 15 minutos antes do horário agendado para entrada na portaria
const EARLY_ENTRY_TOLERANCE_MS = 15 * 60 * 1000;

function generatePassCode(): string {
  // Gera código legível de 8 caracteres (ex: "A9F2-K81B" -> sem ambiguidade)
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

export class PassesService {
  async create(data: CreatePassInput, residentId: string, unitId: string) {
    if (data.validUntil <= new Date()) {
      throw new AppError(
        "A data de expiração do convite não pode estar no passado.",
        400,
      );
    }

    // Garante unicidade do código gerado
    let code = generatePassCode();
    let exists = await prisma.visitorPass.findUnique({ where: { code } });
    while (exists) {
      code = generatePassCode();
      exists = await prisma.visitorPass.findUnique({ where: { code } });
    }

    return prisma.visitorPass.create({
      data: {
        code,
        visitorName: data.visitorName,
        visitorDocument: data.visitorDocument || null,
        visitorType: data.visitorType,
        singleUse: data.singleUse,
        validFrom: data.validFrom,
        validUntil: data.validUntil,
        unitId,
        createdById: residentId,
      },
      include: {
        unit: { select: { block: true, number: true } },
      },
    });
  }

  async listByUnit(unitId: string) {
    return prisma.visitorPass.findMany({
      where: { unitId },
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { id: true, name: true } },
        accessLogs: {
          orderBy: { timestamp: "desc" },
          select: {
            id: true,
            direction: true,
            notes: true,
            timestamp: true,
          },
        },
      },
    });
  }

  async revoke(passId: string, unitId: string) {
    const pass = await prisma.visitorPass.findUnique({
      where: { id: passId },
    });

    if (!pass) {
      throw new AppError("Convite não encontrado.", 404);
    }

    // Prevenção de IDOR: garante que o convite pertence ao apartamento do morador logado
    if (pass.unitId !== unitId) {
      throw new AppError(
        "Acesso negado: este convite pertence a outra unidade.",
        403,
      );
    }

    if (pass.status !== "ACTIVE") {
      throw new AppError(
        `Não é possível revogar um convite com status ${pass.status}.`,
        400,
      );
    }

    return prisma.visitorPass.update({
      where: { id: passId },
      data: { status: "REVOKED" },
    });
  }

  // Consulta rápida para o porteiro checar o convite antes de liberar a entrada
  async checkByCode(code: string) {
    const pass = await prisma.visitorPass.findUnique({
      where: { code },
      include: {
        unit: { select: { id: true, block: true, number: true } },
        createdBy: { select: { id: true, name: true } },
        accessLogs: {
          orderBy: { timestamp: "desc" },
          take: 5,
        },
      },
    });

    if (!pass) {
      throw new AppError("Código de convite não encontrado.", 404);
    }

    const now = new Date();
    const isExpiredByTime = now > pass.validUntil;
    const isTooEarly =
      now.getTime() + EARLY_ENTRY_TOLERANCE_MS < pass.validFrom.getTime();

    return {
      pass,
      validation: {
        canEnter: pass.status === "ACTIVE" && !isExpiredByTime && !isTooEarly,
        isExpiredByTime,
        isTooEarly,
      },
    };
  }

  // Validação definitiva e registro de entrada ou saída pelo porteiro
  async registerAccess(data: RegisterAccessInput, conciergeId: string) {
    const pass = await prisma.visitorPass.findUnique({
      where: { code: data.code },
      include: {
        unit: { select: { block: true, number: true } },
      },
    });

    if (!pass) {
      throw new AppError("Convite não encontrado.", 404);
    }

    const now = new Date();
    const resolvedDocument =
      data.visitorDocument?.trim() || pass.visitorDocument;

    if (data.direction === "ENTRY") {
      if (pass.status === "REVOKED") {
        throw new AppError("Este convite foi revogado pelo morador.", 400);
      }

      if (pass.status === "USED") {
        throw new AppError("Este convite de uso único já foi utilizado.", 400);
      }

      if (pass.status === "EXPIRED" || now > pass.validUntil) {
        if (pass.status === "ACTIVE") {
          await prisma.visitorPass.update({
            where: { id: pass.id },
            data: { status: "EXPIRED" },
          });
        }
        throw new AppError("Convite expirado.", 400);
      }

      if (now.getTime() + EARLY_ENTRY_TOLERANCE_MS < pass.validFrom.getTime()) {
        throw new AppError(
          "Fora do horário permitido. A entrada é liberada até 15 minutos antes do início.",
          400,
        );
      }

      if (
        pass.visitorType === "SERVICE_PROVIDER" &&
        (!resolvedDocument || resolvedDocument.length < 5)
      ) {
        throw new AppError(
          "Documento (CPF/RG) é obrigatório para liberar a entrada de prestadores de serviço.",
          400,
        );
      }
    }

    const shouldUpdateStatus = data.direction === "ENTRY" && pass.singleUse;
    const shouldUpdateDocument =
      Boolean(data.visitorDocument?.trim()) &&
      data.visitorDocument?.trim() !== pass.visitorDocument;

    const [accessLog, updatedPass] = await prisma.$transaction([
      prisma.accessLog.create({
        data: {
          direction: data.direction,
          notes: data.notes || null,
          passId: pass.id,
          conciergeId,
        },
      }),
      ...(shouldUpdateStatus || shouldUpdateDocument
        ? [
            prisma.visitorPass.update({
              where: { id: pass.id },
              data: {
                ...(shouldUpdateStatus ? { status: "USED" } : {}),
                ...(shouldUpdateDocument
                  ? { visitorDocument: resolvedDocument }
                  : {}),
              },
            }),
          ]
        : [prisma.visitorPass.findUniqueOrThrow({ where: { id: pass.id } })]),
    ]);

    return {
      accessLog,
      pass: {
        ...updatedPass,
        unit: pass.unit,
      },
    };
  }

  async listRecentLogs() {
    return prisma.accessLog.findMany({
      orderBy: { timestamp: "desc" },
      take: 50,
      include: {
        pass: {
          select: {
            code: true,
            visitorName: true,
            visitorType: true,
            unit: { select: { block: true, number: true } },
          },
        },
        concierge: { select: { id: true, name: true } },
      },
    });
  }
}
