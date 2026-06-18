import { tutorApiRequest } from './tutor-client';

export type CommunicationOverview = {
  unreadMessages: number;
  unansweredQuestions: number;
  unrepliedReviews: number;
};

export type TutorMessage = {
  id: string;
  studentName: string;
  studentAvatar: string | null;
  courseTitle: string;
  lastMessage: string;
  lastMessageAt: string;
  isUnread: boolean;
};

export type TutorQuestion = {
  id: string;
  studentName: string;
  studentAvatar: string | null;
  courseTitle: string;
  question: string;
  answer: string | null;
  createdAt: string;
  isAnswered: boolean;
};

export type TutorReview = {
  id: string;
  studentName: string;
  studentAvatar: string | null;
  courseTitle: string;
  rating: number;
  title: string | null;
  comment: string;
  tutorReply: string | null;
  createdAt: string;
};

export async function getCommunicationsOverview(): Promise<CommunicationOverview> {
  return tutorApiRequest<CommunicationOverview>('/api/dashboard/communication/overview');
}

export async function getMessages(): Promise<TutorMessage[]> {
  return tutorApiRequest<TutorMessage[]>('/api/dashboard/communication/messages');
}

export async function getQA(): Promise<TutorQuestion[]> {
  return tutorApiRequest<TutorQuestion[]>('/api/dashboard/communication/qa');
}

export async function getCommunicationReviews(): Promise<TutorReview[]> {
  return tutorApiRequest<TutorReview[]>('/api/dashboard/communication/reviews');
}

export async function replyToReview(reviewId: string, reply: string): Promise<void> {
  await tutorApiRequest(`/api/dashboard/communication/reviews/${reviewId}/reply`, {
    method: 'POST',
    body: { reply },
  });
}

export async function answerQuestion(questionId: string, answer: string): Promise<void> {
  await tutorApiRequest(`/api/dashboard/communication/qa/${questionId}/answer`, {
    method: 'POST',
    body: { answer },
  });
}
