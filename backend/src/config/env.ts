import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET deve ter no mínimo 32 caracteres"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET deve ter no mínimo 32 caracteres"),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("Variáveis de ambiente inválidas:", _env.error.format());
  process.exit(1);
}

export const env = _env.data;
