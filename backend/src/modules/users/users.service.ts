import { prisma } from "../../config/prisma";
import { AppError } from "../../errors/AppError";
import { hashSecret } from "../../utils/hash";
import { CreateUserInput } from "./users.schema";

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  unit: {
    select: { id: true, block: true, number: true },
  },
};

export class UsersService {
  async create(data: CreateUserInput) {
    const normalizedUnitId = data.role === "RESIDENT" ? data.unitId : null;

    if (normalizedUnitId) {
      const unitExists = await prisma.unit.findUnique({
        where: { id: normalizedUnitId },
      });
      if (!unitExists) {
        throw new AppError("A unidade informada não existe.", 404);
      }
    }

    const passwordHash = await hashSecret(data.password);

    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
        unitId: normalizedUnitId,
      },
      select: safeUserSelect,
    });
  }

  async findAll() {
    return prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: safeUserSelect,
    });
  }

  async setActiveStatus(
    targetUserId: string,
    requesterId: string,
    isActive: boolean,
  ) {
    if (targetUserId === requesterId && !isActive) {
      throw new AppError("Você não pode desativar sua própria conta.", 400);
    }

    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) {
      throw new AppError("Usuário não encontrado.", 404);
    }

    // Se estiver desativando o usuário, revoga imediatamente todos os refresh tokens ativos
    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: targetUserId },
        data: { isActive },
        select: safeUserSelect,
      }),
      ...(isActive
        ? []
        : [
            prisma.refreshToken.updateMany({
              where: { userId: targetUserId, revoked: false },
              data: { revoked: true },
            }),
          ]),
    ]);

    return updatedUser;
  }
}
