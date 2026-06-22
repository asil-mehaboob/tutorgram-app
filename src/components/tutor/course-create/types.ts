export type LessonType = 'VIDEO' | 'ARTICLE' | 'QUIZ' | 'ASSIGNMENT' | 'RESOURCE';
export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL_LEVELS';
export type DeliveryType = 'recorded' | 'live';
export type QuizQuestionType = 'mcq' | 'true-false' | 'multiple-select' | 'short-answer';

export type QuizQuestion = {
  id: string;
  questionType: QuizQuestionType;
  question: string;
  options: string[];
  correctAnswer: number;
  correctAnswers: number[];
  shortAnswer: string;
  explanation: string;
};

export type FormLesson = {
  id?: string;
  title: string;
  type: LessonType;
  content: string;
  duration: number;
  isFreePreview: boolean;
  order: number;
  videoUri?: string | null;
  quizQuestions: QuizQuestion[];
  assignmentDelivery: 'file' | 'text';
  assignmentFileUri?: string | null;
  assignmentFileName?: string | null;
  resourceFileUri?: string | null;
  resourceFileName?: string | null;
};

export type FormSection = {
  id?: string;
  title: string;
  description: string;
  order: number;
  lessons: FormLesson[];
};

export type PromoCode = {
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: string;
  validFrom: string;
  validTill: string;
  usageLimit: string;
  isActive: boolean;
};

export type CourseForm = {
  title: string;
  categoryId: string;
  categoryName: string;
  subCategoryId: string;
  subCategoryName: string;
  level: CourseLevel;
  language: string;
  shortDescription: string;
  detailedDescription: string;
  whatYouLearn: string;
  whoIsFor: string;
  prerequisites: string;
  learningOutcomes: string;
  thumbnailKey: string | null;
  thumbnailUri: string | null;
  promoVideoUrl: string;
  promoVideoUri: string | null;
  sections: FormSection[];
  isFree: boolean;
  price: string;
  discountPercent: string;
  discountValidTill: string;
  hasLifetimeAccess: boolean;
  courseExpiryDate: string;
  requirements: string;
  promoCodes: PromoCode[];
};
