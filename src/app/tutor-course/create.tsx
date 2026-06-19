import { useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { File as FSFile } from 'expo-file-system';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import {
  X, ArrowLeft, ArrowRight, Check, BookOpen, VideoCamera,
  Article, ListChecks, Paperclip, Trash, Plus, Image as ImageIcon,
  CurrencyInr, Tag, WarningCircle, Play, CaretDown, CaretUp,
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
type QuizQuestionType = 'mcq' | 'true-false' | 'multiple-select' | 'short-answer';

type QuizQuestion = {
  id: string;
  questionType: QuizQuestionType;
  question: string;
  options: string[];
  correctAnswer: number;
  correctAnswers: number[];
  shortAnswer: string;
  explanation: string;
};

type FormLesson = {
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

// ─── Constants ────────────────────────────────────────────────────────────────

const INITIAL_FORM: CourseForm = {
  title: '', categoryId: '', categoryName: '', subCategoryId: '', subCategoryName: '',
  level: 'ALL_LEVELS', language: 'English',
  shortDescription: '', detailedDescription: '',
  whatYouLearn: '', whoIsFor: '', prerequisites: '', learningOutcomes: '',
  thumbnailKey: null, thumbnailUri: null, promoVideoUrl: '', promoVideoUri: null,
  sections: [{
    title: 'Introduction', description: '', order: 0,
    lessons: [{ title: 'Getting Started', type: 'VIDEO' as LessonType, content: '', duration: 0, isFreePreview: true, order: 0, videoUri: null, quizQuestions: [], assignmentDelivery: 'text' as const }],
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
        rte
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
        rte
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
        rte
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
        rte
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
        rte
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
        rte
        aiField="Course prerequisites"
        courseTitle={form.title}
      />
    </View>
  );
}

// ─── Step 4: Course Media ─────────────────────────────────────────────────────

function Step4({ form, update }: { form: CourseForm; update: (u: Partial<CourseForm>) => void }) {
  const theme = useTheme();
  const [thumbUploading, setThumbUploading] = useState(false);
  const [thumbPct, setThumbPct] = useState(0);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoPct, setVideoPct] = useState(0);

  async function pickThumbnail() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to upload a thumbnail.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    update({ thumbnailUri: asset.uri, thumbnailKey: null });
    setThumbUploading(true);
    setThumbPct(0);
    try {
      const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      const fsFile = new FSFile(asset.uri);
      const size = fsFile.size ?? asset.fileSize ?? 0;
      const { uploadUrl, key } = await presignUpload('thumbnail', `thumbnail.${ext}`, mime, size);
      await uploadFileToS3(uploadUrl, asset.uri, mime, setThumbPct);
      update({ thumbnailKey: key });
    } catch (e: any) {
      Alert.alert('Upload failed', e.message ?? 'Could not upload thumbnail');
      update({ thumbnailUri: null, thumbnailKey: null });
    } finally {
      setThumbUploading(false);
    }
  }

  async function pickPromoVideo() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to upload a promo video.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'videos',
      allowsEditing: false,
      videoMaxDuration: 300,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    update({ promoVideoUri: asset.uri, promoVideoUrl: '' });
    setVideoUploading(true);
    setVideoPct(0);
    try {
      const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'mp4';
      const mime = asset.mimeType ?? `video/${ext}`;
      const fsFile = new FSFile(asset.uri);
      const size = fsFile.size ?? asset.fileSize ?? 0;
      const { uploadUrl, key } = await presignUpload('promo-video', `promo-video.${ext}`, mime, size);
      await uploadFileToS3(uploadUrl, asset.uri, mime, setVideoPct);
      update({ promoVideoUrl: key });
    } catch (e: any) {
      Alert.alert('Upload failed', e.message ?? 'Could not upload promo video');
      update({ promoVideoUri: null, promoVideoUrl: '' });
    } finally {
      setVideoUploading(false);
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
        disabled={thumbUploading}
        style={[styles.thumbBox, { borderColor: form.thumbnailUri ? theme.primary : theme.border, backgroundColor: theme.surface }]}
      >
        {form.thumbnailUri ? (
          <>
            <Image source={{ uri: form.thumbnailUri }} style={styles.thumbPreview} contentFit="cover" />
            {thumbUploading && (
              <View style={styles.thumbOverlay}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.thumbOverlayText}>{thumbPct}%</Text>
              </View>
            )}
            {!thumbUploading && (
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

      {form.thumbnailKey && !thumbUploading && (
        <View style={[styles.uploadedBadge, { backgroundColor: '#E8F5E9' }]}>
          <Check size={14} color="#2E7D32" weight="bold" />
          <Text style={[styles.uploadedBadgeText, { color: '#2E7D32' }]}>Thumbnail uploaded</Text>
        </View>
      )}

      <SectionDivider theme={theme} />

      <FieldLabel text="Promo Video" optional theme={theme} />
      <Text style={[styles.fieldHint, { color: theme.textSecondary }]}>
        A short preview video helps attract students. Max 5 minutes.
      </Text>

      <Pressable
        onPress={pickPromoVideo}
        disabled={videoUploading}
        style={[styles.thumbBox, { borderColor: form.promoVideoUri ? theme.primary : theme.border, backgroundColor: theme.surface }]}
      >
        {form.promoVideoUri ? (
          <>
            <View style={[styles.thumbEmpty, { backgroundColor: theme.surfaceEl }]}>
              <Play size={36} color={form.promoVideoUrl ? theme.primary : theme.textSecondary} weight="fill" />
              <Text style={[styles.thumbEmptyText, { color: form.promoVideoUrl ? theme.primary : theme.textSecondary }]} numberOfLines={1}>
                {form.promoVideoUri.split('/').pop()}
              </Text>
            </View>
            {videoUploading && (
              <View style={styles.thumbOverlay}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.thumbOverlayText}>{videoPct}%</Text>
              </View>
            )}
            {!videoUploading && (
              <View style={styles.thumbChangeBadge}>
                <Text style={styles.thumbChangeBadgeText}>Tap to change</Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.thumbEmpty}>
            <VideoCamera size={36} color={theme.border} weight="regular" />
            <Text style={[styles.thumbEmptyText, { color: theme.textSecondary }]}>Tap to upload promo video</Text>
            <Text style={[styles.thumbEmptyHint, { color: theme.textSecondary }]}>MP4 or MOV, max 1GB</Text>
          </View>
        )}
      </Pressable>

      {form.promoVideoUrl && !videoUploading && (
        <View style={[styles.uploadedBadge, { backgroundColor: '#E8F5E9' }]}>
          <Check size={14} color="#2E7D32" weight="bold" />
          <Text style={[styles.uploadedBadgeText, { color: '#2E7D32' }]}>Promo video uploaded</Text>
        </View>
      )}
    </View>
  );
}

// ─── Step 5: Curriculum ───────────────────────────────────────────────────────

function makeDefaultQuestion(): QuizQuestion {
  return {
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    questionType: 'mcq',
    question: '',
    options: ['', ''],
    correctAnswer: 0,
    correctAnswers: [],
    shortAnswer: '',
    explanation: '',
  };
}

function makeDefaultLesson(order: number, isFreePreview = false): FormLesson {
  return {
    title: '', type: 'VIDEO', content: '', duration: 0,
    isFreePreview, order, videoUri: null, quizQuestions: [],
    assignmentDelivery: 'text', assignmentFileUri: null,
    assignmentFileName: null, resourceFileUri: null, resourceFileName: null,
  };
}

function LessonTypeIcon({ type, color, size = 14 }: { type: LessonType; color: string; size?: number }) {
  const props = { size, color, weight: 'regular' as const };
  switch (type) {
    case 'VIDEO': return <VideoCamera {...props} />;
    case 'ARTICLE': return <Article {...props} />;
    case 'QUIZ': return <ListChecks {...props} />;
    default: return <Paperclip {...props} />;
  }
}

// ─── Quiz Question Editor ─────────────────────────────────────────────────────

const QUESTION_TYPES: { value: QuizQuestionType; label: string }[] = [
  { value: 'mcq', label: 'MCQ' },
  { value: 'true-false', label: 'True / False' },
  { value: 'multiple-select', label: 'Multi-Select' },
  { value: 'short-answer', label: 'Short Answer' },
];

function QuizQuestionEditor({
  question, index, onUpdate, onDelete, theme,
}: {
  question: QuizQuestion;
  index: number;
  onUpdate: (u: Partial<QuizQuestion>) => void;
  onDelete: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  function setOption(oi: number, val: string) {
    const options = [...question.options];
    options[oi] = val;
    onUpdate({ options });
  }

  function addOption() {
    if (question.options.length >= 6) return;
    onUpdate({ options: [...question.options, ''] });
  }

  function removeOption(oi: number) {
    if (question.options.length <= 2) return;
    const options = question.options.filter((_, i) => i !== oi);
    onUpdate({
      options,
      correctAnswer: question.correctAnswer >= oi ? Math.max(0, question.correctAnswer - 1) : question.correctAnswer,
      correctAnswers: question.correctAnswers.filter(ca => ca !== oi).map(ca => ca > oi ? ca - 1 : ca),
    });
  }

  function changeType(type: QuizQuestionType) {
    const base: Partial<QuizQuestion> = { questionType: type };
    if (type === 'true-false') {
      base.options = ['True', 'False'];
      base.correctAnswer = 0;
      base.correctAnswers = [];
    } else if (type === 'mcq') {
      base.options = question.options.length >= 2 ? question.options : ['', ''];
      base.correctAnswers = [];
    } else if (type === 'multiple-select') {
      base.options = question.options.length >= 2 ? question.options : ['', ''];
      base.correctAnswer = 0;
    } else {
      base.options = [];
      base.correctAnswer = 0;
      base.correctAnswers = [];
    }
    onUpdate(base);
  }

  return (
    <View style={[currStyles.qCard, { borderColor: theme.border, backgroundColor: theme.background }]}>
      <View style={currStyles.qHeader}>
        <View style={[currStyles.qNum, { backgroundColor: theme.primary }]}>
          <Text style={currStyles.qNumText}>{index + 1}</Text>
        </View>
        <Text style={[currStyles.qLabel, { color: theme.textSecondary }]}>Question {index + 1}</Text>
        <Pressable onPress={onDelete} hitSlop={8}>
          <Trash size={15} color={theme.error} weight="regular" />
        </Pressable>
      </View>

      <View style={sharedStyles.chipWrap}>
        {QUESTION_TYPES.map((qt) => {
          const sel = question.questionType === qt.value;
          return (
            <Pressable key={qt.value} onPress={() => changeType(qt.value)}
              style={[sharedStyles.chip, { borderColor: sel ? theme.primary : theme.border, backgroundColor: sel ? theme.primaryLight : theme.surface }]}>
              <Text style={[sharedStyles.chipText, { color: sel ? theme.primary : theme.textSecondary }]}>{qt.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <TextInput
        style={[currStyles.qInput, { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text }]}
        value={question.question}
        onChangeText={(v) => onUpdate({ question: v })}
        placeholder="Question text…"
        placeholderTextColor={theme.textSecondary}
        multiline
      />

      {question.questionType === 'short-answer' ? (
        <View style={{ gap: 6 }}>
          <Text style={[currStyles.optLabel, { color: theme.textSecondary }]}>Expected Answer</Text>
          <TextInput
            style={[currStyles.qInput, { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text }]}
            value={question.shortAnswer}
            onChangeText={(v) => onUpdate({ shortAnswer: v })}
            placeholder="Model answer…"
            placeholderTextColor={theme.textSecondary}
          />
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          <Text style={[currStyles.optLabel, { color: theme.textSecondary }]}>
            {question.questionType === 'multiple-select' ? 'Options — tap all correct answers' : 'Options — tap to mark correct'}
          </Text>
          {question.options.map((opt, oi) => {
            const isCorrect = question.questionType === 'multiple-select'
              ? question.correctAnswers.includes(oi)
              : question.correctAnswer === oi;

            function toggleCorrect() {
              if (question.questionType === 'multiple-select') {
                const ca = isCorrect
                  ? question.correctAnswers.filter(x => x !== oi)
                  : [...question.correctAnswers, oi];
                onUpdate({ correctAnswers: ca });
              } else {
                onUpdate({ correctAnswer: oi });
              }
            }

            return (
              <View key={oi} style={currStyles.optRow}>
                <Pressable onPress={toggleCorrect}
                  style={[currStyles.optCheck, { borderColor: isCorrect ? theme.primary : theme.border, backgroundColor: isCorrect ? theme.primary : 'transparent' }]}>
                  {isCorrect && <Check size={10} color="#fff" weight="bold" />}
                </Pressable>
                {question.questionType === 'true-false' ? (
                  <Text style={[currStyles.optText, { color: theme.text }]}>{opt}</Text>
                ) : (
                  <TextInput
                    style={[currStyles.optInput, { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text }]}
                    value={opt}
                    onChangeText={(v) => setOption(oi, v)}
                    placeholder={`Option ${oi + 1}…`}
                    placeholderTextColor={theme.textSecondary}
                  />
                )}
                {question.questionType !== 'true-false' && question.options.length > 2 && (
                  <Pressable onPress={() => removeOption(oi)} hitSlop={8}>
                    <X size={14} color={theme.textSecondary} weight="regular" />
                  </Pressable>
                )}
              </View>
            );
          })}
          {question.questionType !== 'true-false' && question.options.length < 6 && (
            <Pressable onPress={addOption} style={[currStyles.addOptBtn, { borderColor: theme.border }]}>
              <Plus size={13} color={theme.primary} weight="regular" />
              <Text style={[currStyles.addOptText, { color: theme.primary }]}>Add option</Text>
            </Pressable>
          )}
        </View>
      )}

      <View style={{ gap: 6 }}>
        <Text style={[currStyles.optLabel, { color: theme.textSecondary }]}>Explanation (optional)</Text>
        <TextInput
          style={[currStyles.qInput, { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text }]}
          value={question.explanation}
          onChangeText={(v) => onUpdate({ explanation: v })}
          placeholder="Why is this the correct answer?…"
          placeholderTextColor={theme.textSecondary}
          multiline
        />
      </View>
    </View>
  );
}

// ─── Lesson Editor ────────────────────────────────────────────────────────────

function LessonEditor({
  lesson, onUpdate, onDelete, theme,
}: {
  lesson: FormLesson;
  onUpdate: (u: Partial<FormLesson>) => void;
  onDelete: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const [expanded, setExpanded] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);

  async function pickVideo() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow photo library access to upload video.'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'videos', allowsEditing: false });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    const durationSec = asset.duration ? Math.round(asset.duration / 1000) : 0;
    onUpdate({ videoUri: asset.uri, content: '', duration: durationSec });
    setUploading(true); setUploadPct(0);
    try {
      const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'mp4';
      const mime = asset.mimeType ?? `video/${ext}`;
      const fsFile = new FSFile(asset.uri);
      const size = fsFile.size ?? asset.fileSize ?? 0;
      const { uploadUrl, key } = await presignUpload('lesson-video', `lesson-video.${ext}`, mime, size);
      await uploadFileToS3(uploadUrl, asset.uri, mime, setUploadPct);
      onUpdate({ content: key });
    } catch (e: any) {
      Alert.alert('Upload failed', e.message ?? 'Could not upload video');
      onUpdate({ videoUri: null, content: '' });
    } finally { setUploading(false); }
  }

  async function pickDocument(folder: 'assignment' | 'resource', uriKey: 'assignmentFileUri' | 'resourceFileUri', nameKey: 'assignmentFileName' | 'resourceFileName') {
    const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    onUpdate({ [uriKey]: asset.uri, [nameKey]: asset.name, content: '' } as Partial<FormLesson>);
    setUploading(true); setUploadPct(0);
    try {
      const mime = asset.mimeType ?? 'application/octet-stream';
      const size = asset.size ?? 0;
      const { uploadUrl, key } = await presignUpload(folder, asset.name, mime, size);
      await uploadFileToS3(uploadUrl, asset.uri, mime, setUploadPct);
      onUpdate({ content: key } as Partial<FormLesson>);
    } catch (e: any) {
      Alert.alert('Upload failed', e.message ?? 'Could not upload file');
      onUpdate({ [uriKey]: null, [nameKey]: null, content: '' } as Partial<FormLesson>);
    } finally { setUploading(false); }
  }

  function changeType(type: LessonType) {
    onUpdate({
      type, content: '', videoUri: null,
      quizQuestions: type === 'QUIZ' ? [makeDefaultQuestion()] : lesson.quizQuestions,
      assignmentDelivery: 'text', assignmentFileUri: null, assignmentFileName: null,
      resourceFileUri: null, resourceFileName: null,
    });
  }

  const durationMin = lesson.duration ? Math.floor(lesson.duration / 60) : 0;
  const durationSec = lesson.duration ? lesson.duration % 60 : 0;
  const durationDisplay = lesson.duration ? `${durationMin}:${String(durationSec).padStart(2, '0')}` : '';

  return (
    <View style={[currStyles.lessonCard, { borderColor: expanded ? theme.primary : theme.border, backgroundColor: theme.surface }]}>
      {/* Header row */}
      <Pressable onPress={() => setExpanded(!expanded)} style={currStyles.lessonHeader}>
        <LessonTypeIcon type={lesson.type} color={expanded ? theme.primary : theme.textSecondary} size={16} />
        <Text style={[currStyles.lessonHeaderTitle, { color: lesson.title ? theme.text : theme.textSecondary }]} numberOfLines={1}>
          {lesson.title || 'Untitled lesson'}
        </Text>
        <Pressable onPress={onDelete} hitSlop={10} style={{ padding: 4 }}>
          <Trash size={14} color={theme.error} weight="regular" />
        </Pressable>
        {expanded ? <CaretUp size={14} color={theme.textSecondary} /> : <CaretDown size={14} color={theme.textSecondary} />}
      </Pressable>

      {expanded && (
        <View style={[currStyles.lessonBody, { borderTopColor: theme.border }]}>
          {/* Title */}
          <TextInput
            style={[currStyles.lessonTitleInput, { borderColor: theme.border, backgroundColor: theme.background, color: theme.text }]}
            value={lesson.title}
            onChangeText={(v) => onUpdate({ title: v })}
            placeholder="Lesson title…"
            placeholderTextColor={theme.textSecondary}
          />

          {/* Type chips */}
          <View style={sharedStyles.chipWrap}>
            {LESSON_TYPES.map((lt) => {
              const sel = lesson.type === lt.value;
              return (
                <Pressable key={lt.value} onPress={() => changeType(lt.value)}
                  style={[sharedStyles.chip, { borderColor: sel ? theme.primary : theme.border, backgroundColor: sel ? theme.primaryLight : theme.surface }]}>
                  <Text style={[sharedStyles.chipText, { color: sel ? theme.primary : theme.textSecondary }]}>{lt.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* ── VIDEO ── */}
          {lesson.type === 'VIDEO' && (
            <Pressable onPress={pickVideo} disabled={uploading}
              style={[currStyles.mediaBox, { borderColor: lesson.videoUri ? theme.primary : theme.border, backgroundColor: theme.background }]}>
              {lesson.videoUri ? (
                <View style={{ alignItems: 'center', gap: 6 }}>
                  <Play size={30} color={lesson.content ? theme.primary : theme.textSecondary} weight="fill" />
                  <Text style={[currStyles.mediaFileName, { color: theme.text }]} numberOfLines={1}>
                    {lesson.videoUri.split('/').pop()}
                  </Text>
                  {uploading
                    ? <Text style={[currStyles.mediaPct, { color: theme.primary }]}>Uploading… {uploadPct}%</Text>
                    : lesson.content
                      ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Check size={12} color="#2E7D32" weight="bold" />
                          <Text style={{ fontSize: 12, color: '#2E7D32', fontFamily: Fonts.semiBold }}>Uploaded</Text>
                        </View>
                      : null}
                  {!uploading && <Text style={[currStyles.mediaTapChange, { color: theme.textSecondary }]}>Tap to change</Text>}
                </View>
              ) : (
                <View style={{ alignItems: 'center', gap: 8 }}>
                  <VideoCamera size={32} color={theme.border} weight="regular" />
                  <Text style={[currStyles.mediaPrompt, { color: theme.textSecondary }]}>Tap to upload video</Text>
                  <Text style={[currStyles.mediaHint, { color: theme.textSecondary }]}>MP4 or MOV, max 1GB</Text>
                </View>
              )}
              {uploading && (
                <View style={currStyles.mediaOverlay}>
                  <ActivityIndicator color="#fff" />
                  <Text style={currStyles.mediaOverlayText}>{uploadPct}%</Text>
                </View>
              )}
            </Pressable>
          )}

          {/* ── ARTICLE ── */}
          {lesson.type === 'ARTICLE' && (
            <RichField
              label="Article Content"
              value={lesson.content}
              onChangeText={(v) => onUpdate({ content: v })}
              placeholder="Write the article content here…"
              required
              minHeight={180}
              rte
              aiField="Article lesson content"
              courseTitle=""
            />
          )}

          {/* ── QUIZ ── */}
          {lesson.type === 'QUIZ' && (
            <View style={{ gap: 12 }}>
              {lesson.quizQuestions.length === 0 && (
                <Text style={[currStyles.emptyHint, { color: theme.textSecondary }]}>No questions yet. Add one below.</Text>
              )}
              {lesson.quizQuestions.map((q, qi) => (
                <QuizQuestionEditor
                  key={q.id}
                  question={q}
                  index={qi}
                  theme={theme}
                  onUpdate={(u) => {
                    const qs = [...lesson.quizQuestions];
                    qs[qi] = { ...qs[qi], ...u };
                    onUpdate({ quizQuestions: qs });
                  }}
                  onDelete={() => onUpdate({ quizQuestions: lesson.quizQuestions.filter((_, i) => i !== qi) })}
                />
              ))}
              <Pressable
                onPress={() => onUpdate({ quizQuestions: [...lesson.quizQuestions, makeDefaultQuestion()] })}
                style={[currStyles.addQuestionBtn, { borderColor: theme.border }]}
              >
                <Plus size={14} color={theme.primary} weight="regular" />
                <Text style={[currStyles.addQuestionText, { color: theme.primary }]}>Add Question</Text>
              </Pressable>
            </View>
          )}

          {/* ── ASSIGNMENT ── */}
          {lesson.type === 'ASSIGNMENT' && (
            <View style={{ gap: 12 }}>
              <View style={sharedStyles.chipWrap}>
                {[{ value: 'text', label: 'Text Instructions' }, { value: 'file', label: 'File Upload' }].map((d) => {
                  const sel = lesson.assignmentDelivery === d.value;
                  return (
                    <Pressable key={d.value}
                      onPress={() => onUpdate({ assignmentDelivery: d.value as 'text' | 'file', content: '', assignmentFileUri: null, assignmentFileName: null })}
                      style={[sharedStyles.chip, { borderColor: sel ? theme.primary : theme.border, backgroundColor: sel ? theme.primaryLight : theme.surface }]}>
                      <Text style={[sharedStyles.chipText, { color: sel ? theme.primary : theme.textSecondary }]}>{d.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {lesson.assignmentDelivery === 'text' ? (
                <RichField
                  label="Assignment Instructions"
                  value={lesson.content}
                  onChangeText={(v) => onUpdate({ content: v })}
                  placeholder="Describe what students need to do…"
                  required
                  minHeight={140}
                  rte
                  aiField="Assignment instructions"
                  courseTitle=""
                />
              ) : (
                <Pressable onPress={() => pickDocument('assignment', 'assignmentFileUri', 'assignmentFileName')} disabled={uploading}
                  style={[currStyles.mediaBox, { borderColor: lesson.assignmentFileUri ? theme.primary : theme.border, backgroundColor: theme.background }]}>
                  {lesson.assignmentFileUri ? (
                    <View style={{ alignItems: 'center', gap: 6 }}>
                      <Paperclip size={28} color={lesson.content ? theme.primary : theme.textSecondary} weight="regular" />
                      <Text style={[currStyles.mediaFileName, { color: theme.text }]} numberOfLines={1}>{lesson.assignmentFileName}</Text>
                      {uploading
                        ? <Text style={[currStyles.mediaPct, { color: theme.primary }]}>Uploading… {uploadPct}%</Text>
                        : lesson.content
                          ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Check size={12} color="#2E7D32" weight="bold" />
                              <Text style={{ fontSize: 12, color: '#2E7D32', fontFamily: Fonts.semiBold }}>Uploaded</Text>
                            </View>
                          : null}
                      {!uploading && <Text style={[currStyles.mediaTapChange, { color: theme.textSecondary }]}>Tap to change</Text>}
                    </View>
                  ) : (
                    <View style={{ alignItems: 'center', gap: 8 }}>
                      <Paperclip size={32} color={theme.border} weight="regular" />
                      <Text style={[currStyles.mediaPrompt, { color: theme.textSecondary }]}>Tap to upload file</Text>
                      <Text style={[currStyles.mediaHint, { color: theme.textSecondary }]}>PDF, DOC, ZIP up to 50MB</Text>
                    </View>
                  )}
                  {uploading && (
                    <View style={currStyles.mediaOverlay}>
                      <ActivityIndicator color="#fff" />
                      <Text style={currStyles.mediaOverlayText}>{uploadPct}%</Text>
                    </View>
                  )}
                </Pressable>
              )}
            </View>
          )}

          {/* ── RESOURCE ── */}
          {lesson.type === 'RESOURCE' && (
            <View style={{ gap: 12 }}>
              <Pressable onPress={() => pickDocument('resource', 'resourceFileUri', 'resourceFileName')} disabled={uploading}
                style={[currStyles.mediaBox, { borderColor: lesson.resourceFileUri ? theme.primary : theme.border, backgroundColor: theme.background }]}>
                {lesson.resourceFileUri ? (
                  <View style={{ alignItems: 'center', gap: 6 }}>
                    <Paperclip size={28} color={lesson.content ? theme.primary : theme.textSecondary} weight="regular" />
                    <Text style={[currStyles.mediaFileName, { color: theme.text }]} numberOfLines={1}>{lesson.resourceFileName}</Text>
                    {uploading
                      ? <Text style={[currStyles.mediaPct, { color: theme.primary }]}>Uploading… {uploadPct}%</Text>
                      : lesson.content
                        ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Check size={12} color="#2E7D32" weight="bold" />
                            <Text style={{ fontSize: 12, color: '#2E7D32', fontFamily: Fonts.semiBold }}>Uploaded</Text>
                          </View>
                        : null}
                    {!uploading && <Text style={[currStyles.mediaTapChange, { color: theme.textSecondary }]}>Tap to change</Text>}
                  </View>
                ) : (
                  <View style={{ alignItems: 'center', gap: 8 }}>
                    <Paperclip size={32} color={theme.border} weight="regular" />
                    <Text style={[currStyles.mediaPrompt, { color: theme.textSecondary }]}>Tap to add resource file</Text>
                    <Text style={[currStyles.mediaHint, { color: theme.textSecondary }]}>PDF, DOC, ZIP up to 50MB</Text>
                  </View>
                )}
                {uploading && (
                  <View style={currStyles.mediaOverlay}>
                    <ActivityIndicator color="#fff" />
                    <Text style={currStyles.mediaOverlayText}>{uploadPct}%</Text>
                  </View>
                )}
              </Pressable>
            </View>
          )}

          {/* Duration */}
          {lesson.type !== 'RESOURCE' && (
            <View style={currStyles.durationRow}>
              <Text style={[currStyles.durationLabel, { color: theme.textSecondary }]}>
                {lesson.type === 'VIDEO' && lesson.duration > 0 ? 'Duration (auto-detected)' : 'Duration (minutes)'}
              </Text>
              {lesson.type === 'VIDEO' && lesson.duration > 0 ? (
                <Text style={[currStyles.durationValue, { color: theme.text }]}>{durationDisplay}</Text>
              ) : (
                <TextInput
                  style={[currStyles.durationInput, { borderColor: theme.border, backgroundColor: theme.background, color: theme.text }]}
                  value={durationMin > 0 ? String(durationMin) : ''}
                  onChangeText={(v) => onUpdate({ duration: (parseFloat(v) || 0) * 60 })}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  placeholderTextColor={theme.textSecondary}
                />
              )}
            </View>
          )}

        </View>
      )}
    </View>
  );
}

// ─── Step5 ────────────────────────────────────────────────────────────────────

function Step5({ form, update }: { form: CourseForm; update: (u: Partial<CourseForm>) => void }) {
  const theme = useTheme();
  const [editingSectionIdx, setEditingSectionIdx] = useState<number | null>(null);
  const [editingSectionTitle, setEditingSectionTitle] = useState('');

  function updateLesson(si: number, li: number, changes: Partial<FormLesson>) {
    const sections = [...form.sections];
    const sec = { ...sections[si] };
    const lessons = [...sec.lessons];
    lessons[li] = { ...lessons[li], ...changes };
    sec.lessons = lessons;
    sections[si] = sec;
    update({ sections });
  }

  function addLesson(si: number) {
    const sections = [...form.sections];
    const sec = { ...sections[si] };
    sec.lessons = [...sec.lessons, makeDefaultLesson(sec.lessons.length, sec.lessons.length === 0)];
    sections[si] = sec;
    update({ sections });
  }

  function deleteLesson(si: number, li: number) {
    Alert.alert('Delete Lesson', 'Remove this lesson?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          const sections = [...form.sections];
          const sec = { ...sections[si] };
          sec.lessons = sec.lessons.filter((_, i) => i !== li).map((l, i) => ({ ...l, order: i }));
          sections[si] = sec;
          update({ sections });
        },
      },
    ]);
  }

  function addSection() {
    const next = [...form.sections, { title: `Section ${form.sections.length + 1}`, description: '', order: form.sections.length, lessons: [] }];
    update({ sections: next });
  }

  function deleteSection(si: number) {
    Alert.alert('Delete Section', `Remove "${form.sections[si].title}" and all its lessons?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          update({ sections: form.sections.filter((_, i) => i !== si).map((s, i) => ({ ...s, order: i })) });
        },
      },
    ]);
  }

  function saveSectionTitle(si: number) {
    if (!editingSectionTitle.trim()) return;
    const sections = [...form.sections];
    sections[si] = { ...sections[si], title: editingSectionTitle.trim() };
    update({ sections });
    setEditingSectionIdx(null);
  }

  return (
    <View style={styles.stepContent}>
      <Text style={[styles.curriculumHint, { color: theme.textSecondary }]}>
        Organise your content into sections. Each section contains lessons students complete in order.
      </Text>

      {form.sections.map((section, si) => (
        <View key={si} style={[currStyles.sectionWrap, { borderColor: theme.border, backgroundColor: theme.background }]}>
          {/* Section header */}
          <View style={[currStyles.sectionHead, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <View style={[currStyles.sectionNum, { backgroundColor: theme.primary }]}>
              <Text style={currStyles.sectionNumText}>{si + 1}</Text>
            </View>
            {editingSectionIdx === si ? (
              <TextInput
                style={[currStyles.sectionTitleInput, { color: theme.text, borderColor: theme.primary, flex: 1 }]}
                value={editingSectionTitle}
                onChangeText={setEditingSectionTitle}
                onBlur={() => saveSectionTitle(si)}
                onSubmitEditing={() => saveSectionTitle(si)}
                autoFocus
              />
            ) : (
              <Text style={[currStyles.sectionTitle, { color: theme.text }]} numberOfLines={1}>{section.title}</Text>
            )}
            <View style={currStyles.sectionActions}>
              <Text style={[currStyles.lessonCount, { color: theme.textSecondary }]}>
                {section.lessons.length} lesson{section.lessons.length !== 1 ? 's' : ''}
              </Text>
              <Pressable hitSlop={8} onPress={() => { setEditingSectionTitle(section.title); setEditingSectionIdx(si); }}>
                <Text style={[currStyles.editBtn, { color: theme.primary }]}>Edit</Text>
              </Pressable>
              {form.sections.length > 1 && (
                <Pressable hitSlop={8} onPress={() => deleteSection(si)}>
                  <Trash size={15} color={theme.error} weight="regular" />
                </Pressable>
              )}
            </View>
          </View>

          {/* Lessons */}
          <View style={currStyles.lessonsWrap}>
            {section.lessons.map((lesson, li) => (
              <LessonEditor
                key={`${si}-${li}`}
                lesson={lesson}
                theme={theme}
                onUpdate={(changes) => updateLesson(si, li, changes)}
                onDelete={() => deleteLesson(si, li)}
              />
            ))}
            <Pressable onPress={() => addLesson(si)} style={[currStyles.addLessonBtn, { borderColor: theme.border }]}>
              <Plus size={14} color={theme.primary} weight="regular" />
              <Text style={[currStyles.addLessonText, { color: theme.primary }]}>Add Lesson</Text>
            </Pressable>
          </View>
        </View>
      ))}

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
        rte
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
        await tutorApiRequest(`/api/courses/${courseId}/publish`, { method: 'POST', body: { action: 'publish' } });
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

// ─── Curriculum styles ────────────────────────────────────────────────────────

const currStyles = StyleSheet.create({
  // Section
  sectionWrap: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, overflow: 'hidden', marginBottom: 0 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  sectionNum: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  sectionNumText: { fontSize: 12, fontFamily: Fonts.bold, color: '#fff' },
  sectionTitle: { flex: 1, fontSize: 14, fontFamily: Fonts.semiBold },
  sectionTitleInput: { fontSize: 14, fontFamily: Fonts.semiBold, borderBottomWidth: 1, paddingVertical: 2 },
  sectionActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lessonCount: { fontSize: 11, fontFamily: Fonts.regular },
  editBtn: { fontSize: 12, fontFamily: Fonts.semiBold },

  // Lessons container
  lessonsWrap: { padding: 10, gap: 8 },
  addLessonBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingVertical: 10, borderStyle: 'dashed' },
  addLessonText: { fontSize: 13, fontFamily: Fonts.semiBold },

  // Lesson card
  lessonCard: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  lessonHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  lessonHeaderTitle: { flex: 1, fontSize: 13, fontFamily: Fonts.medium },
  freeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  freeBadgeText: { fontSize: 10, fontFamily: Fonts.bold },
  lessonBody: { borderTopWidth: StyleSheet.hairlineWidth, padding: 12, gap: 14 },
  lessonTitleInput: { height: 42, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 12, fontSize: 14, fontFamily: Fonts.regular },
  emptyHint: { fontSize: 13, fontFamily: Fonts.regular, textAlign: 'center', paddingVertical: 8 },

  // Media upload box
  mediaBox: { borderWidth: 1, borderRadius: 10, borderStyle: 'dashed', height: 160, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  mediaFileName: { fontSize: 12, fontFamily: Fonts.medium, maxWidth: 240, textAlign: 'center' },
  mediaPct: { fontSize: 12, fontFamily: Fonts.semiBold },
  mediaTapChange: { fontSize: 11, fontFamily: Fonts.regular },
  mediaPrompt: { fontSize: 14, fontFamily: Fonts.medium },
  mediaHint: { fontSize: 12, fontFamily: Fonts.regular },
  mediaOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', gap: 8 },
  mediaOverlayText: { color: '#fff', fontSize: 14, fontFamily: Fonts.bold },

  // Duration row
  durationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  durationLabel: { fontSize: 13, fontFamily: Fonts.medium, flex: 1 },
  durationValue: { fontSize: 13, fontFamily: Fonts.semiBold },
  durationInput: { width: 70, height: 36, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 10, fontSize: 14, fontFamily: Fonts.semiBold, textAlign: 'center' },

  // Free preview row
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
  previewLabel: { fontSize: 13, fontFamily: Fonts.semiBold },
  previewDesc: { fontSize: 11, fontFamily: Fonts.regular },

  // Quiz question card
  qCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12, gap: 10 },
  qHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qNum: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  qNumText: { fontSize: 11, fontFamily: Fonts.bold, color: '#fff' },
  qLabel: { flex: 1, fontSize: 12, fontFamily: Fonts.regular },
  qInput: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, fontFamily: Fonts.regular, minHeight: 44 },
  optLabel: { fontSize: 12, fontFamily: Fonts.medium },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optCheck: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  optText: { flex: 1, fontSize: 13, fontFamily: Fonts.regular },
  optInput: { flex: 1, height: 36, borderWidth: StyleSheet.hairlineWidth, borderRadius: 6, paddingHorizontal: 10, fontSize: 13, fontFamily: Fonts.regular },
  addOptBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: StyleSheet.hairlineWidth, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start' },
  addOptText: { fontSize: 12, fontFamily: Fonts.semiBold },
  addQuestionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingVertical: 10, borderStyle: 'dashed' },
  addQuestionText: { fontSize: 13, fontFamily: Fonts.semiBold },
});
