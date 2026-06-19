import { useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import {
  X, ArrowLeft, ArrowRight, Check, BookOpen, VideoCamera,
  Article, ListChecks, Paperclip, Trash, Plus, Image as ImageIcon,
  CurrencyInr, Tag, WarningCircle,
} from 'phosphor-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { Fonts, Spacing } from '@/constants/theme';
import { Input } from '@/components/ui/input';
import { RichField } from '@/components/tutor/rich-field';
import { getCategories } from '@/lib/api/tutor-courses';
import { tutorApiRequest } from '@/lib/api/tutor-client';
import { presignUpload, uploadFileToS3 } from '@/lib/api/tutor-upload';
import type { Category } from '@/lib/api/tutor-courses';

// ─── Types ────────────────────────────────────────────────────────────────────

type LessonType = 'VIDEO' | 'ARTICLE' | 'QUIZ' | 'ASSIGNMENT' | 'RESOURCE';
type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL_LEVELS';
type DeliveryType = 'recorded' | 'live';

type FormLesson = {
  id?: string;
  title: string;
  type: LessonType;
  content: string;
  duration: number;
  isFreePreview: boolean;
  order: number;
};

type FormSection = {
  id?: string;
  title: string;
  description: string;
  order: number;
  lessons: FormLesson[];
};

type PromoCode = {
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: string;
  validFrom: string;
  validTill: string;
  usageLimit: string;
  isActive: boolean;
};

type CourseForm = {
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

// ─── Constants ────────────────────────────────────────────────────────────────

const INITIAL_FORM: CourseForm = {
  title: '', categoryId: '', categoryName: '', subCategoryId: '', subCategoryName: '',
  level: 'ALL_LEVELS', language: 'English',
  shortDescription: '', detailedDescription: '',
  whatYouLearn: '', whoIsFor: '', prerequisites: '', learningOutcomes: '',
  thumbnailKey: null, thumbnailUri: null, promoVideoUrl: '',
  sections: [{
    title: 'Introduction', description: '', order: 0,
    lessons: [{ title: 'Getting Started', type: 'VIDEO', content: '', duration: 0, isFreePreview: true, order: 0 }],
  }],
  isFree: true, price: '', discountPercent: '', discountValidTill: '',
  hasLifetimeAccess: true, courseExpiryDate: '', requirements: '',
  promoCodes: [],
};

const STEPS = [
  { title: 'Basic Details', group: 'PLAN YOUR COURSE' },
  { title: 'Description', group: 'PLAN YOUR COURSE' },
  { title: 'Learning Goals', group: 'TARGET YOUR LEARNERS' },
  { title: 'Course Media', group: 'CREATE YOUR CONTENT' },
  { title: 'Curriculum', group: 'CREATE YOUR CONTENT' },
  { title: 'Pricing', group: 'PUBLISH' },
  { title: 'Access & Promos', group: 'PUBLISH' },
];

const LEVELS: { value: CourseLevel; label: string }[] = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
  { value: 'ALL_LEVELS', label: 'All Levels' },
];

const LANGUAGES = ['English', 'Hindi', 'Tamil', 'Telugu', 'Malayalam', 'Kannada', 'Bengali', 'Marathi'];

const LESSON_TYPES: { value: LessonType; label: string }[] = [
  { value: 'VIDEO', label: 'Video' },
  { value: 'ARTICLE', label: 'Article' },
  { value: 'QUIZ', label: 'Quiz' },
  { value: 'ASSIGNMENT', label: 'Assignment' },
  { value: 'RESOURCE', label: 'Resource' },
];

// ─── Shared UI pieces ─────────────────────────────────────────────────────────

function ChipRow<T extends string>({
  options, value, onChange, theme,
}: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={sharedStyles.chipWrap}>
      {options.map((o) => {
        const sel = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[sharedStyles.chip, { borderColor: sel ? theme.primary : theme.border, backgroundColor: sel ? theme.primaryLight : theme.surface }]}
          >
            <Text style={[sharedStyles.chipText, { color: sel ? theme.primary : theme.textSecondary }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function FieldLabel({ text, required, optional, theme }: { text: string; required?: boolean; optional?: boolean; theme: ReturnType<typeof useTheme> }) {
  return (
    <Text style={[sharedStyles.fieldLabel, { color: theme.text }]}>
      {text}
      {required && <Text style={{ color: theme.error }}> *</Text>}
      {optional && <Text style={[sharedStyles.optTag, { color: theme.textSecondary }]}> (optional)</Text>}
    </Text>
  );
}

function SectionDivider({ theme }: { theme: ReturnType<typeof useTheme> }) {
  return <View style={[sharedStyles.divider, { backgroundColor: theme.border }]} />;
}

// ─── Category picker modal ─────────────────────────────────────────────────────

function CategoryModal({
  visible, onClose, categories, onSelect, selectedId, title = 'Select Category',
}: {
  visible: boolean;
  onClose: () => void;
  categories: Category[];
  onSelect: (id: string, name: string) => void;
  selectedId: string;
  title?: string;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={sharedStyles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[sharedStyles.modalSheet, { backgroundColor: theme.background, paddingBottom: insets.bottom + 16 }]}>
          <View style={[sharedStyles.modalHandle, { backgroundColor: theme.border }]} />
          <Text style={[sharedStyles.modalTitle, { color: theme.text }]}>{title}</Text>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={sharedStyles.catGrid}>
            {categories.map((c) => {
              const sel = c.id === selectedId;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => { onSelect(c.id, c.name); onClose(); }}
                  style={[sharedStyles.catCard, { borderColor: sel ? theme.primary : theme.border, backgroundColor: sel ? theme.primaryLight : theme.surface }]}
                >
                  <BookOpen size={18} color={sel ? theme.primary : theme.textSecondary} weight={sel ? 'fill' : 'regular'} />
                  <Text style={[sharedStyles.catCardText, { color: sel ? theme.primary : theme.text }]} numberOfLines={2}>{c.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Step 1: Basic Details ────────────────────────────────────────────────────

function Step1({
  form, update, categories,
}: { form: CourseForm; update: (u: Partial<CourseForm>) => void; categories: Category[] }) {
  const theme = useTheme();
  const [catOpen, setCatOpen] = useState(false);
  const [subCatOpen, setSubCatOpen] = useState(false);
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('recorded');

  const selectedCategory = categories.find((c) => c.id === form.categoryId);
  const hasSubcats = (selectedCategory?.subCategories?.length ?? 0) > 0;

  return (
    <View style={styles.stepContent}>
      <Input
        label="Course Title *"
        value={form.title}
        onChangeText={(v) => update({ title: v })}
        placeholder="e.g. Complete React Native Development"
        maxLength={100}
      />
      <Text style={[sharedStyles.charHint, { color: form.title.length > 85 ? theme.error : theme.textSecondary }]}>
        {form.title.length}/100
      </Text>

      <SectionDivider theme={theme} />

      <FieldLabel text="Course Delivery Type" required theme={theme} />
      <View style={styles.deliveryRow}>
        {/* Recorded — active */}
        <Pressable
          onPress={() => setDeliveryType('recorded')}
          style={[styles.deliveryCard, {
            borderColor: deliveryType === 'recorded' ? theme.primary : theme.border,
            backgroundColor: deliveryType === 'recorded' ? theme.primaryLight : theme.surface,
          }]}
        >
          <View style={[styles.deliveryRadio, { borderColor: deliveryType === 'recorded' ? theme.primary : theme.border }]}>
            {deliveryType === 'recorded' && <View style={[styles.deliveryRadioDot, { backgroundColor: theme.primary }]} />}
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.deliveryLabel, { color: deliveryType === 'recorded' ? theme.primary : theme.text }]}>Recorded</Text>
            <Text style={[styles.deliveryDesc, { color: theme.textSecondary }]}>Students access anytime</Text>
          </View>
        </Pressable>

        {/* Live — coming soon */}
        <View style={[styles.deliveryCard, styles.deliveryCardDisabled, { borderColor: theme.border, backgroundColor: theme.surfaceEl }]}>
          <View style={[styles.deliveryRadio, { borderColor: theme.border }]} />
          <View style={{ flex: 1, gap: 2 }}>
            <View style={styles.deliveryLabelRow}>
              <Text style={[styles.deliveryLabel, { color: theme.textSecondary }]}>Live</Text>
              <View style={[styles.comingSoonBadge, { backgroundColor: theme.surfaceEl, borderColor: theme.border }]}>
                <Text style={[styles.comingSoonText, { color: theme.textSecondary }]}>Coming Soon</Text>
              </View>
            </View>
            <Text style={[styles.deliveryDesc, { color: theme.textSecondary }]}>Real-time sessions</Text>
          </View>
        </View>
      </View>

      <SectionDivider theme={theme} />

      <FieldLabel text="Category" required theme={theme} />
      <Pressable
        onPress={() => setCatOpen(true)}
        style={[sharedStyles.selectBtn, { borderColor: form.categoryId ? theme.primary : theme.border, backgroundColor: theme.surface }]}
      >
        <BookOpen size={16} color={form.categoryId ? theme.primary : theme.textSecondary} weight="regular" />
        <Text style={[sharedStyles.selectBtnText, { color: form.categoryId ? theme.text : theme.textSecondary }]} numberOfLines={1}>
          {form.categoryName || 'Select a category'}
        </Text>
        <ArrowRight size={14} color={theme.textSecondary} weight="bold" />
      </Pressable>

      {hasSubcats && (
        <>
          <FieldLabel text="Subcategory" optional theme={theme} />
          <Pressable
            onPress={() => setSubCatOpen(true)}
            style={[sharedStyles.selectBtn, { borderColor: form.subCategoryId ? theme.primary : theme.border, backgroundColor: theme.surface }]}
          >
            <Text style={[sharedStyles.selectBtnText, { color: form.subCategoryId ? theme.text : theme.textSecondary }]} numberOfLines={1}>
              {form.subCategoryName || 'Select subcategory (optional)'}
            </Text>
            <ArrowRight size={14} color={theme.textSecondary} weight="bold" />
          </Pressable>
        </>
      )}

      <SectionDivider theme={theme} />

      <FieldLabel text="Level" required theme={theme} />
      <ChipRow options={LEVELS} value={form.level} onChange={(v) => update({ level: v })} theme={theme} />

      <SectionDivider theme={theme} />

      <FieldLabel text="Language" required theme={theme} />
      <ChipRow
        options={LANGUAGES.map((l) => ({ value: l, label: l }))}
        value={form.language}
        onChange={(v) => update({ language: v })}
        theme={theme}
      />

      <CategoryModal
        visible={catOpen}
        onClose={() => setCatOpen(false)}
        categories={categories}
        selectedId={form.categoryId}
        onSelect={(id, name) => update({ categoryId: id, categoryName: name, subCategoryId: '', subCategoryName: '' })}
      />

      {hasSubcats && selectedCategory && (
        <CategoryModal
          visible={subCatOpen}
          onClose={() => setSubCatOpen(false)}
          title="Select Subcategory"
          categories={selectedCategory.subCategories.map((s) => ({ id: s.id, name: s.name, subCategories: [] }))}
          selectedId={form.subCategoryId}
          onSelect={(id, name) => update({ subCategoryId: id, subCategoryName: name })}
        />
      )}
    </View>
  );
}

// ─── Step 2: Description ──────────────────────────────────────────────────────

function Step2({ form, update }: { form: CourseForm; update: (u: Partial<CourseForm>) => void }) {
  return (
    <View style={styles.stepContent}>
      <RichField
        label="Short Description"
        value={form.shortDescription}
        onChangeText={(v) => update({ shortDescription: v })}
        placeholder="A brief, compelling summary of your course (shown in search results)…"
        required
        maxLength={300}
        minHeight={90}
        aiField="Short course description"
        courseTitle={form.title}
      />

      <RichField
        label="Detailed Description"
        value={form.detailedDescription}
        onChangeText={(v) => update({ detailedDescription: v })}
        placeholder="Give students a thorough understanding of what they'll get from this course…"
        required
        minHeight={180}
        aiField="Detailed course description"
        courseTitle={form.title}
      />
    </View>
  );
}

// ─── Step 3: Learning Goals ───────────────────────────────────────────────────

function Step3({ form, update }: { form: CourseForm; update: (u: Partial<CourseForm>) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.stepContent}>
      <RichField
        label="What Students Will Learn"
        value={form.whatYouLearn}
        onChangeText={(v) => update({ whatYouLearn: v })}
        placeholder="List the key things students will be able to do after completing your course…"
        required
        minHeight={120}
        aiField="What students will learn"
        courseTitle={form.title}
      />

      <SectionDivider theme={theme} />

      <RichField
        label="Learning Outcomes"
        value={form.learningOutcomes}
        onChangeText={(v) => update({ learningOutcomes: v })}
        placeholder="Specific measurable outcomes students can expect…"
        optional
        minHeight={100}
        aiField="Course learning outcomes"
        courseTitle={form.title}
      />

      <SectionDivider theme={theme} />

      <RichField
        label="Who This Course Is For"
        value={form.whoIsFor}
        onChangeText={(v) => update({ whoIsFor: v })}
        placeholder="Describe the ideal students for this course…"
        optional
        minHeight={100}
        aiField="Target audience for the course"
        courseTitle={form.title}
      />

      <SectionDivider theme={theme} />

      <RichField
        label="Prerequisites"
        value={form.prerequisites}
        onChangeText={(v) => update({ prerequisites: v })}
        placeholder="List any knowledge, skills or tools students need before starting…"
        optional
        minHeight={100}
        aiField="Course prerequisites"
        courseTitle={form.title}
      />
    </View>
  );
}

// ─── Step 4: Course Media ─────────────────────────────────────────────────────

function Step4({ form, update }: { form: CourseForm; update: (u: Partial<CourseForm>) => void }) {
  const theme = useTheme();
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);

  async function pickThumbnail() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to upload a thumbnail.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    update({ thumbnailUri: asset.uri, thumbnailKey: null });
    setUploading(true);
    setUploadPct(0);
    try {
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const mime = asset.mimeType ?? 'image/jpeg';
      const { uploadUrl, key } = await presignUpload('thumbnail', `thumbnail.${ext}`, mime);
      await uploadFileToS3(uploadUrl, asset.uri, mime, setUploadPct);
      update({ thumbnailKey: key });
    } catch (e: any) {
      Alert.alert('Upload failed', e.message ?? 'Could not upload thumbnail');
      update({ thumbnailUri: null, thumbnailKey: null });
    } finally {
      setUploading(false);
    }
  }

  return (
    <View style={styles.stepContent}>
      <FieldLabel text="Course Thumbnail" required theme={theme} />
      <Text style={[styles.fieldHint, { color: theme.textSecondary }]}>
        Recommended size: 1280×720 (16:9). JPG or PNG, max 2MB.
      </Text>

      <Pressable
        onPress={pickThumbnail}
        disabled={uploading}
        style={[styles.thumbBox, { borderColor: form.thumbnailUri ? theme.primary : theme.border, backgroundColor: theme.surface }]}
      >
        {form.thumbnailUri ? (
          <>
            <Image source={{ uri: form.thumbnailUri }} style={styles.thumbPreview} contentFit="cover" />
            {uploading && (
              <View style={styles.thumbOverlay}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.thumbOverlayText}>{uploadPct}%</Text>
              </View>
            )}
            {!uploading && (
              <View style={styles.thumbChangeBadge}>
                <Text style={styles.thumbChangeBadgeText}>Tap to change</Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.thumbEmpty}>
            <ImageIcon size={36} color={theme.border} weight="regular" />
            <Text style={[styles.thumbEmptyText, { color: theme.textSecondary }]}>Tap to upload thumbnail</Text>
            <Text style={[styles.thumbEmptyHint, { color: theme.textSecondary }]}>16:9 ratio recommended</Text>
          </View>
        )}
      </Pressable>

      {form.thumbnailKey && !uploading && (
        <View style={[styles.uploadedBadge, { backgroundColor: '#E8F5E9' }]}>
          <Check size={14} color="#2E7D32" weight="bold" />
          <Text style={[styles.uploadedBadgeText, { color: '#2E7D32' }]}>Uploaded successfully</Text>
        </View>
      )}

      <SectionDivider theme={theme} />

      <Input
        label="Promo Video URL"
        value={form.promoVideoUrl}
        onChangeText={(v) => update({ promoVideoUrl: v })}
        placeholder="https://youtube.com/... or direct video URL"
        autoCapitalize="none"
        keyboardType="url"
      />
      <Text style={[styles.fieldHint, { color: theme.textSecondary }]}>
        A short preview video helps attract students. Optional.
      </Text>
    </View>
  );
}

// ─── Step 5: Curriculum ───────────────────────────────────────────────────────

function LessonTypeIcon({ type, color }: { type: LessonType; color: string }) {
  const props = { size: 14, color, weight: 'regular' as const };
  switch (type) {
    case 'VIDEO': return <VideoCamera {...props} />;
    case 'ARTICLE': return <Article {...props} />;
    case 'QUIZ': return <ListChecks {...props} />;
    default: return <Paperclip {...props} />;
  }
}

function Step5({ form, update }: { form: CourseForm; update: (u: Partial<CourseForm>) => void }) {
  const theme = useTheme();
  const [expandedSection, setExpandedSection] = useState<number>(0);
  const [addingLessonTo, setAddingLessonTo] = useState<number | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonType, setNewLessonType] = useState<LessonType>('VIDEO');
  const [editingSectionIdx, setEditingSectionIdx] = useState<number | null>(null);
  const [editingSectionTitle, setEditingSectionTitle] = useState('');

  function addSection() {
    const next = [...form.sections, {
      title: `Section ${form.sections.length + 1}`,
      description: '', order: form.sections.length, lessons: [],
    }];
    update({ sections: next });
    setExpandedSection(next.length - 1);
  }

  function deleteSection(idx: number) {
    Alert.alert('Delete Section', `Remove "${form.sections[idx].title}" and all its lessons?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          const next = form.sections.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i }));
          update({ sections: next });
          if (expandedSection >= next.length) setExpandedSection(Math.max(0, next.length - 1));
        },
      },
    ]);
  }

  function addLesson(sectionIdx: number) {
    if (!newLessonTitle.trim()) return;
    const sections = [...form.sections];
    const sec = { ...sections[sectionIdx] };
    sec.lessons = [...sec.lessons, {
      title: newLessonTitle.trim(), type: newLessonType,
      content: '', duration: 0, isFreePreview: sec.lessons.length === 0, order: sec.lessons.length,
    }];
    sections[sectionIdx] = sec;
    update({ sections });
    setNewLessonTitle('');
    setAddingLessonTo(null);
  }

  function deleteLesson(sectionIdx: number, lessonIdx: number) {
    const sections = [...form.sections];
    const sec = { ...sections[sectionIdx] };
    sec.lessons = sec.lessons.filter((_, i) => i !== lessonIdx).map((l, i) => ({ ...l, order: i }));
    sections[sectionIdx] = sec;
    update({ sections });
  }

  function saveSectionTitle(idx: number) {
    if (!editingSectionTitle.trim()) return;
    const sections = [...form.sections];
    sections[idx] = { ...sections[idx], title: editingSectionTitle.trim() };
    update({ sections });
    setEditingSectionIdx(null);
  }

  return (
    <View style={styles.stepContent}>
      <Text style={[styles.curriculumHint, { color: theme.textSecondary }]}>
        Organise your content into sections. Each section contains lessons students complete in order.
      </Text>

      {form.sections.map((section, si) => {
        const expanded = expandedSection === si;
        return (
          <View key={si} style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {/* Section header */}
            <Pressable
              style={[styles.sectionHeader, { borderBottomColor: theme.border, borderBottomWidth: expanded ? StyleSheet.hairlineWidth : 0 }]}
              onPress={() => setExpandedSection(expanded ? -1 : si)}
            >
              <View style={[styles.sectionNum, { backgroundColor: theme.primary }]}>
                <Text style={styles.sectionNumText}>{si + 1}</Text>
              </View>
              {editingSectionIdx === si ? (
                <TextInput
                  style={[styles.sectionTitleInput, { color: theme.text, borderColor: theme.primary }]}
                  value={editingSectionTitle}
                  onChangeText={setEditingSectionTitle}
                  onBlur={() => saveSectionTitle(si)}
                  onSubmitEditing={() => saveSectionTitle(si)}
                  autoFocus
                />
              ) : (
                <Text style={[styles.sectionTitle, { color: theme.text }]} numberOfLines={1}>{section.title}</Text>
              )}
              <View style={styles.sectionMeta}>
                <Text style={[styles.sectionLessonCount, { color: theme.textSecondary }]}>{section.lessons.length} lesson{section.lessons.length !== 1 ? 's' : ''}</Text>
                <Pressable onPress={() => { setEditingSectionTitle(section.title); setEditingSectionIdx(si); }} hitSlop={8}>
                  <Text style={[styles.sectionEditBtn, { color: theme.primary }]}>Edit</Text>
                </Pressable>
                {form.sections.length > 1 && (
                  <Pressable onPress={() => deleteSection(si)} hitSlop={8}>
                    <Trash size={15} color={theme.error} weight="regular" />
                  </Pressable>
                )}
              </View>
            </Pressable>

            {/* Lessons */}
            {expanded && (
              <View>
                {section.lessons.map((lesson, li) => (
                  <View key={li} style={[styles.lessonRow, { borderBottomColor: theme.border }]}>
                    <LessonTypeIcon type={lesson.type} color={theme.textSecondary} />
                    <Text style={[styles.lessonTitle, { color: theme.text }]} numberOfLines={1}>{lesson.title}</Text>
                    {lesson.isFreePreview && (
                      <View style={[styles.freeTag, { backgroundColor: theme.primaryLight }]}>
                        <Text style={[styles.freeTagText, { color: theme.primary }]}>Free</Text>
                      </View>
                    )}
                    <Pressable onPress={() => deleteLesson(si, li)} hitSlop={8}>
                      <Trash size={14} color={theme.error} weight="regular" />
                    </Pressable>
                  </View>
                ))}

                {/* Add lesson row */}
                {addingLessonTo === si ? (
                  <View style={[styles.addLessonForm, { borderTopColor: theme.border }]}>
                    <View style={sharedStyles.chipWrap}>
                      {LESSON_TYPES.map((t) => {
                        const sel = newLessonType === t.value;
                        return (
                          <Pressable
                            key={t.value}
                            onPress={() => setNewLessonType(t.value)}
                            style={[styles.typeChip, { borderColor: sel ? theme.primary : theme.border, backgroundColor: sel ? theme.primaryLight : theme.surface }]}
                          >
                            <Text style={[styles.typeChipText, { color: sel ? theme.primary : theme.textSecondary }]}>{t.label}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <View style={styles.addLessonRow}>
                      <TextInput
                        style={[styles.addLessonInput, { borderColor: theme.border, backgroundColor: theme.background, color: theme.text }]}
                        value={newLessonTitle}
                        onChangeText={setNewLessonTitle}
                        placeholder="Lesson title…"
                        placeholderTextColor={theme.textSecondary}
                        returnKeyType="done"
                        onSubmitEditing={() => addLesson(si)}
                      />
                      <Pressable onPress={() => addLesson(si)} style={[styles.addLessonBtn, { backgroundColor: theme.primary }]}>
                        <Text style={styles.addLessonBtnText}>Add</Text>
                      </Pressable>
                      <Pressable onPress={() => setAddingLessonTo(null)} style={[styles.cancelLessonBtn, { backgroundColor: theme.surfaceEl }]}>
                        <Text style={[styles.cancelLessonBtnText, { color: theme.textSecondary }]}>Cancel</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => { setAddingLessonTo(si); setNewLessonTitle(''); setNewLessonType('VIDEO'); }}
                    style={[styles.addLessonTrigger, { borderTopColor: theme.border }]}
                  >
                    <Plus size={14} color={theme.primary} weight="regular" />
                    <Text style={[styles.addLessonTriggerText, { color: theme.primary }]}>Add Lesson</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        );
      })}

      <Pressable onPress={addSection} style={[styles.addSectionBtn, { borderColor: theme.border }]}>
        <Plus size={16} color={theme.primary} weight="regular" />
        <Text style={[styles.addSectionBtnText, { color: theme.primary }]}>Add Section</Text>
      </Pressable>
    </View>
  );
}

// ─── Step 6: Pricing ──────────────────────────────────────────────────────────

function Step6({ form, update }: { form: CourseForm; update: (u: Partial<CourseForm>) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.stepContent}>
      <FieldLabel text="Course Type" required theme={theme} />
      <View style={styles.pricingOptions}>
        {[{ key: true, label: 'Free', desc: 'No cost for students to enroll' }, { key: false, label: 'Paid', desc: 'Set a price for enrollment' }].map((o) => {
          const sel = form.isFree === o.key;
          return (
            <Pressable
              key={String(o.key)}
              onPress={() => update({ isFree: o.key })}
              style={[styles.pricingCard, { borderColor: sel ? theme.primary : theme.border, backgroundColor: sel ? theme.primaryLight : theme.surface }]}
            >
              <View style={[styles.pricingRadio, { borderColor: sel ? theme.primary : theme.border }]}>
                {sel && <View style={[styles.pricingRadioDot, { backgroundColor: theme.primary }]} />}
              </View>
              <View style={{ gap: 2, flex: 1 }}>
                <Text style={[styles.pricingCardLabel, { color: sel ? theme.primary : theme.text }]}>{o.label}</Text>
                <Text style={[styles.pricingCardDesc, { color: theme.textSecondary }]}>{o.desc}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {!form.isFree && (
        <>
          <SectionDivider theme={theme} />

          <View style={styles.priceRow}>
            <View style={[styles.priceInputWrap, { borderColor: theme.border, backgroundColor: theme.surface }]}>
              <CurrencyInr size={16} color={theme.textSecondary} weight="regular" />
              <TextInput
                style={[styles.priceInput, { color: theme.text }]}
                value={form.price}
                onChangeText={(v) => update({ price: v })}
                placeholder="0"
                keyboardType="decimal-pad"
                placeholderTextColor={theme.textSecondary}
              />
            </View>
            <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>Course Price</Text>
          </View>

          <Input
            label="Discount %"
            value={form.discountPercent}
            onChangeText={(v) => update({ discountPercent: v })}
            placeholder="0–100 (leave blank for no discount)"
            keyboardType="decimal-pad"
          />

          {form.discountPercent && form.price && (
            <View style={[styles.priceSummary, { backgroundColor: theme.primaryLight }]}>
              <CurrencyInr size={14} color={theme.primary} weight="regular" />
              <Text style={[styles.priceSummaryText, { color: theme.primary }]}>
                Original ₹{form.price}  →  Final ₹{Math.round(parseFloat(form.price || '0') * (1 - parseFloat(form.discountPercent || '0') / 100))}
                {'  '}({form.discountPercent}% off)
              </Text>
            </View>
          )}

          <Input
            label="Discount Valid Till"
            value={form.discountValidTill}
            onChangeText={(v) => update({ discountValidTill: v })}
            placeholder="e.g. 2025-12-31"
          />
        </>
      )}
    </View>
  );
}

// ─── Step 7: Access & Promos ──────────────────────────────────────────────────

function PromoCodeRow({
  code, index, onUpdate, onDelete, theme,
}: {
  code: PromoCode; index: number;
  onUpdate: (idx: number, u: Partial<PromoCode>) => void;
  onDelete: (idx: number) => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={[styles.promoCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <Pressable style={styles.promoCardHeader} onPress={() => setExpanded(!expanded)}>
        <Tag size={15} color={theme.primary} weight="regular" />
        <Text style={[styles.promoCardTitle, { color: theme.text }]}>
          {code.code || `Promo Code ${index + 1}`}
        </Text>
        <View style={[styles.promoActiveBadge, { backgroundColor: code.isActive ? '#E8F5E9' : theme.surfaceEl }]}>
          <Text style={[styles.promoActiveBadgeText, { color: code.isActive ? '#2E7D32' : theme.textSecondary }]}>
            {code.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
        <Pressable onPress={() => onDelete(index)} hitSlop={8}>
          <Trash size={15} color={theme.error} weight="regular" />
        </Pressable>
      </Pressable>

      {expanded && (
        <View style={styles.promoCardBody}>
          <Input
            label="Code *"
            value={code.code}
            onChangeText={(v) => onUpdate(index, { code: v.toUpperCase() })}
            placeholder="e.g. SUMMER2025"
            autoCapitalize="characters"
          />
          <FieldLabel text="Discount Type" required theme={theme} />
          <ChipRow
            options={[{ value: 'PERCENTAGE', label: 'Percentage (%)' }, { value: 'FIXED', label: 'Fixed Amount (₹)' }]}
            value={code.discountType}
            onChange={(v) => onUpdate(index, { discountType: v as 'PERCENTAGE' | 'FIXED' })}
            theme={theme}
          />
          <Input
            label="Discount Value *"
            value={code.discountValue}
            onChangeText={(v) => onUpdate(index, { discountValue: v })}
            placeholder={code.discountType === 'PERCENTAGE' ? '20' : '500'}
            keyboardType="decimal-pad"
          />
          <Input
            label="Valid From *"
            value={code.validFrom}
            onChangeText={(v) => onUpdate(index, { validFrom: v })}
            placeholder="YYYY-MM-DD"
          />
          <Input
            label="Valid Till *"
            value={code.validTill}
            onChangeText={(v) => onUpdate(index, { validTill: v })}
            placeholder="YYYY-MM-DD"
          />
          <Input
            label="Usage Limit"
            value={code.usageLimit}
            onChangeText={(v) => onUpdate(index, { usageLimit: v })}
            placeholder="Leave blank for unlimited"
            keyboardType="number-pad"
          />
          <View style={styles.promoActiveRow}>
            <Text style={[styles.promoActiveLabel, { color: theme.text }]}>Active</Text>
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

function Step7({ form, update }: { form: CourseForm; update: (u: Partial<CourseForm>) => void }) {
  const theme = useTheme();

  function updatePromo(idx: number, changes: Partial<PromoCode>) {
    const next = [...form.promoCodes];
    next[idx] = { ...next[idx], ...changes };
    update({ promoCodes: next });
  }

  function deletePromo(idx: number) {
    update({ promoCodes: form.promoCodes.filter((_, i) => i !== idx) });
  }

  function addPromo() {
    update({
      promoCodes: [...form.promoCodes, {
        code: '', discountType: 'PERCENTAGE', discountValue: '',
        validFrom: '', validTill: '', usageLimit: '', isActive: true,
      }],
    });
  }

  return (
    <View style={styles.stepContent}>
      <FieldLabel text="Course Access" required theme={theme} />

      <View style={[styles.accessToggleRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={{ gap: 2, flex: 1 }}>
          <Text style={[styles.accessToggleLabel, { color: theme.text }]}>Lifetime Access</Text>
          <Text style={[styles.accessToggleDesc, { color: theme.textSecondary }]}>
            Students keep access indefinitely after enrolling
          </Text>
        </View>
        <Switch
          value={form.hasLifetimeAccess}
          onValueChange={(v) => update({ hasLifetimeAccess: v })}
          trackColor={{ true: theme.primary }}
        />
      </View>

      {!form.hasLifetimeAccess && (
        <Input
          label="Course Expiry Date *"
          value={form.courseExpiryDate}
          onChangeText={(v) => update({ courseExpiryDate: v })}
          placeholder="YYYY-MM-DD"
        />
      )}

      <SectionDivider theme={theme} />

      <RichField
        label="Requirements"
        value={form.requirements}
        onChangeText={(v) => update({ requirements: v })}
        placeholder="List any tools, hardware or accounts students need to take this course…"
        optional
        minHeight={100}
        aiField="Course requirements and tools needed"
        courseTitle={form.title}
      />

      {!form.isFree && (
        <>
          <SectionDivider theme={theme} />
          <View style={styles.promoHeader}>
            <Text style={[styles.promoSectionTitle, { color: theme.text }]}>Promo Codes</Text>
            <Pressable onPress={addPromo} style={[styles.addPromoBtn, { borderColor: theme.primary }]}>
              <Plus size={14} color={theme.primary} weight="regular" />
              <Text style={[styles.addPromoBtnText, { color: theme.primary }]}>Add Code</Text>
            </Pressable>
          </View>
          {form.promoCodes.length === 0 ? (
            <Text style={[styles.noPromosText, { color: theme.textSecondary }]}>
              No promo codes yet. Add one to offer discounts to students.
            </Text>
          ) : (
            <View style={{ gap: 10 }}>
              {form.promoCodes.map((pc, i) => (
                <PromoCodeRow key={i} code={pc} index={i} onUpdate={updatePromo} onDelete={deletePromo} theme={theme} />
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

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

function validateStep(step: number, form: CourseForm): string | null {
  switch (step) {
    case 0:
      if (!form.title.trim() || form.title.trim().length < 5) return 'Course title must be at least 5 characters';
      if (!form.categoryId) return 'Please select a category';
      return null;
    case 1:
      if (form.shortDescription.trim().length < 10) return 'Short description must be at least 10 characters';
      if (form.shortDescription.trim().length > 300) return 'Short description must be under 300 characters';
      if (form.detailedDescription.trim().length < 50) return 'Detailed description must be at least 50 characters';
      return null;
    case 2:
      if (!form.whatYouLearn.trim()) return 'Please describe what students will learn';
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

  function update(changes: Partial<CourseForm>) {
    setForm((prev) => ({ ...prev, ...changes }));
  }

  async function saveDraft(silent = false) {
    if (!silent) setIsSaving(true);
    try {
      const payload = buildPayload(form);
      if (draftId) {
        await tutorApiRequest(`/api/courses/${draftId}/draft`, { method: 'PATCH', body: payload });
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
      // Create draft silently on completing step 1
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
        await tutorApiRequest(`/api/courses/${courseId}/publish`, { method: 'POST' });
      }
      router.replace({ pathname: '/tutor-course/[id]/edit', params: { id: courseId! } });
    } catch (e: any) {
      setError(e.message ?? 'Failed to create course. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const progress = (step / (STEPS.length - 1)) * 100;
  const currentStep = STEPS[step];
  const isLastStep = step === STEPS.length - 1;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* ── Header ── */}
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

      {/* ── Progress bar ── */}
      <View style={[styles.progressTrack, { backgroundColor: theme.surfaceEl }]}>
        <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: theme.primary }]} />
      </View>
      <Text style={[styles.stepCount, { color: theme.textSecondary, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        Step {step + 1} of {STEPS.length}
      </Text>

      {/* ── Step content ── */}
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
          {step === 4 && <Step5 form={form} update={update} />}
          {step === 5 && <Step6 form={form} update={update} />}
          {step === 6 && <Step7 form={form} update={update} />}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Footer navigation ── */}
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
                    {isLastStep ? 'Submit for Review' : 'Continue'}
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

// ─── Shared styles ────────────────────────────────────────────────────────────

const sharedStyles = StyleSheet.create({
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontFamily: Fonts.medium },
  fieldLabel: { fontSize: 13, fontFamily: Fonts.semiBold },
  optTag: { fontSize: 12, fontFamily: Fonts.regular },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
  charHint: { fontSize: 11, fontFamily: Fonts.regular, textAlign: 'right', marginTop: -6 },
  selectBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13 },
  selectBtnText: { flex: 1, fontSize: 14, fontFamily: Fonts.regular },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '75%' },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontFamily: Fonts.bold, marginBottom: 16 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catCard: { width: '47%', borderWidth: 1, borderRadius: 10, padding: 12, gap: 8, alignItems: 'flex-start' },
  catCardText: { fontSize: 13, fontFamily: Fonts.semiBold, lineHeight: 18 },
});

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: Spacing.three, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerBack: { padding: 4 },
  headerCenter: { flex: 1, gap: 2 },
  headerGroup: { fontSize: 10, fontFamily: Fonts.semiBold, textTransform: 'uppercase', letterSpacing: 0.5 },
  headerTitle: { fontSize: 16, fontFamily: Fonts.bold },
  saveDraftBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, minWidth: 80, alignItems: 'center' },
  saveDraftText: { fontSize: 12, fontFamily: Fonts.semiBold },

  // Progress
  progressTrack: { height: 3 },
  progressFill: { height: 3 },
  stepCount: { fontSize: 11, fontFamily: Fonts.medium, paddingHorizontal: Spacing.three, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth },

  // Scroll
  scroll: { padding: Spacing.three, paddingBottom: 24, gap: 20 },
  stepContent: { gap: 18 },

  // Delivery type
  deliveryRow: { flexDirection: 'row', gap: 10 },
  deliveryCard: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1.5, borderRadius: 12, padding: 12 },
  deliveryCardDisabled: { opacity: 0.6 },
  deliveryRadio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  deliveryRadioDot: { width: 8, height: 8, borderRadius: 4 },
  deliveryLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deliveryLabel: { fontSize: 14, fontFamily: Fonts.bold },
  deliveryDesc: { fontSize: 11, fontFamily: Fonts.regular },
  comingSoonBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  comingSoonText: { fontSize: 9, fontFamily: Fonts.semiBold, textTransform: 'uppercase', letterSpacing: 0.3 },

  // Field hints
  fieldHint: { fontSize: 12, fontFamily: Fonts.regular, lineHeight: 16, marginTop: -10 },

  // Thumbnail
  thumbBox: { borderWidth: 1, borderRadius: 12, overflow: 'hidden', height: 200, borderStyle: 'dashed' },
  thumbPreview: { width: '100%', height: '100%' },
  thumbOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', gap: 8 },
  thumbOverlayText: { color: '#fff', fontSize: 14, fontFamily: Fonts.bold },
  thumbChangeBadge: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  thumbChangeBadgeText: { color: '#fff', fontSize: 11, fontFamily: Fonts.semiBold },
  thumbEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  thumbEmptyText: { fontSize: 14, fontFamily: Fonts.medium },
  thumbEmptyHint: { fontSize: 12, fontFamily: Fonts.regular },
  uploadedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginTop: -10 },
  uploadedBadgeText: { fontSize: 13, fontFamily: Fonts.semiBold },

  // Curriculum
  curriculumHint: { fontSize: 13, fontFamily: Fonts.regular, lineHeight: 18 },
  sectionCard: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  sectionNum: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  sectionNumText: { fontSize: 11, fontFamily: Fonts.bold, color: '#fff' },
  sectionTitle: { flex: 1, fontSize: 14, fontFamily: Fonts.semiBold },
  sectionTitleInput: { flex: 1, fontSize: 14, fontFamily: Fonts.semiBold, borderBottomWidth: 1, paddingVertical: 2 },
  sectionMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionLessonCount: { fontSize: 11, fontFamily: Fonts.regular },
  sectionEditBtn: { fontSize: 12, fontFamily: Fonts.semiBold },
  lessonRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  lessonTitle: { flex: 1, fontSize: 13, fontFamily: Fonts.regular },
  freeTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  freeTagText: { fontSize: 10, fontFamily: Fonts.bold },
  addLessonForm: { borderTopWidth: StyleSheet.hairlineWidth, padding: 12, gap: 10 },
  typeChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1 },
  typeChipText: { fontSize: 11, fontFamily: Fonts.medium },
  addLessonRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  addLessonInput: { flex: 1, height: 40, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 12, fontSize: 13, fontFamily: Fonts.regular },
  addLessonBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  addLessonBtnText: { fontSize: 13, fontFamily: Fonts.bold, color: '#fff' },
  cancelLessonBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  cancelLessonBtnText: { fontSize: 13, fontFamily: Fonts.medium },
  addLessonTrigger: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  addLessonTriggerText: { fontSize: 13, fontFamily: Fonts.semiBold },
  addSectionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingVertical: 14, borderStyle: 'dashed' },
  addSectionBtnText: { fontSize: 14, fontFamily: Fonts.semiBold },

  // Pricing
  pricingOptions: { gap: 10 },
  pricingCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1.5, borderRadius: 12, padding: 14 },
  pricingRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  pricingRadioDot: { width: 10, height: 10, borderRadius: 5 },
  pricingCardLabel: { fontSize: 16, fontFamily: Fonts.bold },
  pricingCardDesc: { fontSize: 12, fontFamily: Fonts.regular },
  priceRow: { gap: 6 },
  priceInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 14, height: 50 },
  priceInput: { flex: 1, fontSize: 20, fontFamily: Fonts.bold },
  priceLabel: { fontSize: 12, fontFamily: Fonts.medium },
  priceSummary: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 8 },
  priceSummaryText: { fontSize: 13, fontFamily: Fonts.semiBold, flex: 1 },

  // Access
  accessToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 14 },
  accessToggleLabel: { fontSize: 14, fontFamily: Fonts.semiBold },
  accessToggleDesc: { fontSize: 12, fontFamily: Fonts.regular },

  // Promo codes
  promoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  promoSectionTitle: { fontSize: 15, fontFamily: Fonts.bold },
  addPromoBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  addPromoBtnText: { fontSize: 12, fontFamily: Fonts.semiBold },
  noPromosText: { fontSize: 13, fontFamily: Fonts.regular, textAlign: 'center', paddingVertical: 12 },
  promoCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, overflow: 'hidden' },
  promoCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  promoCardTitle: { flex: 1, fontSize: 14, fontFamily: Fonts.semiBold },
  promoActiveBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  promoActiveBadgeText: { fontSize: 11, fontFamily: Fonts.semiBold },
  promoCardBody: { padding: 12, gap: 12, borderTopWidth: StyleSheet.hairlineWidth },
  promoActiveRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  promoActiveLabel: { fontSize: 14, fontFamily: Fonts.medium },

  // Error
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  errorBannerText: { flex: 1, fontSize: 13, fontFamily: Fonts.medium, lineHeight: 18 },

  // Footer
  footer: { gap: 0, paddingHorizontal: Spacing.three, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  footerBtns: { flexDirection: 'row', gap: 10 },
  backBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  backBtnText: { fontSize: 14, fontFamily: Fonts.semiBold },
  continueBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  continueBtnText: { fontSize: 15, fontFamily: Fonts.bold, color: '#fff' },
});
