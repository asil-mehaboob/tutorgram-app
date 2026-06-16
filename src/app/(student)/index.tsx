import { useState } from 'react';
import {
  ActivityIndicator,
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
import {
  Bell,
  MagnifyingGlass,
  ArrowRight,
  GraduationCap,
} from 'phosphor-react-native';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';
import { CourseCard } from '@/components/course/course-card';
import { getCatalogCourses } from '@/lib/api/catalog';
import { useAuth } from '@/lib/auth/context';
import type { CatalogCourse } from '@/lib/api/catalog';

const { width: SW } = Dimensions.get('window');
const CARD_W = Math.min(220, SW * 0.58);

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'popular', label: 'Most Popular' },
  { id: 'newest', label: 'New' },
  { id: 'rated', label: 'Top Rated' },
  { id: 'free', label: 'Free' },
];

type CourseRowProps = {
  title: string;
  subtitle?: string;
  courses: CatalogCourse[];
  isLoading: boolean;
};

function CourseRow({ title, subtitle, courses, isLoading }: CourseRowProps) {
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
        <Pressable style={styles.seeAllBtn} hitSlop={8}>
          <Text style={[styles.seeAllText, { color: theme.primary }]}>See all</Text>
          <ArrowRight size={13} color={theme.primary} weight="bold" />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.carouselSkeleton}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.skeletonCard, { backgroundColor: theme.surfaceEl, width: CARD_W }]} />
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
            <CourseCard course={item} width={CARD_W} />
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
  const firstName = state.status === 'authenticated'
    ? (state.user.name?.split(' ')[0] ?? 'there')
    : 'there';
  const userInitial = state.status === 'authenticated'
    ? (state.user.name?.[0]?.toUpperCase() ?? '?')
    : '?';

  const [activeCategory, setActiveCategory] = useState('all');

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

  const popularCourses = featuredData?.items ?? [];
  const newCourses = newData?.items ?? [];
  const ratedCourses = ratedData?.items ?? [];

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
              <Pressable style={[styles.iconBtn, { borderColor: theme.border }]} hitSlop={8}>
                <MagnifyingGlass size={20} color={theme.text} weight="regular" />
              </Pressable>
              <Pressable style={[styles.iconBtn, { borderColor: theme.border }]} hitSlop={8}>
                <Bell size={20} color={theme.text} weight="regular" />
              </Pressable>
              <View style={[styles.avatarCircle, { backgroundColor: theme.primary }]}>
                <Text style={styles.avatarText}>{userInitial}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Category pills ───────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.pillsRow, { borderBottomColor: theme.border }]}
          style={{ backgroundColor: theme.surface }}
        >
          {CATEGORIES.map((cat) => {
            const active = cat.id === activeCategory;
            return (
              <Pressable
                key={cat.id}
                onPress={() => setActiveCategory(cat.id)}
                style={[
                  styles.pill,
                  active
                    ? { borderBottomWidth: 2, borderBottomColor: theme.primary }
                    : { borderBottomWidth: 2, borderBottomColor: 'transparent' },
                ]}
              >
                <Text style={[
                  styles.pillText,
                  { color: active ? theme.primary : theme.textSecondary },
                  active && { fontFamily: Fonts.bold },
                ]}>
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Welcome banner ───────────────────────────── */}
        <View style={[styles.welcomeBanner, { backgroundColor: theme.primaryLight, borderColor: theme.primaryLight }]}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.welcomeGreet, { color: theme.primary }]}>
              Welcome back, {firstName}
            </Text>
            <Text style={[styles.welcomeHeadline, { color: theme.text }]}>
              Keep learning,{'\n'}keep growing.
            </Text>
          </View>
          <GraduationCap size={52} color={theme.primary} weight="duotone" />
        </View>

        {/* ── Search bar ───────────────────────────────── */}
        <View style={[styles.searchSection, { backgroundColor: theme.background }]}>
          <Pressable style={[styles.searchBar, { backgroundColor: theme.surfaceEl, borderColor: theme.border }]}>
            <MagnifyingGlass size={18} color={theme.textSecondary} />
            <Text style={[styles.searchPlaceholder, { color: theme.textSecondary }]}>
              Search courses, topics, instructors…
            </Text>
          </Pressable>
        </View>

        {/* ── Course sections ──────────────────────────── */}
        <View style={[styles.sections, { backgroundColor: theme.background }]}>
          <CourseRow
            title="Most Popular"
            subtitle="Courses students love right now"
            courses={popularCourses}
            isLoading={featuredLoading}
          />

          <View style={[styles.divider, { backgroundColor: theme.surfaceEl }]} />

          <CourseRow
            title="New & Noteworthy"
            subtitle="Fresh content added recently"
            courses={newCourses}
            isLoading={newLoading}
          />

          <View style={[styles.divider, { backgroundColor: theme.surfaceEl }]} />

          <CourseRow
            title="Highest Rated"
            subtitle="Top-rated by our learners"
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
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
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

  /* Category pills */
  pillsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginRight: 4,
  },
  pillText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    letterSpacing: 0.1,
  },

  /* Welcome banner */
  welcomeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  welcomeGreet: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    letterSpacing: 0.2,
  },
  welcomeHeadline: {
    fontSize: 20,
    fontFamily: Fonts.extraBold,
    lineHeight: 26,
    letterSpacing: -0.4,
  },

  /* Search */
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  searchPlaceholder: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    flex: 1,
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

});
