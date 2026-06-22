import type { CourseForm, CourseLevel, LessonType } from './types';

export const INITIAL_FORM: CourseForm = {
  title: '', categoryId: '', categoryName: '', subCategoryId: '', subCategoryName: '',
  level: 'ALL_LEVELS', language: 'English',
  shortDescription: '', detailedDescription: '',
  whatYouLearn: '', whoIsFor: '', prerequisites: '', learningOutcomes: '',
  thumbnailKey: null, thumbnailUri: null, promoVideoUrl: '', promoVideoUri: null,
  sections: [{
    title: 'Introduction', description: '', order: 0,
    lessons: [{
      title: 'Getting Started', type: 'VIDEO' as LessonType, content: '', duration: 0,
      isFreePreview: true, order: 0, videoUri: null, quizQuestions: [],
      assignmentDelivery: 'text' as const,
    }],
  }],
  isFree: true, price: '', discountPercent: '', discountValidTill: '',
  hasLifetimeAccess: true, courseExpiryDate: '', requirements: '',
  promoCodes: [],
};

export const STEPS = [
  { title: 'Basic Details', group: 'PLAN YOUR COURSE' },
  { title: 'Description', group: 'PLAN YOUR COURSE' },
  { title: 'Learning Goals', group: 'TARGET YOUR LEARNERS' },
  { title: 'Course Media', group: 'CREATE YOUR CONTENT' },
  { title: 'Curriculum', group: 'CREATE YOUR CONTENT' },
  { title: 'Pricing', group: 'PUBLISH' },
  { title: 'Access & Promos', group: 'PUBLISH' },
];

export const LEVELS: { value: CourseLevel; label: string }[] = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
  { value: 'ALL_LEVELS', label: 'All Levels' },
];

export const LANGUAGES = [
  'English', 'Hindi', 'Tamil', 'Telugu', 'Malayalam', 'Kannada', 'Bengali', 'Marathi',
];

export const LESSON_TYPES: { value: LessonType; label: string }[] = [
  { value: 'VIDEO', label: 'Video' },
  { value: 'ARTICLE', label: 'Article' },
  { value: 'QUIZ', label: 'Quiz' },
  { value: 'ASSIGNMENT', label: 'Assignment' },
  { value: 'RESOURCE', label: 'Resource' },
];
