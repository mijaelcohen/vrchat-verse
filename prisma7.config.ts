import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
    // Optional: a separate empty database used by `prisma migrate dev` for drift
    // detection. Not needed for `migrate deploy` (used in production/CI). If unset,
    // Prisma creates/drops a scratch shadow database on the same server as
    // DATABASE_URL automatically (the Neon default role has CREATE DATABASE rights).
    // `env()` throws on a missing var, and Prisma rejects an empty string, so this
    // one reads process.env directly and normalizes "" (the .env.example default) to undefined.
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL || undefined,
  },
});
