import { prisma } from "../../config/prisma";
import { AppError } from "../../errors/AppError";
import { CreateOccurrenceInput } from "./occurrences.schema";

const occurrenceSelect = {
  id: true,
  category: true,
  title: true,
  description: true,
  isResolved: true,
  resolvedAt: true,
  createdAt: true,
  author: {
    select: { id: true, name: true, role: true },
  },
  resolvedBy: {
    select: { id: true, name: true },
  },
};

export class OccurrencesService {
  async list(onlyPending?: boolean) {
    return prisma.occurrence.findMany({
      where: onlyPending ? { isResolved: false } : undefined,
      orderBy: [{ isResolved: "asc" }, { createdAt: "desc" }],
      take: 50,
      select: occurrenceSelect,
    });
  }

  async create(data: CreateOccurrenceInput, authorId: string) {
    return prisma.occurrence.create({
      data: {
        category: data.category,
        title: data.title,
        description: data.description,
        authorId,
      },
      select: occurrenceSelect,
    });
  }

  async toggleResolve(id: string, userId: string) {
    const existing = await prisma.occurrence.findUnique({ where: { id } });

    if (!existing) {
      throw new AppError("Registro de ocorrência não encontrado.", 404);
    }

    const nextResolved = !existing.isResolved;

    return prisma.occurrence.update({
      where: { id },
      data: {
        isResolved: nextResolved,
        resolvedAt: nextResolved ? new Date() : null,
        resolvedById: nextResolved ? userId : null,
      },
      select: occurrenceSelect,
    });
  }
}
