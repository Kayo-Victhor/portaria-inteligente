import crypto from "node:crypto";
import { prisma } from "../../config/prisma";
import { AppError } from "../../errors/AppError";
import { hashSecret, verifySecret } from "../../utils/hash";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../utils/jwt";
import { LoginInput } from "./auth.schema";

const REFRESH_TOKEN_TTL_DAYS = 7;

export class AuthService {
  private async generateTokenPair(user: {
    id: string;
    role: "ADMIN" | "CONCIERGE" | "RESIDENT";
    unitId: string | null;
  }) {
    const tokenId = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

    const accessToken = signAccessToken({
      sub: user.id,
      role: user.role,
      unitId: user.unitId,
    });

    const refreshToken = signRefreshToken({
      sub: user.id,
      tokenId,
    });

    const tokenHash = await hashSecret(refreshToken);

    await prisma.refreshToken.create({
      data: {
        id: tokenId,
        tokenHash,
        expiresAt,
        userId: user.id,
      },
    });

    return { accessToken, refreshToken };
  }

  async login(data: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: {
        unit: {
          select: { id: true, block: true, number: true },
        },
      },
    });

    // Mensagem genérica para evitar enumeração de e-mails válidos
    if (!user || !user.isActive) {
      throw new AppError("Credenciais inválidas.", 401);
    }

    const passwordMatches = await verifySecret(
      user.passwordHash,
      data.password,
    );
    if (!passwordMatches) {
      throw new AppError("Credenciais inválidas.", 401);
    }

    const tokens = await this.generateTokenPair({
      id: user.id,
      role: user.role,
      unitId: user.unitId,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        unit: user.unit,
      },
      ...tokens,
    };
  }

  async refresh(rawRefreshToken: string) {
    let payload: { sub: string; tokenId: string };

    try {
      payload = verifyRefreshToken(rawRefreshToken);
    } catch {
      throw new AppError("Refresh token inválido ou expirado.", 401);
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { id: payload.tokenId },
      include: {
        user: {
          include: {
            unit: {
              select: { id: true, block: true, number: true },
            },
          },
        },
      },
    });

    if (!storedToken) {
      throw new AppError("Sessão não encontrada.", 401);
    }

    // Detecção de reuso de token já revogado (possível roubo de sessão)
    if (storedToken.revoked) {
      await prisma.refreshToken.updateMany({
        where: { userId: storedToken.userId, revoked: false },
        data: { revoked: true },
      });
      throw new AppError("Sessão comprometida. Faça login novamente.", 401);
    }

    if (storedToken.expiresAt < new Date() || !storedToken.user.isActive) {
      throw new AppError("Sessão expirada ou usuário inativo.", 401);
    }

    const isTokenValid = await verifySecret(
      storedToken.tokenHash,
      rawRefreshToken,
    );
    if (!isTokenValid) {
      throw new AppError("Refresh token inválido.", 401);
    }

    // Revoga o token atual antes de emitir o novo par (Token Rotation)
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true },
    });

    const tokens = await this.generateTokenPair({
      id: storedToken.user.id,
      role: storedToken.user.role,
      unitId: storedToken.user.unitId,
    });

    return {
      user: {
        id: storedToken.user.id,
        name: storedToken.user.name,
        email: storedToken.user.email,
        role: storedToken.user.role,
        unit: storedToken.user.unit,
      },
      ...tokens,
    };
  }

  async logout(rawRefreshToken?: string) {
    if (!rawRefreshToken) return;

    try {
      const payload = verifyRefreshToken(rawRefreshToken);
      await prisma.refreshToken.updateMany({
        where: { id: payload.tokenId, revoked: false },
        data: { revoked: true },
      });
    } catch {
      // Ignora erros se o token já estiver expirado; os cookies serão limpos no controller
    }
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        unit: {
          select: { id: true, block: true, number: true },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new AppError("Usuário não encontrado ou inativo.", 404);
    }

    return user;
  }
}
