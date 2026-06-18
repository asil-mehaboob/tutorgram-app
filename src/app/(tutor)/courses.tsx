import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, BookOpen } from 'phosphor-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { Fonts, Spacing, BottomTabInset } from '@/constants/theme';
import { CourseRow } from '@/components/tutor/course-row';
import { getMyCourses, deleteCourse, publishCourse } from '@/lib/api/tutor-courses';
import type { CourseStatus, TutorCourse } from '@/lib/api/tutor-courses';

const FILTERS: { label: string; value: CourseStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Published', value: 'PUBLISHED' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'In Review', value: 'PENDING_REVIEW' },
  { label: 'Archived', value: 'ARCHIVED' },
];

export default function TutorCourses() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<CourseStatus | 'ALL'>('ALL');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['tutor-courses', filter],
    queryFn: () => getMyCourses(filter !== 'ALL' ? { status: filter } : undefined),
    staleTime: 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCourse(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tutor-courses'] }),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => publishCourse(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tutor-courses'] }),
  });

  function handleMore(course: TutorCourse) {
    const actions: { text: string; onPress?: () => void; style?: 'destructive' | 'cancel' }[] = [];

    if (course.status === 'DRAFT') {
      actions.push({ text: 'Submit for Review', onPress: () => publishMutation.mutate(course.id) });
    }
    if (course.status !== 'ARCHIVED') {
      actions.push({
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Delete Course', `Delete "${course.title}"? This cannot be undone.`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(course.id) },
          ]),
      });
    }
    actions.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert(course.title, undefined, actions);
  }

  const courses = data?.courses ?? [];

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>My Courses</Text>
        <Pressable
          onPress={() => router.push('/tutor-course/create')}
          style={({ pressed }) => [styles.newBtn, { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 }]}
        >
          <Plus size={16} color="#fff" weight="bold" />
          <Text style={styles.newBtnText}>New</Text>
        </Pressable>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.filters, { borderBottomColor: theme.border }]}
      >
        {FILTERS.map((f) => (
          <Pressable
            key={f.value}
            onPress={() => setFilter(f.value)}
            style={[
              styles.chip,
              filter === f.value
                ? { backgroundColor: theme.primaryLight, borderColor: theme.primary }
                : { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Text style={[
              styles.chipText,
              { color: filter === f.value ? theme.primary : theme.textSecondary },
            ]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

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
              onMore={() => handleMore(item)}
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: BottomTabInset + 16 }]}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  filters: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontFamily: Fonts.semiBold },
  list: { padding: Spacing.three },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: Spacing.five },
  emptyTitle: { fontSize: 18, fontFamily: Fonts.bold, textAlign: 'center' },
  emptyText: { fontSize: 14, fontFamily: Fonts.regular, textAlign: 'center', lineHeight: 20 },
  createBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, marginTop: 4 },
  createBtnText: { fontSize: 15, fontFamily: Fonts.bold, color: '#fff' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  retryText: { fontSize: 14, fontFamily: Fonts.semiBold },
});
