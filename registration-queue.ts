import { RegistrationRequest } from "./types.ts";
import { createQueue } from "./queue.ts";
import {
  insertUserRegistration,
  selectCompleteUserById,
  selectHappeningById,
  selectSpotRangesByHappeningId,
  selectUserRegistrationsByHappeningId,
} from "./queries.ts";
import { kv } from "./kv.ts";
import { selectQuestionsByHappeningId } from "./queries.ts";

export const { enqueue: enqueueRegistrationRequest } =
  createQueue<RegistrationRequest>(kv, {
    queueId: "registration-queue",
    handler: async ({
      queueId,
      data: { userId, happeningId, questions: userQuestions },
    }) => {
      const user = await selectCompleteUserById(userId);

      if (!user) {
        console.log(
          `🚫 Failed when processing queue, ${queueId}, user not complete, ${userId}`
        );
        return;
      }

      const happening = await selectHappeningById(happeningId);

      if (!happening) {
        console.log(
          `🚫 Failed when processing queue, ${queueId}, happening not found, ${happeningId}`
        );
        return;
      }

      const spotRanges = await selectSpotRangesByHappeningId(happeningId);

      if (!spotRanges) {
        console.log(
          `🚫 Failed when processing queue, ${queueId}, spot ranges not found, ${happeningId}`
        );
        return;
      }

      const existingRegistration = await selectUserRegistrationsByHappeningId(
        userId,
        happeningId
      );

      if (existingRegistration) {
        console.log(
          `🚫 Failed when processing queue, ${queueId}, user has existing registration as, ${existingRegistration.status}, ${userId}`
        );
        return;
      }

      const userSpotRange = spotRanges.find((range) => {
        return user.year! >= range.minYear && user.year! <= range.maxYear;
      });

      if (userSpotRange === undefined) {
        console.log(
          `🚫 Failed when processing queue, ${queueId}, user not allowed to register, ${userId}`
        );
        return;
      }

      const happeningQuestions = await selectQuestionsByHappeningId(
        happeningId
      );

      const isAllQuestionsAnswered = happeningQuestions.every((question) => {
        const questionExists = userQuestions.find(
          (q) => q.questionId === question.id
        );
        const questionAnswer = questionExists?.answer;

        return question.required ? !!questionAnswer : true;
      });

      if (!isAllQuestionsAnswered) {
        console.log(
          `🚫 Failed when processing queue, ${queueId}, not all questions answered, ${userId}`
        );
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
        console.log(
          `🚫 Failed when processing queue, ${queueId}, failed to insert registration, ${userId}`
        );
        return;
      }

      console.log(
        `📣 User, ${userId}, is registered as, ${result}, for happening, ${happeningId}`
      );
    },
  });
