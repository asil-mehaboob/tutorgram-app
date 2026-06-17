import { useRef, useEffect } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Play } from 'phosphor-react-native';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';
import { router } from 'expo-router';
import { CourseCard } from '@/components/course/course-card';
import { getCatalogCourses } from '@/lib/api/catalog';
import { getMyLearning } from '@/lib/api/enrollment';
import { useAuth } from '@/lib/auth/context';
import type { CatalogCourse } from '@/lib/api/catalog';
import type { MyLearningCourse } from '@/lib/api/enrollment';

const { width: SW } = Dimensions.get('window');
const CARD_W = Math.min(220, SW * 0.58);
const CONTINUE_CARD_W = Math.min(260, SW * 0.68);

const FALLBACK_COLORS = ['#7C3AED', '#2563EB', '#059669', '#EA580C', '#DB2777', '#4338CA', '#D97706', '#0369A1'];
function fallbackColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return FALLBACK_COLORS[Math.abs(h) % FALLBACK_COLORS.length];
}

function SkeletonCard({ width }: { width: number }) {
  const theme = useTheme();
  const anim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);

  return (
    <Animated.View
      style={[styles.skeletonCard, { backgroundColor: theme.surfaceEl, width, opacity: anim }]}
    />
  );
}

function ContinueCard({ course, onPress }: { course: MyLearningCourse; onPress: () => void }) {
  const theme = useTheme();
  const percent = Math.round(course.progressPercent);
  const bg = fallbackColor(course.courseId);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.continueCard,
        { backgroundColor: theme.surface, borderColor: theme.border, width: CONTINUE_CARD_W, opacity: pressed ? 0.93 : 1 },
      ]}
    >
      <View style={styles.continueThumbWrap}>
        {course.thumbnail ? (
          <Image source={{ uri: course.thumbnail }} style={styles.continueThumb} contentFit="cover" />
        ) : (
          <View style={[styles.continueThumb, { backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={styles.continueThumbInitial}>{course.title.charAt(0)}</Text>
          </View>
        )}
        <View style={[styles.continuePlayBadge, { backgroundColor: theme.primary }]}>
          <Play size={10} color="#fff" weight="fill" />
        </View>
      </View>
      <View style={styles.continueBody}>
        <Text style={[styles.continueTitle, { color: theme.text }]} numberOfLines={2}>
          {course.title}
        </Text>
        <View style={styles.progressSection}>
          <View style={[styles.progressTrack, { backgroundColor: theme.surfaceEl }]}>
            <View
              style={[styles.progressFill, { backgroundColor: theme.primary, width: `${percent}%` as `${number}%` }]}
            />
          </View>
          <Text style={[styles.progressPct, { color: theme.primary }]}>{percent}%</Text>
        </View>
      </View>
    </Pressable>
  );
}

type CourseRowProps = {
  title: string;
  subtitle?: string;
  sortBy: string;
  courses: CatalogCourse[];
  isLoading: boolean;
};

function CourseRow({ title, subtitle, sortBy, courses, isLoading }: CourseRowProps) {
  const theme = useTheme();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
          )}
        </View>
        <Pressable
          style={styles.seeAllBtn}
          hitSlop={8}
          onPress={() =>
            router.push({
              pathname: '/(student)/catalog',
              params: { sortBy, title },
            } as never)
          }
        >
          <Text style={[styles.seeAllText, { color: theme.primary }]}>See all</Text>
          <ArrowRight size={13} color={theme.primary} weight="bold" />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.carouselSkeleton}>
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} width={CARD_W} />
          ))}
        </View>
      ) : (
        <FlatList
          data={courses}
          horizontal
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
          ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
          renderItem={({ item }) => (
            <CourseCard
              course={item}
              width={CARD_W}
              onPress={() => router.push(`/course/${item.slug}` as never)}
            />
          )}
        />
      )}
    </View>
  );
}

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { state } = useAuth();
  const userInitial = state.status === 'authenticated'
    ? (state.user.name?.[0]?.toUpperCase() ?? '?')
    : '?';

  const { data: featuredData, isLoading: featuredLoading } = useQuery({
    queryKey: ['catalog-courses', 'popular'],
    queryFn: () => getCatalogCourses({ limit: 12, sortBy: 'popular' }),
  });

  const { data: newData, isLoading: newLoading } = useQuery({
    queryKey: ['catalog-courses', 'newest'],
    queryFn: () => getCatalogCourses({ limit: 12, sortBy: 'newest' }),
  });

  const { data: ratedData, isLoading: ratedLoading } = useQuery({
    queryKey: ['catalog-courses', 'rated'],
    queryFn: () => getCatalogCourses({ limit: 12, sortBy: 'rated' }),
  });

  const { data: learningData } = useQuery({
    queryKey: ['my-learning'],
    queryFn: () => getMyLearning({ limit: 5 }),
  });

  const popularCourses = featuredData?.items ?? [];
  const newCourses = newData?.items ?? [];
  const ratedCourses = ratedData?.items ?? [];
  const inProgressCourses = (learningData?.items ?? []).filter((c) => !c.completedAt);


  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[0]}>
        {/* ── Top bar (sticky) ─────────────────────────── */}
        <View style={[styles.topBarOuter, { paddingTop: insets.top, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <View style={styles.topBarRow}>
            <Image
              source={require('@/assets/images/logo.svg')}
              style={styles.logo}
              contentFit="contain"
            />
            <View style={styles.topActions}>
              <View style={[styles.avatarCircle, { backgroundColor: theme.primary }]}>
                <Text style={styles.avatarText}>{userInitial}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Continue Learning ────────────────────────── */}
        {inProgressCourses.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Continue Learning</Text>
                <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>Pick up where you left off</Text>
              </View>
            </View>
            <FlatList
              data={inProgressCourses}
              horizontal
              keyExtractor={(item) => item.courseId}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carousel}
              ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
              renderItem={({ item }) => (
                <ContinueCard
                  course={item}
                  onPress={() => router.push(`/learn/${item.courseId}` as never)}
                />
              )}
            />
          </View>
        )}

        {/* ── Course sections ──────────────────────────── */}
        <View style={[styles.sections, { backgroundColor: theme.background }]}>
          <CourseRow
            title="Most Popular"
            subtitle="Courses students love right now"
            sortBy="popular"
            courses={popularCourses}
            isLoading={featuredLoading}
          />

          <View style={[styles.divider, { backgroundColor: theme.surfaceEl }]} />

          <CourseRow
            title="New & Noteworthy"
            subtitle="Fresh content added recently"
            sortBy="newest"
            courses={newCourses}
            isLoading={newLoading}
          />

          <View style={[styles.divider, { backgroundColor: theme.surfaceEl }]} />

          <CourseRow
            title="Highest Rated"
            subtitle="Top-rated by our learners"
            sortBy="rated"
            courses={ratedCourses}
            isLoading={ratedLoading}
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  /* Top bar */
  topBarOuter: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  logo: { width: 120, height: 30 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.bold,
  },

  /* Sections */
  sections: {
    paddingTop: 4,
  },
  section: {
    paddingVertical: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 14,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Fonts.extraBold,
    letterSpacing: -0.4,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  seeAllText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
  },
  carousel: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  carouselSkeleton: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  skeletonCard: {
    height: 200,
    borderRadius: 12,
  },
  divider: {
    height: 8,
  },

  /* Continue Learning cards */
  continueCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  continueThumbWrap: {
    position: 'relative',
  },
  continueThumb: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  continueThumbInitial: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 28,
    fontFamily: Fonts.extraBold,
  },
  continuePlayBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueBody: {
    padding: 12,
    gap: 8,
  },
  continueTitle: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    lineHeight: 18,
    letterSpacing: -0.1,
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 99,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
  },
  progressPct: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    minWidth: 28,
    textAlign: 'right',
  },
});
