import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./config/prisma";

const server = app.listen(env.PORT, () => {
  console.log(`Servidor rodando na porta ${env.PORT} [${env.NODE_ENV}]`);
});

async function gracefulShutdown(signal: string) {
  console.log(`Sinal ${signal} recebido. Encerrando servidor...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
