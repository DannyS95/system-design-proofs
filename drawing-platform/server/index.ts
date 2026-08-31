import { resolve } from "node:path";

import { buildApp } from "./app.js";

function readPort(value: string | undefined): number {
  if (value === undefined) {
    return 8787;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }
  return port;
}

const production = process.env.NODE_ENV === "production";
const app = await buildApp({
  dataDirectory:
    process.env.SYSTEM_CANVAS_DATA_DIR ?? resolve(process.cwd(), ".data"),
  staticDirectory: production ? resolve(process.cwd(), "dist") : undefined,
  logger: true,
});

try {
  await app.listen({
    host: process.env.HOST ?? "127.0.0.1",
    port: readPort(process.env.PORT),
  });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
