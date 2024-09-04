import { Hono } from "hono";
import { RegistrationRequest } from "./types.ts";
import { auth } from "./middleware/auth.ts";
import { logger } from "./middleware/logger.ts";
import { RegistrationQueue } from "./queues/registration-queue.ts";
import { RegistrationResultModel } from "./models/registration-result-model.ts";
import { queueProcessor } from "./lib/queue-processor.ts";
import { kv } from "./storage/kv.ts";
import { Logger } from "./lib/logger.ts";

const app = new Hono();

app.use(logger);

app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

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

  const { key, result } = await RegistrationQueue.enqueue(json);

  if (result.ok) {
    Logger.log(`✅ Successfully enqueued ${key}: ${JSON.stringify(json)}`);
  } else {
    Logger.log(`❌ Failed to enqueue ${key}: ${JSON.stringify(json)}`);
  }

  const queueResult = await RegistrationResultModel.poll(key);

  if (!queueResult) {
    return c.json({ success: false, message: "Queue timed out" });
  }

  return c.json(queueResult);
});

queueProcessor(kv, {
  queues: [RegistrationQueue],
});

export default app;
