import { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, WarningCircle, X } from 'phosphor-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { Fonts, Spacing } from '@/constants/theme';
import { tutorApiRequest } from '@/lib/api/tutor-client';
import { getCourse } from '@/lib/api/tutor-courses';
import type { Category } from '@/lib/api/tutor-courses';

import { INITIAL_FORM, STEPS } from '@/components/tutor/course-create/constants';
import { Step1 } from '@/components/tutor/course-create/step1';
import { Step2 } from '@/components/tutor/course-create/step2';
import { Step3 } from '@/components/tutor/course-create/step3';
import { Step4 } from '@/components/tutor/course-create/step4';
import { Step5 } from '@/components/tutor/course-create/step5';
import { Step6 } from '@/components/tutor/course-create/step6';
import { Step7 } from '@/components/tutor/course-create/step7';
import type { CourseForm } from '@/components/tutor/course-create/types';

// ─── Payload builder ──────────────────────────────────────────────────────────

function buildPayload(form: CourseForm) {
  return {
    title: form.title.trim(),
    categoryId: form.categoryId,
    subCategoryId: form.subCategoryId || null,
    level: form.level,
    language: form.language,
    shortDescription: form.shortDescription.trim(),
    detailedDescription: form.detailedDescription.trim(),
    whatYouLearn: form.whatYouLearn.trim(),
    whoIsFor: form.whoIsFor.trim() || null,
    prerequisites: form.prerequisites.trim() || null,
    learningOutcomes: form.learningOutcomes.trim() || null,
    thumbnail: form.thumbnailKey,
    promoVideoUrl: form.promoVideoUrl.trim() || null,
    sections: form.sections.map((s, si) => ({
      ...(s.id ? { id: s.id } : {}),
      title: s.title,
      description: s.description,
      order: si,
      lessons: s.lessons.map((l, li) => ({
        ...(l.id ? { id: l.id } : {}),
        title: l.title,
        type: l.type,
        content: l.content,
        duration: l.duration,
        isFreePreview: l.isFreePreview,
        order: li,
        quizQuestions: l.type === 'QUIZ' ? l.quizQuestions.map((q, qi) => ({
          id: q.id,
          question: q.question,
          options: q.questionType === 'short-answer'
            ? { type: 'short-answer', answer: q.shortAnswer }
            : q.questionType === 'multiple-select'
            ? { type: 'multiple-select', choices: q.options, correctAnswers: q.correctAnswers }
            : q.questionType === 'true-false'
            ? { type: 'true-false', choices: ['True', 'False'] }
            : { type: 'mcq', choices: q.options },
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          order: qi,
        })) : [],
      })),
    })),
    isFree: form.isFree,
    price: form.isFree ? null : (parseFloat(form.price) || null),
    discountPercent: form.isFree ? null : (parseInt(form.discountPercent, 10) || null),
    discountValidTill: form.discountValidTill || null,
    hasLifetimeAccess: form.hasLifetimeAccess,
    courseExpiryDate: form.hasLifetimeAccess ? null : (form.courseExpiryDate || null),
    requirements: form.requirements.trim() || null,
    promoCodes: form.isFree ? [] : form.promoCodes.map((pc) => ({
      code: pc.code,
      discountType: pc.discountType,
      discountValue: parseFloat(pc.discountValue) || 0,
      validFrom: pc.validFrom,
      validTill: pc.validTill,
      usageLimit: pc.usageLimit ? parseInt(pc.usageLimit, 10) : null,
      isActive: pc.isActive,
    })),
  };
}

// ─── Step validator ───────────────────────────────────────────────────────────

function validateStep(step: number, form: CourseForm): string | null {
  switch (step) {
    case 0:
      if (!form.title.trim() || form.title.trim().length < 5) return 'Course title must be at least 5 characters';
      if (!form.categoryId) return 'Please select a category';
      return null;
    case 1:
      if (form.shortDescription.trim().length < 10) return 'Short description must be at least 10 characters';
      if (form.shortDescription.trim().length > 300) return 'Short description must be under 300 characters';
      if (form.detailedDescription.replace(/<[^>]*>/g, '').trim().length < 50) return 'Detailed description must be at least 50 characters';
      return null;
    case 2:
      if (!form.whatYouLearn.replace(/<[^>]*>/g, '').trim()) return 'Please describe what students will learn';
      return null;
    case 3:
      return null;
    case 4:
      if (form.sections.length === 0) return 'Add at least one section';
      if (form.sections.every((s) => s.lessons.length === 0)) return 'Add at least one lesson to a section';
      return null;
    case 5:
      if (!form.isFree && (!form.price || parseFloat(form.price) <= 0)) return 'Please enter a valid course price';
      return null;
    case 6:
      if (!form.hasLifetimeAccess && !form.courseExpiryDate) return 'Please set a course expiry date';
      return null;
    default:
      return null;
  }
}

// ─── Ensure lesson ID ─────────────────────────────────────────────────────────
// Mirrors the web app's draft-save-before-upload pattern: saves the course as a
// draft (creating it if needed) to get real DB IDs, then returns the DB ID for
// the lesson at [sectionIdx][lessonIdx]. Also promotes all returned IDs into
// form state so subsequent calls don't re-save unnecessarily.

async function ensureLessonId(
  currentForm: CourseForm,
  currentDraftId: string | null,
  si: number,
  li: number,
  onDraftCreated: (id: string) => void,
  onIdsPromoted: (sections: CourseForm['sections']) => void
): Promise<string> {
  const payload = buildPayload(currentForm);
  let courseId = currentDraftId;

  if (!courseId) {
    const res = await tutorApiRequest<{ id: string }>('/api/courses/draft', { method: 'POST', body: payload });
    courseId = res.id;
    onDraftCreated(courseId);
  } else {
    await tutorApiRequest(`/api/courses/${courseId}/draft`, { method: 'PUT', body: payload });
  }

  const saved = await getCourse(courseId);
  const savedSections = (saved.sections ?? []).slice().sort((a, b) => a.order - b.order);

  // Promote all returned DB IDs into form state
  const promoted = currentForm.sections.map((sec, secIdx) => {
    const savedSec = savedSections[secIdx];
    if (!savedSec) return sec;
    const savedLessons = savedSec.lessons.slice().sort((a, b) => a.order - b.order);
    return {
      ...sec,
      id: sec.id ?? savedSec.id,
      lessons: sec.lessons.map((l, lessonIdx) => ({
        ...l,
        id: l.id ?? savedLessons[lessonIdx]?.id,
      })),
    };
  });
  onIdsPromoted(promoted);

  const savedSection = savedSections[si];
  const savedLesson = savedSection?.lessons.slice().sort((a, b) => a.order - b.order)[li];
  if (!savedLesson?.id) throw new Error('Could not determine lesson ID. Please try again.');
  return savedLesson.id;
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

export default function CreateCourse() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [form, setForm] = useState<CourseForm>(INITIAL_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => tutorApiRequest<Category[]>('/api/categories'),
    staleTime: 10 * 60_000,
  });

  function update(changes: Partial<CourseForm> | ((prev: CourseForm) => Partial<CourseForm>)) {
    if (typeof changes === 'function') {
      setForm((prev) => ({ ...prev, ...changes(prev) }));
    } else {
      setForm((prev) => ({ ...prev, ...changes }));
    }
  }

  async function saveDraft(silent = false) {
    if (!silent) setIsSaving(true);
    try {
      const payload = buildPayload(form);
      if (draftId) {
        await tutorApiRequest(`/api/courses/${draftId}/draft`, { method: 'PUT', body: payload });
      } else {
        const res = await tutorApiRequest<{ id: string }>('/api/courses/draft', { method: 'POST', body: payload });
        setDraftId(res.id);
      }
    } catch {
      if (!silent) setError('Failed to save draft. Please try again.');
    } finally {
      if (!silent) setIsSaving(false);
    }
  }

  async function handleContinue() {
    const err = validateStep(step, form);
    if (err) { setError(err); return; }
    setError('');

    if (step === 0 && !draftId) {
      saveDraft(true);
    } else if (draftId) {
      saveDraft(true);
    }

    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      await handleSubmit();
    }
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setError('');
    try {
      const payload = buildPayload(form);
      let courseId = draftId;
      if (!courseId) {
        const res = await tutorApiRequest<{ id: string }>('/api/courses', { method: 'POST', body: payload });
        courseId = res.id;
      } else {
        await tutorApiRequest(`/api/courses/${courseId}`, { method: 'PUT', body: payload });
        await tutorApiRequest(`/api/courses/${courseId}/publish`, { method: 'POST', body: { action: 'publish' } });
      }
      router.replace({ pathname: '/tutor-course/[id]/edit', params: { id: courseId! } });
    } catch (e: any) {
      setError(e.message ?? 'Failed to create course. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function makeEnsureLessonId(si: number, li: number) {
    return () =>
      ensureLessonId(
        form,
        draftId,
        si,
        li,
        (id) => setDraftId(id),
        (promoted) => setForm((prev) => ({ ...prev, sections: promoted }))
      );
  }

  const progress = (step / (STEPS.length - 1)) * 100;
  const currentStep = STEPS[step];
  const isLastStep = step === STEPS.length - 1;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => (step === 0 ? router.back() : setStep(step - 1))} style={styles.headerBack} hitSlop={8}>
          {step === 0
            ? <X size={22} color={theme.text} weight="regular" />
            : <ArrowLeft size={22} color={theme.text} weight="regular" />}
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerGroup, { color: theme.textSecondary }]}>{currentStep.group}</Text>
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>{currentStep.title}</Text>
        </View>
        <Pressable
          onPress={() => saveDraft()}
          disabled={isSaving}
          style={[styles.saveDraftBtn, { borderColor: theme.border }]}
        >
          {isSaving
            ? <ActivityIndicator size={12} color={theme.primary} />
            : <Text style={[styles.saveDraftText, { color: theme.primary }]}>Save Draft</Text>}
        </Pressable>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: theme.surfaceEl }]}>
        <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: theme.primary }]} />
      </View>
      <Text style={[styles.stepCount, { color: theme.textSecondary, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        Step {step + 1} of {STEPS.length}
      </Text>

      {/* Step content */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === 0 && <Step1 form={form} update={update} categories={categories} />}
          {step === 1 && <Step2 form={form} update={update} />}
          {step === 2 && <Step3 form={form} update={update} />}
          {step === 3 && <Step4 form={form} update={update} />}
          {step === 4 && <Step5 form={form} update={update} makeEnsureLessonId={makeEnsureLessonId} />}
          {step === 5 && <Step6 form={form} update={update} />}
          {step === 6 && <Step7 form={form} update={update} />}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: theme.border, paddingBottom: insets.bottom + 12, backgroundColor: theme.surface }]}>
        {error ? (
          <View style={[styles.errorBanner, { backgroundColor: `${theme.error}12`, borderColor: `${theme.error}30` }]}>
            <WarningCircle size={16} color={theme.error} weight="fill" />
            <Text style={[styles.errorBannerText, { color: theme.error }]} numberOfLines={2}>{error}</Text>
          </View>
        ) : null}
        <View style={styles.footerBtns}>
          {step > 0 && (
            <Pressable
              onPress={() => { setError(''); setStep(step - 1); }}
              style={[styles.backBtn, { borderColor: theme.border, flex: 1 }]}
            >
              <ArrowLeft size={16} color={theme.text} weight="regular" />
              <Text style={[styles.backBtnText, { color: theme.text }]}>Back</Text>
            </Pressable>
          )}
          <Pressable
            onPress={handleContinue}
            disabled={isSubmitting}
            style={[styles.continueBtn, { backgroundColor: theme.primary, flex: 1, opacity: isSubmitting ? 0.8 : 1 }]}
          >
            {isSubmitting
              ? <ActivityIndicator color="#fff" />
              : (
                <>
                  <Text style={styles.continueBtnText}>
                    {isLastStep ? 'Publish Course' : 'Continue'}
                  </Text>
                  {!isLastStep && <ArrowRight size={16} color="#fff" weight="bold" />}
                </>
              )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: Spacing.three, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBack: { padding: 4 },
  headerCenter: { flex: 1, gap: 2 },
  headerGroup: { fontSize: 10, fontFamily: Fonts.semiBold, textTransform: 'uppercase', letterSpacing: 0.5 },
  headerTitle: { fontSize: 16, fontFamily: Fonts.bold },
  saveDraftBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, minWidth: 80, alignItems: 'center' },
  saveDraftText: { fontSize: 12, fontFamily: Fonts.semiBold },
  progressTrack: { height: 3 },
  progressFill: { height: 3 },
  stepCount: {
    fontSize: 11, fontFamily: Fonts.medium,
    paddingHorizontal: Spacing.three, paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scroll: { padding: Spacing.three, paddingBottom: 24, gap: 20 },
  footer: { gap: 0, paddingHorizontal: Spacing.three, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  footerBtns: { flexDirection: 'row', gap: 10 },
  backBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  backBtnText: { fontSize: 14, fontFamily: Fonts.semiBold },
  continueBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  continueBtnText: { fontSize: 15, fontFamily: Fonts.bold, color: '#fff' },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  errorBannerText: { flex: 1, fontSize: 13, fontFamily: Fonts.medium, lineHeight: 18 },
});
