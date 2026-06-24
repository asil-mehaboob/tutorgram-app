import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Plus, Warning } from 'phosphor-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { Fonts, Spacing, BottomTabInset } from '@/constants/theme';
import { CourseRow } from '@/components/tutor/course-row';
import {
  getMyCourses,
  deleteCourse,
  publishCourse,
  unpublishCourse,
} from '@/lib/api/tutor-courses';
import type { CourseStatus, TutorCourse } from '@/lib/api/tutor-courses';

const TABS: { label: string; value: CourseStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Published', value: 'PUBLISHED' },
  { label: 'Draft', value: 'DRAFT' },
];

export default function TutorCourses() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<CourseStatus | 'ALL'>('ALL');
  const [confirmDelete, setConfirmDelete] = useState<TutorCourse | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['tutor-courses', filter],
    queryFn: () => getMyCourses(filter !== 'ALL' ? { status: filter } : undefined),
    staleTime: 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCourse(id),
    onSuccess: () => {
      setConfirmDelete(null);
      qc.invalidateQueries({ queryKey: ['tutor-courses'] });
    },
  });

  async function handlePublish(course: TutorCourse) {
    setPublishingId(course.id);
    try {
      if (course.status === 'PUBLISHED') {
        await unpublishCourse(course.id);
      } else {
        await publishCourse(course.id);
      }
      qc.invalidateQueries({ queryKey: ['tutor-courses'] });
    } catch {
      // error handled silently; could add toast here
    } finally {
      setPublishingId(null);
    }
  }

  const courses = data ?? [];

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>My Courses</Text>
        <Pressable
          onPress={() => router.push('/tutor-course/create')}
          style={({ pressed }) => [styles.newBtn, { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 }]}
        >
          <Plus size={16} color="#fff" weight="regular" />
          <Text style={styles.newBtnText}>New</Text>
        </Pressable>
      </View>

      {/* Tab bar */}
      <View style={[styles.tabBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        {TABS.map((t) => (
          <Pressable key={t.value} onPress={() => setFilter(t.value)} style={styles.tabItem}>
            <Text style={[styles.tabLabel, { color: filter === t.value ? theme.primary : theme.textSecondary }]}>
              {t.label}
            </Text>
            {filter === t.value && <View style={[styles.tabIndicator, { backgroundColor: theme.primary }]} />}
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Failed to load courses</Text>
          <Pressable onPress={() => refetch()} style={[styles.retryBtn, { borderColor: theme.border }]}>
            <Text style={[styles.retryText, { color: theme.primary }]}>Retry</Text>
          </Pressable>
        </View>
      ) : courses.length === 0 ? (
        <View style={styles.center}>
          <BookOpen size={52} color={theme.border} weight="regular" />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No courses yet</Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Create your first course to start teaching
          </Text>
          <Pressable
            onPress={() => router.push('/tutor-course/create')}
            style={[styles.createBtn, { backgroundColor: theme.primary }]}
          >
            <Text style={styles.createBtnText}>Create Course</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <CourseRow
              course={item}
              onEdit={() => router.push({ pathname: '/tutor-course/[id]/edit', params: { id: item.id } })}
              onPreview={() => router.push({ pathname: '/tutor-course/[id]/preview' as any, params: { id: item.id } })}
              onPublish={() => handlePublish(item)}
              onDelete={() => setConfirmDelete(item)}
              isPublishing={publishingId === item.id}
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: BottomTabInset + 16 }]}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Delete confirmation modal */}
      <Modal visible={!!confirmDelete} transparent animationType="fade" onRequestClose={() => setConfirmDelete(null)}>
        <Pressable style={styles.backdrop} onPress={() => setConfirmDelete(null)}>
          <Pressable style={[styles.dialog, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => {}}>

            <View style={styles.dialogIcon}>
              <Warning size={28} color="#EF4444" weight="regular" />
            </View>

            <Text style={[styles.dialogTitle, { color: theme.text }]}>Delete Course</Text>
            <Text style={[styles.dialogBody, { color: theme.textSecondary }]}>
              <Text style={{ color: theme.text, fontFamily: Fonts.semiBold }}>"{confirmDelete?.title}"</Text>
              {' '}will be permanently deleted. This cannot be undone.
            </Text>

            <View style={[styles.dialogDivider, { backgroundColor: theme.border }]} />

            <View style={styles.dialogActions}>
              <Pressable
                onPress={() => setConfirmDelete(null)}
                style={({ pressed }) => [styles.dialogBtn, { borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={[styles.dialogBtnText, { color: theme.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
                disabled={deleteMutation.isPending}
                style={({ pressed }) => [styles.dialogBtn, styles.dialogBtnDelete, { opacity: pressed ? 0.8 : 1 }]}
              >
                {deleteMutation.isPending
                  ? <ActivityIndicator size={14} color="#fff" />
                  : <Text style={[styles.dialogBtnText, { color: '#fff' }]}>Delete</Text>}
              </Pressable>
            </View>

          </Pressable>
        </Pressable>
      </Modal>

    </View>
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
  headerTitle: { fontSize: 26, fontFamily: Fonts.extraBold, letterSpacing: -0.5 },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newBtnText: { fontSize: 13, fontFamily: Fonts.bold, color: '#fff' },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  tabLabel: { fontSize: 13, fontFamily: Fonts.semiBold },
  tabIndicator: { position: 'absolute', bottom: 0, left: '15%', right: '15%', height: 2, borderRadius: 1 },
  list: { padding: Spacing.three },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: Spacing.five },
  emptyTitle: { fontSize: 18, fontFamily: Fonts.bold, textAlign: 'center' },
  emptyText: { fontSize: 14, fontFamily: Fonts.regular, textAlign: 'center', lineHeight: 20 },
  createBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, marginTop: 4 },
  createBtnText: { fontSize: 15, fontFamily: Fonts.bold, color: '#fff' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  retryText: { fontSize: 14, fontFamily: Fonts.semiBold },

  // Delete dialog
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    alignItems: 'center',
    paddingTop: 28,
  },
  dialogIcon: {
    marginBottom: 12,
  },
  dialogTitle: {
    fontSize: 17,
    fontFamily: Fonts.bold,
    marginBottom: 8,
  },
  dialogBody: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  dialogDivider: {
    height: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  dialogActions: {
    flexDirection: 'row',
    alignSelf: 'stretch',
  },
  dialogBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  dialogBtnDelete: {
    backgroundColor: '#EF4444',
    borderRightWidth: 0,
  },
  dialogBtnText: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
  },
});
