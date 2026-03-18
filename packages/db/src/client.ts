import { PrismaClient } from "../generated/client/index.js";

const globalForPrisma = globalThis as typeof globalThis & {
  __neomello_prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.__neomello_prisma ??
  new PrismaClient({
    log: ["warn", "error"],
  });

if (process.env["NODE_ENV"] !== "production") {
  globalForPrisma.__neomello_prisma = prisma;
}
