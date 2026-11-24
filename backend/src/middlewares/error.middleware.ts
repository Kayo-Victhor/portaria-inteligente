import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AppError } from "../errors/AppError";
import { env } from "../config/env";

export function globalErrorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // 1. Erros de validação do Zod
  if (err instanceof ZodError) {
    res.status(400).json({
      status: "validation_error",
      message: "Dados de entrada inválidos.",
      issues: err.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  // 2. Erros conhecidos do Prisma ORM
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002: Violação de restrição UNIQUE (ex: e-mail duplicado ou bloco+apto duplicado)
    if (err.code === "P2002") {
      const target =
        (err.meta?.target as string[])?.join(", ") || "campo único";
      res.status(409).json({
        status: "conflict",
        message: `Já existe um registro cadastrado com este valor (${target}).`,
      });
      return;
    }

    // P2025: Registro não encontrado para update/delete
    if (err.code === "P2025") {
      res.status(404).json({
        status: "not_found",
        message: "O registro solicitado não foi encontrado.",
      });
      return;
    }

    // P2003: Falha de chave estrangeira (ex: unitId inexistente)
    if (err.code === "P2003") {
      res.status(400).json({
        status: "bad_request",
        message: "Referência inválida a um registro relacionado.",
      });
      return;
    }
  }

  // 3. Erros controlados de regra de negócio (AppError)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: "error",
      message: err.message,
    });
    return;
  }

  // 4. Erros inesperados (500)
  console.error("Erro interno não tratado:", err);

  res.status(500).json({
    status: "internal_error",
    message:
      env.NODE_ENV === "development" && err instanceof Error
        ? err.message
        : "Erro interno no servidor.",
  });
}
