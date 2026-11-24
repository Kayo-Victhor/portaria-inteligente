import { prisma } from "../../config/prisma";
import { AppError } from "../../errors/AppError";
import { CreateUnitInput } from "./units.schema";

export class UnitsService {
  async create(data: CreateUnitInput) {
    // O erro de duplicidade (block + number) será capturado como P2002 pelo globalErrorHandler
    return prisma.unit.create({
      data: {
        block: data.block,
        number: data.number,
      },
    });
  }

  async findAll() {
    return prisma.unit.findMany({
      orderBy: [{ block: "asc" }, { number: "asc" }],
      include: {
        _count: {
          select: {
            residents: true,
            deliveries: { where: { status: "PENDING" } },
          },
        },
      },
    });
  }

  async findById(id: string) {
    const unit = await prisma.unit.findUnique({
      where: { id },
      include: {
        residents: {
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
          },
        },
      },
    });

    if (!unit) {
      throw new AppError("Unidade não encontrada.", 404);
    }

    return unit;
  }

  async delete(id: string) {
    const unit = await prisma.unit.findUnique({
      where: { id },
      include: { _count: { select: { residents: true } } },
    });

    if (!unit) {
      throw new AppError("Unidade não encontrada.", 404);
    }

    if (unit._count.residents > 0) {
      throw new AppError(
        "Não é possível remover uma unidade que possui moradores vinculados.",
        400,
      );
    }

    await prisma.unit.delete({ where: { id } });
  }
}
