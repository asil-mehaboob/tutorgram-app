import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Books, ArrowClockwise } from 'phosphor-react-native';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';
import { EnrolledCard } from '@/components/course/enrolled-card';
import { getMyLearning } from '@/lib/api/enrollment';
import type { MyLearningCourse } from '@/lib/api/enrollment';

type Tab = 'inprogress' | 'completed';

export default function MyLearningScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('inprogress');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-learning'],
    queryFn: () => getMyLearning({ limit: 50 }),
  });

  const courses = data?.items ?? [];
  const inProgress = courses.filter((c) => !c.completedAt);
  const completed = courses.filter((c) => c.completedAt);
  const displayList: MyLearningCourse[] = activeTab === 'inprogress' ? inProgress : completed;

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: 'inprogress', label: 'In Progress', count: inProgress.length },
    { id: 'completed', label: 'Completed', count: completed.length },
  ];

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* ─── Header ──────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 14, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.heading, { color: theme.text }]}>My Learning</Text>
          {!isLoading && courses.length > 0 && (
            <View style={[styles.countBadge, { backgroundColor: theme.primaryLight }]}>
              <Text style={[styles.countText, { color: theme.primary }]}>{courses.length}</Text>
            </View>
          )}
        </View>

        {/* ─── Underline tabs ──────────────────────── */}
        <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
          {TABS.map((tab) => {
            const active = tab.id === activeTab;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[
                  styles.tab,
                  active && { borderBottomColor: theme.primary, borderBottomWidth: 2 },
                ]}
              >
                <Text style={[
                  styles.tabLabel,
                  { color: active ? theme.primary : theme.textSecondary },
                  active && { fontFamily: Fonts.bold },
                ]}>
                  {tab.label}
                  {tab.count > 0 ? `  ${tab.count}` : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ─── Loading ─────────────────────────────────── */}
      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      )}

      {/* ─── Error ───────────────────────────────────── */}
      {isError && (
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.surfaceEl }]}>
            <ArrowClockwise size={32} color={theme.textSecondary} weight="regular" />
          </View>
          <Text style={[styles.stateTitle, { color: theme.text }]}>Something went wrong</Text>
          <Text style={[styles.stateSubtitle, { color: theme.textSecondary }]}>
            We couldn't load your courses. Please try again.
          </Text>
          <Pressable
            onPress={() => refetch()}
            style={[styles.retryBtn, { backgroundColor: theme.primary }]}
          >
            <Text style={styles.retryBtnText}>Try Again</Text>
          </Pressable>
        </View>
      )}

      {/* ─── Empty (no courses at all) ───────────────── */}
      {!isLoading && !isError && courses.length === 0 && (
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.primaryLight }]}>
            <Books size={40} color={theme.primary} weight="regular" />
          </View>
          <Text style={[styles.stateTitle, { color: theme.text }]}>Start your learning journey</Text>
          <Text style={[styles.stateSubtitle, { color: theme.textSecondary }]}>
            Browse courses on the Home tab and enroll to begin learning.
          </Text>
          <Pressable style={[styles.retryBtn, { backgroundColor: theme.primary }]}>
            <Text style={styles.retryBtnText}>Explore Courses</Text>
          </Pressable>
        </View>
      )}

      {/* ─── Empty tab state ─────────────────────────── */}
      {!isLoading && !isError && courses.length > 0 && displayList.length === 0 && (
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.surfaceEl }]}>
            <Books size={32} color={theme.textSecondary} weight="regular" />
          </View>
          <Text style={[styles.stateTitle, { color: theme.text }]}>
            {activeTab === 'inprogress' ? 'No courses in progress' : 'No completed courses yet'}
          </Text>
          <Text style={[styles.stateSubtitle, { color: theme.textSecondary }]}>
            {activeTab === 'inprogress'
              ? 'All your courses are completed — great work!'
              : 'Finish a course to see it here.'}
          </Text>
        </View>
      )}

      {/* ─── Course list ─────────────────────────────── */}
      {!isLoading && !isError && displayList.length > 0 && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        >
          {/* Progress summary bar */}
          {activeTab === 'inprogress' && inProgress.length > 0 && (
            <View style={[styles.summaryBar, { backgroundColor: theme.primaryLight, borderColor: theme.primaryLight }]}>
              <Text style={[styles.summaryText, { color: theme.primary }]}>
                {inProgress.length} course{inProgress.length !== 1 ? 's' : ''} in progress
                {completed.length > 0 ? ` · ${completed.length} completed` : ''}
              </Text>
            </View>
          )}

          {displayList.map((course) => (
            <EnrolledCard key={course.courseId} course={course} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  /* Header */
  header: {
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  heading: {
    fontSize: 26,
    fontFamily: Fonts.extraBold,
    letterSpacing: -0.5,
  },
  countBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 99,
  },
  countText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
  },

  /* Underline tabs */
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginTop: 6,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    letterSpacing: 0.1,
  },

  /* List */
  list: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },

  /* Summary */
  summaryBar: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  summaryText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
  },

  /* States */
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  stateTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  stateSubtitle: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    lineHeight: 20,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 8,
  },
  retryBtnText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: '#fff',
  },
});
