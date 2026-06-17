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
import { getCatalogCourses } from '@/lib/api/catalog';
import type { CatalogCourse } from '@/lib/api/catalog';

const GRAD_COLORS = ['#7C3AED', '#2563EB', '#059669', '#EA580C', '#DB2777', '#4338CA', '#D97706', '#0369A1'];
function gradColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return GRAD_COLORS[Math.abs(h) % GRAD_COLORS.length];
}

function CourseRow({ course, theme }: { course: CatalogCourse; theme: ReturnType<typeof useTheme> }) {
  const priceLabel = course.isFree
    ? 'Free'
    : course.effectivePrice != null
    ? `₹${course.effectivePrice.toLocaleString('en-IN')}`
    : '';

  return (
    <Pressable
      onPress={() => router.push(`/course/${course.slug}` as never)}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.85 : 1 }]}
    >
      {course.thumbnail ? (
        <Image source={{ uri: course.thumbnail }} style={styles.thumb} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, { backgroundColor: gradColor(course.id), justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={styles.thumbInitial}>{course.title.charAt(0)}</Text>
        </View>
      )}
      <View style={styles.body}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
          {course.title}
        </Text>
        <Text style={[styles.instructor, { color: theme.textSecondary }]} numberOfLines={1}>
          {course.tutor.fullName}
        </Text>
        <View style={styles.meta}>
          <Star size={11} color={theme.star} weight="fill" />
          <Text style={[styles.rating, { color: theme.star }]}>
            {course.averageRating.toFixed(1)}
          </Text>
          <Text style={[styles.reviews, { color: theme.textSecondary }]}>
            ({course.totalReviews.toLocaleString()})
          </Text>
          <Text style={[styles.dot, { color: theme.border }]}>·</Text>
          <Text style={[styles.price, { color: course.isFree ? theme.success : theme.text }]}>
            {priceLabel}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function CatalogScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { sortBy, title } = useLocalSearchParams<{ sortBy: string; title: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['catalog-courses-list', sortBy],
    queryFn: () => getCatalogCourses({ limit: 30, sortBy }),
  });

  const courses = data?.items ?? [];

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <ArrowLeft size={22} color={theme.text} weight="regular" />
        </Pressable>
        <Text style={[styles.heading, { color: theme.text }]} numberOfLines={1}>
          {title ?? 'Courses'}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.border }]} />}
          renderItem={({ item }) => <CourseRow course={item} theme={theme} />}
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
  backBtn: {
    padding: 2,
  },
  heading: {
    flex: 1,
    fontSize: 20,
    fontFamily: Fonts.extraBold,
    letterSpacing: -0.4,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  list: {
    paddingTop: 4,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  thumb: {
    width: 96,
    height: 64,
    borderRadius: 6,
    flexShrink: 0,
    overflow: 'hidden',
  },
  thumbInitial: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 22,
    fontFamily: Fonts.extraBold,
  },
  body: {
    flex: 1,
    gap: 3,
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    lineHeight: 18,
  },
  instructor: {
    fontSize: 11,
    fontFamily: Fonts.regular,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  rating: {
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
  reviews: {
    fontSize: 11,
    fontFamily: Fonts.regular,
  },
  dot: {
    fontSize: 10,
  },
  price: {
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
});
