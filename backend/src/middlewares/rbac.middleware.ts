import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { AppError } from "../errors/AppError";

export function authorizeRoles(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError("Usuário não autenticado.", 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError(
        "Acesso negado: você não possui permissão para executar esta ação.",
        403,
      );
    }
    if (req.user.role === "RESIDENT" && !req.user.unitId) {
      throw new AppError(
        "Morador sem unidade habitacional vinculada. Contate a administração.",
        403,
      );
    }

    next();
  };
}
