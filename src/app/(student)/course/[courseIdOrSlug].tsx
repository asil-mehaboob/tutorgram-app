import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CaretDown,
  CaretUp,
  Certificate,
  Check,
  Clock,
  PlayCircle,
  Article,
  Question,
  SealCheck,
  Star,
  Users,
  Heart,
  BookOpen,
  VideoCamera,
} from 'phosphor-react-native';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';
import { getCourseDetail } from '@/lib/api/catalog';
import { enrollFreeCourse, toggleWishlist } from '@/lib/api/commerce';
import { getMyLearning } from '@/lib/api/enrollment';
import { ApiError } from '@/lib/api/client';
import type { CourseSection, CourseLesson } from '@/lib/api/catalog';

const LEVEL_LABEL: Record<string, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
  ALL_LEVELS: 'All Levels',
};

const GRADIENTS = [
  '#7C3AED', '#2563EB', '#059669', '#EA580C', '#DB2777', '#4338CA',
];

function gradColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return GRADIENTS[Math.abs(h) % GRADIENTS.length];
}

function formatDuration(seconds: number): string {
  if (!seconds) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatStudents(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return String(n);
}

function LessonIcon({ type, color }: { type: string; color: string }) {
  if (type === 'ARTICLE') return <Article size={14} color={color} weight="regular" />;
  if (type === 'QUIZ') return <Question size={14} color={color} weight="regular" />;
  return <VideoCamera size={14} color={color} weight="regular" />;
}

function StarRow({ rating, count, theme }: { rating: number; count: number; theme: ReturnType<typeof useTheme> }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const label = count >= 1000 ? `(${(count / 1000).toFixed(1)}k)` : `(${count})`;
  return (
    <View style={styles.starRow}>
      <Text style={[styles.ratingNum, { color: theme.star }]}>{rating.toFixed(1)}</Text>
      <View style={styles.stars}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={13}
            color={theme.star}
            weight={i < full ? 'fill' : half && i === full ? 'duotone' : 'regular'}
          />
        ))}
      </View>
      <Text style={[styles.ratingLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

function SectionRow({
  section,
  isOpen,
  onToggle,
  theme,
}: {
  section: CourseSection;
  isOpen: boolean;
  onToggle: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const totalDur = section.lessons.reduce((s, l) => s + (l.duration ?? 0), 0);

  return (
    <View style={[styles.sectionBlock, { borderColor: theme.border }]}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [
          styles.sectionHeader,
          { backgroundColor: pressed ? theme.surfaceEl : theme.surface },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.sectionTitle, { color: theme.text }]} numberOfLines={2}>
            {section.title}
          </Text>
          <Text style={[styles.sectionMeta, { color: theme.textSecondary }]}>
            {section.lessons.length} lesson{section.lessons.length !== 1 ? 's' : ''}
            {totalDur > 0 ? ` · ${formatDuration(totalDur)}` : ''}
          </Text>
        </View>
        {isOpen ? (
          <CaretUp size={16} color={theme.textSecondary} weight="bold" />
        ) : (
          <CaretDown size={16} color={theme.textSecondary} weight="bold" />
        )}
      </Pressable>

      {isOpen &&
        section.lessons.map((lesson, i) => (
          <LessonRow key={lesson.id} lesson={lesson} isLast={i === section.lessons.length - 1} theme={theme} />
        ))}
    </View>
  );
}

function LessonRow({
  lesson,
  isLast,
  theme,
}: {
  lesson: CourseLesson;
  isLast: boolean;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View
      style={[
        styles.lessonRow,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
      ]}
    >
      <LessonIcon type={lesson.type} color={theme.textSecondary} />
      <Text style={[styles.lessonTitle, { color: theme.text }]} numberOfLines={2}>
        {lesson.title}
      </Text>
      <View style={styles.lessonMeta}>
        {lesson.isFreePreview && (
          <View style={[styles.previewBadge, { backgroundColor: theme.primaryLight }]}>
            <Text style={[styles.previewText, { color: theme.primary }]}>Preview</Text>
          </View>
        )}
        {lesson.duration != null && lesson.duration > 0 && (
          <Text style={[styles.lessonDur, { color: theme.textSecondary }]}>
            {formatDuration(lesson.duration)}
          </Text>
        )}
      </View>
    </View>
  );
}

export default function CourseDetailScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { courseIdOrSlug } = useLocalSearchParams<{ courseIdOrSlug: string }>();
  const queryClient = useQueryClient();

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [learnExpanded, setLearnExpanded] = useState(false);
  const [enrolledLocally, setEnrolledLocally] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['course-detail', courseIdOrSlug],
    queryFn: () => getCourseDetail(courseIdOrSlug!),
    enabled: !!courseIdOrSlug,
  });

  const { data: myLearningData } = useQuery({
    queryKey: ['my-learning'],
    queryFn: () => getMyLearning({ limit: 200 }),
  });

  const course = data?.course;

  const isEnrolled =
    enrolledLocally ||
    (myLearningData?.items.some((e) => e.courseId === course?.id) ?? false);

  const { mutate: enroll, isPending: enrolling } = useMutation({
    mutationFn: () => enrollFreeCourse(course!.id),
    onSuccess: () => {
      setEnrolledLocally(true);
      queryClient.invalidateQueries({ queryKey: ['my-learning'] });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) {
        setEnrolledLocally(true);
      }
    },
  });

  const { mutate: wishlist, isPending: wishlistPending } = useMutation({
    mutationFn: () => toggleWishlist(course!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });

  function toggleSection(id: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  if (isError || !course) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.textSecondary }]}>Course not found.</Text>
        <Pressable onPress={() => router.back()} style={[styles.retryBtn, { borderColor: theme.border }]}>
          <Text style={[styles.retryLabel, { color: theme.text }]}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const levelLabel = LEVEL_LABEL[course.level] ?? course.level;
  const bgColor = gradColor(course.id);

  const priceLabel = course.isFree
    ? 'Free'
    : course.effectivePrice != null
    ? `₹${course.effectivePrice.toLocaleString('en-IN')}`
    : '';

  const originalPrice =
    !course.isFree && course.discountPercent > 0 && course.price != null
      ? `₹${course.price.toLocaleString('en-IN')}`
      : null;

  const learnItems = course.whatYouLearn ?? [];
  const showMoreLearn = learnItems.length > 6 && !learnExpanded;
  const displayedLearn = showMoreLearn ? learnItems.slice(0, 6) : learnItems;

  const requirementItems = course.requirements ?? course.prerequisites ?? [];

  const isBestseller = course.totalStudents > 1000 || course.averageRating >= 4.5;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* ── Floating back button ─────────────────────── */}
      <View style={[styles.floatingBack, { top: insets.top + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={[styles.backCircle, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
        >
          <ArrowLeft size={20} color="#fff" weight="bold" />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {/* ── Hero ────────────────────────────────────── */}
        <View style={styles.heroWrapper}>
          {course.thumbnail ? (
            <Image source={{ uri: course.thumbnail }} style={styles.heroImage} contentFit="cover" />
          ) : (
            <View style={[styles.heroImage, styles.heroPlaceholder, { backgroundColor: bgColor }]}>
              <BookOpen size={56} color="rgba(255,255,255,0.7)" weight="duotone" />
            </View>
          )}
          {/* Bottom overlay for visual separation */}
          <View style={styles.heroOverlay} pointerEvents="none" />
        </View>

        {/* ── Main content ─────────────────────────────── */}
        <View style={[styles.contentCard, { backgroundColor: theme.background }]}>

          {/* Badges */}
          <View style={styles.badgeRow}>
            {isBestseller && (
              <View style={[styles.badge, { backgroundColor: theme.bestseller }]}>
                <Text style={styles.badgeText}>Bestseller</Text>
              </View>
            )}
            <View style={[styles.badge, { backgroundColor: theme.surfaceEl }]}>
              <Text style={[styles.badgeText, { color: theme.textSecondary }]}>{levelLabel}</Text>
            </View>
            {course.language && (
              <View style={[styles.badge, { backgroundColor: theme.surfaceEl }]}>
                <Text style={[styles.badgeText, { color: theme.textSecondary }]}>{course.language}</Text>
              </View>
            )}
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: theme.text }]}>{course.title}</Text>

          {/* Short description */}
          <Text style={[styles.shortDesc, { color: theme.textSecondary }]}>
            {course.shortDescription}
          </Text>

          {/* Rating row */}
          <View style={styles.ratingRow}>
            <StarRow rating={course.averageRating} count={course.totalReviews} theme={theme} />
            <Text style={[styles.dot, { color: theme.border }]}>·</Text>
            <Users size={13} color={theme.textSecondary} />
            <Text style={[styles.metaText, { color: theme.textSecondary }]}>
              {formatStudents(course.totalStudents)} students
            </Text>
          </View>

          {/* Instructor */}
          <View style={styles.instructorRow}>
            <Text style={[styles.byText, { color: theme.textSecondary }]}>Created by </Text>
            <Text style={[styles.instructorName, { color: theme.primary }]}>
              {course.instructor.fullName}
            </Text>
            {course.instructor.isVerified && (
              <SealCheck size={13} color={theme.primary} weight="fill" />
            )}
          </View>

          {/* Course stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Clock size={14} color={theme.textSecondary} weight="regular" />
              <Text style={[styles.statText, { color: theme.textSecondary }]}>
                {formatDuration(course.totalDuration)} total
              </Text>
            </View>
            <View style={styles.statItem}>
              <PlayCircle size={14} color={theme.textSecondary} weight="regular" />
              <Text style={[styles.statText, { color: theme.textSecondary }]}>
                {course.totalLessons} lessons
              </Text>
            </View>
            <View style={styles.statItem}>
              <Certificate size={14} color={theme.textSecondary} weight="regular" />
              <Text style={[styles.statText, { color: theme.textSecondary }]}>Certificate</Text>
            </View>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.surfaceEl }]} />

        {/* ── What you'll learn ──────────────────────── */}
        {learnItems.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.background }]}>
            <Text style={[styles.sectionHeading, { color: theme.text }]}>What you'll learn</Text>
            {displayedLearn.map((item, i) => (
              <View key={i} style={styles.bulletRow}>
                <Check size={16} color={theme.primary} weight="bold" />
                <Text style={[styles.bulletText, { color: theme.text }]}>{item}</Text>
              </View>
            ))}
            {learnItems.length > 6 && (
              <Pressable onPress={() => setLearnExpanded((p) => !p)} style={styles.showMoreBtn}>
                <Text style={[styles.showMoreText, { color: theme.primary }]}>
                  {learnExpanded ? 'Show less' : `Show ${learnItems.length - 6} more`}
                </Text>
                {learnExpanded ? (
                  <CaretUp size={14} color={theme.primary} weight="bold" />
                ) : (
                  <CaretDown size={14} color={theme.primary} weight="bold" />
                )}
              </Pressable>
            )}
          </View>
        )}

        <View style={[styles.divider, { backgroundColor: theme.surfaceEl }]} />

        {/* ── Requirements ───────────────────────────── */}
        {requirementItems.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.background }]}>
            <Text style={[styles.sectionHeading, { color: theme.text }]}>Requirements</Text>
            {requirementItems.map((item, i) => (
              <View key={i} style={styles.bulletRow}>
                <View style={[styles.dot2, { backgroundColor: theme.textSecondary }]} />
                <Text style={[styles.bulletText, { color: theme.text }]}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {requirementItems.length > 0 && (
          <View style={[styles.divider, { backgroundColor: theme.surfaceEl }]} />
        )}

        {/* ── Curriculum ─────────────────────────────── */}
        {course.sections.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.background }]}>
            <Text style={[styles.sectionHeading, { color: theme.text }]}>Course Content</Text>
            <Text style={[styles.curriculumMeta, { color: theme.textSecondary }]}>
              {course.totalSections} section{course.totalSections !== 1 ? 's' : ''} ·{' '}
              {course.totalLessons} lesson{course.totalLessons !== 1 ? 's' : ''} ·{' '}
              {formatDuration(course.totalDuration)} total length
            </Text>
            <View style={[styles.curriculumList, { borderColor: theme.border }]}>
              {course.sections.map((section) => (
                <SectionRow
                  key={section.id}
                  section={section}
                  isOpen={expandedSections.has(section.id)}
                  onToggle={() => toggleSection(section.id)}
                  theme={theme}
                />
              ))}
            </View>
          </View>
        )}

        {course.sections.length > 0 && (
          <View style={[styles.divider, { backgroundColor: theme.surfaceEl }]} />
        )}

        {/* ── Instructor ─────────────────────────────── */}
        <View style={[styles.section, { backgroundColor: theme.background }]}>
          <Text style={[styles.sectionHeading, { color: theme.text }]}>Your Instructor</Text>
          <View style={styles.instructorCard}>
            {course.instructor.profilePicture ? (
              <Image
                source={{ uri: course.instructor.profilePicture }}
                style={styles.instructorAvatar}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.instructorAvatar, styles.instructorAvatarFallback, { backgroundColor: bgColor }]}>
                <Text style={styles.instructorInitial}>
                  {course.instructor.fullName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <View style={styles.instructorNameRow}>
                <Text style={[styles.instructorFullName, { color: theme.text }]}>
                  {course.instructor.fullName}
                </Text>
                {course.instructor.isVerified && (
                  <SealCheck size={15} color={theme.primary} weight="fill" />
                )}
              </View>
              {course.instructor.professionalTitle && (
                <Text style={[styles.instructorTitle, { color: theme.textSecondary }]}>
                  {course.instructor.professionalTitle}
                </Text>
              )}
            </View>
          </View>
          {course.instructor.bio && (
            <Text style={[styles.instructorBio, { color: theme.textSecondary }]}>
              {course.instructor.bio}
            </Text>
          )}
        </View>
      </ScrollView>

      {/* ── Sticky bottom bar ──────────────────────────── */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: theme.surface,
            borderTopColor: theme.border,
            paddingBottom: insets.bottom + 12,
          },
        ]}
      >
        {!isEnrolled && (
          <View style={styles.priceBlock}>
            <Text style={[styles.priceLabel, { color: course.isFree ? theme.success : theme.text }]}>
              {priceLabel}
            </Text>
            {originalPrice && (
              <Text style={[styles.originalPrice, { color: theme.textSecondary }]}>
                {originalPrice}
              </Text>
            )}
          </View>
        )}

        <View style={styles.ctaRow}>
          {/* Wishlist button */}
          {!isEnrolled && (
            <Pressable
              onPress={() => wishlist()}
              disabled={wishlistPending}
              style={[styles.wishlistBtn, { borderColor: theme.border, backgroundColor: theme.surface }]}
            >
              <Heart size={20} color={theme.primary} weight="regular" />
            </Pressable>
          )}

          {/* Main CTA */}
          <Pressable
            onPress={() => {
              if (isEnrolled) {
                router.push('/(student)/my-learning' as never);
              } else if (course.isFree) {
                enroll();
              }
            }}
            disabled={enrolling}
            style={({ pressed }) => [
              styles.enrollBtn,
              {
                backgroundColor: enrolling ? theme.primaryDark : pressed ? theme.primaryDark : theme.primary,
                flex: isEnrolled ? 1 : undefined,
              },
            ]}
          >
            {enrolling ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.enrollBtnText}>
                {isEnrolled
                  ? 'Go to Course'
                  : course.isFree
                  ? 'Enroll for Free'
                  : 'Add to Cart'}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  errorText: { fontSize: 15, fontFamily: Fonts.regular },
  retryBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryLabel: { fontSize: 14, fontFamily: Fonts.semiBold },

  /* Hero */
  floatingBack: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
  },
  backCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },

  /* Content card */
  contentCard: {
    padding: 16,
    gap: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: '#fff',
    letterSpacing: 0.1,
  },
  title: {
    fontSize: 20,
    fontFamily: Fonts.extraBold,
    lineHeight: 27,
    letterSpacing: -0.4,
    marginTop: 2,
  },
  shortDesc: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    lineHeight: 21,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stars: { flexDirection: 'row', gap: 2 },
  ratingNum: { fontSize: 13, fontFamily: Fonts.bold },
  ratingLabel: { fontSize: 12, fontFamily: Fonts.regular },
  dot: { fontSize: 13 },
  metaText: { fontSize: 12, fontFamily: Fonts.regular },
  instructorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 3,
  },
  byText: { fontSize: 13, fontFamily: Fonts.regular },
  instructorName: { fontSize: 13, fontFamily: Fonts.semiBold },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statText: { fontSize: 12, fontFamily: Fonts.regular },

  /* Sections */
  divider: { height: 8 },
  section: {
    padding: 16,
    gap: 12,
  },
  sectionHeading: {
    fontSize: 17,
    fontFamily: Fonts.extraBold,
    letterSpacing: -0.3,
  },

  /* What you'll learn */
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.regular,
    lineHeight: 20,
  },
  dot2: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 7,
  },
  showMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  showMoreText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
  },

  /* Curriculum */
  curriculumMeta: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: -4,
  },
  curriculumList: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  sectionBlock: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    lineHeight: 20,
  },
  sectionMeta: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    gap: 10,
  },
  lessonTitle: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.regular,
    lineHeight: 18,
  },
  lessonMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  previewText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
  },
  lessonDur: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    minWidth: 30,
    textAlign: 'right',
  },

  /* Instructor */
  instructorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  instructorAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  instructorAvatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructorInitial: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 22,
    fontFamily: Fonts.extraBold,
  },
  instructorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  instructorFullName: {
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  instructorTitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  instructorBio: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    lineHeight: 20,
    marginTop: -4,
  },

  /* Bottom bar */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  priceBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  priceLabel: {
    fontSize: 22,
    fontFamily: Fonts.extraBold,
    letterSpacing: -0.5,
  },
  originalPrice: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    textDecorationLine: 'line-through',
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  wishlistBtn: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  enrollBtn: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  enrollBtnText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: Fonts.bold,
    letterSpacing: -0.1,
  },
});
