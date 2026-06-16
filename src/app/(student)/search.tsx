import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { MagnifyingGlass, X, Star, ClockCounterClockwise, TrendUp } from 'phosphor-react-native';
import * as SecureStore from 'expo-secure-store';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';
import { getCatalogCourses } from '@/lib/api/catalog';
import type { CatalogCourse } from '@/lib/api/catalog';

const POPULAR = [
  'Web Development',
  'Data Science',
  'UI/UX Design',
  'Python',
  'Machine Learning',
  'Photography',
];

const RECENT_KEY = 'recent_searches';
const MAX_RECENT = 8;

async function loadRecent(): Promise<string[]> {
  try {
    const raw = await SecureStore.getItemAsync(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveRecent(items: string[]) {
  await SecureStore.setItemAsync(RECENT_KEY, JSON.stringify(items));
}

export default function SearchScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    loadRecent().then(setRecent);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['search', submitted],
    queryFn: () => getCatalogCourses({ limit: 20, q: submitted }),
    enabled: submitted.length > 0,
  });

  const results: CatalogCourse[] = data?.items ?? [];

  const runSearch = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setQuery(trimmed);
    setSubmitted(trimmed);
    setRecent((prev) => {
      const next = [trimmed, ...prev.filter((r) => r !== trimmed)].slice(0, MAX_RECENT);
      saveRecent(next);
      return next;
    });
  }, []);

  function handleSubmit() {
    runSearch(query);
  }

  function handleClear() {
    setQuery('');
    setSubmitted('');
  }

  function removeRecent(item: string) {
    setRecent((prev) => {
      const next = prev.filter((r) => r !== item);
      saveRecent(next);
      return next;
    });
  }

  function clearAllRecent() {
    setRecent([]);
    saveRecent([]);
  }

  const showSuggestions = submitted.length === 0;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* ── Header ──────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={[styles.searchBar, { backgroundColor: theme.surfaceEl, borderColor: theme.border }]}>
          <MagnifyingGlass size={18} color={theme.textSecondary} weight="regular" />
          <TextInput
            style={[styles.searchInput, { color: theme.text, fontFamily: Fonts.regular }]}
            placeholder="Search courses, topics, instructors…"
            placeholderTextColor={theme.textSecondary}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSubmit}
            returnKeyType="search"
            autoFocus
          />
          {query.length > 0 && (
            <Pressable onPress={handleClear} hitSlop={8}>
              <X size={16} color={theme.textSecondary} weight="bold" />
            </Pressable>
          )}
        </View>
      </View>

      {/* ── Suggestions ─────────────────────────────── */}
      {showSuggestions && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.suggestions, { paddingBottom: insets.bottom + 32 }]}
        >
          {/* Recent searches */}
          {recent.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>RECENT</Text>
                <Pressable onPress={clearAllRecent} hitSlop={8}>
                  <Text style={[styles.clearAll, { color: theme.primary }]}>Clear all</Text>
                </Pressable>
              </View>
              <View style={[styles.listCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                {recent.map((item, i) => (
                  <Pressable
                    key={item}
                    onPress={() => runSearch(item)}
                    style={({ pressed }) => [
                      styles.listRow,
                      i < recent.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
                      { backgroundColor: pressed ? theme.surfaceEl : 'transparent' },
                    ]}
                  >
                    <ClockCounterClockwise size={16} color={theme.textSecondary} weight="regular" />
                    <Text style={[styles.listLabel, { color: theme.text }]} numberOfLines={1}>{item}</Text>
                    <Pressable
                      onPress={(e) => { e.stopPropagation(); removeRecent(item); }}
                      hitSlop={8}
                    >
                      <X size={14} color={theme.textSecondary} weight="bold" />
                    </Pressable>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Popular searches */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>POPULAR</Text>
            </View>
            <View style={[styles.listCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {POPULAR.map((item, i) => (
                <Pressable
                  key={item}
                  onPress={() => runSearch(item)}
                  style={({ pressed }) => [
                    styles.listRow,
                    i < POPULAR.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
                    { backgroundColor: pressed ? theme.surfaceEl : 'transparent' },
                  ]}
                >
                  <TrendUp size={16} color={theme.textSecondary} weight="regular" />
                  <Text style={[styles.listLabel, { color: theme.text }]} numberOfLines={1}>{item}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      {/* ── Loading ──────────────────────────────────── */}
      {isLoading && submitted.length > 0 && (
        <View style={styles.center}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      )}

      {/* ── Results ──────────────────────────────────── */}
      {!isLoading && submitted.length > 0 && (
        <>
          <View style={[styles.resultsMeta, { borderBottomColor: theme.border }]}>
            <Text style={[styles.resultsCount, { color: theme.textSecondary }]}>
              {results.length} result{results.length !== 1 ? 's' : ''} for{' '}
              <Text style={[styles.resultsQuery, { color: theme.text }]}>"{submitted}"</Text>
            </Text>
          </View>

          {results.length === 0 ? (
            <View style={styles.center}>
              <MagnifyingGlass size={40} color={theme.border} weight="regular" />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No results found</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                Try different keywords or check the spelling.
              </Text>
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.border }]} />}
              renderItem={({ item }) => (
                <SearchResultRow course={item} theme={theme} />
              )}
            />
          )}
        </>
      )}
    </View>
  );
}

const GRAD_COLORS = ['#7C3AED', '#2563EB', '#059669', '#EA580C', '#DB2777', '#4338CA', '#D97706', '#0369A1'];
function gradColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return GRAD_COLORS[Math.abs(h) % GRAD_COLORS.length];
}

function SearchResultRow({ course, theme }: { course: CatalogCourse; theme: ReturnType<typeof useTheme> }) {
  const priceLabel = course.isFree
    ? 'Free'
    : course.effectivePrice != null
    ? `₹${course.effectivePrice.toLocaleString('en-IN')}`
    : '';

  return (
    <Pressable
    onPress={() => router.push(`/course/${course.slug}` as never)}
    style={({ pressed }) => [styles.resultRow, { opacity: pressed ? 0.85 : 1 }]}
  >
      {course.thumbnail ? (
        <Image source={{ uri: course.thumbnail }} style={styles.resultThumb} contentFit="cover" />
      ) : (
        <View style={[styles.resultThumb, { backgroundColor: gradColor(course.id), justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={styles.resultThumbInitial}>{course.title.charAt(0)}</Text>
        </View>
      )}
      <View style={styles.resultBody}>
        <Text style={[styles.resultTitle, { color: theme.text }]} numberOfLines={2}>
          {course.title}
        </Text>
        <Text style={[styles.resultInstructor, { color: theme.textSecondary }]} numberOfLines={1}>
          {course.tutor.fullName}
        </Text>
        <View style={styles.resultMeta}>
          <Star size={11} color={theme.star} weight="fill" />
          <Text style={[styles.resultRating, { color: theme.star }]}>
            {course.averageRating.toFixed(1)}
          </Text>
          <Text style={[styles.resultReviews, { color: theme.textSecondary }]}>
            ({course.totalReviews.toLocaleString()})
          </Text>
          <Text style={[styles.resultDot, { color: theme.border }]}>·</Text>
          <Text style={[styles.resultPrice, { color: course.isFree ? theme.success : theme.text }]}>
            {priceLabel}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  /* Header */
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },

  /* Suggestions */
  suggestions: {
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 24,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    letterSpacing: 0.8,
  },
  clearAll: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
  },
  listCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  listLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.medium,
  },

  /* Results meta */
  resultsMeta: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultsCount: {
    fontSize: 13,
    fontFamily: Fonts.regular,
  },
  resultsQuery: {
    fontFamily: Fonts.semiBold,
  },

  /* Result rows */
  list: {
    paddingTop: 4,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
  resultRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  resultThumb: {
    width: 96,
    height: 64,
    borderRadius: 6,
    flexShrink: 0,
    overflow: 'hidden',
  },
  resultThumbInitial: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 22,
    fontFamily: Fonts.extraBold,
  },
  resultBody: {
    flex: 1,
    gap: 3,
    justifyContent: 'center',
  },
  resultTitle: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    lineHeight: 18,
  },
  resultInstructor: {
    fontSize: 11,
    fontFamily: Fonts.regular,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  resultRating: {
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
  resultReviews: {
    fontSize: 11,
    fontFamily: Fonts.regular,
  },
  resultDot: {
    fontSize: 10,
  },
  resultPrice: {
    fontSize: 12,
    fontFamily: Fonts.bold,
  },

  /* States */
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: Fonts.bold,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    lineHeight: 19,
    textAlign: 'center',
  },
});
