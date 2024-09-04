// deno-lint-ignore-file no-console
const timestamp = () => {
  return new Date().toISOString();
};

export const Logger = {
  log(str: string) {
    console.log(`[${timestamp()}] ${str}`);
  },
};
