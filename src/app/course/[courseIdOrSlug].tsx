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
  Check,
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
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';
import { getCourseDetail } from '@/lib/api/catalog';
import { enrollFreeCourse, toggleWishlist } from '@/lib/api/commerce';
import { getMyLearning } from '@/lib/api/enrollment';
import { ApiError } from '@/lib/api/client';
import type { CourseSection, CourseLesson } from '@/lib/api/catalog';

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

  const learnItems: string[] = Array.isArray(course.whatYouLearn) ? course.whatYouLearn : [];
  const requirementItems: string[] = Array.isArray(course.requirements)
    ? course.requirements
    : Array.isArray(course.prerequisites)
    ? course.prerequisites
    : [];
  const whoIsForItems: string[] = Array.isArray(course.whoIsFor) ? course.whoIsFor : [];
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
          <Pressable onPress={() => descIsTruncatable && setDescExpanded((p) => !p)} activeOpacity={0.8}>
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
          <View style={styles.heroInstructorRow}>
            <UserCircle size={14} color="rgba(255,255,255,0.55)" weight="regular" />
            <Text style={styles.heroInstructor}>
              Created by{' '}
              <Text style={styles.heroInstructorName}>{course.instructor.fullName}</Text>
              {course.instructor.isVerified && (
                <>{'  '}<SealCheck size={12} color="#6C8EFF" weight="fill" /></>
              )}
            </Text>
          </View>

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
                <Text style={styles.aboutText}>{course.detailedDescription}</Text>
              </View>
              <View style={styles.sep} />
            </>
          )}

          {/* What you'll learn */}
          {learnItems.length > 0 && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>What you'll learn</Text>
                <View style={styles.checkList}>
                  {learnItems.map((item, i) => (
                    <View key={i} style={styles.checkRow}>
                      <Check size={16} color={theme.primary} weight="bold" style={{ marginTop: 2 }} />
                      <Text style={styles.checkText}>{item}</Text>
                    </View>
                  ))}
                </View>
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
          {whoIsForItems.length > 0 && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Who this course is for</Text>
                <View style={styles.checkList}>
                  {whoIsForItems.map((item, i) => (
                    <View key={i} style={styles.checkRow}>
                      <UserCircle size={16} color={theme.primary} weight="regular" style={{ marginTop: 2 }} />
                      <Text style={styles.checkText}>{item}</Text>
                    </View>
                  ))}
                </View>
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
          {requirementItems.length > 0 && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Requirements</Text>
                <View style={styles.bulletList}>
                  {requirementItems.map((item, i) => (
                    <View key={i} style={styles.bulletRow}>
                      <View style={styles.bullet} />
                      <Text style={styles.bulletText}>{item}</Text>
                    </View>
                  ))}
                </View>
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
                              <Text style={styles.accordionHeaderDesc} numberOfLines={isOpen ? undefined : 1}>
                                {section.description}
                              </Text>
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
                                {getLessonIcon(lesson.type, '#666')}
                                <Text style={styles.lessonItemTitle} numberOfLines={2}>
                                  {lesson.title}
                                </Text>
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
            <View style={styles.instructorCard}>
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
            </View>
            {!!course.instructor.bio && (
              <Text style={styles.instructorBio}>{course.instructor.bio}</Text>
            )}
          </View>
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
                router.push('/(student)/my-learning');
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

  aboutText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: '#3A3A3A',
    lineHeight: 22,
  },

  checkList: { gap: 10 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  checkText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: '#1C1D1F',
    lineHeight: 20,
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

  bulletList: { gap: 10 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#555',
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: '#1C1D1F',
    lineHeight: 20,
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
  accordionHeaderDesc: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: '#888',
    lineHeight: 17,
    marginTop: 2,
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    gap: 10,
  },
  lessonItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  lessonItemTitle: {
    flex: 1,
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

  instructorCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
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
  instructorBio: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: '#444',
    lineHeight: 21,
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
