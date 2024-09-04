import { createId } from "../utils.ts";

type QueueProcessOptions<T> = {
  key: string;
  queueId: string;
  data: T;
};

// deno-lint-ignore no-explicit-any
type QueueProcessor<T> = ({ queueId, data }: QueueProcessOptions<T>) => any;

type CreateQueueOptions<T> = {
  queueId: string;
  process: QueueProcessor<T>;
};

export class Queue<T> {
  queueId: string;

  constructor(private kv: Deno.Kv, private options: CreateQueueOptions<T>) {
    this.queueId = options.queueId;
  }

  enqueue = async (data: T) => {
    const key = createId();
    const result = await this.kv.enqueue({
      key,
      queueId: this.options.queueId,
      data,
    });

    return {
      key,
      result,
    };
  };

  process: QueueProcessor<T> = async (event) => {
    await this.options.process(event);
  };
}

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
    options.before?.(event);

    const q = queueMap.get(event.queueId);

    if (!q) {
      console.log(`Queue ${event.queueId} not found`);
      return;
    }

    await q.process(event);

    options.after?.(event);
  });
};
