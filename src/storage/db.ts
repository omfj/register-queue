import { CamelCasePlugin, Kysely, PostgresDialect } from "kysely";
import { type DB } from "../../database.types.ts";
// @ts-types="npm:@types/pg"
import pg from "pg";

const { Pool } = pg;

export const db = new Kysely<DB>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: Deno.env.get("DATABASE_URL"),
      max: 10,
    }),
  }),
  plugins: [new CamelCasePlugin()],
});
