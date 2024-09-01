import { createId } from "./id.ts";

type QueueHandler<T> = ({
  queueId,
  data,
}: {
  queueId: string;
  data: T;
}) => Promise<void>;
type CreateQueueOptions<T> = {
  queueId: string;
  handler: QueueHandler<T>;
};

export const createQueue = <T>(kv: Deno.Kv, options: CreateQueueOptions<T>) => {
  kv.listenQueue(options.handler);

  return {
    enqueue: async (data: T) => {
      const key = createId();
      const result = await kv.enqueue({
        key,
        queueId: options.queueId,
        data,
      });

      return {
        key,
        result,
      };
    },
  };
};
