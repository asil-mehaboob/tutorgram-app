import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Star, SealCheck, Users } from 'phosphor-react-native';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';
import type { CatalogCourse } from '@/lib/api/catalog';

type CourseCardProps = {
  course: CatalogCourse;
  onPress?: () => void;
  width?: number;
};

const LEVEL_LABEL: Record<string, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
  ALL_LEVELS: 'All Levels',
};

const GRADIENTS = [
  ['#7C3AED', '#6D28D9'],
  ['#2563EB', '#1D4ED8'],
  ['#059669', '#047857'],
  ['#EA580C', '#C2410C'],
  ['#DB2777', '#BE185D'],
  ['#4338CA', '#3730A3'],
  ['#D97706', '#B45309'],
  ['#0369A1', '#075985'],
];

function getGradient(id: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length] as [string, string];
}

function StarRow({ rating, count }: { rating: number; count: number }) {
  const theme = useTheme();
  const reviewLabel = count >= 1000 ? `(${(count / 1000).toFixed(1)}k)` : `(${count})`;
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;

  return (
    <View style={styles.starRow}>
      <Text style={[styles.ratingNum, { color: theme.star }]}>{rating.toFixed(1)}</Text>
      <View style={styles.stars}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={11}
            color={theme.star}
            weight={i < fullStars ? 'fill' : hasHalf && i === fullStars ? 'duotone' : 'regular'}
          />
        ))}
      </View>
      <Text style={[styles.ratingCount, { color: theme.textSecondary }]}>{reviewLabel}</Text>
    </View>
  );
}

export function CourseCard({ course, onPress, width = 220 }: CourseCardProps) {
  const theme = useTheme();
  const [grad1, grad2] = getGradient(course.id);

  const priceLabel = course.isFree
    ? 'Free'
    : course.effectivePrice != null
    ? `₹${course.effectivePrice.toLocaleString('en-IN')}`
    : '';

  const originalPrice =
    !course.isFree && course.discountPercent > 0 && course.price != null
      ? `₹${course.price.toLocaleString('en-IN')}`
      : null;

  const levelLabel = LEVEL_LABEL[course.level] ?? course.level;
  const isBestseller = course.totalStudents > 1000 || course.averageRating >= 4.5;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.border, width, opacity: pressed ? 0.93 : 1 },
      ]}
    >
      {/* Thumbnail */}
      <View style={styles.thumbWrapper}>
        {course.thumbnail ? (
          <Image source={{ uri: course.thumbnail }} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbGradient, { backgroundColor: grad1 }]}>
            <Text style={styles.thumbInitial}>{course.title.charAt(0)}</Text>
          </View>
        )}
        {isBestseller && (
          <View style={[styles.badge, { backgroundColor: theme.bestseller }]}>
            <Text style={styles.badgeText}>Bestseller</Text>
          </View>
        )}
        {!isBestseller && course.discountPercent > 0 && (
          <View style={[styles.badge, { backgroundColor: '#D32F2F' }]}>
            <Text style={styles.badgeText}>{course.discountPercent}% off</Text>
          </View>
        )}
      </View>

      {/* Body */}
      <View style={styles.body}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
          {course.title}
        </Text>

        <View style={styles.tutorRow}>
          <Text style={[styles.tutor, { color: theme.textSecondary }]} numberOfLines={1}>
            {course.tutor.fullName}
          </Text>
          {course.tutor.isVerified && (
            <SealCheck size={11} color={theme.primary} weight="fill" />
          )}
        </View>

        <StarRow rating={course.averageRating} count={course.totalReviews} />

        <View style={styles.metaRow}>
          <Users size={11} color={theme.textSecondary} />
          <Text style={[styles.students, { color: theme.textSecondary }]}>
            {course.totalStudents >= 1000
              ? `${(course.totalStudents / 1000).toFixed(0)}k`
              : course.totalStudents}{' '}
            students
          </Text>
          <Text style={[styles.dot, { color: theme.border }]}>·</Text>
          <Text style={[styles.level, { color: theme.textSecondary }]}>{levelLabel}</Text>
        </View>

        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: course.isFree ? theme.success : theme.text }]}>
            {priceLabel}
          </Text>
          {originalPrice && (
            <Text style={[styles.originalPrice, { color: theme.textSecondary }]}>
              {originalPrice}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  thumbWrapper: { position: 'relative' },
  thumb: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  thumbGradient: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbInitial: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 32,
    fontFamily: Fonts.extraBold,
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: Fonts.bold,
    letterSpacing: 0.1,
  },
  body: {
    padding: 12,
    gap: 5,
  },
  title: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    lineHeight: 18,
    letterSpacing: -0.1,
  },
  tutorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  tutor: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    flex: 1,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingNum: {
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
  stars: {
    flexDirection: 'row',
    gap: 1,
  },
  ratingCount: {
    fontSize: 10,
    fontFamily: Fonts.regular,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  students: {
    fontSize: 10,
    fontFamily: Fonts.regular,
  },
  dot: {
    fontSize: 10,
  },
  level: {
    fontSize: 10,
    fontFamily: Fonts.regular,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 2,
  },
  price: {
    fontSize: 15,
    fontFamily: Fonts.extraBold,
    letterSpacing: -0.3,
  },
  originalPrice: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    textDecorationLine: 'line-through',
  },
});
