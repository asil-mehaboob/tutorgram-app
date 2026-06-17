import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Star } from 'phosphor-react-native';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';
import { getCourseReviews } from '@/lib/api/catalog';
import type { CourseReview } from '@/lib/api/catalog';

function formatReviewDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

const AVATAR_COLORS = ['#7C3AED', '#2563EB', '#059669', '#EA580C', '#DB2777', '#4338CA'];
function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function ReviewItem({ review, showBorder }: { review: CourseReview; showBorder: boolean }) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const TRUNCATE = 180;
  const isTruncatable = (review.comment?.length ?? 0) > TRUNCATE;
  const displayedComment =
    !isTruncatable || expanded
      ? review.comment
      : review.comment!.slice(0, TRUNCATE).trimEnd() + '…';

  const name = review.studentName ?? 'Student';
  const color = avatarColor(name);

  return (
    <View style={[styles.item, showBorder && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]}>
      <View style={styles.itemHeader}>
        {review.studentProfilePicture ? (
          <Image source={{ uri: review.studentProfilePicture }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: color }]}>
            <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
            {name}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.stars}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={12} color="#FFB800" weight={i < review.rating ? 'fill' : 'regular'} />
              ))}
            </View>
            <Text style={[styles.date, { color: theme.textSecondary }]}>
              {formatReviewDate(review.createdAt)}
            </Text>
          </View>
        </View>
      </View>

      {!!review.title && (
        <Text style={[styles.reviewTitle, { color: theme.text }]}>{review.title}</Text>
      )}
      {!!review.comment && (
        <Pressable onPress={() => isTruncatable && setExpanded((p) => !p)}>
          <Text style={[styles.comment, { color: theme.text }]}>{displayedComment}</Text>
          {isTruncatable && (
            <Text style={[styles.readToggle, { color: theme.primary }]}>
              {expanded ? 'Show less' : 'Read more'}
            </Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

export default function ReviewsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { courseId, title, averageRating, totalReviews } = useLocalSearchParams<{
    courseId: string;
    title: string;
    averageRating: string;
    totalReviews: string;
  }>();

  const { data, isLoading } = useQuery({
    queryKey: ['course-reviews-all', courseId],
    queryFn: () => getCourseReviews(courseId!, { limit: 100 }),
    enabled: !!courseId,
  });

  const reviews: CourseReview[] = data?.items ?? [];
  const rating = parseFloat(averageRating ?? '0');
  const total = parseInt(totalReviews ?? '0', 10);
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <ArrowLeft size={22} color={theme.text} weight="regular" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.heading, { color: theme.text }]} numberOfLines={1}>
            Student Reviews
          </Text>
          {!!title && (
            <Text style={[styles.subheading, { color: theme.textSecondary }]} numberOfLines={1}>
              {title}
            </Text>
          )}
        </View>
      </View>

      {/* Rating summary */}
      {rating > 0 && (
        <View style={[styles.summary, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <Text style={[styles.ratingNum, { color: theme.text }]}>{rating.toFixed(1)}</Text>
          <View style={styles.summaryRight}>
            <View style={styles.stars}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={16} color="#FFB800" weight={i < full ? 'fill' : half && i === full ? 'duotone' : 'regular'} />
              ))}
            </View>
            <Text style={[styles.ratingLabel, { color: theme.textSecondary }]}>
              {total.toLocaleString()} {total === 1 ? 'rating' : 'ratings'}
            </Text>
          </View>
        </View>
      )}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      ) : reviews.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No reviews yet</Text>
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          renderItem={({ item, index }) => (
            <ReviewItem review={item} showBorder={index < reviews.length - 1} />
          )}
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
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 2 },
  heading: {
    fontSize: 18,
    fontFamily: Fonts.extraBold,
    letterSpacing: -0.3,
  },
  subheading: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 1,
  },

  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  summaryRight: { gap: 4 },
  ratingNum: {
    fontSize: 44,
    fontFamily: Fonts.extraBold,
    letterSpacing: -1,
    lineHeight: 48,
  },
  stars: { flexDirection: 'row', gap: 2 },
  ratingLabel: {
    fontSize: 13,
    fontFamily: Fonts.regular,
  },

  list: { paddingTop: 4 },

  item: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    flexShrink: 0,
  },
  avatarFallback: { justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { color: '#fff', fontSize: 16, fontFamily: Fonts.bold },
  name: { fontSize: 14, fontFamily: Fonts.semiBold, lineHeight: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  date: { fontSize: 11, fontFamily: Fonts.regular },
  reviewTitle: { fontSize: 14, fontFamily: Fonts.bold },
  comment: { fontSize: 14, fontFamily: Fonts.regular, lineHeight: 22 },
  readToggle: { fontSize: 13, fontFamily: Fonts.semiBold, marginTop: 4 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 14, fontFamily: Fonts.regular },
});
