import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ListBullets } from 'phosphor-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { Fonts, Spacing } from '@/constants/theme';
import { Input } from '@/components/ui/input';
import { RichField } from '@/components/tutor/rich-field';
import { StatusChip } from '@/components/tutor/status-chip';
import { getCourse, saveCourseDraft } from '@/lib/api/tutor-courses';
import { tutorApiRequest } from '@/lib/api/tutor-client';
import type { CourseLevel } from '@/lib/api/tutor-courses';

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
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [error, setError] = useState('');
  const [initialized, setInitialized] = useState(false);

  const [title, setTitle] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [level, setLevel] = useState<CourseLevel>('ALL_LEVELS');
  const [language, setLanguage] = useState('English');
  const [detailedDesc, setDetailedDesc] = useState('');
  const [whatYouLearn, setWhatYouLearn] = useState('');
  const [whoIsFor, setWhoIsFor] = useState('');
  const [requirements, setRequirements] = useState('');
  const [isFree, setIsFree] = useState(true);
  const [priceStr, setPriceStr] = useState('');
  const [discountStr, setDiscountStr] = useState('');

  const { data: course, isLoading } = useQuery({
    queryKey: ['tutor-course', id],
    queryFn: () => getCourse(id!),
    enabled: !!id,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (course && !initialized) {
      const asStr = (v: unknown) =>
        Array.isArray(v) ? (v as string[]).join('\n') : (typeof v === 'string' ? v : '');
      setTitle(course.title ?? '');
      setShortDesc(course.shortDescription ?? '');
      setLevel(course.level);
      setLanguage(course.language ?? 'English');
      setDetailedDesc(course.detailedDescription ?? '');
      setWhatYouLearn(asStr(course.whatYouLearn));
      setWhoIsFor(asStr(course.whoIsFor));
      setRequirements(asStr(course.requirements));
      setIsFree(course.isFree);
      setPriceStr(course.price != null ? String(course.price) : '');
      setDiscountStr(course.discountPercent != null ? String(course.discountPercent) : '');
      setInitialized(true);
    }
  }, [course, initialized]);

  function buildPayload() {
    return {
      title: title.trim(),
      categoryId: course!.category?.id ?? '',
      subCategoryId: course!.subCategory?.id ?? null,
      level,
      language,
      shortDescription: shortDesc.trim(),
      detailedDescription: detailedDesc.trim(),
      whatYouLearn: whatYouLearn.trim() || null,
      whoIsFor: whoIsFor.trim() || null,
      requirements: requirements.trim() || null,
      isFree,
      price: !isFree && priceStr ? parseFloat(priceStr) || null : null,
      discountPercent: !isFree && discountStr ? parseInt(discountStr, 10) || null : null,
    };
  }

  async function handleSaveDraft() {
    if (!id) return;
    setSaving(true);
    setError('');
    try {
      await saveCourseDraft(id, buildPayload());
      qc.invalidateQueries({ queryKey: ['tutor-course', id] });
      Alert.alert('Saved', 'Draft saved successfully.');
    } catch (e: any) {
      setError(e.message ?? 'Failed to save draft.');
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!id) return;
    setPublishing(true);
    setError('');
    try {
      await saveCourseDraft(id, buildPayload());
      await tutorApiRequest(`/api/courses/${id}/publish`, { method: 'POST', body: { action: 'publish' } });
      qc.invalidateQueries({ queryKey: ['tutor-course', id] });
      Alert.alert('Published', 'Course published successfully.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e: any) {
      setError(e.message ?? 'Failed to publish course.');
    } finally {
      setPublishing(false);
    }
  }

  const canPublish = course?.status === 'DRAFT' || course?.status === 'REJECTED';
  const canUnpublish = course?.status === 'PUBLISHED';

  async function handleUnpublish() {
    if (!id) return;
    Alert.alert(
      'Move to Draft',
      'This will unpublish the course and hide it from students. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move to Draft', style: 'destructive', onPress: async () => {
            setUnpublishing(true);
            setError('');
            try {
              await tutorApiRequest(`/api/courses/${id}/publish`, { method: 'POST', body: { action: 'unpublish' } });
              qc.invalidateQueries({ queryKey: ['tutor-course', id] });
              Alert.alert('Moved to Draft', 'Course is now a draft and hidden from students.');
            } catch (e: any) {
              setError(e.message ?? 'Failed to unpublish course.');
            } finally {
              setUnpublishing(false);
            }
          },
        },
      ]
    );
  }

  const TABS: { key: ActiveTab; label: string }[] = [
    { key: 'basics', label: 'Basics' },
    { key: 'details', label: 'Details' },
    { key: 'pricing', label: 'Pricing' },
  ];

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.back}>
          <ArrowLeft size={22} color={theme.text} weight="regular" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
            {course?.title ?? 'Edit Course'}
          </Text>
          {course && <StatusChip status={course.status} small />}
        </View>
        <Pressable
          onPress={() => router.push({ pathname: '/tutor-course/[id]/curriculum', params: { id: id! } })}
          style={[styles.currBtn, { backgroundColor: theme.surfaceEl }]}
        >
          <ListBullets size={15} color={theme.textSecondary} />
          <Text style={[styles.currBtnText, { color: theme.textSecondary }]}>Curriculum</Text>
        </Pressable>
      </View>

      {/* Tab bar */}
      <View style={[styles.tabBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable key={t.key} onPress={() => setTab(t.key)} style={styles.tabItem}>
              <Text style={[styles.tabLabel, { color: active ? theme.primary : theme.textSecondary }]}>{t.label}</Text>
              {active && <View style={[styles.tabLine, { backgroundColor: theme.primary }]} />}
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {tab === 'basics' && (
              <View style={styles.section}>
                <Input
                  label="Course Title *"
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. Complete React Native Development"
                />
                <RichField
                  label="Short Description"
                  value={shortDesc}
                  onChangeText={setShortDesc}
                  placeholder="A brief summary shown in search results…"
                  maxLength={300}
                  minHeight={80}
                  rte
                />
                <View style={styles.field}>
                  <Text style={[styles.fieldLabel, { color: theme.text }]}>Level</Text>
                  <View style={styles.chips}>
                    {LEVELS.map((l) => {
                      const sel = level === l.value;
                      return (
                        <Pressable key={l.value} onPress={() => setLevel(l.value)}
                          style={[styles.chip, { borderColor: sel ? theme.primary : theme.border, backgroundColor: sel ? theme.primaryLight : theme.surface }]}>
                          <Text style={[styles.chipText, { color: sel ? theme.primary : theme.textSecondary }]}>{l.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
                <Input
                  label="Language"
                  value={language}
                  onChangeText={setLanguage}
                  placeholder="e.g. English"
                />
              </View>
            )}

            {tab === 'details' && (
              <View style={styles.section}>
                <RichField
                  label="Detailed Description"
                  value={detailedDesc}
                  onChangeText={setDetailedDesc}
                  placeholder="Comprehensive description of your course…"
                  minHeight={180}
                  rte
                />
                <RichField
                  label="What Students Will Learn"
                  value={whatYouLearn}
                  onChangeText={setWhatYouLearn}
                  placeholder="Key skills and knowledge students will gain…"
                  minHeight={120}
                  rte
                />
                <RichField
                  label="Who This Course Is For"
                  value={whoIsFor}
                  onChangeText={setWhoIsFor}
                  placeholder="Describe the ideal student for this course…"
                  minHeight={100}
                  rte
                />
                <RichField
                  label="Requirements"
                  value={requirements}
                  onChangeText={setRequirements}
                  placeholder="Any tools, skills or accounts students need…"
                  minHeight={100}
                  rte
                />
              </View>
            )}

            {tab === 'pricing' && (
              <View style={styles.section}>
                <View style={styles.field}>
                  <Text style={[styles.fieldLabel, { color: theme.text }]}>Course Type</Text>
                  <View style={styles.priceCards}>
                    {[{ val: true, label: 'Free', desc: 'No cost for students to enroll' }, { val: false, label: 'Paid', desc: 'Set a price for enrollment' }].map((o) => {
                      const sel = isFree === o.val;
                      return (
                        <Pressable key={String(o.val)} onPress={() => setIsFree(o.val)}
                          style={[styles.priceCard, { borderColor: sel ? theme.primary : theme.border, backgroundColor: sel ? theme.primaryLight : theme.surface }]}>
                          <View style={[styles.priceRadio, { borderColor: sel ? theme.primary : theme.border }]}>
                            {sel && <View style={[styles.priceRadioDot, { backgroundColor: theme.primary }]} />}
                          </View>
                          <View style={{ flex: 1, gap: 2 }}>
                            <Text style={[styles.priceCardLabel, { color: sel ? theme.primary : theme.text }]}>{o.label}</Text>
                            <Text style={[styles.priceCardDesc, { color: theme.textSecondary }]}>{o.desc}</Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
                {!isFree && (
                  <>
                    <Input
                      label="Price (₹)"
                      value={priceStr}
                      onChangeText={setPriceStr}
                      placeholder="e.g. 999"
                      keyboardType="decimal-pad"
                    />
                    <Input
                      label="Discount %"
                      value={discountStr}
                      onChangeText={setDiscountStr}
                      placeholder="e.g. 20 (leave blank for none)"
                      keyboardType="decimal-pad"
                    />
                    {priceStr && discountStr ? (
                      <View style={[styles.pricePreview, { backgroundColor: theme.primaryLight }]}>
                        <Text style={[styles.pricePreviewText, { color: theme.primary }]}>
                          ₹{priceStr} → ₹{Math.round(parseFloat(priceStr) * (1 - parseFloat(discountStr) / 100))} ({discountStr}% off)
                        </Text>
                      </View>
                    ) : null}
                  </>
                )}
              </View>
            )}

            {error ? (
              <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
            ) : null}

            {/* Actions */}
            <View style={styles.actions}>
              <Pressable
                onPress={handleSaveDraft}
                disabled={saving}
                style={[styles.btn, styles.btnOutline, { borderColor: theme.border, flexDirection: 'row', gap: 8 }]}
              >
                {saving && <ActivityIndicator size={16} color={theme.primary} />}
                <Text style={[styles.btnText, { color: theme.text }]}>{saving ? 'Saving…' : 'Save Draft'}</Text>
              </Pressable>
              {canPublish && (
                <Pressable
                  onPress={handlePublish}
                  disabled={publishing}
                  style={[styles.btn, { backgroundColor: theme.primary, flexDirection: 'row', gap: 8 }]}
                >
                  {publishing && <ActivityIndicator size={16} color="#fff" />}
                  <Text style={[styles.btnText, { color: '#fff' }]}>{publishing ? 'Publishing…' : 'Publish Course'}</Text>
                </Pressable>
              )}
              {canUnpublish && (
                <Pressable
                  onPress={handleUnpublish}
                  disabled={unpublishing}
                  style={[styles.btn, styles.btnOutline, { borderColor: theme.error, flexDirection: 'row', gap: 8 }]}
                >
                  {unpublishing && <ActivityIndicator size={16} color={theme.error} />}
                  <Text style={[styles.btnText, { color: theme.error }]}>{unpublishing ? 'Moving…' : 'Move to Draft'}</Text>
                </Pressable>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: Spacing.three, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: { padding: 4 },
  headerCenter: { flex: 1, gap: 4 },
  headerTitle: { fontSize: 16, fontFamily: Fonts.bold },
  currBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  currBtnText: { fontSize: 12, fontFamily: Fonts.semiBold },
  tabBar: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabLabel: { fontSize: 13, fontFamily: Fonts.semiBold },
  tabLine: { position: 'absolute', bottom: 0, left: '20%', right: '20%', height: 2, borderRadius: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: Spacing.three, paddingBottom: 40 },
  section: { gap: 16 },
  field: { gap: 8 },
  fieldLabel: { fontSize: 13, fontFamily: Fonts.semiBold },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontFamily: Fonts.medium },
  priceCards: { gap: 10 },
  priceCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1.5, borderRadius: 12, padding: 14 },
  priceRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  priceRadioDot: { width: 10, height: 10, borderRadius: 5 },
  priceCardLabel: { fontSize: 15, fontFamily: Fonts.bold },
  priceCardDesc: { fontSize: 12, fontFamily: Fonts.regular },
  pricePreview: { padding: 10, borderRadius: 8 },
  pricePreviewText: { fontSize: 13, fontFamily: Fonts.semiBold },
  errorText: { fontSize: 13, fontFamily: Fonts.medium, textAlign: 'center', marginTop: 8 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 24 },
  btn: { flex: 1, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  btnOutline: { borderWidth: 1 },
  btnText: { fontSize: 15, fontFamily: Fonts.bold },
});
