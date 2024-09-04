import { kv } from "./kv.ts";
import { Model } from "./lib/model.ts";

export type RegistrationResult = {
  success: boolean;
  message: string;
};

export const RegistrationResultModel = new Model<RegistrationResult>(kv, {
  prefix: "registration-result",
});
