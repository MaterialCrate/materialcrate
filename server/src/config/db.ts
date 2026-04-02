import { prisma } from "./prisma.js";

export const connectDB = async () => {
  await prisma.$connect();
  console.log("PostgreSQL connected");
};
