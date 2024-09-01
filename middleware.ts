import { MiddlewareHandler } from "hono";

const ADMIN_KEY = Deno.env.get("ADMIN_KEY");

export const auth: MiddlewareHandler = async (c, next) => {
  if (!ADMIN_KEY) {
    return await next();
  }

  const token = c.req.header("Authorization");
  if (token !== `Bearer ${ADMIN_KEY}`) {
    return c.text("Unauthorized", { status: 401 });
  }

  return await next();
};
