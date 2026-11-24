import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { AppError } from "../errors/AppError";

export function ensureAuthenticated(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const token = req.cookies?.access_token;

  if (!token) {
    throw new AppError("Sessão não autenticada. Token ausente.", 401);
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch {
    throw new AppError("Token de acesso inválido ou expirado.", 401);
  }
}
