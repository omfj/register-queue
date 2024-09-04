import { Logger } from "./logger.ts";

type ModelOptions = {
  prefix: string;
};

export class Model<T> {
  constructor(private kv: Deno.Kv, private options: ModelOptions) {}

  set = async (key: string, data: T) => {
    return await this.kv.set([this.options.prefix, key], data);
  };

  get = async (key: string) => {
    const { value } = await this.kv.get<T>([this.options.prefix, key]);

    if (!value) {
      return null;
    }

    return value;
  };

  poll = async (
    key: string,
    wait: number = 100,
    duration: number = 1000,
    n: number = 0
  ): Promise<T | null> => {
    if (duration <= 0) {
      Logger.log(`⌛ Polling ${key} timed out`);
      return null;
    }

    const value = await this.get(key);
    if (value !== null) {
      return value;
    }

    await new Promise((resolve) => setTimeout(resolve, wait));

    const newDuration = duration - wait;
    return await this.poll(key, wait, newDuration, n + 1);
  };
}
