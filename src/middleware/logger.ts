import { MiddlewareHandler } from "hono";
import { Logger } from "../lib/logger.ts";

export const logger: MiddlewareHandler = async (c, next) => {
  const start = Date.now();

  Logger.log(`➡️ ${c.req.method} ${c.req.url}`);

  await next();

  const end = Date.now();
  const duration = end - start;

  Logger.log(`⬅️ ${c.req.method} ${c.req.path} finished in ${duration}ms`);
};
