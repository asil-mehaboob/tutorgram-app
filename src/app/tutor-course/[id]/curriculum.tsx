import { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Article, Check, ListChecks,
  Paperclip, PencilSimple, Plus, Trash, VideoCamera, Warning,
} from 'phosphor-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useTheme } from '@/hooks/use-theme';
import { Fonts, Spacing } from '@/constants/theme';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RichField } from '@/components/tutor/rich-field';
import { getCourse, updateLesson, deleteLesson } from '@/lib/api/tutor-courses';
import { useDialog } from '@/lib/dialog/context';
import type { TutorLesson, LessonType, VideoStatus } from '@/lib/api/tutor-courses';
import { tutorApiRequest as apiReq } from '@/lib/api/tutor-client';
import { uploadVideo } from '@/lib/api/tutor-upload';

const LESSON_TYPES: { value: LessonType; label: string }[] = [
  { value: 'VIDEO', label: 'Video' },
  { value: 'ARTICLE', label: 'Article' },
  { value: 'QUIZ', label: 'Quiz' },
  { value: 'RESOURCE', label: 'Resource' },
];

function LessonTypeIcon({ type, color, size = 14 }: { type: LessonType; color: string; size?: number }) {
  const p = { size, color, weight: 'regular' as const };
  switch (type) {
    case 'VIDEO': return <VideoCamera {...p} />;
    case 'ARTICLE': return <Article {...p} />;
    case 'QUIZ': return <ListChecks {...p} />;
    default: return <Paperclip {...p} />;
  }
}

function VideoStatusBadge({ status, theme }: { status: VideoStatus; theme: ReturnType<typeof useTheme> }) {
  if (status === 'NONE') return null;
  const map: Record<VideoStatus, { label: string; bg: string; color: string }> = {
    NONE: { label: '', bg: '', color: '' },
    PROCESSING: { label: 'Processing', bg: '#FFF8E1', color: '#F57F17' },
    READY: { label: 'Ready', bg: '#E8F5E9', color: '#2E7D32' },
    FAILED: { label: 'Failed', bg: '#FFEBEE', color: '#C62828' },
  };
  const { label, bg, color } = map[status];
  return (
    <View style={[vs.badge, { backgroundColor: bg }]}>
      <Text style={[vs.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Shared lesson form body (used by both Add and Edit modals) ────────────────

function LessonFormBody({
  title, setTitle,
  type, setType,
  content, setContent,
  videoUri, uploading, uploadPct, uploadedKey,
  existingVideoStatus,
  onPickVideo,
  onPickResource,
  theme,
}: {
  title: string;
  setTitle: (v: string) => void;
  type: LessonType;
  setType: (v: LessonType) => void;
  content: string;
  setContent: (v: string) => void;
  videoUri: string | null;
  uploading: boolean;
  uploadPct: number;
  uploadedKey: string;
  existingVideoStatus: VideoStatus;
  onPickVideo: () => void;
  onPickResource: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const isVideo = type === 'VIDEO';

  return (
    <>
      <Input
        label="Lesson Title *"
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Introduction to React Native"
      />

      <View style={em.field}>
        <Text style={[em.fieldLabel, { color: theme.text }]}>Lesson Type</Text>
        <View style={em.typeRow}>
          {LESSON_TYPES.map((lt) => {
            const sel = type === lt.value;
            return (
              <Pressable
                key={lt.value}
                onPress={() => setType(lt.value)}
                style={[em.typeChip, {
                  borderColor: sel ? theme.primary : theme.border,
                  backgroundColor: sel ? theme.primaryLight : theme.surface,
                }]}
              >
                <LessonTypeIcon type={lt.value} color={sel ? theme.primary : theme.textSecondary} />
                <Text style={[em.typeChipText, { color: sel ? theme.primary : theme.textSecondary }]}>{lt.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* VIDEO */}
      {isVideo && (
        <View style={em.field}>
          <Text style={[em.fieldLabel, { color: theme.text }]}>Video</Text>

          {!videoUri && existingVideoStatus !== 'NONE' && (
            <View style={[em.videoStatusCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {existingVideoStatus === 'PROCESSING' && (
                <View style={em.videoStatusRow}>
                  <ActivityIndicator size={16} color="#F57F17" />
                  <View style={{ flex: 1 }}>
                    <Text style={[em.videoStatusTitle, { color: theme.text }]}>Transcoding in progress</Text>
                    <Text style={[em.videoStatusSub, { color: theme.textSecondary }]}>HLS stream is being generated. This may take a few minutes.</Text>
                  </View>
                </View>
              )}
              {existingVideoStatus === 'READY' && (
                <View style={em.videoStatusRow}>
                  <Check size={18} color="#2E7D32" weight="bold" />
                  <View style={{ flex: 1 }}>
                    <Text style={[em.videoStatusTitle, { color: theme.text }]}>Video ready</Text>
                    <Text style={[em.videoStatusSub, { color: '#2E7D32' }]}>HLS stream is ready for playback</Text>
                  </View>
                </View>
              )}
              {existingVideoStatus === 'FAILED' && (
                <View style={em.videoStatusRow}>
                  <Warning size={18} color="#C62828" weight="regular" />
                  <View style={{ flex: 1 }}>
                    <Text style={[em.videoStatusTitle, { color: theme.text }]}>Transcoding failed</Text>
                    <Text style={[em.videoStatusSub, { color: theme.textSecondary }]}>Upload a new video to replace it.</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          <Pressable
            onPress={onPickVideo}
            disabled={uploading}
            style={[em.uploadZone, {
              borderColor: videoUri ? theme.primary : theme.border,
              backgroundColor: theme.surface,
            }]}
          >
            {videoUri ? (
              <View style={{ alignItems: 'center', gap: 6 }}>
                <VideoCamera size={28} color={uploadedKey ? theme.primary : theme.textSecondary} weight="regular" />
                <Text style={[em.uploadFileName, { color: theme.text }]} numberOfLines={1}>
                  {videoUri.split('/').pop()}
                </Text>
                {uploading ? (
                  <View style={{ alignItems: 'center', gap: 4 }}>
                    <ActivityIndicator size={14} color={theme.primary} />
                    <Text style={[em.uploadPct, { color: theme.primary }]}>Uploading… {uploadPct}%</Text>
                    <View style={[em.progressTrack, { backgroundColor: theme.border }]}>
                      <View style={[em.progressFill, { width: `${uploadPct}%` as any, backgroundColor: theme.primary }]} />
                    </View>
                  </View>
                ) : uploadedKey ? (
                  <View style={em.uploadDoneRow}>
                    <Check size={13} color="#2E7D32" weight="bold" />
                    <Text style={em.uploadDoneText}>Uploaded</Text>
                  </View>
                ) : null}
                {!uploading && <Text style={[em.tapChange, { color: theme.textSecondary }]}>Tap to change</Text>}
              </View>
            ) : (
              <View style={{ alignItems: 'center', gap: 8 }}>
                <VideoCamera size={30} color={theme.border} weight="regular" />
                <Text style={[em.uploadPrompt, { color: theme.textSecondary }]}>
                  {existingVideoStatus === 'NONE' ? 'Tap to upload video' : 'Tap to replace video'}
                </Text>
                <Text style={[em.uploadHint, { color: theme.textSecondary }]}>MP4 or MOV · Max 1 GB</Text>
              </View>
            )}
          </Pressable>
        </View>
      )}

      {/* ARTICLE */}
      {type === 'ARTICLE' && (
        <RichField
          label="Article Content"
          value={content}
          onChangeText={setContent}
          placeholder="Write the lesson content here…"
          minHeight={200}
          rte
        />
      )}

      {/* QUIZ */}
      {type === 'QUIZ' && (
        <View style={[em.infoBox, { backgroundColor: theme.surfaceEl, borderColor: theme.border }]}>
          <ListChecks size={18} color={theme.textSecondary} weight="regular" />
          <Text style={[em.infoText, { color: theme.textSecondary }]}>
            Quiz questions are managed via the web app. Save this lesson first, then add questions there.
          </Text>
        </View>
      )}

      {/* RESOURCE */}
      {type === 'RESOURCE' && (
        <View style={em.field}>
          <Text style={[em.fieldLabel, { color: theme.text }]}>Resource File</Text>
          <Pressable
            onPress={onPickResource}
            style={[em.uploadZone, { borderColor: content ? theme.primary : theme.border, backgroundColor: theme.surface }]}
          >
            {content ? (
              <View style={{ alignItems: 'center', gap: 6 }}>
                <Paperclip size={26} color={theme.primary} weight="regular" />
                <Text style={[em.uploadFileName, { color: theme.text }]} numberOfLines={1}>
                  {content.split('/').pop()}
                </Text>
                <View style={em.uploadDoneRow}>
                  <Check size={13} color="#2E7D32" weight="bold" />
                  <Text style={em.uploadDoneText}>Attached</Text>
                </View>
                <Text style={[em.tapChange, { color: theme.textSecondary }]}>Tap to change</Text>
              </View>
            ) : (
              <View style={{ alignItems: 'center', gap: 8 }}>
                <Paperclip size={28} color={theme.border} weight="regular" />
                <Text style={[em.uploadPrompt, { color: theme.textSecondary }]}>Tap to attach resource file</Text>
                <Text style={[em.uploadHint, { color: theme.textSecondary }]}>PDF, DOC, ZIP, etc.</Text>
              </View>
            )}
          </Pressable>
        </View>
      )}
    </>
  );
}

// ─── Add Lesson Modal ──────────────────────────────────────────────────────────

function AddLessonModal({
  courseId,
  sectionId,
  visible,
  onClose,
  onAdded,
  theme,
}: {
  courseId: string;
  sectionId: string;
  visible: boolean;
  onClose: () => void;
  onAdded: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const insets = useSafeAreaInsets();
  const { showDialog } = useDialog();

  const [title, setTitle] = useState('');
  const [type, setType] = useState<LessonType>('VIDEO');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadedKey, setUploadedKey] = useState('');
  const [videoUri, setVideoUri] = useState<string | null>(null);
  // Lesson created eagerly on video pick so we have an ID for the upload
  const [createdLessonId, setCreatedLessonId] = useState<string | null>(null);

  function reset() {
    setTitle('');
    setType('VIDEO');
    setContent('');
    setSaving(false);
    setUploadPct(0);
    setUploading(false);
    setUploadedKey('');
    setVideoUri(null);
    setCreatedLessonId(null);
  }

  function handleClose() {
    // If a lesson was already created (video picked), refresh the list so it appears
    if (createdLessonId) onAdded();
    reset();
    onClose();
  }

  async function pickVideo() {
    if (!title.trim()) {
      showDialog({ title: 'Enter a title first', message: 'Please enter a lesson title before uploading a video.', type: 'error' });
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showDialog({ title: 'Permission needed', message: 'Allow photo library access to upload videos.', type: 'error' });
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'videos', allowsEditing: false });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'mp4';
    const mime = asset.mimeType ?? `video/${ext}`;
    const file = new File(asset.uri);
    const size = file.size > 0 ? file.size : (asset.fileSize ?? 0);
    setVideoUri(asset.uri);
    setUploadedKey('');

    // Create the lesson now to get a real ID, then start uploading immediately
    let lessonId = createdLessonId;
    if (!lessonId) {
      setSaving(true);
      try {
        const created = await apiReq<TutorLesson>(`/api/courses/${courseId}/sections/${sectionId}/lessons`, {
          method: 'POST',
          body: { title: title.trim(), type },
        });
        lessonId = created.id;
        setCreatedLessonId(created.id);
      } catch (e: any) {
        showDialog({ title: 'Error', message: e.message ?? 'Could not create lesson', type: 'error' });
        setVideoUri(null);
        return;
      } finally {
        setSaving(false);
      }
    }

    // Upload starts immediately
    setUploading(true);
    setUploadPct(0);
    try {
      const key = await uploadVideo('lesson-video', `lesson-video.${ext}`, asset.uri, mime, size, lessonId, setUploadPct);
      setUploadedKey(key);
      await updateLesson(courseId, lessonId, { content: key });
      apiReq('/api/upload/transcode', { method: 'POST', body: { lessonId, sourceKey: key } })
        .catch((e: any) => console.warn('[curriculum] transcode trigger failed:', e?.message));
    } catch (e: any) {
      showDialog({ title: 'Upload failed', message: e.message ?? 'Could not upload video', type: 'error' });
      setVideoUri(null);
    } finally {
      setUploading(false);
    }
  }

  async function pickResource() {
    try {
      const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: false });
      if (res.canceled || !res.assets[0]) return;
      setContent(res.assets[0].uri);
    } catch (e: any) {
      showDialog({ title: 'Could not pick file', message: e.message ?? 'Unknown error', type: 'error' });
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      showDialog({ title: 'Missing title', message: 'Please enter a lesson title.', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      if (createdLessonId) {
        // Lesson was already created when video was picked — just sync title/type
        await updateLesson(courseId, createdLessonId, { title: title.trim(), type });
      } else {
        // No video picked — create lesson with content now
        const created = await apiReq<TutorLesson>(`/api/courses/${courseId}/sections/${sectionId}/lessons`, {
          method: 'POST',
          body: { title: title.trim(), type },
        });
        if (type === 'ARTICLE' && content.trim()) {
          await updateLesson(courseId, created.id, { content });
        }
      }
      onAdded();
      reset();
      onClose();
    } catch (e: any) {
      showDialog({ title: 'Error', message: e.message ?? 'Could not add lesson', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[em.root, { backgroundColor: theme.background }]}>
        <View style={[em.header, { paddingTop: insets.top + 8, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <Pressable onPress={handleClose} hitSlop={8}>
            <Text style={[em.cancelText, { color: theme.textSecondary }]}>Cancel</Text>
          </Pressable>
          <Text style={[em.headerTitle, { color: theme.text }]}>New Lesson</Text>
          <Pressable onPress={handleSave} disabled={saving || uploading} style={em.saveBtn}>
            {saving || uploading ? <ActivityIndicator size={16} color={theme.primary} /> : null}
            <Text style={[em.saveText, { color: saving || uploading ? theme.textSecondary : theme.primary }]}>
              {uploading ? `${uploadPct}%` : 'Add'}
            </Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={[em.body, { paddingBottom: insets.bottom + 40 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <LessonFormBody
              title={title} setTitle={setTitle}
              type={type} setType={setType}
              content={content} setContent={setContent}
              videoUri={videoUri}
              uploading={uploading}
              uploadPct={uploadPct}
              uploadedKey={uploadedKey}
              existingVideoStatus="NONE"
              onPickVideo={pickVideo}
              onPickResource={pickResource}
              theme={theme}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Edit Lesson Modal ─────────────────────────────────────────────────────────

function LessonEditModal({
  lesson,
  courseId,
  visible,
  onClose,
  onSaved,
  theme,
}: {
  lesson: TutorLesson;
  courseId: string;
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const insets = useSafeAreaInsets();
  const { showDialog } = useDialog();

  const [title, setTitle] = useState(lesson.title);
  const [type, setType] = useState<LessonType>(lesson.type);
  const [content, setContent] = useState(lesson.type !== 'VIDEO' ? (lesson.content ?? '') : '');
  const [saving, setSaving] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadedKey, setUploadedKey] = useState(lesson.type === 'VIDEO' ? (lesson.content ?? '') : '');
  const [videoUri, setVideoUri] = useState<string | null>(null);

  async function pickVideo() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showDialog({ title: 'Permission needed', message: 'Allow photo library access to upload videos.', type: 'error' });
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'videos', allowsEditing: false });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    setVideoUri(asset.uri);
    setUploading(true);
    setUploadPct(0);
    try {
      const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'mp4';
      const mime = asset.mimeType ?? `video/${ext}`;
      const file = new File(asset.uri);
      const size = file.size > 0 ? file.size : (asset.fileSize ?? 0);
      const key = await uploadVideo('lesson-video', `lesson-video.${ext}`, asset.uri, mime, size, lesson.id, setUploadPct);
      setUploadedKey(key);
      apiReq('/api/upload/transcode', { method: 'POST', body: { lessonId: lesson.id, sourceKey: key } })
        .catch((e: any) => console.warn('[curriculum] transcode trigger failed:', e?.message));
    } catch (e: any) {
      showDialog({ title: 'Upload failed', message: e.message ?? 'Could not upload video', type: 'error' });
      setVideoUri(null);
    } finally {
      setUploading(false);
    }
  }

  async function pickResource() {
    try {
      const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: false });
      if (res.canceled || !res.assets[0]) return;
      setContent(res.assets[0].uri);
    } catch (e: any) {
      showDialog({ title: 'Could not pick file', message: e.message ?? 'Unknown error', type: 'error' });
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      showDialog({ title: 'Missing title', message: 'Please enter a lesson title.', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const body: Parameters<typeof updateLesson>[2] = { title: title.trim(), type };
      if (type === 'ARTICLE') body.content = content;
      if (type === 'VIDEO' && uploadedKey && uploadedKey !== lesson.content) body.content = uploadedKey;
      await updateLesson(courseId, lesson.id, body);
      onSaved();
      onClose();
    } catch (e: any) {
      showDialog({ title: 'Save failed', message: e.message ?? 'Could not save lesson.', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[em.root, { backgroundColor: theme.background }]}>
        <View style={[em.header, { paddingTop: insets.top + 8, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={[em.cancelText, { color: theme.textSecondary }]}>Cancel</Text>
          </Pressable>
          <Text style={[em.headerTitle, { color: theme.text }]} numberOfLines={1}>Edit Lesson</Text>
          <Pressable onPress={handleSave} disabled={saving || uploading} style={em.saveBtn}>
            {saving ? <ActivityIndicator size={16} color={theme.primary} /> : null}
            <Text style={[em.saveText, { color: saving || uploading ? theme.textSecondary : theme.primary }]}>Save</Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={[em.body, { paddingBottom: insets.bottom + 40 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <LessonFormBody
              title={title} setTitle={setTitle}
              type={type} setType={setType}
              content={content} setContent={setContent}
              videoUri={videoUri}
              uploading={uploading}
              uploadPct={uploadPct}
              uploadedKey={uploadedKey}
              existingVideoStatus={lesson.videoStatus}
              onPickVideo={pickVideo}
              onPickResource={pickResource}
              theme={theme}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function CourseCurriculum() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { showDialog } = useDialog();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();

  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [showAddSection, setShowAddSection] = useState(false);
  const [addingLessonToSection, setAddingLessonToSection] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<TutorLesson | null>(null);

  const { data: course, isLoading } = useQuery({
    queryKey: ['tutor-course', id],
    queryFn: () => getCourse(id!),
    enabled: !!id,
    staleTime: 30_000,
  });

  async function addSection() {
    if (!newSectionTitle.trim()) return;
    await apiReq(`/api/courses/${id}/sections`, { method: 'POST', body: { title: newSectionTitle } });
    qc.invalidateQueries({ queryKey: ['tutor-course', id] });
    setNewSectionTitle('');
    setShowAddSection(false);
  }

  async function deleteSection(sectionId: string) {
    await apiReq(`/api/courses/${id}/sections/${sectionId}`, { method: 'DELETE' });
    qc.invalidateQueries({ queryKey: ['tutor-course', id] });
  }

  async function handleDeleteLesson(lessonId: string) {
    await deleteLesson(id!, lessonId);
    qc.invalidateQueries({ queryKey: ['tutor-course', id] });
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}>
          <ArrowLeft size={22} color={theme.text} weight="regular" />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Curriculum</Text>
        <Pressable onPress={() => setShowAddSection(true)} style={styles.addBtn}>
          <Plus size={18} color={theme.primary} weight="regular" />
          <Text style={[styles.addBtnText, { color: theme.primary }]}>Section</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={theme.primary} size="large" /></View>
      ) : course?.sections?.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No sections yet</Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Add a section to start building your curriculum
          </Text>
          <Pressable onPress={() => setShowAddSection(true)} style={[styles.addFirstBtn, { backgroundColor: theme.primary }]}>
            <Text style={styles.addFirstBtnText}>Add First Section</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {course?.sections?.map((section, si) => (
            <View key={section.id} style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={[styles.sectionHeader, { backgroundColor: theme.surfaceEl }]}>
                <Text style={[styles.sectionNum, { color: theme.textSecondary }]}>Section {si + 1}</Text>
                <Text style={[styles.sectionTitle, { color: theme.text }]} numberOfLines={1}>{section.title}</Text>
                <View style={styles.sectionActions}>
                  <Pressable onPress={() => setAddingLessonToSection(section.id)} hitSlop={8}>
                    <Plus size={16} color={theme.primary} weight="regular" />
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      showDialog({
                        title: 'Delete Section',
                        message: `Delete "${section.title}" and all its lessons?`,
                        type: 'warning',
                        actions: [
                          { label: 'Cancel', variant: 'cancel' },
                          { label: 'Delete', variant: 'destructive', onPress: () => deleteSection(section.id) },
                        ],
                      })
                    }
                    hitSlop={8}
                  >
                    <Trash size={16} color={theme.error} weight="regular" />
                  </Pressable>
                </View>
              </View>

              {section.lessons?.length === 0 && (
                <Pressable
                  onPress={() => setAddingLessonToSection(section.id)}
                  style={[styles.emptyLessons, { borderColor: theme.border }]}
                >
                  <Plus size={14} color={theme.textSecondary} weight="regular" />
                  <Text style={[styles.emptyLessonsText, { color: theme.textSecondary }]}>Add first lesson</Text>
                </Pressable>
              )}

              {section.lessons?.map((lesson, li) => (
                <View
                  key={lesson.id}
                  style={[
                    styles.lessonRow,
                    {
                      borderBottomColor: theme.border,
                      borderBottomWidth: li < section.lessons.length - 1 ? StyleSheet.hairlineWidth : 0,
                    },
                  ]}
                >
                  <LessonTypeIcon type={lesson.type} color={theme.textSecondary} />
                  <View style={styles.lessonMeta}>
                    <Text style={[styles.lessonTitle, { color: theme.text }]} numberOfLines={1}>{lesson.title}</Text>
                    <View style={styles.lessonBadgeRow}>
                      {lesson.duration ? (
                        <Text style={[styles.lessonDuration, { color: theme.textSecondary }]}>
                          {Math.floor(lesson.duration / 60)}m {lesson.duration % 60}s
                        </Text>
                      ) : null}
                      {lesson.type === 'VIDEO' && lesson.videoStatus !== 'NONE' && (
                        <VideoStatusBadge status={lesson.videoStatus} theme={theme} />
                      )}
                    </View>
                  </View>
                  <Pressable onPress={() => setEditingLesson(lesson)} style={styles.iconBtn} hitSlop={8}>
                    <PencilSimple size={15} color={theme.textSecondary} weight="regular" />
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      showDialog({
                        title: 'Delete Lesson',
                        message: `Delete "${lesson.title}"?`,
                        type: 'warning',
                        actions: [
                          { label: 'Cancel', variant: 'cancel' },
                          { label: 'Delete', variant: 'destructive', onPress: () => handleDeleteLesson(lesson.id) },
                        ],
                      })
                    }
                    style={styles.iconBtn}
                    hitSlop={8}
                  >
                    <Trash size={15} color={theme.error} weight="regular" />
                  </Pressable>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add Section Modal */}
      <Modal visible={showAddSection} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>New Section</Text>
            <Pressable onPress={() => setShowAddSection(false)}>
              <Text style={[styles.cancelText, { color: theme.primary }]}>Cancel</Text>
            </Pressable>
          </View>
          <View style={styles.modalBody}>
            <Input
              label="Section Title"
              value={newSectionTitle}
              onChangeText={setNewSectionTitle}
              placeholder="e.g. Getting Started"
            />
            <Button label="Add Section" onPress={addSection} />
          </View>
        </View>
      </Modal>

      {/* Add Lesson Modal */}
      {addingLessonToSection && (
        <AddLessonModal
          courseId={id!}
          sectionId={addingLessonToSection}
          visible={!!addingLessonToSection}
          onClose={() => setAddingLessonToSection(null)}
          onAdded={() => qc.invalidateQueries({ queryKey: ['tutor-course', id] })}
          theme={theme}
        />
      )}

      {/* Edit Lesson Modal */}
      {editingLesson && (
        <LessonEditModal
          lesson={editingLesson}
          courseId={id!}
          visible={!!editingLesson}
          onClose={() => setEditingLesson(null)}
          onSaved={() => qc.invalidateQueries({ queryKey: ['tutor-course', id] })}
          theme={theme}
        />
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
  headerTitle: { flex: 1, fontSize: 18, fontFamily: Fonts.bold },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  addBtnText: { fontSize: 12, fontFamily: Fonts.semiBold },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  emptyTitle: { fontSize: 18, fontFamily: Fonts.bold, textAlign: 'center' },
  emptyText: { fontSize: 14, fontFamily: Fonts.regular, textAlign: 'center', lineHeight: 20 },
  addFirstBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  addFirstBtnText: { fontSize: 15, fontFamily: Fonts.bold, color: '#fff' },
  scroll: { padding: Spacing.three, gap: 12 },
  sectionCard: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  sectionNum: { fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 0.5 },
  sectionTitle: { flex: 1, fontSize: 13, fontFamily: Fonts.semiBold },
  sectionActions: { flexDirection: 'row', gap: 14 },
  emptyLessons: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth,
  },
  emptyLessonsText: { fontSize: 13, fontFamily: Fonts.regular },
  lessonRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  lessonMeta: { flex: 1, gap: 2 },
  lessonTitle: { fontSize: 13, fontFamily: Fonts.regular },
  lessonBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lessonDuration: { fontSize: 11, fontFamily: Fonts.regular },
  iconBtn: { padding: 4 },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: { fontSize: 17, fontFamily: Fonts.bold },
  cancelText: { fontSize: 15, fontFamily: Fonts.medium },
  modalBody: { padding: 16, gap: 14 },
});

const vs = StyleSheet.create({
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 10, fontFamily: Fonts.semiBold },
});

const em = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cancelText: { fontSize: 15, fontFamily: Fonts.medium, minWidth: 56 },
  headerTitle: { flex: 1, fontSize: 17, fontFamily: Fonts.bold, textAlign: 'center' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 56, justifyContent: 'flex-end' },
  saveText: { fontSize: 15, fontFamily: Fonts.bold },
  body: { padding: 16, gap: 18 },
  field: { gap: 8 },
  fieldLabel: { fontSize: 13, fontFamily: Fonts.semiBold },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1,
  },
  typeChipText: { fontSize: 12, fontFamily: Fonts.semiBold },
  videoStatusCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12, marginBottom: 8 },
  videoStatusRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  videoStatusTitle: { fontSize: 13, fontFamily: Fonts.semiBold },
  videoStatusSub: { fontSize: 12, fontFamily: Fonts.regular, marginTop: 2 },
  uploadZone: {
    borderWidth: 1.5, borderRadius: 12, borderStyle: 'dashed',
    height: 148, justifyContent: 'center', alignItems: 'center', padding: 16,
  },
  uploadFileName: { fontSize: 12, fontFamily: Fonts.medium, maxWidth: 240, textAlign: 'center' },
  uploadPct: { fontSize: 12, fontFamily: Fonts.semiBold },
  progressTrack: { width: 160, height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  uploadDoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  uploadDoneText: { fontSize: 12, fontFamily: Fonts.semiBold, color: '#2E7D32' },
  tapChange: { fontSize: 11, fontFamily: Fonts.regular, marginTop: 2 },
  uploadPrompt: { fontSize: 14, fontFamily: Fonts.medium },
  uploadHint: { fontSize: 12, fontFamily: Fonts.regular },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12 },
  infoText: { flex: 1, fontSize: 13, fontFamily: Fonts.regular, lineHeight: 18 },
});
