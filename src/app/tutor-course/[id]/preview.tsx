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
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  CaretDown,
  CaretUp,
  Certificate,
  Clock,
  DeviceMobile,
  PlayCircle,
  Article,
  Question,
  PencilSimple,
  Star,
  Users,
} from 'phosphor-react-native';
import { RichText } from '@/components/ui/rich-text';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';
import { getCourse } from '@/lib/api/tutor-courses';
import type { TutorCourse, TutorSection, TutorLesson } from '@/lib/api/tutor-courses';

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

export default function TutorCoursePreviewScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [descExpanded, setDescExpanded] = useState(false);

  const { data: course, isLoading, isError } = useQuery({
    queryKey: ['tutor-course', id],
    queryFn: () => getCourse(id!),
    enabled: !!id,
    staleTime: 60_000,
  });

  function toggleSection(sectionId: string) {
    setExpandedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  }

  function goEdit() {
    router.replace({ pathname: '/tutor-course/[id]/edit', params: { id: id! } });
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading || !id) {
    return (
      <View style={[styles.center, { backgroundColor: HERO_BG }]}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
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

  // ── Derived ──────────────────────────────────────────────────────────────
  const levelLabel = LEVEL_LABEL[course.level] ?? course.level;

  const hasDiscount =
    (course.discountPercent ?? 0) > 0 &&
    (!course.discountValidTill || new Date(course.discountValidTill) > new Date());

  const effectivePrice = hasDiscount
    ? Math.round((course.price ?? 0) * (1 - (course.discountPercent ?? 0) / 100))
    : course.price;

  const priceLabel = course.isFree || !course.price
    ? 'Free'
    : `₹${effectivePrice?.toLocaleString('en-IN')}`;

  const originalPrice =
    !course.isFree && hasDiscount && course.price != null
      ? `₹${course.price.toLocaleString('en-IN')}`
      : null;

  const averageRating = course.averageRating ?? 0;
  const totalStudents = course.totalStudents ?? 0;
  const totalLessons = course.totalLessons ?? 0;
  const totalSections = course.totalSections ?? (course.sections?.length ?? 0);
  const totalDuration = course.totalDuration ?? 0;

  const learnHtml = typeof course.whatYouLearn === 'string' ? course.whatYouLearn : null;
  const requirementsHtml = typeof course.requirements === 'string'
    ? course.requirements
    : typeof course.prerequisites === 'string'
    ? course.prerequisites
    : null;
  const whoIsForHtml = typeof course.whoIsFor === 'string' ? course.whoIsFor : null;

  const SHORT_DESC_LIMIT = 120;
  const shortDesc = course.shortDescription ?? '';
  const descIsTruncatable = shortDesc.length > SHORT_DESC_LIMIT;
  const displayedDesc = descExpanded || !descIsTruncatable
    ? shortDesc
    : shortDesc.slice(0, SHORT_DESC_LIMIT).trimEnd() + '…';

  const full = Math.floor(averageRating);
  const half = averageRating - full >= 0.5;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >

        {/* ── DARK HERO ───────────────────────────────────────────────── */}
        <View style={[styles.hero, { paddingTop: insets.top + 4 }]}>

          {/* Nav row */}
          <View style={styles.heroNav}>
            <Pressable onPress={() => router.back()} hitSlop={10} style={styles.heroNavBtn}>
              <ArrowLeft size={22} color="#fff" weight="bold" />
            </Pressable>
            <View style={styles.previewBadge}>
              <Text style={styles.previewBadgeText}>PREVIEW MODE</Text>
            </View>
            <Pressable onPress={goEdit} hitSlop={10} style={styles.editNavBtn}>
              <PencilSimple size={15} color="#fff" weight="regular" />
              <Text style={styles.editNavBtnText}>Edit</Text>
            </Pressable>
          </View>

          {/* Category breadcrumb */}
          {(course.category || course.subCategory) && (
            <Text style={styles.heroCategory} numberOfLines={1}>
              {[course.category?.name, course.subCategory?.name].filter(Boolean).join('  ›  ')}
            </Text>
          )}

          {/* Title */}
          <Text style={styles.heroTitle}>{course.title}</Text>

          {/* Short description */}
          {!!shortDesc && (
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
          )}

          {/* Rating row */}
          {averageRating > 0 && (
            <View style={styles.heroRatingRow}>
              <Text style={styles.heroRatingNum}>{averageRating.toFixed(1)}</Text>
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
              {totalStudents > 0 && (
                <>
                  <Text style={styles.heroDot}>·</Text>
                  <Users size={12} color="rgba(255,255,255,0.65)" />
                  <Text style={styles.heroRatingLabel}>
                    {formatStudents(totalStudents)} learners
                  </Text>
                </>
              )}
            </View>
          )}

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
            {totalDuration > 0 && (
              <View style={styles.heroChip}>
                <Text style={styles.heroChipText}>{formatDuration(totalDuration)}</Text>
              </View>
            )}
            {totalLessons > 0 && (
              <View style={styles.heroChip}>
                <Text style={styles.heroChipText}>
                  {totalLessons} lesson{totalLessons !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── BODY ────────────────────────────────────────────────────── */}
        <View style={[styles.body, { backgroundColor: theme.background }]}>

          {/* About this course */}
          {!!course.detailedDescription && (
            <>
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>About this course</Text>
                <RichText html={course.detailedDescription} />
              </View>
              <View style={[styles.sep, { backgroundColor: theme.surfaceEl }]} />
            </>
          )}

          {/* What you'll learn */}
          {!!learnHtml && (
            <>
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>What you'll learn</Text>
                <RichText html={learnHtml} />
              </View>
              <View style={[styles.sep, { backgroundColor: theme.surfaceEl }]} />
            </>
          )}

          {/* Who this course is for */}
          {!!whoIsForHtml && (
            <>
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Who this course is for</Text>
                <RichText html={whoIsForHtml} />
              </View>
              <View style={[styles.sep, { backgroundColor: theme.surfaceEl }]} />
            </>
          )}

          {/* This course includes */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>This course includes</Text>
            <View style={styles.includesList}>
              {totalDuration > 0 && (
                <View style={styles.includesRow}>
                  <Clock size={18} color={theme.textSecondary} weight="regular" />
                  <Text style={[styles.includesText, { color: theme.text }]}>
                    {formatDuration(totalDuration)} of on-demand content
                  </Text>
                </View>
              )}
              {totalLessons > 0 && (
                <View style={styles.includesRow}>
                  <PlayCircle size={18} color={theme.textSecondary} weight="regular" />
                  <Text style={[styles.includesText, { color: theme.text }]}>
                    {totalLessons} lesson{totalLessons !== 1 ? 's' : ''} across{' '}
                    {totalSections} section{totalSections !== 1 ? 's' : ''}
                  </Text>
                </View>
              )}
              <View style={styles.includesRow}>
                <DeviceMobile size={18} color={theme.textSecondary} weight="regular" />
                <Text style={[styles.includesText, { color: theme.text }]}>Access on mobile</Text>
              </View>
              <View style={styles.includesRow}>
                <Certificate size={18} color={theme.textSecondary} weight="regular" />
                <Text style={[styles.includesText, { color: theme.text }]}>Certificate of completion</Text>
              </View>
            </View>
          </View>

          <View style={[styles.sep, { backgroundColor: theme.surfaceEl }]} />

          {/* Requirements */}
          {!!requirementsHtml && (
            <>
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Requirements</Text>
                <RichText html={requirementsHtml} />
              </View>
              <View style={[styles.sep, { backgroundColor: theme.surfaceEl }]} />
            </>
          )}

          {/* Course content */}
          {(course.sections?.length ?? 0) > 0 && (
            <>
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Course content</Text>
                <Text style={[styles.contentMeta, { color: theme.textSecondary }]}>
                  {totalSections} section{totalSections !== 1 ? 's' : ''} •{' '}
                  {totalLessons} lesson{totalLessons !== 1 ? 's' : ''} •{' '}
                  {formatDuration(totalDuration)} total
                </Text>

                <View style={[styles.accordion, { borderColor: theme.border }]}>
                  {course.sections!.map((section: TutorSection, sIdx: number) => {
                    const isOpen = !!expandedSections[section.id];
                    const sectionDur = section.lessons.reduce(
                      (acc: number, l: TutorLesson) => acc + (l.duration ?? 0),
                      0,
                    );
                    return (
                      <View
                        key={section.id}
                        style={[
                          styles.accordionSection,
                          sIdx < course.sections!.length - 1 && styles.accordionSectionBorder,
                          sIdx < course.sections!.length - 1 && { borderBottomColor: theme.border },
                        ]}
                      >
                        <Pressable
                          onPress={() => toggleSection(section.id)}
                          style={({ pressed }) => [
                            styles.accordionHeader,
                            { backgroundColor: theme.surface },
                            pressed && { backgroundColor: theme.surfaceEl },
                          ]}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.accordionHeaderTitle, { color: theme.text }]} numberOfLines={2}>
                              {section.title}
                            </Text>
                            {!!section.description && (
                              <RichText html={section.description} />
                            )}
                            <Text style={[styles.accordionHeaderMeta, { color: theme.textSecondary }]}>
                              {section.lessons.length} lesson
                              {section.lessons.length !== 1 ? 's' : ''}
                              {sectionDur > 0 ? ` • ${formatDuration(sectionDur)}` : ''}
                            </Text>
                          </View>
                          {isOpen
                            ? <CaretUp size={16} color={theme.textSecondary} weight="bold" />
                            : <CaretDown size={16} color={theme.textSecondary} weight="bold" />
                          }
                        </Pressable>

                        {isOpen && (
                          <View style={[styles.lessonList, { backgroundColor: theme.surfaceEl, borderTopColor: theme.border }]}>
                            {section.lessons.map((lesson: TutorLesson, lIdx: number) => (
                              <Pressable
                                key={lesson.id}
                                onPress={() =>
                                  router.push({
                                    pathname: '/tutor-course/[id]/lesson' as any,
                                    params: { id: id!, lessonId: lesson.id },
                                  })
                                }
                                style={({ pressed }) => [
                                  styles.lessonItem,
                                  lIdx < section.lessons.length - 1 && styles.lessonItemBorder,
                                  lIdx < section.lessons.length - 1 && { borderBottomColor: theme.border },
                                  pressed && { backgroundColor: theme.surfaceEl, opacity: 0.8 },
                                ]}
                              >
                                <View style={styles.lessonItemIcon}>
                                  {getLessonIcon(lesson.type, theme.textSecondary)}
                                </View>
                                <View style={styles.lessonItemBody}>
                                  <Text style={[styles.lessonItemTitle, { color: theme.text }]}>
                                    {lesson.title}
                                  </Text>
                                </View>
                                <View style={styles.lessonItemRight}>
                                  {lesson.isFreePreview && (
                                    <Text style={[styles.previewTag, { color: theme.primary }]}>
                                      Preview
                                    </Text>
                                  )}
                                  {lesson.duration != null && lesson.duration > 0 && (
                                    <Text style={[styles.lessonDur, { color: theme.textSecondary }]}>
                                      {formatDuration(lesson.duration)}
                                    </Text>
                                  )}
                                </View>
                              </Pressable>
                            ))}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
              <View style={[styles.sep, { backgroundColor: theme.surfaceEl }]} />
            </>
          )}
        </View>
      </ScrollView>

      {/* ── STICKY BOTTOM BAR ───────────────────────────────────────────── */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12, backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <View style={styles.bottomBarInner}>
          <View style={styles.priceBlock}>
            <Text style={[styles.priceMain, { color: theme.text }]}>{priceLabel}</Text>
            {!!originalPrice && (
              <Text style={[styles.priceOriginal, { color: theme.textSecondary }]}>{originalPrice}</Text>
            )}
            {hasDiscount && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{course.discountPercent}% off</Text>
              </View>
            )}
          </View>

          <Pressable
            onPress={goEdit}
            style={[styles.ctaBtn, { backgroundColor: theme.primary }]}
          >
            <PencilSimple size={15} color="#fff" weight="regular" />
            <Text style={styles.ctaBtnText}>Edit Course</Text>
          </Pressable>
        </View>
        <Text style={[styles.previewNote, { color: theme.textSecondary }]}>
          Preview only — changes won't affect live enrollment
        </Text>
      </View>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
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
    paddingBottom: 20,
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
  previewBadge: {
    flex: 1,
    alignItems: 'center',
  },
  previewBadgeText: {
    color: '#FFB800',
    fontSize: 10,
    fontFamily: Fonts.bold,
    letterSpacing: 1,
  },
  editNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  editNavBtnText: { color: '#fff', fontSize: 13, fontFamily: Fonts.semiBold },

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
  heroRatingNum: { color: '#FFB800', fontSize: 13, fontFamily: Fonts.bold },
  stars: { flexDirection: 'row', gap: 1 },
  heroRatingLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    fontFamily: Fonts.regular,
  },
  heroDot: { color: 'rgba(255,255,255,0.35)', fontSize: 13 },

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

  /* ── Body ── */
  body: {},
  sep: { height: 8 },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Fonts.extraBold,
    letterSpacing: -0.3,
  },

  includesList: { gap: 13 },
  includesRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  includesText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    flex: 1,
  },

  contentMeta: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    marginTop: -6,
  },
  accordion: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  accordionSection: {},
  accordionSectionBorder: {
    borderBottomWidth: 1,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  accordionHeaderTitle: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    lineHeight: 20,
  },
  accordionHeaderMeta: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 3,
  },
  lessonList: {
    borderTopWidth: 1,
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
  },
  lessonItemTitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    lineHeight: 18,
  },
  lessonItemRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  previewTag: { fontSize: 12, fontFamily: Fonts.semiBold },
  lessonDur: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    minWidth: 30,
    textAlign: 'right',
  },

  /* ── Bottom bar ── */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingTop: 12,
    paddingHorizontal: 16,
    gap: 6,
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
    letterSpacing: -0.5,
  },
  priceOriginal: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: '#FFF3CD',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountText: { fontSize: 11, fontFamily: Fonts.bold, color: '#8B6914' },
  ctaBtn: {
    height: 46,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 20,
    minWidth: 140,
  },
  ctaBtnText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.bold,
    letterSpacing: 0.1,
  },
  previewNote: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    textAlign: 'center',
  },
});
