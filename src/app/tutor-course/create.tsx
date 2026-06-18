import { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, BookOpen } from 'phosphor-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { Fonts, Spacing } from '@/constants/theme';
import { Input } from '@/components/ui/input';
import { createCourse, getCategories } from '@/lib/api/tutor-courses';
import type { CourseLevel } from '@/lib/api/tutor-courses';

const LEVELS: { value: CourseLevel; label: string }[] = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
  { value: 'ALL_LEVELS', label: 'All Levels' },
];

const LANGUAGES = ['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Bengali', 'Marathi'];

const TOTAL_STEPS = 2;

function StepIndicator({ current }: { current: number }) {
  const theme = useTheme();
  const LABELS = ['Basics', 'Category'];
  return (
    <View style={[styles.stepBar, { borderBottomColor: theme.border }]}>
      {LABELS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <View key={label} style={styles.stepItem}>
            <View style={[
              styles.stepCircle,
              done ? { backgroundColor: theme.primary } :
              active ? { backgroundColor: theme.primary } :
              { backgroundColor: theme.surfaceEl, borderWidth: 1, borderColor: theme.border },
            ]}>
              {done
                ? <Check size={12} color="#fff" weight="bold" />
                : <Text style={[styles.stepNum, { color: active ? '#fff' : theme.textSecondary }]}>{i + 1}</Text>
              }
            </View>
            <Text style={[styles.stepLabel, { color: active || done ? theme.primary : theme.textSecondary }]}>
              {label}
            </Text>
            {i < LABELS.length - 1 && (
              <View style={[styles.stepConnector, { backgroundColor: done ? theme.primary : theme.border }]} />
            )}
          </View>
        );
      })}
    </View>
  );
}

export default function CreateCourse() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);

  // Step 0 state
  const [title, setTitle] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [level, setLevel] = useState<CourseLevel>('ALL_LEVELS');
  const [language, setLanguage] = useState('English');

  // Step 1 state
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');

  const [error, setError] = useState('');

  const categoriesQ = useQuery({ queryKey: ['categories'], queryFn: getCategories, staleTime: 10 * 60_000 });

  const mutation = useMutation({
    mutationFn: () => createCourse({
      title: title.trim(),
      shortDescription: shortDesc.trim() || undefined,
      categoryId,
      subCategoryId: subcategoryId || null,
      level,
      language,
      isFree: true,
      sections: [{
        title: 'Introduction',
        description: '',
        order: 0,
        lessons: [{
          title: 'Getting Started',
          type: 'VIDEO',
          content: '',
          duration: 0,
          isFreePreview: true,
          order: 0,
        }],
      }],
    }),
    onSuccess: (course) => {
      router.replace({ pathname: '/tutor-course/[id]/edit', params: { id: course.id } });
    },
    onError: (e: Error) => setError(e.message),
  });

  function handleNext() {
    setError('');
    if (step === 0) {
      if (!title.trim()) { setError('Course title is required'); return; }
      if (title.trim().length < 5) { setError('Title must be at least 5 characters'); return; }
      setStep(1);
    } else {
      if (!categoryId) { setError('Please select a category'); return; }
      mutation.mutate();
    }
  }

  const selectedCategory = categoriesQ.data?.find((c) => c.id === categoryId);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <Pressable onPress={() => step === 0 ? router.back() : setStep(0)} style={styles.backBtn}>
            <ArrowLeft size={22} color={theme.text} weight="regular" />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>New Course</Text>
          <View style={{ width: 30 }} />
        </View>

        <StepIndicator current={step} />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {step === 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Course Basics</Text>
              <Text style={[styles.sectionDesc, { color: theme.textSecondary }]}>
                Start with the fundamentals. You can always edit everything later.
              </Text>

              <Input
                label="Course Title *"
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Complete React Native Development"
              />
              <Input
                label="Short Description"
                value={shortDesc}
                onChangeText={setShortDesc}
                placeholder="Brief summary of what students will learn..."
                multiline
                numberOfLines={3}
                style={{ minHeight: 80, textAlignVertical: 'top' }}
              />

              <View style={styles.fieldBlock}>
                <Text style={[styles.fieldLabel, { color: theme.text }]}>Level</Text>
                <View style={styles.chipGrid}>
                  {LEVELS.map((l) => (
                    <Pressable
                      key={l.value}
                      onPress={() => setLevel(l.value)}
                      style={[
                        styles.optionChip,
                        level === l.value
                          ? { backgroundColor: theme.primaryLight, borderColor: theme.primary }
                          : { backgroundColor: theme.surface, borderColor: theme.border },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: level === l.value ? theme.primary : theme.textSecondary }]}>
                        {l.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.fieldBlock}>
                <Text style={[styles.fieldLabel, { color: theme.text }]}>Language</Text>
                <View style={styles.chipGrid}>
                  {LANGUAGES.map((lang) => (
                    <Pressable
                      key={lang}
                      onPress={() => setLanguage(lang)}
                      style={[
                        styles.roundChip,
                        language === lang
                          ? { backgroundColor: theme.primaryLight, borderColor: theme.primary }
                          : { backgroundColor: theme.surface, borderColor: theme.border },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: language === lang ? theme.primary : theme.textSecondary }]}>
                        {lang}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          )}

          {step === 1 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Pick a Category</Text>
              <Text style={[styles.sectionDesc, { color: theme.textSecondary }]}>
                Help students find your course. Category is required.
              </Text>

              {categoriesQ.isLoading ? (
                <View style={styles.loadingBlock}>
                  <ActivityIndicator color={theme.primary} />
                </View>
              ) : categoriesQ.isError ? (
                <View style={styles.loadingBlock}>
                  <Text style={[styles.sectionDesc, { color: theme.textSecondary }]}>Failed to load categories</Text>
                </View>
              ) : (
                <>
                  <View style={styles.fieldBlock}>
                    <Text style={[styles.fieldLabel, { color: theme.text }]}>Category *</Text>
                    <View style={styles.categoryGrid}>
                      {(categoriesQ.data ?? []).map((c) => {
                        const selected = categoryId === c.id;
                        return (
                          <Pressable
                            key={c.id}
                            onPress={() => { setCategoryId(c.id); setSubcategoryId(''); }}
                            style={[
                              styles.categoryCard,
                              {
                                backgroundColor: selected ? theme.primaryLight : theme.surface,
                                borderColor: selected ? theme.primary : theme.border,
                              },
                            ]}
                          >
                            <BookOpen size={18} color={selected ? theme.primary : theme.textSecondary} weight={selected ? 'fill' : 'regular'} />
                            <Text
                              style={[styles.categoryCardText, { color: selected ? theme.primary : theme.text }]}
                              numberOfLines={2}
                            >
                              {c.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  {(selectedCategory?.subcategories?.length ?? 0) > 0 && (
                    <View style={styles.fieldBlock}>
                      <Text style={[styles.fieldLabel, { color: theme.text }]}>Subcategory</Text>
                      <View style={styles.chipGrid}>
                        {selectedCategory!.subcategories.map((s) => (
                          <Pressable
                            key={s.id}
                            onPress={() => setSubcategoryId(s.id)}
                            style={[
                              styles.roundChip,
                              subcategoryId === s.id
                                ? { backgroundColor: theme.primaryLight, borderColor: theme.primary }
                                : { backgroundColor: theme.surface, borderColor: theme.border },
                            ]}
                          >
                            <Text style={[styles.chipText, { color: subcategoryId === s.id ? theme.primary : theme.textSecondary }]}>
                              {s.name}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  )}
                </>
              )}
            </View>
          )}

          {error ? (
            <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          ) : null}

          <Pressable
            onPress={handleNext}
            disabled={mutation.isPending}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: theme.primary, opacity: pressed || mutation.isPending ? 0.85 : 1 },
            ]}
          >
            {mutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : step < TOTAL_STEPS - 1 ? (
              <>
                <Text style={styles.primaryBtnText}>Continue</Text>
                <ArrowRight size={18} color="#fff" weight="bold" />
              </>
            ) : (
              <Text style={styles.primaryBtnText}>Create Course</Text>
            )}
          </Pressable>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontFamily: Fonts.bold },

  stepBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 0,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNum: { fontSize: 12, fontFamily: Fonts.bold },
  stepLabel: { fontSize: 12, fontFamily: Fonts.semiBold },
  stepConnector: { width: 40, height: 2, marginHorizontal: 8 },

  scroll: { padding: Spacing.three, gap: 24, paddingBottom: 40 },
  section: { gap: 20 },
  sectionTitle: { fontSize: 22, fontFamily: Fonts.extraBold, letterSpacing: -0.4 },
  sectionDesc: { fontSize: 14, fontFamily: Fonts.regular, lineHeight: 20, marginTop: -12 },

  fieldBlock: { gap: 10 },
  fieldLabel: { fontSize: 13, fontFamily: Fonts.semiBold },

  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  roundChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontFamily: Fonts.medium },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryCard: {
    width: '47%',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    alignItems: 'flex-start',
  },
  categoryCardText: { fontSize: 13, fontFamily: Fonts.semiBold, lineHeight: 18 },

  loadingBlock: { paddingVertical: 32, alignItems: 'center' },

  errorText: { fontSize: 13, fontFamily: Fonts.regular, textAlign: 'center' },
  primaryBtn: {
    height: 52,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  primaryBtnText: { fontSize: 15, fontFamily: Fonts.bold, color: '#fff' },
});
