import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { hashSecret } from "../src/utils/hash";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  const defaultPassword = await hashSecret("Senha@123");

  const unit = await prisma.unit.upsert({
    where: { block_number: { block: "Bloco A", number: "101" } },
    update: {},
    create: {
      block: "Bloco A",
      number: "101",
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@condominio.com" },
    update: {},
    create: {
      name: "Administrador Geral",
      email: "admin@condominio.com",
      passwordHash: defaultPassword,
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "portaria@condominio.com" },
    update: {},
    create: {
      name: "Porteiro Turno A",
      email: "portaria@condominio.com",
      passwordHash: defaultPassword,
      role: "CONCIERGE",
    },
  });

  await prisma.user.upsert({
    where: { email: "morador101@condominio.com" },
    update: {},
    create: {
      name: "Carlos Morador",
      email: "morador101@condominio.com",
      passwordHash: defaultPassword,
      role: "RESIDENT",
      unitId: unit.id,
    },
  });

  console.log("Seed executado com sucesso.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
