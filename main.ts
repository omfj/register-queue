import { Hono } from "hono";
import { RegistrationRequest } from "./types.ts";
import { enqueueRegistrationRequest } from "./registration-queue.ts";
import { auth } from "./middleware.ts";

const app = new Hono();

app.post("/", auth, async (c) => {
  const json = await c.req.json<RegistrationRequest>().catch(() => {
    return undefined;
  });

  if (!json) {
    return c.json(
      {
        message: "Bad request",
      },
      400
    );
  }

  const { key, result } = await enqueueRegistrationRequest(json);

  if (result.ok) {
    console.log(`✅ Successfully enqueued ${key}: ${JSON.stringify(json)}`);
  } else {
    console.log(`❌ Failed to enqueue ${key}: ${JSON.stringify(json)}`);
  }

  return c.json({
    message: "OK",
  });
});

export default app;
