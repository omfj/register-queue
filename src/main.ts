import { Hono } from "hono";
import { RegistrationRequest } from "./types.ts";
import { auth } from "./middleware.ts";
import { RegistrationQueue } from "./registration-queue.ts";
import { RegistrationResultModel } from "./registration-result-model.ts";
import { queueProcessor } from "./lib/queue.ts";
import { kv } from "./kv.ts";

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

  const { key, result } = await RegistrationQueue.enqueue(json);

  if (result.ok) {
    console.log(`✅ Successfully enqueued ${key}: ${JSON.stringify(json)}`);
  } else {
    console.log(`❌ Failed to enqueue ${key}: ${JSON.stringify(json)}`);
  }

  const queueResult = await RegistrationResultModel.poll(key);

  return c.json(queueResult);
});

queueProcessor(kv, {
  queues: [RegistrationQueue],
});

export default app;
