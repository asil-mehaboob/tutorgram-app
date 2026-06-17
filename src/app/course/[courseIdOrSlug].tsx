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
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import {
  ArrowLeft,
  ArrowRight,
  BookmarkSimple,
  Buildings,
  CaretDown,
  CaretUp,
  Certificate,
  Clock,
  DeviceMobile,
  PlayCircle,
  Article,
  Question,
  SealCheck,
  Star,
  Tag,
  Users,
  UserCircle,
} from 'phosphor-react-native';
import { RichText } from '@/components/ui/rich-text';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';
import { getCourseDetail, getCourseReviews } from '@/lib/api/catalog';
import { enrollFreeCourse, toggleWishlist } from '@/lib/api/commerce';
import { getMyLearning } from '@/lib/api/enrollment';
import { ApiError } from '@/lib/api/client';
import type { CourseSection, CourseLesson, CourseReview } from '@/lib/api/catalog';

// ─── constants ────────────────────────────────────────────────────────────────

const HERO_BG = '#1A2236';

const LEVEL_LABEL: Record<string, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
  ALL_LEVELS: 'All levels',
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m > 0 ? `${m}m` : ''}`.trim();
  return `${m}m`;
}

function formatStudents(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return String(n);
}

function getLessonIcon(type: string, color: string) {
  if (type === 'ARTICLE') return <Article size={14} color={color} weight="regular" />;
  if (type === 'QUIZ') return <Question size={14} color={color} weight="regular" />;
  return <PlayCircle size={14} color={color} weight="regular" />;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatReviewDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

const REVIEW_AVATAR_COLORS = ['#7C3AED', '#2563EB', '#059669', '#EA580C', '#DB2777', '#4338CA'];
function reviewAvatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return REVIEW_AVATAR_COLORS[Math.abs(h) % REVIEW_AVATAR_COLORS.length];
}

function ReviewCard({
  review,
  showBorder,
  theme,
}: {
  review: CourseReview;
  showBorder: boolean;
  theme: ReturnType<typeof import('@/hooks/use-theme').useTheme>;
}) {
  const [expanded, setExpanded] = useState(false);
  const name = review.studentName ?? 'Student';
  const avatarColor = reviewAvatarColor(name);
  const TRUNCATE = 140;
  const isTruncatable = (review.comment?.length ?? 0) > TRUNCATE;
  const displayedComment =
    !isTruncatable || expanded
      ? review.comment
      : review.comment!.slice(0, TRUNCATE).trimEnd() + '…';

  return (
    <View style={[styles.reviewCard, showBorder && styles.reviewCardBorder]}>
      <View style={styles.reviewHeader}>
        {review.studentProfilePicture ? (
          <Image
            source={{ uri: review.studentProfilePicture }}
            style={styles.reviewAvatar}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.reviewAvatar, styles.reviewAvatarFallback, { backgroundColor: avatarColor }]}>
            <Text style={styles.reviewAvatarInitial}>{name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.reviewName} numberOfLines={1}>{name}</Text>
          <View style={styles.reviewMeta}>
            <View style={styles.reviewStars}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={11}
                  color="#FFB800"
                  weight={i < review.rating ? 'fill' : 'regular'}
                />
              ))}
            </View>
            <Text style={styles.reviewDate}>{formatReviewDate(review.createdAt)}</Text>
          </View>
        </View>
      </View>
      {!!review.title && (
        <Text style={styles.reviewTitle}>{review.title}</Text>
      )}
      {!!review.comment && (
        <Pressable onPress={() => isTruncatable && setExpanded((p) => !p)}>
          <Text style={styles.reviewComment}>{displayedComment}</Text>
          {isTruncatable && (
            <Text style={[styles.reviewReadToggle, { color: theme.primary }]}>
              {expanded ? 'Show less' : 'Read more'}
            </Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

// ─── screen ───────────────────────────────────────────────────────────────────

export default function CourseDetailScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { courseIdOrSlug } = useLocalSearchParams<{ courseIdOrSlug: string }>();
  const queryClient = useQueryClient();

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [descExpanded, setDescExpanded] = useState(false);
  const [enrolledLocally, setEnrolledLocally] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['course-detail', courseIdOrSlug],
    queryFn: () => getCourseDetail(courseIdOrSlug!),
    enabled: !!courseIdOrSlug,
  });

  const { data: myLearningData } = useQuery({
    queryKey: ['my-learning'],
    queryFn: () => getMyLearning({ limit: 200 }),
    enabled: !!courseIdOrSlug,
  });

  const course = data?.course;

  const { data: reviewsData } = useQuery({
    queryKey: ['course-reviews', course?.id],
    queryFn: () => getCourseReviews(course!.id, { limit: 3 }),
    enabled: !!course?.id,
  });

  const reviews: CourseReview[] = reviewsData?.items ?? [];

  const isEnrolled =
    enrolledLocally ||
    !!(myLearningData?.items ?? []).find((e) => e.courseId === course?.id);

  const { mutate: enroll, isPending: enrolling } = useMutation({
    mutationFn: () => enrollFreeCourse(course!.id),
    onSuccess: () => {
      setEnrolledLocally(true);
      queryClient.invalidateQueries({ queryKey: ['my-learning'] });
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError && err.status === 409) setEnrolledLocally(true);
    },
  });

  const { mutate: wishlist } = useMutation({
    mutationFn: () => toggleWishlist(course!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wishlist'] }),
  });

  function toggleSection(id: string) {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handlePreviewOpen() {
    if (course?.promoVideoUrl) {
      router.push({
        pathname: '/course/preview',
        params: { uri: course.promoVideoUrl, title: course.title },
      });
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading || !courseIdOrSlug) {
    return (
      <View style={[styles.center, { backgroundColor: HERO_BG }]}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (isError || !course) {
    return (
      <View style={[styles.center, { backgroundColor: HERO_BG, paddingTop: insets.top }]}>
        <Text style={styles.heroErrorText}>Course not found.</Text>
        <Pressable onPress={() => router.back()} style={styles.heroRetryBtn}>
          <Text style={styles.heroRetryLabel}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const levelLabel = LEVEL_LABEL[course.level] ?? course.level;
  const isBestseller = course.totalStudents > 1000 || course.averageRating >= 4.5;

  const priceLabel = course.isFree
    ? 'Free'
    : course.effectivePrice != null
    ? `₹${course.effectivePrice.toLocaleString('en-IN')}`
    : '';

  const originalPrice =
    !course.isFree && course.discountPercent > 0 && course.price != null
      ? `₹${course.price.toLocaleString('en-IN')}`
      : null;

  const learnHtml: string | null = course.whatYouLearn ?? null;
  const requirementsHtml: string | null = course.requirements ?? course.prerequisites ?? null;
  const whoIsForHtml: string | null = course.whoIsFor ?? null;
  const outcomeItems: string[] = Array.isArray(course.learningOutcomes) ? course.learningOutcomes : [];

  const full = Math.floor(course.averageRating);
  const half = course.averageRating - full >= 0.5;
  const reviewLabel =
    course.totalReviews >= 1000
      ? `(${(course.totalReviews / 1000).toFixed(1)}k ratings)`
      : `(${course.totalReviews} ratings)`;

  const SHORT_DESC_LIMIT = 120;
  const descIsTruncatable = course.shortDescription.length > SHORT_DESC_LIMIT;
  const displayedDesc = descExpanded || !descIsTruncatable
    ? course.shortDescription
    : course.shortDescription.slice(0, SHORT_DESC_LIMIT).trimEnd() + '…';

  const hasPromo = !!course.promoVideoUrl;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >

        {/* ── DARK HERO ─────────────────────────────────────────────────── */}
        <View style={[styles.hero, { paddingTop: insets.top + 4 }]}>

          {/* Nav row */}
          <View style={styles.heroNav}>
            <Pressable onPress={() => router.back()} hitSlop={10} style={styles.heroNavBtn}>
              <ArrowLeft size={22} color="#fff" weight="bold" />
            </Pressable>
            <Pressable onPress={() => wishlist()} hitSlop={10} style={styles.heroNavBtn}>
              <BookmarkSimple size={22} color="#fff" weight="regular" />
            </Pressable>
          </View>

          {/* Brand */}
          {course.brand && (
            <View style={styles.brandRow}>
              {course.brand.logoUrl ? (
                <Image
                  source={{ uri: course.brand.logoUrl }}
                  style={styles.brandLogo}
                  contentFit="contain"
                />
              ) : (
                <Buildings size={14} color="rgba(255,255,255,0.6)" weight="regular" />
              )}
              <Text style={styles.brandName}>{course.brand.name}</Text>
            </View>
          )}

          {/* Category breadcrumb */}
          {(course.category || course.subCategory) && (
            <Text style={styles.heroCategory} numberOfLines={1}>
              {[course.category?.name, course.subCategory?.name].filter(Boolean).join('  ›  ')}
            </Text>
          )}

          {/* Title */}
          <Text style={styles.heroTitle}>{course.title}</Text>

          {/* Short description — expandable */}
          <Pressable
            onPress={() => descIsTruncatable && setDescExpanded((p) => !p)}
            style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
          >
            <Text style={styles.heroDesc}>{displayedDesc}</Text>
            {descIsTruncatable && (
              <Text style={styles.heroDescToggle}>
                {descExpanded ? 'Show less' : 'Show more'}
              </Text>
            )}
          </Pressable>

          {/* Rating row */}
          <View style={styles.heroRatingRow}>
            {isBestseller && (
              <View style={styles.bestseller}>
                <Text style={styles.bestsellerText}>Bestseller</Text>
              </View>
            )}
            <Text style={styles.heroRatingNum}>{course.averageRating.toFixed(1)}</Text>
            <View style={styles.stars}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={12}
                  color="#FFB800"
                  weight={i < full ? 'fill' : half && i === full ? 'duotone' : 'regular'}
                />
              ))}
            </View>
            <Text style={styles.heroRatingLabel}>{reviewLabel}</Text>
            <Text style={styles.heroDot}>·</Text>
            <Users size={12} color="rgba(255,255,255,0.65)" />
            <Text style={styles.heroRatingLabel}>
              {formatStudents(course.totalStudents)} learners
            </Text>
          </View>

          {/* Instructor */}
          <Pressable
            style={styles.heroInstructorRow}
            onPress={() => router.push(`/instructor/${course.instructor.id}` as never)}
            hitSlop={6}
          >
            <UserCircle size={14} color="rgba(255,255,255,0.55)" weight="regular" />
            <Text style={styles.heroInstructor}>
              Created by{' '}
              <Text style={styles.heroInstructorName}>{course.instructor.fullName}</Text>
              {course.instructor.isVerified && (
                <>{'  '}<SealCheck size={12} color="#6C8EFF" weight="fill" /></>
              )}
            </Text>
          </Pressable>

          {/* Chips */}
          <View style={styles.heroChips}>
            <View style={styles.heroChip}>
              <Text style={styles.heroChipText}>{levelLabel}</Text>
            </View>
            {!!course.language && (
              <View style={styles.heroChip}>
                <Text style={styles.heroChipText}>{course.language}</Text>
              </View>
            )}
            {course.totalDuration > 0 && (
              <View style={styles.heroChip}>
                <Text style={styles.heroChipText}>{formatDuration(course.totalDuration)}</Text>
              </View>
            )}
            {course.totalLessons > 0 && (
              <View style={styles.heroChip}>
                <Text style={styles.heroChipText}>
                  {course.totalLessons} lesson{course.totalLessons !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>

          {/* Watch preview — bottom of hero */}
          {hasPromo && (
            <Pressable
              onPress={handlePreviewOpen}
              style={({ pressed }) => [styles.previewRow, pressed && { opacity: 0.75 }]}
            >
              <View style={styles.previewIconWrap}>
                <PlayCircle size={20} color="#fff" weight="fill" />
              </View>
              <Text style={styles.previewRowLabel}>Watch course preview</Text>
              <ArrowRight size={16} color="rgba(255,255,255,0.6)" weight="bold" />
            </Pressable>
          )}
        </View>

        {/* ── WHITE BODY ────────────────────────────────────────────────── */}
        <View style={styles.body}>

          {/* About this course */}
          {!!course.detailedDescription && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>About this course</Text>
                <RichText html={course.detailedDescription} />
              </View>
              <View style={styles.sep} />
            </>
          )}

          {/* What you'll learn */}
          {!!learnHtml && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>What you'll learn</Text>
                <RichText html={learnHtml} />
              </View>
              <View style={styles.sep} />
            </>
          )}

          {/* Skills you'll gain */}
          {outcomeItems.length > 0 && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Skills you'll gain</Text>
                <View style={styles.pillsWrap}>
                  {outcomeItems.map((tag, i) => (
                    <View key={i} style={styles.skillPill}>
                      <Tag size={12} color="#444" weight="regular" />
                      <Text style={styles.skillText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={styles.sep} />
            </>
          )}

          {/* Who this course is for */}
          {!!whoIsForHtml && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Who this course is for</Text>
                <RichText html={whoIsForHtml} />
              </View>
              <View style={styles.sep} />
            </>
          )}

          {/* This course includes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>This course includes</Text>
            <View style={styles.includesList}>
              {course.totalDuration > 0 && (
                <View style={styles.includesRow}>
                  <Clock size={18} color="#666" weight="regular" />
                  <Text style={styles.includesText}>
                    {formatDuration(course.totalDuration)} of on-demand content
                  </Text>
                </View>
              )}
              {course.totalLessons > 0 && (
                <View style={styles.includesRow}>
                  <PlayCircle size={18} color="#666" weight="regular" />
                  <Text style={styles.includesText}>
                    {course.totalLessons} lesson{course.totalLessons !== 1 ? 's' : ''} across{' '}
                    {course.totalSections} section{course.totalSections !== 1 ? 's' : ''}
                  </Text>
                </View>
              )}
              <View style={styles.includesRow}>
                <DeviceMobile size={18} color="#666" weight="regular" />
                <Text style={styles.includesText}>Access on mobile</Text>
              </View>
              <View style={styles.includesRow}>
                <Certificate size={18} color="#666" weight="regular" />
                <Text style={styles.includesText}>Certificate of completion</Text>
              </View>
            </View>
          </View>

          <View style={styles.sep} />

          {/* Requirements */}
          {!!requirementsHtml && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Requirements</Text>
                <RichText html={requirementsHtml} />
              </View>
              <View style={styles.sep} />
            </>
          )}

          {/* Course content */}
          {course.sections.length > 0 && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Course content</Text>
                <Text style={styles.contentMeta}>
                  {course.totalSections} section{course.totalSections !== 1 ? 's' : ''} •{' '}
                  {course.totalLessons} lesson{course.totalLessons !== 1 ? 's' : ''} •{' '}
                  {formatDuration(course.totalDuration)} total
                </Text>

                <View style={styles.accordion}>
                  {course.sections.map((section: CourseSection, sIdx: number) => {
                    const isOpen = !!expandedSections[section.id];
                    const sectionDur = section.lessons.reduce(
                      (acc: number, l: CourseLesson) => acc + (l.duration ?? 0),
                      0,
                    );
                    return (
                      <View
                        key={section.id}
                        style={[
                          styles.accordionSection,
                          sIdx < course.sections.length - 1 && styles.accordionSectionBorder,
                        ]}
                      >
                        <Pressable
                          onPress={() => toggleSection(section.id)}
                          style={({ pressed }) => [
                            styles.accordionHeader,
                            pressed && { backgroundColor: '#F5F5F5' },
                          ]}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.accordionHeaderTitle} numberOfLines={2}>
                              {section.title}
                            </Text>
                            {!!section.description && (
                              <RichText html={section.description} />
                            )}
                            <Text style={styles.accordionHeaderMeta}>
                              {section.lessons.length} lesson
                              {section.lessons.length !== 1 ? 's' : ''}
                              {sectionDur > 0 ? ` • ${formatDuration(sectionDur)}` : ''}
                            </Text>
                          </View>
                          {isOpen
                            ? <CaretUp size={16} color="#666" weight="bold" />
                            : <CaretDown size={16} color="#666" weight="bold" />
                          }
                        </Pressable>

                        {isOpen && (
                          <View style={styles.lessonList}>
                            {section.lessons.map((lesson: CourseLesson, lIdx: number) => (
                              <View
                                key={lesson.id}
                                style={[
                                  styles.lessonItem,
                                  lIdx < section.lessons.length - 1 && styles.lessonItemBorder,
                                ]}
                              >
                                <View style={styles.lessonItemIcon}>
                                  {getLessonIcon(lesson.type, '#666')}
                                </View>
                                <View style={styles.lessonItemBody}>
                                  <Text style={styles.lessonItemTitle}>
                                    {lesson.title}
                                  </Text>
                                  {!!lesson.description && (
                                    <RichText html={lesson.description} />
                                  )}
                                </View>
                                <View style={styles.lessonItemRight}>
                                  {lesson.isFreePreview && (
                                    <Text style={[styles.previewTag, { color: theme.primary }]}>
                                      Preview
                                    </Text>
                                  )}
                                  {lesson.duration != null && lesson.duration > 0 && (
                                    <Text style={styles.lessonDur}>
                                      {formatDuration(lesson.duration)}
                                    </Text>
                                  )}
                                </View>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
              <View style={styles.sep} />
            </>
          )}

          {/* Instructor */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Instructor</Text>
            <Pressable
              style={({ pressed }) => [styles.instructorCard, { opacity: pressed ? 0.85 : 1 }]}
              onPress={() => router.push(`/instructor/${course.instructor.id}` as never)}
            >
              {course.instructor.profilePicture ? (
                <Image
                  source={{ uri: course.instructor.profilePicture }}
                  style={styles.instructorAvatar}
                  contentFit="cover"
                />
              ) : (
                <View
                  style={[
                    styles.instructorAvatar,
                    styles.instructorAvatarFallback,
                    { backgroundColor: theme.primaryLight },
                  ]}
                >
                  <Text style={[styles.instructorInitial, { color: theme.primary }]}>
                    {course.instructor.fullName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <View style={styles.instructorNameRow}>
                  <Text style={styles.instructorName}>{course.instructor.fullName}</Text>
                  {course.instructor.isVerified && (
                    <SealCheck size={15} color={theme.primary} weight="fill" />
                  )}
                </View>
                {!!course.instructor.professionalTitle && (
                  <Text style={styles.instructorRole}>
                    {course.instructor.professionalTitle}
                  </Text>
                )}
                <View style={styles.instructorMeta}>
                  <Star size={13} color="#FFB800" weight="fill" />
                  <Text style={styles.instructorMetaText}>
                    {course.averageRating.toFixed(1)} instructor rating
                  </Text>
                  <Text style={styles.instructorMetaDot}>·</Text>
                  <Users size={13} color="#666" />
                  <Text style={styles.instructorMetaText}>
                    {formatStudents(course.totalStudents)} students
                  </Text>
                </View>
              </View>
            </Pressable>
            {!!course.instructor.bio && (
              <RichText html={course.instructor.bio} />
            )}
          </View>

          {/* Student reviews */}
          {course.totalReviews > 0 && (
            <>
              <View style={styles.sep} />
              <View style={styles.section}>
                <View style={styles.reviewsSectionHeader}>
                  <Text style={styles.sectionTitle}>Student reviews</Text>
                  <Pressable
                    hitSlop={8}
                    onPress={() =>
                      router.push({
                        pathname: '/course/reviews',
                        params: {
                          courseId: course.id,
                          title: course.title,
                          averageRating: String(course.averageRating),
                          totalReviews: String(course.totalReviews),
                        },
                      } as never)
                    }
                    style={styles.seeAllReviews}
                  >
                    <Text style={[styles.seeAllReviewsText, { color: theme.primary }]}>
                      See all {course.totalReviews.toLocaleString()}
                    </Text>
                    <ArrowRight size={13} color={theme.primary} weight="bold" />
                  </Pressable>
                </View>

                {/* Rating summary */}
                <View style={styles.ratingSummary}>
                  <View style={styles.ratingBig}>
                    <Text style={styles.ratingBigNum}>{course.averageRating.toFixed(1)}</Text>
                    <View style={styles.stars}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          color="#FFB800"
                          weight={i < full ? 'fill' : half && i === full ? 'duotone' : 'regular'}
                        />
                      ))}
                    </View>
                    <Text style={styles.ratingBigLabel}>
                      {course.totalReviews.toLocaleString()} {course.totalReviews === 1 ? 'rating' : 'ratings'}
                    </Text>
                  </View>
                </View>

                {/* Review list */}
                {reviews.length > 0 && (
                  <View style={styles.reviewList}>
                    {reviews.map((review, i) => (
                      <ReviewCard
                        key={review.id}
                        review={review}
                        showBorder={i < reviews.length - 1}
                        theme={theme}
                      />
                    ))}
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* ── STICKY BOTTOM BAR ───────────────────────────────────────────── */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.bottomBarInner}>
          <View style={styles.priceBlock}>
            {isEnrolled ? (
              <Text style={styles.enrolledLabel}>Enrolled</Text>
            ) : (
              <>
                <Text style={styles.priceMain}>{priceLabel}</Text>
                {!!originalPrice && (
                  <Text style={styles.priceOriginal}>{originalPrice}</Text>
                )}
                {course.discountPercent > 0 && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>{course.discountPercent}% off</Text>
                  </View>
                )}
              </>
            )}
          </View>

          <Pressable
            onPress={() => {
              if (isEnrolled) {
                router.push(`/learn/${course.id}`);
              } else if (course.isFree) {
                enroll();
              }
            }}
            disabled={enrolling}
            style={({ pressed }) => [
              styles.ctaBtn,
              { backgroundColor: pressed || enrolling ? theme.primaryDark : theme.primary },
            ]}
          >
            {enrolling ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.ctaBtnText}>
                {isEnrolled
                  ? 'Go to course'
                  : course.isFree
                  ? 'Enroll for free'
                  : 'Buy this course'}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },

  heroErrorText: { color: '#fff', fontSize: 16, fontFamily: Fonts.regular },
  heroRetryBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  heroRetryLabel: { color: '#fff', fontSize: 14, fontFamily: Fonts.semiBold },

  /* ── Hero ── */
  hero: {
    backgroundColor: HERO_BG,
    paddingHorizontal: 16,
    paddingBottom: 0,
    gap: 10,
  },
  heroNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: -4,
    paddingVertical: 4,
  },
  heroNavBtn: { padding: 4 },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandLogo: { width: 20, height: 20, borderRadius: 4 },
  brandName: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontFamily: Fonts.semiBold,
  },

  heroCategory: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontFamily: Fonts.semiBold,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#fff',
    fontSize: 22,
    fontFamily: Fonts.extraBold,
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  heroDesc: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 14,
    fontFamily: Fonts.regular,
    lineHeight: 21,
  },
  heroDescToggle: {
    color: '#8BA4FF',
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    marginTop: 4,
  },
  heroRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
  },
  bestseller: {
    backgroundColor: '#FFB800',
    borderRadius: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  bestsellerText: { color: '#1A1A1A', fontSize: 10, fontFamily: Fonts.bold },
  heroRatingNum: { color: '#FFB800', fontSize: 13, fontFamily: Fonts.bold },
  stars: { flexDirection: 'row', gap: 1 },
  heroRatingLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    fontFamily: Fonts.regular,
  },
  heroDot: { color: 'rgba(255,255,255,0.35)', fontSize: 13 },

  heroInstructorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroInstructor: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    fontFamily: Fonts.regular,
    lineHeight: 18,
    flex: 1,
  },
  heroInstructorName: { color: '#8BA4FF', fontFamily: Fonts.semiBold },

  heroChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  heroChip: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  heroChipText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontFamily: Fonts.medium,
  },

  /* Watch preview row */
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  previewIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewRowLabel: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.semiBold,
  },

  /* ── Body ── */
  body: { backgroundColor: '#fff' },
  sep: { height: 8, backgroundColor: '#F0F2F5' },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Fonts.extraBold,
    color: '#1C1D1F',
    letterSpacing: -0.3,
  },

  pillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EEF0F3',
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  skillText: { fontSize: 12, fontFamily: Fonts.medium, color: '#1C1D1F' },

  includesList: { gap: 13 },
  includesRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  includesText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: '#1C1D1F',
    flex: 1,
  },

  contentMeta: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: '#666',
    marginTop: -6,
  },
  accordion: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  accordionSection: {},
  accordionSectionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
    backgroundColor: '#fff',
  },
  accordionHeaderTitle: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: '#1C1D1F',
    lineHeight: 20,
  },
  accordionHeaderMeta: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: '#666',
    marginTop: 3,
  },
  lessonList: {
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  lessonItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 11,
    gap: 10,
  },
  lessonItemIcon: { paddingTop: 3 },
  lessonItemBody: { flex: 1, gap: 4 },
  lessonItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  lessonItemTitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: '#1C1D1F',
    lineHeight: 18,
  },
  lessonItemRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  previewTag: { fontSize: 12, fontFamily: Fonts.semiBold },
  lessonDur: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: '#666',
    minWidth: 30,
    textAlign: 'right',
  },

  instructorCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, backgroundColor: '#F7F9FA', borderRadius: 12, padding: 14 },
  instructorAvatar: { width: 60, height: 60, borderRadius: 30 },
  instructorAvatarFallback: { justifyContent: 'center', alignItems: 'center' },
  instructorInitial: { fontSize: 24, fontFamily: Fonts.extraBold },
  instructorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  instructorName: { fontSize: 16, fontFamily: Fonts.bold, color: '#1C1D1F' },
  instructorRole: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: '#666',
    marginTop: 2,
  },
  instructorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  instructorMetaText: { fontSize: 12, fontFamily: Fonts.regular, color: '#666' },
  instructorMetaDot: { color: '#CCC', fontSize: 13 },

  /* ── Reviews ── */
  reviewsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seeAllReviews: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  seeAllReviewsText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
  },
  ratingSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  ratingBig: {
    alignItems: 'center',
    gap: 4,
  },
  ratingBigNum: {
    fontSize: 40,
    fontFamily: Fonts.extraBold,
    color: '#1C1D1F',
    lineHeight: 44,
    letterSpacing: -1,
  },
  ratingBigLabel: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: '#666',
  },
  reviewList: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  reviewCard: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 8,
    backgroundColor: '#fff',
  },
  reviewCardBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reviewAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    flexShrink: 0,
  },
  reviewAvatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewAvatarInitial: {
    color: '#fff',
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  reviewName: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: '#1C1D1F',
  },
  reviewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 1,
  },
  reviewDate: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: '#999',
  },
  reviewTitle: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: '#1C1D1F',
  },
  reviewComment: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: '#444',
    lineHeight: 20,
  },
  reviewReadToggle: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    marginTop: 4,
  },

  /* ── Bottom bar ── */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  bottomBarInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  priceBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  priceMain: {
    fontSize: 20,
    fontFamily: Fonts.extraBold,
    color: '#1C1D1F',
    letterSpacing: -0.5,
  },
  priceOriginal: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: '#FFF3CD',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountText: { fontSize: 11, fontFamily: Fonts.bold, color: '#8B6914' },
  enrolledLabel: { fontSize: 14, fontFamily: Fonts.semiBold, color: '#059669' },
  ctaBtn: {
    height: 46,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    minWidth: 160,
  },
  ctaBtnText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.bold,
    letterSpacing: 0.1,
  },
});
