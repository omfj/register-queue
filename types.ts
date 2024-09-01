export type Answer = Array<string> | string | undefined;

export interface Question {
  questionId: string;
  answer: Answer;
}

export interface RegistrationRequest {
  userId: string;
  happeningId: string;
  questions: Array<Question>;
}
