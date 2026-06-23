import { useEffect, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StyleSheet, Switch, Text, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Eye, ListBullets, Plus, Tag, Trash } from 'phosphor-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { Fonts, Spacing } from '@/constants/theme';
import { Input } from '@/components/ui/input';
import { RichField } from '@/components/tutor/rich-field';
import { StatusChip } from '@/components/tutor/status-chip';
import { getCourse, saveCourseDraft } from '@/lib/api/tutor-courses';
import { useDialog } from '@/lib/dialog/context';
import { tutorApiRequest } from '@/lib/api/tutor-client';
import type { CourseLevel } from '@/lib/api/tutor-courses';

const LEVELS: { value: CourseLevel; label: string }[] = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
  { value: 'ALL_LEVELS', label: 'All Levels' },
];

type ActiveTab = 'basics' | 'details' | 'pricing' | 'access';

type EditPromoCode = {
  id?: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: string;
  validFrom: string;
  validTill: string;
  usageLimit: string;
  isActive: boolean;
};

// ─── Promo Code Editor ────────────────────────────────────────────────────────

function PromoCodeEditor({
  code, index, onUpdate, onDelete, theme,
}: {
  code: EditPromoCode;
  index: number;
  onUpdate: (idx: number, u: Partial<EditPromoCode>) => void;
  onDelete: (idx: number) => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={[promoStyles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <Pressable style={promoStyles.cardHeader} onPress={() => setExpanded(!expanded)}>
        <Tag size={15} color={theme.primary} weight="regular" />
        <Text style={[promoStyles.cardTitle, { color: theme.text }]}>
          {code.code || `Promo Code ${index + 1}`}
        </Text>
        <View style={[promoStyles.badge, { backgroundColor: code.isActive ? '#E8F5E9' : theme.surfaceEl }]}>
          <Text style={[promoStyles.badgeText, { color: code.isActive ? '#2E7D32' : theme.textSecondary }]}>
            {code.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
        <Pressable onPress={() => onDelete(index)} hitSlop={8}>
          <Trash size={15} color={theme.error} weight="regular" />
        </Pressable>
      </Pressable>

      {expanded && (
        <View style={[promoStyles.cardBody, { borderTopColor: theme.border }]}>
          <Input
            label="Code *"
            value={code.code}
            onChangeText={(v) => onUpdate(index, { code: v.toUpperCase() })}
            placeholder="e.g. SUMMER2025"
            autoCapitalize="characters"
          />

          <View style={{ gap: 6 }}>
            <Text style={[promoStyles.fieldLabel, { color: theme.text }]}>Discount Type</Text>
            <View style={promoStyles.chipRow}>
              {[{ value: 'PERCENTAGE' as const, label: 'Percentage (%)' }, { value: 'FIXED' as const, label: 'Fixed Amount (₹)' }].map((opt) => {
                const sel = code.discountType === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => onUpdate(index, { discountType: opt.value })}
                    style={[promoStyles.chip, {
                      borderColor: sel ? theme.primary : theme.border,
                      backgroundColor: sel ? theme.primaryLight : theme.surface,
                    }]}
                  >
                    <Text style={[promoStyles.chipText, { color: sel ? theme.primary : theme.textSecondary }]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Input
            label="Discount Value *"
            value={code.discountValue}
            onChangeText={(v) => onUpdate(index, { discountValue: v })}
            placeholder={code.discountType === 'PERCENTAGE' ? '20' : '500'}
            keyboardType="decimal-pad"
          />

          <View style={promoStyles.dateRow}>
            <View style={{ flex: 1 }}>
              <Input
                label="Valid From *"
                value={code.validFrom}
                onChangeText={(v) => onUpdate(index, { validFrom: v })}
                placeholder="YYYY-MM-DD"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Valid Till *"
                value={code.validTill}
                onChangeText={(v) => onUpdate(index, { validTill: v })}
                placeholder="YYYY-MM-DD"
              />
            </View>
          </View>

          <Input
            label="Usage Limit"
            value={code.usageLimit}
            onChangeText={(v) => onUpdate(index, { usageLimit: v })}
            placeholder="Leave blank for unlimited"
            keyboardType="number-pad"
          />

          <View style={promoStyles.activeRow}>
            <Text style={[promoStyles.fieldLabel, { color: theme.text }]}>Active</Text>
            <Switch
              value={code.isActive}
              onValueChange={(v) => onUpdate(index, { isActive: v })}
              trackColor={{ true: theme.primary }}
            />
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Main Edit Screen ─────────────────────────────────────────────────────────

export default function EditCourse() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showDialog } = useDialog();
  const qc = useQueryClient();
  const [tab, setTab] = useState<ActiveTab>('basics');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [error, setError] = useState('');
  const [initialized, setInitialized] = useState(false);

  // Basics
  const [title, setTitle] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [level, setLevel] = useState<CourseLevel>('ALL_LEVELS');
  const [language, setLanguage] = useState('English');

  // Details
  const [detailedDesc, setDetailedDesc] = useState('');
  const [whatYouLearn, setWhatYouLearn] = useState('');
  const [whoIsFor, setWhoIsFor] = useState('');
  const [requirements, setRequirements] = useState('');

  // Pricing
  const [isFree, setIsFree] = useState(true);
  const [priceStr, setPriceStr] = useState('');
  const [discountStr, setDiscountStr] = useState('');
  const [discountValidTill, setDiscountValidTill] = useState('');

  // Access & Promos
  const [hasLifetimeAccess, setHasLifetimeAccess] = useState(true);
  const [courseExpiryDate, setCourseExpiryDate] = useState('');
  const [promoCodes, setPromoCodes] = useState<EditPromoCode[]>([]);

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
      setDiscountValidTill(course.discountValidTill ? course.discountValidTill.substring(0, 10) : '');
      setHasLifetimeAccess(course.hasLifetimeAccess ?? true);
      setPromoCodes(
        (course.promoCodes ?? []).map((pc) => ({
          id: pc.id,
          code: pc.code,
          discountType: pc.discountType as 'PERCENTAGE' | 'FIXED',
          discountValue: String(pc.discountValue),
          validFrom: pc.validFrom ? pc.validFrom.substring(0, 10) : '',
          validTill: pc.validTill ? pc.validTill.substring(0, 10) : '',
          usageLimit: pc.usageLimit != null ? String(pc.usageLimit) : '',
          isActive: pc.isActive,
        }))
      );
      setInitialized(true);
    }
  }, [course, initialized]);

  function buildPayload() {
    return {
      title: title.trim(),
      categoryId: course!.category?.id ?? '',
      ...(course!.subCategory?.id ? { subCategoryId: course!.subCategory.id } : {}),
      level,
      language,
      shortDescription: shortDesc.trim(),
      detailedDescription: detailedDesc.trim(),
      whatYouLearn: whatYouLearn.trim() || undefined,
      whoIsFor: whoIsFor.trim() || undefined,
      requirements: requirements.trim() || undefined,
      isFree,
      price: !isFree && priceStr ? parseFloat(priceStr) || null : null,
      discountPercent: !isFree && discountStr ? parseInt(discountStr, 10) || null : null,
      discountValidTill: !isFree && discountValidTill ? discountValidTill : null,
      hasLifetimeAccess,
      courseExpiryDate: !hasLifetimeAccess && courseExpiryDate ? courseExpiryDate : null,
      promoCodes: !isFree
        ? promoCodes
            .filter((pc) => pc.code.trim() !== '')
            .map((pc) => ({
              ...(pc.id ? { id: pc.id } : {}),
              code: pc.code.toUpperCase(),
              discountType: pc.discountType,
              discountValue: parseFloat(pc.discountValue) || 0,
              validFrom: pc.validFrom,
              validTill: pc.validTill,
              usageLimit: pc.usageLimit ? parseInt(pc.usageLimit, 10) : null,
              isActive: pc.isActive,
            }))
        : [],
    };
  }

  async function handleSaveDraft() {
    if (!id) return;
    setSaving(true);
    setError('');
    try {
      await saveCourseDraft(id, buildPayload());
      qc.invalidateQueries({ queryKey: ['tutor-course', id] });
      showDialog({ title: 'Saved', message: 'Draft saved successfully.', type: 'success' });
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
      showDialog({ title: 'Published', message: 'Course published successfully.', type: 'success', actions: [{ label: 'OK', onPress: () => router.back() }] });
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
    showDialog({
      title: 'Move to Draft',
      message: 'This will unpublish the course and hide it from students. Continue?',
      type: 'warning',
      actions: [
        { label: 'Cancel', variant: 'cancel' },
        {
          label: 'Move to Draft', variant: 'destructive', onPress: async () => {
            setUnpublishing(true);
            setError('');
            try {
              await tutorApiRequest(`/api/courses/${id}/publish`, { method: 'POST', body: { action: 'unpublish' } });
              qc.invalidateQueries({ queryKey: ['tutor-course', id] });
              showDialog({ title: 'Moved to Draft', message: 'Course is now a draft and hidden from students.', type: 'success' });
            } catch (e: any) {
              setError(e.message ?? 'Failed to unpublish course.');
            } finally {
              setUnpublishing(false);
            }
          },
        },
      ],
    });
  }

  function addPromo() {
    setPromoCodes((prev) => [
      ...prev,
      { code: '', discountType: 'PERCENTAGE', discountValue: '', validFrom: '', validTill: '', usageLimit: '', isActive: true },
    ]);
  }

  function updatePromo(idx: number, changes: Partial<EditPromoCode>) {
    setPromoCodes((prev) => prev.map((p, i) => i === idx ? { ...p, ...changes } : p));
  }

  function deletePromo(idx: number) {
    showDialog({
      title: 'Remove Promo Code',
      message: 'Remove this promo code?',
      type: 'warning',
      actions: [
        { label: 'Cancel', variant: 'cancel' },
        { label: 'Remove', variant: 'destructive', onPress: () => setPromoCodes((prev) => prev.filter((_, i) => i !== idx)) },
      ],
    });
  }

  const TABS: { key: ActiveTab; label: string }[] = [
    { key: 'basics', label: 'Basics' },
    { key: 'details', label: 'Details' },
    { key: 'pricing', label: 'Pricing' },
    { key: 'access', label: 'Access' },
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
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => router.push({ pathname: '/tutor-course/[id]/preview' as any, params: { id: id! } })}
            style={[styles.currBtn, { backgroundColor: theme.surfaceEl }]}
          >
            <Eye size={15} color={theme.textSecondary} />
            <Text style={[styles.currBtnText, { color: theme.textSecondary }]}>Preview</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push({ pathname: '/tutor-course/[id]/curriculum', params: { id: id! } })}
            style={[styles.currBtn, { backgroundColor: theme.surfaceEl }]}
          >
            <ListBullets size={15} color={theme.textSecondary} />
            <Text style={[styles.currBtnText, { color: theme.textSecondary }]}>Curriculum</Text>
          </Pressable>
        </View>
      </View>

      {/* Tab bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}
        contentContainerStyle={styles.tabBarContent}
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable key={t.key} onPress={() => setTab(t.key)} style={styles.tabItem}>
              <Text style={[styles.tabLabel, { color: active ? theme.primary : theme.textSecondary }]}>{t.label}</Text>
              {active && <View style={[styles.tabLine, { backgroundColor: theme.primary }]} />}
            </Pressable>
          );
        })}
      </ScrollView>

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
            {/* ── Basics ─────────────────────────────────────────────── */}
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

            {/* ── Details ────────────────────────────────────────────── */}
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

            {/* ── Pricing ────────────────────────────────────────────── */}
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
                      label="Price (₹) *"
                      value={priceStr}
                      onChangeText={setPriceStr}
                      placeholder="e.g. 999"
                      keyboardType="decimal-pad"
                    />
                    <View style={styles.row}>
                      <View style={{ flex: 1 }}>
                        <Input
                          label="Discount %"
                          value={discountStr}
                          onChangeText={setDiscountStr}
                          placeholder="0–100"
                          keyboardType="decimal-pad"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Input
                          label="Discount Valid Till"
                          value={discountValidTill}
                          onChangeText={setDiscountValidTill}
                          placeholder="YYYY-MM-DD"
                        />
                      </View>
                    </View>
                    {priceStr && discountStr ? (
                      <View style={[styles.pricePreview, { backgroundColor: theme.primaryLight }]}>
                        <Text style={[styles.pricePreviewText, { color: theme.primary }]}>
                          ₹{priceStr}{'  →  '}₹{Math.round(parseFloat(priceStr) * (1 - parseFloat(discountStr) / 100))}{'  '}({discountStr}% off)
                        </Text>
                      </View>
                    ) : null}
                  </>
                )}
              </View>
            )}

            {/* ── Access & Promos ─────────────────────────────────────── */}
            {tab === 'access' && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Course Access</Text>

                <View style={[styles.toggleRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={{ gap: 2, flex: 1 }}>
                    <Text style={[styles.toggleLabel, { color: theme.text }]}>Lifetime Access</Text>
                    <Text style={[styles.toggleDesc, { color: theme.textSecondary }]}>
                      Students keep access indefinitely after enrolling
                    </Text>
                  </View>
                  <Switch
                    value={hasLifetimeAccess}
                    onValueChange={setHasLifetimeAccess}
                    trackColor={{ true: theme.primary }}
                  />
                </View>

                {!hasLifetimeAccess && (
                  <Input
                    label="Course Expiry Date *"
                    value={courseExpiryDate}
                    onChangeText={setCourseExpiryDate}
                    placeholder="YYYY-MM-DD"
                  />
                )}

                {!isFree && (
                  <>
                    <View style={styles.promoHeaderRow}>
                      <Text style={[styles.sectionTitle, { color: theme.text }]}>Promo Codes</Text>
                      <Pressable onPress={addPromo} style={[styles.addPromoBtn, { borderColor: theme.primary }]}>
                        <Plus size={14} color={theme.primary} weight="regular" />
                        <Text style={[styles.addPromoBtnText, { color: theme.primary }]}>Add Code</Text>
                      </Pressable>
                    </View>

                    {promoCodes.length === 0 ? (
                      <View style={[styles.emptyPromos, { borderColor: theme.border, backgroundColor: theme.surface }]}>
                        <Tag size={24} color={theme.textSecondary} weight="regular" />
                        <Text style={[styles.emptyPromosText, { color: theme.textSecondary }]}>
                          No promo codes yet
                        </Text>
                        <Text style={[styles.emptyPromosHint, { color: theme.textSecondary }]}>
                          Add discount codes to offer students a special rate
                        </Text>
                      </View>
                    ) : (
                      <View style={{ gap: 10 }}>
                        {promoCodes.map((pc, i) => (
                          <PromoCodeEditor
                            key={pc.id ?? i}
                            code={pc}
                            index={i}
                            onUpdate={updatePromo}
                            onDelete={deletePromo}
                            theme={theme}
                          />
                        ))}
                      </View>
                    )}
                  </>
                )}

                {isFree && (
                  <View style={[styles.infoBox, { backgroundColor: theme.surfaceEl, borderColor: theme.border }]}>
                    <Text style={[styles.infoBoxText, { color: theme.textSecondary }]}>
                      Promo codes are only available for paid courses. Switch the course to Paid in the Pricing tab to add promo codes.
                    </Text>
                  </View>
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

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  headerActions: { flexDirection: 'row', gap: 6 },
  currBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  currBtnText: { fontSize: 12, fontFamily: Fonts.semiBold },
  tabBar: { borderBottomWidth: StyleSheet.hairlineWidth, flexGrow: 0 },
  tabBarContent: { flexDirection: 'row' },
  tabItem: { paddingHorizontal: Spacing.three, paddingVertical: 12, alignItems: 'center' },
  tabLabel: { fontSize: 13, fontFamily: Fonts.semiBold },
  tabLine: { position: 'absolute', bottom: 0, left: '15%', right: '15%', height: 2, borderRadius: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: Spacing.three, paddingBottom: 40 },
  section: { gap: 16 },
  sectionTitle: { fontSize: 15, fontFamily: Fonts.bold },
  field: { gap: 8 },
  fieldLabel: { fontSize: 13, fontFamily: Fonts.semiBold },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontFamily: Fonts.medium },
  row: { flexDirection: 'row', gap: 10 },
  priceCards: { gap: 10 },
  priceCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1.5, borderRadius: 12, padding: 14 },
  priceRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  priceRadioDot: { width: 10, height: 10, borderRadius: 5 },
  priceCardLabel: { fontSize: 15, fontFamily: Fonts.bold },
  priceCardDesc: { fontSize: 12, fontFamily: Fonts.regular },
  pricePreview: { padding: 10, borderRadius: 8 },
  pricePreviewText: { fontSize: 13, fontFamily: Fonts.semiBold },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 14 },
  toggleLabel: { fontSize: 14, fontFamily: Fonts.semiBold },
  toggleDesc: { fontSize: 12, fontFamily: Fonts.regular },
  promoHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addPromoBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  addPromoBtnText: { fontSize: 12, fontFamily: Fonts.semiBold },
  emptyPromos: { alignItems: 'center', gap: 8, padding: 24, borderWidth: 1, borderRadius: 12, borderStyle: 'dashed' },
  emptyPromosText: { fontSize: 14, fontFamily: Fonts.semiBold },
  emptyPromosHint: { fontSize: 12, fontFamily: Fonts.regular, textAlign: 'center' },
  infoBox: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 14 },
  infoBoxText: { fontSize: 13, fontFamily: Fonts.regular, lineHeight: 18 },
  errorText: { fontSize: 13, fontFamily: Fonts.medium, textAlign: 'center', marginTop: 8 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 24 },
  btn: { flex: 1, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  btnOutline: { borderWidth: 1 },
  btnText: { fontSize: 15, fontFamily: Fonts.bold },
});

const promoStyles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  cardTitle: { flex: 1, fontSize: 14, fontFamily: Fonts.semiBold },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontFamily: Fonts.semiBold },
  cardBody: { padding: 12, gap: 12, borderTopWidth: StyleSheet.hairlineWidth },
  fieldLabel: { fontSize: 13, fontFamily: Fonts.semiBold },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: Fonts.medium },
  dateRow: { flexDirection: 'row', gap: 10 },
  activeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
});
