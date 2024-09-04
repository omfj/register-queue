export type Answer = Array<string> | string | undefined;

export type Question = {
  questionId: string;
  answer: Answer;
};

export type RegistrationRequest = {
  userId: string;
  happeningId: string;
  questions: Array<Question>;
};
