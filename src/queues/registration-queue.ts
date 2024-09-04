import { RegistrationRequest } from "../types.ts";
import {
  insertUserRegistration,
  selectCompleteUserById,
  selectHappeningById,
  selectSpotRangesByHappeningId,
  selectUserRegistrationsByHappeningId,
} from "../queries.ts";
import { kv } from "../storage/kv.ts";
import { selectQuestionsByHappeningId } from "../queries.ts";
import { Queue } from "../lib/queue.ts";
import { RegistrationResultModel } from "../models/registration-result-model.ts";
import { Logger } from "../lib/logger.ts";

export const RegistrationQueue = new Queue<RegistrationRequest>(kv, {
  queueId: "registration-queue",
  process: async ({ key, queueId, data }) => {
    const { userId, happeningId, questions: userQuestions } = data;

    const user = await selectCompleteUserById(userId);

    if (!user) {
      Logger.log(
        `🚫 Failed when processing queue, ${queueId}, user not complete, ${userId}`
      );
      await RegistrationResultModel.set(key, {
        success: false,
        message:
          "Du må ha fylt ut studieinformasjon for å kunne registrere deg",
      });
      return;
    }

    const happening = await selectHappeningById(happeningId);

    if (!happening) {
      Logger.log(
        `🚫 Failed when processing queue, ${queueId}, happening not found, ${happeningId}`
      );
      await RegistrationResultModel.set(key, {
        success: false,
        message: "Arrangementet finnes ikke",
      });
      return;
    }

    const spotRanges = await selectSpotRangesByHappeningId(happeningId);

    if (!spotRanges) {
      Logger.log(
        `🚫 Failed when processing queue, ${queueId}, spot ranges not found, ${happeningId}`
      );
      await RegistrationResultModel.set(key, {
        success: false,
        message: "Du kan ikke melde deg på dette arrangementet",
      });
      return;
    }

    const existingRegistration = await selectUserRegistrationsByHappeningId(
      userId,
      happeningId
    );

    if (existingRegistration) {
      Logger.log(
        `🚫 Failed when processing queue, ${queueId}, user has existing registration as, ${existingRegistration.status}, ${userId}`
      );
      await RegistrationResultModel.set(key, {
        success: false,
        message:
          existingRegistration.status === "registered"
            ? "Du er allerede påmeldt dette arrangementet"
            : "Du er allerede på venteliste til dette arrangementet",
      });
      return;
    }

    const userSpotRange = spotRanges.find((range) => {
      return user.year! >= range.minYear && user.year! <= range.maxYear;
    });

    if (userSpotRange === undefined) {
      Logger.log(
        `🚫 Failed when processing queue, ${queueId}, user not allowed to register, ${userId}`
      );
      await RegistrationResultModel.set(key, {
        success: false,
        message: "Du kan ikke melde deg på dette arrangementet",
      });
      return;
    }

    const happeningQuestions = await selectQuestionsByHappeningId(happeningId);

    const isAllQuestionsAnswered = happeningQuestions.every((question) => {
      const questionExists = userQuestions.find(
        (q) => q.questionId === question.id
      );
      const questionAnswer = questionExists?.answer;

      return question.required ? !!questionAnswer : true;
    });

    if (!isAllQuestionsAnswered) {
      Logger.log(
        `🚫 Failed when processing queue, ${queueId}, not all questions answered, ${userId}`
      );
      await RegistrationResultModel.set(key, {
        success: false,
        message: "Du må svare på alle spørsmålene",
      });
      return;
    }

    const result = await insertUserRegistration(
      userId,
      happeningId,
      userSpotRange.spots,
      userSpotRange.minYear,
      userSpotRange.maxYear
    );

    if (result === "failure") {
      Logger.log(
        `🚫 Failed when processing queue, ${queueId}, failed to insert registration, ${userId}`
      );
      await RegistrationResultModel.set(key, {
        success: false,
        message: "Noe gikk galt, prøv igjen",
      });
      return;
    }

    Logger.log(
      `📣 User, ${userId}, is registered as, ${result}, for happening, ${happeningId}`
    );

    await RegistrationResultModel.set(key, {
      success: true,
      message:
        result === "waitlisted"
          ? "Du er nå på venteliste"
          : "Du er nå påmeldt arrangementet",
    });
  },
});
