import { createId } from "../utils/create-id.ts";

type QueueProcessOptions<T> = Readonly<{
  key: string;
  queueId: string;
  data: T;
}>;

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

  process = async (event: QueueProcessOptions<T>) => {
    await this.options.process(event);
  };
}
