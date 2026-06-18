import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, BookOpen, CurrencyInr, Image as ImageIcon, ListBullets } from 'phosphor-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { Fonts, Spacing } from '@/constants/theme';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { StatusChip } from '@/components/tutor/status-chip';
import { getCourse, updateCourse, publishCourse, saveCourseDraft } from '@/lib/api/tutor-courses';
import type { CourseLevel, UpdateCourseInput } from '@/lib/api/tutor-courses';

const LEVELS: { value: CourseLevel; label: string }[] = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
  { value: 'ALL_LEVELS', label: 'All Levels' },
];

type ActiveTab = 'basics' | 'details' | 'pricing';

export default function EditCourse() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [tab, setTab] = useState<ActiveTab>('basics');

  // Basics
  const [title, setTitle] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [level, setLevel] = useState<CourseLevel>('ALL_LEVELS');
  const [language, setLanguage] = useState('English');
  const [promoUrl, setPromoUrl] = useState('');

  // Details
  const [detailedDesc, setDetailedDesc] = useState('');
  const [whatYouLearn, setWhatYouLearn] = useState('');
  const [whoIsFor, setWhoIsFor] = useState('');
  const [requirements, setRequirements] = useState('');

  // Pricing
  const [isFree, setIsFree] = useState(false);
  const [priceStr, setPriceStr] = useState('');
  const [discountStr, setDiscountStr] = useState('');

  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState('');

  const { data: course, isLoading } = useQuery({
    queryKey: ['tutor-course', id],
    queryFn: () => getCourse(id!),
    enabled: !!id,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (course && !initialized) {
      setTitle(course.title);
      setShortDesc(course.shortDescription ?? '');
      setLevel(course.level);
      setLanguage(course.language);
      setPromoUrl(course.promoVideoUrl ?? '');
      setDetailedDesc(course.detailedDescription ?? '');
      setWhatYouLearn(course.whatYouLearn?.join('\n') ?? '');
      setWhoIsFor(course.whoIsFor?.join('\n') ?? '');
      setRequirements(course.requirements?.join('\n') ?? '');
      setIsFree(course.isFree);
      setPriceStr(course.price != null ? String(course.price) : '');
      setDiscountStr(course.discountPercent != null ? String(course.discountPercent) : '');
      setInitialized(true);
    }
  }, [course, initialized]);

  function buildPayload(): UpdateCourseInput {
    const payload: UpdateCourseInput = { title, shortDescription: shortDesc, level, language, promoVideoUrl: promoUrl, detailedDescription: detailedDesc, isFree };
    payload.whatYouLearn = whatYouLearn.split('\n').filter((l) => l.trim());
    payload.whoIsFor = whoIsFor.split('\n').filter((l) => l.trim());
    payload.requirements = requirements.split('\n').filter((l) => l.trim());
    if (!isFree) {
      const p = parseFloat(priceStr);
      const d = parseFloat(discountStr);
      if (!isNaN(p)) payload.price = p;
      if (!isNaN(d)) payload.discountPercent = d;
    }
    return payload;
  }

  const saveDraftM = useMutation({
    mutationFn: () => saveCourseDraft(id!, buildPayload()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tutor-course', id] }); setError(''); },
    onError: (e: Error) => setError(e.message),
  });

  const publishM = useMutation({
    mutationFn: async () => {
      await saveCourseDraft(id!, buildPayload());
      await publishCourse(id!);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tutor-course', id] }); router.back(); },
    onError: (e: Error) => setError(e.message),
  });

  const TABS: { key: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { key: 'basics', label: 'Basics', icon: <BookOpen size={15} color={tab === 'basics' ? theme.primary : theme.textSecondary} /> },
    { key: 'details', label: 'Details', icon: <ListBullets size={15} color={tab === 'details' ? theme.primary : theme.textSecondary} /> },
    { key: 'pricing', label: 'Pricing', icon: <CurrencyInr size={15} color={tab === 'pricing' ? theme.primary : theme.textSecondary} /> },
  ];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <Pressable onPress={() => router.back()} style={styles.back}>
            <ArrowLeft size={22} color={theme.text} weight="bold" />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>{course?.title ?? 'Edit Course'}</Text>
            {course && <StatusChip status={course.status} small />}
          </View>
          <Pressable
            onPress={() => router.push({ pathname: '/tutor-course/[id]/curriculum', params: { id: id! } })}
            style={({ pressed }) => [styles.curriculumBtn, { backgroundColor: theme.surfaceEl, opacity: pressed ? 0.7 : 1 }]}
          >
            <ListBullets size={16} color={theme.textSecondary} weight="bold" />
            <Text style={[styles.curriculumText, { color: theme.textSecondary }]}>Curriculum</Text>
          </Pressable>
        </View>

        {/* Tab bar */}
        <View style={[styles.tabBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          {TABS.map((t) => (
            <Pressable key={t.key} onPress={() => setTab(t.key)} style={styles.tabItem}>
              <View style={styles.tabInner}>
                {t.icon}
                <Text style={[styles.tabLabel, { color: t.key === tab ? theme.primary : theme.textSecondary }]}>{t.label}</Text>
              </View>
              {t.key === tab && <View style={[styles.tabIndicator, { backgroundColor: theme.primary }]} />}
            </Pressable>
          ))}
        </View>

        {isLoading ? (
          <View style={styles.center}><ActivityIndicator color={theme.primary} size="large" /></View>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {tab === 'basics' && (
              <>
                <Input label="Title *" value={title} onChangeText={setTitle} placeholder="Course title" />
                <Input label="Short Description" value={shortDesc} onChangeText={setShortDesc} placeholder="Brief summary..." multiline numberOfLines={3} style={{ minHeight: 80, textAlignVertical: 'top' }} />
                <Input label="Promo Video URL" value={promoUrl} onChangeText={setPromoUrl} placeholder="https://..." autoCapitalize="none" />
                <Text style={[styles.fieldLabel, { color: theme.text }]}>Level</Text>
                <View style={styles.optGrid}>
                  {LEVELS.map((l) => (
                    <Pressable key={l.value} onPress={() => setLevel(l.value)} style={[styles.optBtn, { borderColor: level === l.value ? theme.primary : theme.border, backgroundColor: level === l.value ? theme.primaryLight : theme.surface }]}>
                      <Text style={[styles.optText, { color: level === l.value ? theme.primary : theme.textSecondary }]}>{l.label}</Text>
                    </Pressable>
                  ))}
                </View>
                <Input label="Language" value={language} onChangeText={setLanguage} placeholder="e.g. English" />
              </>
            )}

            {tab === 'details' && (
              <>
                <Input label="Detailed Description" value={detailedDesc} onChangeText={setDetailedDesc} placeholder="Comprehensive description of your course..." multiline numberOfLines={8} style={{ minHeight: 160, textAlignVertical: 'top' }} />
                <Input label="What You'll Learn (one per line)" value={whatYouLearn} onChangeText={setWhatYouLearn} placeholder="Build React Native apps&#10;Deploy to App Store&#10;..." multiline numberOfLines={5} style={{ minHeight: 100, textAlignVertical: 'top' }} />
                <Input label="Who This Course Is For (one per line)" value={whoIsFor} onChangeText={setWhoIsFor} placeholder="Beginners who want to learn...&#10;Developers looking to...&#10;..." multiline numberOfLines={4} style={{ minHeight: 80, textAlignVertical: 'top' }} />
                <Input label="Requirements (one per line)" value={requirements} onChangeText={setRequirements} placeholder="Basic JavaScript knowledge&#10;A computer with internet...&#10;..." multiline numberOfLines={4} style={{ minHeight: 80, textAlignVertical: 'top' }} />
              </>
            )}

            {tab === 'pricing' && (
              <>
                <View style={styles.freeRow}>
                  <Pressable
                    onPress={() => setIsFree(true)}
                    style={[styles.priceOpt, { borderColor: isFree ? theme.primary : theme.border, backgroundColor: isFree ? theme.primaryLight : theme.surface }]}
                  >
                    <Text style={[styles.priceOptLabel, { color: isFree ? theme.primary : theme.text }]}>Free</Text>
                    <Text style={[styles.priceOptDesc, { color: theme.textSecondary }]}>No charge for students</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setIsFree(false)}
                    style={[styles.priceOpt, { borderColor: !isFree ? theme.primary : theme.border, backgroundColor: !isFree ? theme.primaryLight : theme.surface }]}
                  >
                    <Text style={[styles.priceOptLabel, { color: !isFree ? theme.primary : theme.text }]}>Paid</Text>
                    <Text style={[styles.priceOptDesc, { color: theme.textSecondary }]}>Set a price for enrollment</Text>
                  </Pressable>
                </View>
                {!isFree && (
                  <>
                    <Input label="Price (₹)" value={priceStr} onChangeText={setPriceStr} placeholder="e.g. 999" keyboardType="numeric" />
                    <Input label="Discount %" value={discountStr} onChangeText={setDiscountStr} placeholder="e.g. 20 (leave blank for no discount)" keyboardType="numeric" />
                    {priceStr && discountStr && (
                      <View style={[styles.pricePreview, { backgroundColor: theme.primaryLight }]}>
                        <Text style={[styles.pricePreviewText, { color: theme.primary }]}>
                          Original: ₹{priceStr} → Final: ₹{Math.round(parseFloat(priceStr) * (1 - parseFloat(discountStr) / 100))} ({discountStr}% off)
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </>
            )}

            {error ? <Text style={[styles.error, { color: theme.error }]}>{error}</Text> : null}

            <View style={styles.actionRow}>
              <Button label="Save Draft" variant="outline" onPress={() => saveDraftM.mutate()} loading={saveDraftM.isPending} style={{ flex: 1 }} />
              {(course?.status === 'DRAFT' || course?.status === 'REJECTED') && (
                <Button label="Submit for Review" onPress={() => publishM.mutate()} loading={publishM.isPending} style={{ flex: 1 }} />
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: Spacing.three, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  back: { padding: 4 },
  headerCenter: { flex: 1, gap: 3 },
  headerTitle: { fontSize: 16, fontFamily: Fonts.bold },
  curriculumBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  curriculumText: { fontSize: 12, fontFamily: Fonts.semiBold },
  tabBar: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tabItem: { flex: 1, alignItems: 'center' },
  tabInner: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 10 },
  tabLabel: { fontSize: 13, fontFamily: Fonts.semiBold },
  tabIndicator: { height: 2, width: '60%', borderRadius: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: Spacing.three, gap: 14 },
  fieldLabel: { fontSize: 13, fontFamily: Fonts.semiBold, marginBottom: -8 },
  optGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  optText: { fontSize: 13, fontFamily: Fonts.medium },
  freeRow: { flexDirection: 'row', gap: 10 },
  priceOpt: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1.5, gap: 4 },
  priceOptLabel: { fontSize: 16, fontFamily: Fonts.bold },
  priceOptDesc: { fontSize: 11, fontFamily: Fonts.regular },
  pricePreview: { padding: 10, borderRadius: 8 },
  pricePreviewText: { fontSize: 13, fontFamily: Fonts.semiBold },
  error: { fontSize: 13, fontFamily: Fonts.regular, textAlign: 'center' },
  actionRow: { flexDirection: 'row', gap: 10 },
});
