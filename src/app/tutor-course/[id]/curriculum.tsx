import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, PencilSimple, Trash, VideoCamera, Article, ListChecks, Paperclip, Eye, EyeSlash } from 'phosphor-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { Fonts, Spacing } from '@/constants/theme';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getCourse, updateLesson, deleteLesson } from '@/lib/api/tutor-courses';
import { useDialog } from '@/lib/dialog/context';
import type { TutorLesson, LessonType } from '@/lib/api/tutor-courses';
import { tutorApiRequest as apiReq } from '@/lib/api/tutor-client';

const LESSON_TYPES: { value: LessonType; label: string; icon: React.ReactNode }[] = [
  { value: 'VIDEO', label: 'Video', icon: <VideoCamera size={14} /> },
  { value: 'ARTICLE', label: 'Article', icon: <Article size={14} /> },
  { value: 'QUIZ', label: 'Quiz', icon: <ListChecks size={14} /> },
  { value: 'RESOURCE', label: 'Resource', icon: <Paperclip size={14} /> },
];

function LessonTypeIcon({ type, color }: { type: LessonType; color: string }) {
  const props = { size: 14, color, weight: 'regular' as const };
  switch (type) {
    case 'VIDEO': return <VideoCamera {...props} />;
    case 'ARTICLE': return <Article {...props} />;
    case 'QUIZ': return <ListChecks {...props} />;
    default: return <Paperclip {...props} />;
  }
}

export default function CourseCurriculum() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { showDialog } = useDialog();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();

  const [addingSectionTo, setAddingSectionTo] = useState<string | null>(null);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [addingLessonTo, setAddingLessonTo] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonType, setNewLessonType] = useState<LessonType>('VIDEO');
  const [showAddSection, setShowAddSection] = useState(false);

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

  async function addLesson(sectionId: string) {
    if (!newLessonTitle.trim()) return;
    await apiReq(`/api/courses/${id}/sections/${sectionId}/lessons`, { method: 'POST', body: { title: newLessonTitle, type: newLessonType } });
    qc.invalidateQueries({ queryKey: ['tutor-course', id] });
    setNewLessonTitle('');
    setAddingLessonTo(null);
  }

  async function deleteSection(sectionId: string) {
    await apiReq(`/api/courses/${id}/sections/${sectionId}`, { method: 'DELETE' });
    qc.invalidateQueries({ queryKey: ['tutor-course', id] });
  }

  async function toggleFreePreview(lesson: TutorLesson, sectionId: string) {
    await updateLesson(id!, lesson.id, { isFreePreview: !lesson.isFreePreview });
    qc.invalidateQueries({ queryKey: ['tutor-course', id] });
  }

  async function handleDeleteLesson(lessonId: string) {
    await deleteLesson(id!, lessonId);
    qc.invalidateQueries({ queryKey: ['tutor-course', id] });
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}><ArrowLeft size={22} color={theme.text} weight="regular" /></Pressable>
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
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Add a section to start building your curriculum</Text>
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
                  <Pressable
                    onPress={() => { setAddingLessonTo(section.id); setNewLessonTitle(''); setNewLessonType('VIDEO'); }}
                    hitSlop={8}
                  >
                    <Plus size={16} color={theme.primary} weight="regular" />
                  </Pressable>
                  <Pressable
                    onPress={() => showDialog({ title: 'Delete Section', message: `Delete "${section.title}" and all its lessons?`, type: 'warning', actions: [{ label: 'Cancel', variant: 'cancel' }, { label: 'Delete', variant: 'destructive', onPress: () => deleteSection(section.id) }] })}
                    hitSlop={8}
                  >
                    <Trash size={16} color={theme.error} weight="regular" />
                  </Pressable>
                </View>
              </View>

              {section.lessons?.map((lesson, li) => (
                <View key={lesson.id} style={[styles.lessonRow, { borderBottomColor: theme.border, borderBottomWidth: li < section.lessons.length - 1 ? StyleSheet.hairlineWidth : 0 }]}>
                  <LessonTypeIcon type={lesson.type} color={theme.textSecondary} />
                  <Text style={[styles.lessonTitle, { color: theme.text }]} numberOfLines={1}>{lesson.title}</Text>
                  {lesson.duration && <Text style={[styles.lessonDuration, { color: theme.textSecondary }]}>{Math.floor(lesson.duration / 60)}m</Text>}
                  <Pressable onPress={() => toggleFreePreview(lesson, section.id)} style={styles.previewBtn}>
                    {lesson.isFreePreview
                      ? <Eye size={14} color={theme.primary} weight="fill" />
                      : <EyeSlash size={14} color={theme.textSecondary} />}
                  </Pressable>
                  <Pressable
                    onPress={() => showDialog({ title: 'Delete', message: `Delete "${lesson.title}"?`, type: 'warning', actions: [{ label: 'Cancel', variant: 'cancel' }, { label: 'Delete', variant: 'destructive', onPress: () => handleDeleteLesson(lesson.id) }] })}
                    style={styles.lessonDeleteBtn}
                  >
                    <Trash size={14} color={theme.error} weight="regular" />
                  </Pressable>
                </View>
              ))}

              {addingLessonTo === section.id && (
                <View style={[styles.addLessonForm, { borderTopColor: theme.border }]}>
                  <View style={styles.lessonTypeRow}>
                    {LESSON_TYPES.map((lt) => (
                      <Pressable
                        key={lt.value}
                        onPress={() => setNewLessonType(lt.value)}
                        style={[styles.typeBtn, { borderColor: newLessonType === lt.value ? theme.primary : theme.border, backgroundColor: newLessonType === lt.value ? theme.primaryLight : theme.surface }]}
                      >
                        <Text style={[styles.typeBtnText, { color: newLessonType === lt.value ? theme.primary : theme.textSecondary }]}>{lt.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.lessonInputRow}>
                    <Input
                      value={newLessonTitle}
                      onChangeText={setNewLessonTitle}
                      placeholder="Lesson title..."
                      style={{ height: 40, flex: 1 }}
                    />
                    <Pressable onPress={() => addLesson(section.id)} style={[styles.addLessonBtn, { backgroundColor: theme.primary }]}>
                      <Text style={styles.addLessonBtnText}>Add</Text>
                    </Pressable>
                    <Pressable onPress={() => setAddingLessonTo(null)} style={[styles.cancelLessonBtn, { backgroundColor: theme.surfaceEl }]}>
                      <Text style={[styles.cancelLessonText, { color: theme.textSecondary }]}>Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add Section Modal */}
      <Modal visible={showAddSection} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>New Section</Text>
            <Pressable onPress={() => setShowAddSection(false)}><Text style={[styles.cancelText, { color: theme.primary }]}>Cancel</Text></Pressable>
          </View>
          <View style={styles.modalBody}>
            <Input label="Section Title" value={newSectionTitle} onChangeText={setNewSectionTitle} placeholder="e.g. Getting Started" />
            <Button label="Add Section" onPress={addSection} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: Spacing.three, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
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
  sectionActions: { flexDirection: 'row', gap: 16 },
  lessonRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  lessonTitle: { flex: 1, fontSize: 13, fontFamily: Fonts.regular },
  lessonDuration: { fontSize: 11, fontFamily: Fonts.regular },
  previewBtn: { padding: 4 },
  lessonDeleteBtn: { padding: 4 },
  addLessonForm: { borderTopWidth: StyleSheet.hairlineWidth, padding: 10, gap: 8 },
  lessonTypeRow: { flexDirection: 'row', gap: 6 },
  typeBtn: { flex: 1, paddingVertical: 6, borderRadius: 6, borderWidth: 1, alignItems: 'center' },
  typeBtnText: { fontSize: 11, fontFamily: Fonts.semiBold },
  lessonInputRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  addLessonBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  addLessonBtnText: { fontSize: 13, fontFamily: Fonts.bold, color: '#fff' },
  cancelLessonBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 6 },
  cancelLessonText: { fontSize: 13, fontFamily: Fonts.medium },
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  modalTitle: { fontSize: 17, fontFamily: Fonts.bold },
  cancelText: { fontSize: 15, fontFamily: Fonts.medium },
  modalBody: { padding: 16, gap: 14 },
});
