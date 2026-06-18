import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check } from 'phosphor-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { Fonts, Spacing } from '@/constants/theme';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { createCourse, getCategories } from '@/lib/api/tutor-courses';
import type { CourseLevel, CreateCourseInput } from '@/lib/api/tutor-courses';

const LEVELS: { value: CourseLevel; label: string }[] = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
  { value: 'ALL_LEVELS', label: 'All Levels' },
];

const LANGUAGES = ['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Bengali', 'Marathi'];

function StepIndicator({ current, total }: { current: number; total: number }) {
  const theme = useTheme();
  return (
    <View style={styles.stepRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={styles.stepItem}>
          <View style={[
            styles.stepCircle,
            i < current ? { backgroundColor: theme.primary } : i === current ? { backgroundColor: theme.primary, borderWidth: 2, borderColor: theme.primaryLight } : { backgroundColor: theme.surfaceEl },
          ]}>
            {i < current ? (
              <Check size={12} color="#fff" weight="bold" />
            ) : (
              <Text style={[styles.stepNum, { color: i === current ? '#fff' : theme.textSecondary }]}>{i + 1}</Text>
            )}
          </View>
          {i < total - 1 && <View style={[styles.stepLine, { backgroundColor: i < current ? theme.primary : theme.border }]} />}
        </View>
      ))}
    </View>
  );
}

export default function CreateCourse() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [level, setLevel] = useState<CourseLevel>('ALL_LEVELS');
  const [language, setLanguage] = useState('English');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [error, setError] = useState('');

  const categoriesQ = useQuery({ queryKey: ['categories'], queryFn: getCategories, staleTime: 10 * 60_000 });

  const mutation = useMutation({
    mutationFn: () => {
      const payload: CreateCourseInput = { title, shortDescription: shortDesc, level, language };
      if (categoryId) payload.categoryId = categoryId;
      if (subcategoryId) payload.subcategoryId = subcategoryId;
      return createCourse(payload);
    },
    onSuccess: (course) => {
      router.replace({ pathname: '/tutor-course/[id]/edit', params: { id: course.id } });
    },
    onError: (e: Error) => setError(e.message),
  });

  function nextStep() {
    if (step === 0 && !title.trim()) { setError('Title is required'); return; }
    setError('');
    if (step === 1) { mutation.mutate(); return; }
    setStep(step + 1);
  }

  const selectedCategory = categoriesQ.data?.find((c) => c.id === categoryId);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <Pressable onPress={() => step === 0 ? router.back() : setStep(step - 1)} style={styles.back}>
            <ArrowLeft size={22} color={theme.text} weight="bold" />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>New Course</Text>
        </View>

        <StepIndicator current={step} total={2} />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {step === 0 && (
            <>
              <Text style={[styles.stepTitle, { color: theme.text }]}>Course Basics</Text>
              <Text style={[styles.stepDesc, { color: theme.textSecondary }]}>Start with the fundamentals of your course</Text>

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

              <Text style={[styles.fieldLabel, { color: theme.text }]}>Level</Text>
              <View style={styles.optionGrid}>
                {LEVELS.map((l) => (
                  <Pressable
                    key={l.value}
                    onPress={() => setLevel(l.value)}
                    style={[styles.optionBtn, { borderColor: level === l.value ? theme.primary : theme.border, backgroundColor: level === l.value ? theme.primaryLight : theme.surface }]}
                  >
                    <Text style={[styles.optionText, { color: level === l.value ? theme.primary : theme.textSecondary }]}>{l.label}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { color: theme.text }]}>Language</Text>
              <View style={styles.langGrid}>
                {LANGUAGES.map((lang) => (
                  <Pressable
                    key={lang}
                    onPress={() => setLanguage(lang)}
                    style={[styles.langBtn, { borderColor: language === lang ? theme.primary : theme.border, backgroundColor: language === lang ? theme.primaryLight : theme.surface }]}
                  >
                    <Text style={[styles.langText, { color: language === lang ? theme.primary : theme.textSecondary }]}>{lang}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {step === 1 && (
            <>
              <Text style={[styles.stepTitle, { color: theme.text }]}>Category</Text>
              <Text style={[styles.stepDesc, { color: theme.textSecondary }]}>Help students discover your course</Text>

              {categoriesQ.isLoading ? (
                <ActivityIndicator color={theme.primary} style={{ marginVertical: 24 }} />
              ) : (
                <>
                  <Text style={[styles.fieldLabel, { color: theme.text }]}>Category</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                    <View style={styles.catRow}>
                      {categoriesQ.data?.map((c) => (
                        <Pressable
                          key={c.id}
                          onPress={() => { setCategoryId(c.id); setSubcategoryId(''); }}
                          style={[styles.catBtn, { borderColor: categoryId === c.id ? theme.primary : theme.border, backgroundColor: categoryId === c.id ? theme.primaryLight : theme.surface }]}
                        >
                          <Text style={[styles.catText, { color: categoryId === c.id ? theme.primary : theme.textSecondary }]}>{c.name}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>

                  {(selectedCategory?.subcategories?.length ?? 0) > 0 && (
                    <>
                      <Text style={[styles.fieldLabel, { color: theme.text }]}>Subcategory</Text>
                      <View style={styles.langGrid}>
                        {selectedCategory?.subcategories.map((s) => (
                          <Pressable
                            key={s.id}
                            onPress={() => setSubcategoryId(s.id)}
                            style={[styles.langBtn, { borderColor: subcategoryId === s.id ? theme.primary : theme.border, backgroundColor: subcategoryId === s.id ? theme.primaryLight : theme.surface }]}
                          >
                            <Text style={[styles.langText, { color: subcategoryId === s.id ? theme.primary : theme.textSecondary }]}>{s.name}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </>
                  )}
                </>
              )}
            </>
          )}

          {error ? <Text style={[styles.error, { color: theme.error }]}>{error}</Text> : null}

          <Pressable
            onPress={nextStep}
            disabled={mutation.isPending}
            style={({ pressed }) => [styles.nextBtn, { backgroundColor: theme.primary, opacity: pressed || mutation.isPending ? 0.85 : 1 }]}
          >
            {mutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.nextBtnText}>{step === 1 ? 'Create Course' : 'Continue'}</Text>
                {step < 1 && <ArrowRight size={18} color="#fff" weight="bold" />}
              </>
            )}
          </Pressable>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.three, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  back: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: Fonts.bold },
  stepRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, gap: 0 },
  stepItem: { flexDirection: 'row', alignItems: 'center' },
  stepCircle: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  stepNum: { fontSize: 12, fontFamily: Fonts.bold },
  stepLine: { width: 48, height: 2 },
  scroll: { padding: Spacing.three, gap: 16 },
  stepTitle: { fontSize: 22, fontFamily: Fonts.extraBold, letterSpacing: -0.4 },
  stepDesc: { fontSize: 14, fontFamily: Fonts.regular, lineHeight: 20, marginTop: -8 },
  fieldLabel: { fontSize: 13, fontFamily: Fonts.semiBold, marginBottom: -8 },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  optionText: { fontSize: 13, fontFamily: Fonts.medium },
  langGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  langBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  langText: { fontSize: 12, fontFamily: Fonts.medium },
  catScroll: { marginHorizontal: -Spacing.three },
  catRow: { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.three },
  catBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  catText: { fontSize: 13, fontFamily: Fonts.medium },
  error: { fontSize: 13, fontFamily: Fonts.regular, textAlign: 'center' },
  nextBtn: { height: 52, borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  nextBtnText: { fontSize: 15, fontFamily: Fonts.bold, color: '#fff' },
});
