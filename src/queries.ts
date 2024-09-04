import { sql } from "kysely";
import { db } from "./storage/db.ts";

export const selectCompleteUserById = async (userId: string) => {
  return await db
    .selectFrom("user")
    .where("id", "=", userId)
    .where("year", "is not", null)
    .where("degreeId", "is not", null)
    .where("hasReadTerms", "is not", null)
    .selectAll()
    .executeTakeFirst();
};

export const selectHappeningById = async (happeningId: string) => {
  return await db
    .selectFrom("happening")
    .where("id", "=", happeningId)
    .selectAll()
    .executeTakeFirst();
};

export const selectSpotRangesByHappeningId = async (happeningId: string) => {
  return await db
    .selectFrom("spotRange")
    .where("happeningId", "=", happeningId)
    .selectAll()
    .execute();
};

export const selectUserRegistrationsByHappeningId = async (
  userId: string,
  happeningId: string
) => {
  return await db
    .selectFrom("registration")
    .where("userId", "=", userId)
    .where("happeningId", "=", happeningId)
    .where((eb) =>
      eb.or([eb("status", "=", "registered"), eb("status", "=", "waiting")])
    )
    .selectAll()
    .executeTakeFirst();
};

export const insertUserRegistration = async (
  userId: string,
  happeningId: string,
  spots: number,
  minYear: number,
  maxYear: number
): Promise<"success" | "waitlisted" | "failure"> => {
  try {
    return await db
      .transaction()
      .setIsolationLevel("read committed")
      .execute(async (tx) => {
        await sql`LOCK TABLE registration IN EXCLUSIVE MODE`.execute(tx);

        const registrations = await tx
          .selectFrom("registration")
          .leftJoin("user", "registration.userId", "user.id")
          .where("registration.happeningId", "=", happeningId)
          .where("user.year", ">=", minYear)
          .where("user.year", "<=", maxYear)
          .where((eb) =>
            eb.or([
              eb("registration.status", "=", "registered"),
              eb("registration.status", "=", "waiting"),
            ])
          )
          .selectAll()
          .execute();

        const isInfiniteSpots = spots === 0;
        const isWaitlisted = !isInfiniteSpots && registrations.length >= spots;

        const registration = await tx
          .insertInto("registration")
          .values({
            status: isWaitlisted ? "waiting" : "registered",
            happeningId,
            userId,
            changedBy: null,
          })
          .returningAll()
          .onConflict((oc) =>
            oc.columns(["userId", "happeningId"]).doUpdateSet({
              status: isWaitlisted ? "waiting" : "registered",
            })
          )
          .executeTakeFirst();

        if (!registration) {
          return "failure" as const;
        }

        if (isWaitlisted) {
          return "waitlisted" as const;
        }

        return "success" as const;
      });
  } catch (e) {
    // deno-lint-ignore no-console
    console.error("FATAL ERROR", e, e.stack);

    return "failure" as const;
  }
};

export const selectQuestionsByHappeningId = async (happeningId: string) => {
  return await db
    .selectFrom("question")
    .where("happeningId", "=", happeningId)
    .selectAll()
    .execute();
};
