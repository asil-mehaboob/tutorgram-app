import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { PencilSimple, DotsThreeVertical, Student, CurrencyInr } from 'phosphor-react-native';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';
import { StatusChip } from './status-chip';
import type { TutorCourse } from '@/lib/api/tutor-courses';

const FALLBACK_COLORS = ['#7C3AED', '#2563EB', '#059669', '#EA580C', '#DB2777', '#4338CA'];
function fallbackColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return FALLBACK_COLORS[Math.abs(h) % FALLBACK_COLORS.length];
}

type CourseRowProps = {
  course: TutorCourse;
  onEdit: () => void;
  onMore: () => void;
};

export function CourseRow({ course, onEdit, onMore }: CourseRowProps) {
  const theme = useTheme();
  const bg = fallbackColor(course.id);

  return (
    <View style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {course.thumbnail ? (
        <Image source={{ uri: course.thumbnail }} style={styles.thumb} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, { backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={styles.thumbInitial}>{course.title.charAt(0)}</Text>
        </View>
      )}
      <View style={styles.body}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
          {course.title}
        </Text>
        <StatusChip status={course.status} small />
        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Student size={12} color={theme.textSecondary} weight="bold" />
            <Text style={[styles.metaText, { color: theme.textSecondary }]}>{course.studentsCount}</Text>
          </View>
          <View style={styles.metaItem}>
            <CurrencyInr size={12} color={theme.textSecondary} weight="bold" />
            <Text style={[styles.metaText, { color: theme.textSecondary }]}>
              {course.earnings.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable
          onPress={onEdit}
          style={({ pressed }) => [styles.actionBtn, { backgroundColor: theme.primaryLight, opacity: pressed ? 0.7 : 1 }]}
        >
          <PencilSimple size={16} color={theme.primary} weight="bold" />
        </Pressable>
        <Pressable
          onPress={onMore}
          style={({ pressed }) => [styles.actionBtn, { backgroundColor: theme.surfaceEl, opacity: pressed ? 0.7 : 1 }]}
        >
          <DotsThreeVertical size={16} color={theme.textSecondary} weight="bold" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
    overflow: 'hidden',
    gap: 12,
    padding: 10,
  },
  thumb: {
    width: 72,
    height: 56,
    borderRadius: 8,
    flexShrink: 0,
  },
  thumbInitial: {
    fontSize: 22,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#fff',
  },
  body: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    lineHeight: 18,
  },
  meta: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 11,
    fontFamily: Fonts.medium,
  },
  actions: {
    gap: 6,
    alignItems: 'center',
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
