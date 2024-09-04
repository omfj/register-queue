type ModelOptions = {
  prefix: string;
};

type ModelPollOptions = {
  wait: number;
  timeLeft: number;
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
    { timeLeft, wait }: ModelPollOptions = { wait: 100, timeLeft: 2000 }
  ): Promise<T | null> => {
    if (timeLeft < 0) {
      console.log(`⌛ Polling ${key} timed out`);
      return null;
    }

    const value = await this.get(key);
    if (value !== null) {
      return value;
    }

    await new Promise((resolve) => setTimeout(resolve, wait));
    return this.poll(key, { timeLeft: timeLeft - wait, wait });
  };
}
