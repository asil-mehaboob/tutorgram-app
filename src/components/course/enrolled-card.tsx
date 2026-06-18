import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Play, CheckCircle } from 'phosphor-react-native';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';
import type { MyLearningCourse } from '@/lib/api/enrollment';

type EnrolledCardProps = {
  course: MyLearningCourse;
  onPress?: () => void;
};

const GRADIENTS: Record<number, string> = {
  0: '#7C3AED',
  1: '#2563EB',
  2: '#059669',
  3: '#EA580C',
  4: '#DB2777',
  5: '#4338CA',
  6: '#D97706',
  7: '#0369A1',
};

function getColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENTS[Math.abs(hash) % 8];
}

export function EnrolledCard({ course, onPress }: EnrolledCardProps) {
  const theme = useTheme();
  const percent = Math.round(course.progressPercent);
  const isCompleted = course.completedAt != null;
  const accentColor = isCompleted ? theme.success : theme.primary;
  const fallbackColor = getColor(course.courseId);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.95 : 1 },
      ]}
    >
      {/* Thumbnail */}
      <View style={styles.thumbContainer}>
        {course.thumbnail ? (
          <Image source={{ uri: course.thumbnail }} style={styles.thumb} contentFit="contain" />
        ) : (
          <View style={[styles.thumb, { backgroundColor: fallbackColor, justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={styles.thumbInitial}>{course.title.charAt(0)}</Text>
          </View>
        )}
        {isCompleted && (
          <View style={styles.completedOverlay}>
            <CheckCircle size={28} color="#fff" weight="fill" />
          </View>
        )}
      </View>

      {/* Body */}
      <View style={styles.body}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
          {course.title}
        </Text>
        <Text style={[styles.tutor, { color: theme.textSecondary }]} numberOfLines={1}>
          {course.tutorName}
        </Text>

        {/* Progress */}
        <View style={styles.progressSection}>
          <View style={[styles.track, { backgroundColor: theme.surfaceEl }]}>
            <View
              style={[styles.fill, { backgroundColor: accentColor, width: `${percent}%` as `${number}%` }]}
            />
          </View>
          <Text style={[styles.pct, { color: accentColor }]}>{percent}%</Text>
        </View>

        {isCompleted ? (
          <View style={styles.completedRow}>
            <CheckCircle size={13} color={theme.success} weight="fill" />
            <Text style={[styles.completedText, { color: theme.success }]}>Completed</Text>
          </View>
        ) : (
          <Pressable
            onPress={onPress}
            style={[styles.continueBtn, { backgroundColor: theme.primary }]}
          >
            <Play size={10} color="#fff" weight="fill" />
            <Text style={styles.continueBtnText}>Continue learning</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
    height: 110,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  thumbContainer: {
    position: 'relative',
    width: 110,
    flexShrink: 0,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbInitial: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 20,
    fontFamily: Fonts.extraBold,
  },
  completedOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 3,
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    lineHeight: 19,
    letterSpacing: -0.1,
  },
  tutor: {
    fontSize: 12,
    fontFamily: Fonts.regular,
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  track: {
    flex: 1,
    height: 5,
    borderRadius: 99,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 99,
  },
  pct: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    minWidth: 32,
    textAlign: 'right',
  },
  continueBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  continueBtnText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: '#fff',
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  completedText: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
  },
});
