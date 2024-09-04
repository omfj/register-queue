import { Logger } from "./logger.ts";
import { Queue } from "./queue.ts";

type QueueProcessorOptions = {
  // deno-lint-ignore no-explicit-any
  queues: Array<Queue<any>>;
  before?: (event: unknown) => Promise<void> | void;
  after?: (event: unknown) => Promise<void> | void;
};

export const queueProcessor = (kv: Deno.Kv, options: QueueProcessorOptions) => {
  const queueMap = new Map<string, Queue<unknown>>(
    options.queues.map((q) => [q.queueId, q])
  );

  return kv.listenQueue(async (event) => {
    await options.before?.(event);

    const q = queueMap.get(event.queueId);

    if (!q) {
      Logger.log(`Queue ${event.queueId} not found`);
      return;
    }

    await q.process(event);

    await options.after?.(event);
  });
};
