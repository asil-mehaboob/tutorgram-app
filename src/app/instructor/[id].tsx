import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Briefcase,
  Certificate,
  CurrencyInr,
  GraduationCap,
  Globe,
  GithubLogo,
  InstagramLogo,
  LinkedinLogo,
  MapPin,
  SealCheck,
  Star,
  Trophy,
  TwitterLogo,
  Users,
  YoutubeLogo,
} from 'phosphor-react-native';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';
import { getInstructorDetail, getInstructorCourses } from '@/lib/api/catalog';
import { CourseCard } from '@/components/course/course-card';
import { RichText } from '@/components/ui/rich-text';
import type { InstructorDetail } from '@/lib/api/catalog';

const { width: SW } = Dimensions.get('window');
const CARD_W = Math.min(220, SW * 0.58);
const HERO_BG = '#1A2236';

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function formatMonthYear(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

function formatYear(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).getFullYear().toString();
}

function expDateRange(start: string | null, end: string | null, isCurrent = false): string {
  const s = formatMonthYear(start);
  if (!s) return '';
  const e = isCurrent ? 'Present' : formatMonthYear(end) ?? '';
  return e ? `${s} – ${e}` : s;
}

function formatPrice(price: number): string {
  return '₹' + price.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ─── sub-components ───────────────────────────────────────────────────────────

function SocialBtn({ link }: { link: InstructorDetail['socialLinks'][0] }) {
  const p = link.platform.toLowerCase();
  const size = 18;
  const color = '#fff';
  let icon: React.ReactNode;
  if (p.includes('linkedin')) icon = <LinkedinLogo size={size} color={color} weight="fill" />;
  else if (p.includes('youtube')) icon = <YoutubeLogo size={size} color={color} weight="fill" />;
  else if (p.includes('twitter') || p.includes('x.com')) icon = <TwitterLogo size={size} color={color} weight="fill" />;
  else if (p.includes('github')) icon = <GithubLogo size={size} color={color} weight="fill" />;
  else if (p.includes('instagram')) icon = <InstagramLogo size={size} color={color} weight="fill" />;
  else icon = <Globe size={size} color={color} weight="regular" />;

  return (
    <Pressable
      style={({ pressed }) => [styles.socialBtn, { opacity: pressed ? 0.7 : 1 }]}
      onPress={() => Linking.openURL(link.url).catch(() => null)}
    >
      {icon}
    </Pressable>
  );
}

function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SectionHeading({
  icon,
  title,
  theme,
}: {
  icon: React.ReactNode;
  title: string;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={styles.sectionHeadingRow}>
      {icon}
      <Text style={[styles.sectionHeadingText, { color: theme.text }]}>{title}</Text>
    </View>
  );
}

function TimelineEntry({ children }: { children: React.ReactNode }) {
  return <View>{children}</View>;
}

function ExperienceItem({ item }: { item: InstructorDetail['experience'][0] }) {
  const range = expDateRange(item.startDate, item.endDate, item.isCurrent);
  return (
    <TimelineEntry>
      <View style={styles.tlCard}>
        <View style={styles.tlTitleRow}>
          <Text style={styles.tlTitle}>{item.title}</Text>
          {item.isCurrent && (
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>Current</Text>
            </View>
          )}
        </View>
        <Text style={styles.tlOrg}>{item.company}</Text>
        {(!!item.location || !!range) && (
          <View style={styles.tlMetaRow}>
            {!!item.location && (
              <>
                <MapPin size={11} color="#888" weight="regular" />
                <Text style={styles.tlMeta}>{item.location}</Text>
                {!!range && <Text style={styles.tlMetaDot}>·</Text>}
              </>
            )}
            {!!range && <Text style={styles.tlMeta}>{range}</Text>}
          </View>
        )}
        {!!item.description && (
          <View style={styles.tlDesc}>
            <RichText html={item.description} />
          </View>
        )}
      </View>
    </TimelineEntry>
  );
}

function EducationItem({ item }: { item: InstructorDetail['education'][0] }) {
  const startY = formatYear(item.startDate);
  const endY = formatYear(item.endDate);
  const yearRange = startY ? (endY ? `${startY} – ${endY}` : startY) : null;

  return (
    <TimelineEntry>
      <View style={styles.tlCard}>
        <Text style={styles.tlTitle}>{item.institution}</Text>
        <Text style={styles.tlOrg}>
          {item.degree}
          {item.field ? `, ${item.field}` : ''}
        </Text>
        {!!yearRange && <Text style={styles.tlMeta}>{yearRange}</Text>}
        {!!item.description && (
          <View style={styles.tlDesc}>
            <RichText html={item.description} />
          </View>
        )}
      </View>
    </TimelineEntry>
  );
}

function CertCard({ item }: { item: InstructorDetail['certifications'][0] }) {
  const issued = formatMonthYear(item.issueDate);
  const expires = formatMonthYear(item.expiryDate);
  return (
    <View style={styles.listCard}>
      <Certificate size={20} color="#2849EA" weight="duotone" />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.listCardTitle}>{item.name}</Text>
        <Text style={styles.listCardSub}>{item.issuer}</Text>
        {(issued || item.credentialId) && (
          <View style={styles.listCardMeta}>
            {!!issued && (
              <Text style={styles.listCardMetaText}>
                Issued {issued}
                {expires ? ` · Expires ${expires}` : ''}
              </Text>
            )}
            {!!item.credentialId && (
              <Text style={styles.listCardMetaText}>ID: {item.credentialId}</Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

function AwardCard({ item }: { item: InstructorDetail['awards'][0] }) {
  const year = formatYear(item.date);
  return (
    <View style={styles.listCard}>
      <Trophy size={20} color="#2849EA" weight="duotone" />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.listCardTitle}>{item.title}</Text>
        <Text style={styles.listCardSub}>
          {item.issuer}
          {year ? ` · ${year}` : ''}
        </Text>
        {!!item.description && <RichText html={item.description} />}
      </View>
    </View>
  );
}

function ServiceCard({ item }: { item: InstructorDetail['services'][0] }) {
  return (
    <View style={styles.serviceCard}>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={styles.serviceCardName}>{item.name}</Text>
        {!!item.description && <RichText html={item.description} />}
      </View>
      <View style={styles.servicePriceBadge}>
        <CurrencyInr size={13} color="#2849EA" weight="bold" />
        <Text style={styles.servicePriceText}>
          {item.price === 0 ? 'Free' : formatPrice(item.price)}
        </Text>
      </View>
    </View>
  );
}

// ─── screen ───────────────────────────────────────────────────────────────────

export default function InstructorScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['instructor-detail', id],
    queryFn: () => getInstructorDetail(id!),
    enabled: !!id,
  });

  const { data: coursesData } = useQuery({
    queryKey: ['instructor-courses', id],
    queryFn: () => getInstructorCourses(id!, { limit: 12, sortBy: 'popular' }),
    enabled: !!id,
  });

  const instructor = data?.instructor;
  const courses = coursesData?.items ?? [];

  if (isLoading || !id) {
    return (
      <View style={[styles.center, { backgroundColor: HERO_BG, paddingTop: insets.top }]}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  if (isError || !instructor) {
    return (
      <View style={[styles.center, { backgroundColor: HERO_BG, paddingTop: insets.top }]}>
        <Text style={styles.errText}>Instructor not found.</Text>
        <Pressable onPress={() => router.back()} style={styles.errBtn}>
          <Text style={styles.errBtnLabel}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const initials = instructor.fullName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();

  const fullStars = Math.floor(instructor.rating);
  const hasHalf = instructor.rating - fullStars >= 0.5;

  const hasExp = instructor.experience.length > 0;
  const hasEdu = instructor.education.length > 0;
  const hasCerts = instructor.certifications.length > 0;
  const hasAwards = instructor.awards.length > 0;
  const hasServices = instructor.services.length > 0;
  const hasCourses = courses.length > 0;

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 56 }}>

        {/* ══════════ HERO ══════════ */}
        <View style={[styles.hero, { paddingTop: insets.top + 6 }]}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
            <ArrowLeft size={22} color="#fff" weight="bold" />
          </Pressable>

          <View style={styles.avatarWrap}>
            {instructor.profilePicture ? (
              <Image
                source={{ uri: instructor.profilePicture }}
                style={styles.avatar}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
            {instructor.isVerified && (
              <View style={styles.verifiedBadge}>
                <SealCheck size={16} color="#fff" weight="fill" />
              </View>
            )}
          </View>

          <Text style={styles.heroName}>{instructor.fullName}</Text>

          {!!instructor.professionalTitle && (
            <Text style={styles.heroTitle}>{instructor.professionalTitle}</Text>
          )}

          {!!instructor.primaryCredibility && (
            <Text style={styles.heroCredibility}>{instructor.primaryCredibility}</Text>
          )}

          {instructor.rating > 0 && (
            <View style={styles.heroRatingRow}>
              <Text style={styles.heroRatingNum}>{instructor.rating.toFixed(1)}</Text>
              <View style={styles.heroStars}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={13}
                    color="#FFB800"
                    weight={
                      i < fullStars ? 'fill' : hasHalf && i === fullStars ? 'duotone' : 'regular'
                    }
                  />
                ))}
              </View>
              <Text style={styles.heroRatingLabel}>
                ({formatCount(instructor.totalReviews)} ratings)
              </Text>
            </View>
          )}

          <View style={styles.statsStrip}>
            <StatPill value={formatCount(instructor.totalStudents)} label="Students" />
            <View style={styles.statsDivider} />
            <StatPill value={String(instructor.totalCourses)} label="Courses" />
            {instructor.totalReviews > 0 && (
              <>
                <View style={styles.statsDivider} />
                <StatPill value={formatCount(instructor.totalReviews)} label="Reviews" />
              </>
            )}
          </View>

          {instructor.socialLinks.length > 0 && (
            <View style={styles.socialRow}>
              {instructor.socialLinks.map((link, i) => (
                <SocialBtn key={i} link={link} />
              ))}
            </View>
          )}
        </View>

        {/* ══════════ BODY ══════════ */}
        <View style={[styles.body, { backgroundColor: theme.background }]}>

          {/* About */}
          {!!instructor.bio && (
            <>
              <View style={styles.section}>
                <SectionHeading
                  icon={<Users size={18} color={theme.textSecondary} weight="regular" />}
                  title="About"
                  theme={theme}
                />
                <RichText html={instructor.bio} />
              </View>
              <View style={[styles.sep, { backgroundColor: theme.surfaceEl }]} />
            </>
          )}

          {/* Courses */}
          {hasCourses && (
            <>
              <View style={[styles.section, { paddingBottom: 4 }]}>
                <View style={styles.sectionHeadingWithAction}>
                  <SectionHeading
                    icon={<GraduationCap size={18} color={theme.textSecondary} weight="regular" />}
                    title="Courses"
                    theme={theme}
                  />
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: '/(student)/catalog',
                        params: {
                          instructorId: instructor.id,
                          title: `${instructor.fullName}'s Courses`,
                        },
                      } as never)
                    }
                    hitSlop={8}
                  >
                    <Text style={[styles.seeAllText, { color: theme.primary }]}>See all</Text>
                  </Pressable>
                </View>
              </View>
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
              <View style={{ height: 8 }} />
              <View style={[styles.sep, { backgroundColor: theme.surfaceEl }]} />
            </>
          )}

          {/* Experience */}
          {hasExp && (
            <>
              <View style={styles.section}>
                <SectionHeading
                  icon={<Briefcase size={18} color={theme.textSecondary} weight="regular" />}
                  title="Experience"
                  theme={theme}
                />
                <View style={styles.tlList}>
                  {instructor.experience.map((exp) => (
                    <ExperienceItem key={exp.id} item={exp} />
                  ))}
                </View>
              </View>
              <View style={[styles.sep, { backgroundColor: theme.surfaceEl }]} />
            </>
          )}

          {/* Education */}
          {hasEdu && (
            <>
              <View style={styles.section}>
                <SectionHeading
                  icon={<GraduationCap size={18} color={theme.textSecondary} weight="regular" />}
                  title="Education"
                  theme={theme}
                />
                <View style={styles.tlList}>
                  {instructor.education.map((edu) => (
                    <EducationItem key={edu.id} item={edu} />
                  ))}
                </View>
              </View>
              <View style={[styles.sep, { backgroundColor: theme.surfaceEl }]} />
            </>
          )}

          {/* Certifications */}
          {hasCerts && (
            <>
              <View style={styles.section}>
                <SectionHeading
                  icon={<Certificate size={18} color={theme.textSecondary} weight="regular" />}
                  title="Certifications"
                  theme={theme}
                />
                <View style={styles.listCardGroup}>
                  {instructor.certifications.map((cert) => (
                    <CertCard key={cert.id} item={cert} />
                  ))}
                </View>
              </View>
              {(hasAwards || hasServices) && (
                <View style={[styles.sep, { backgroundColor: theme.surfaceEl }]} />
              )}
            </>
          )}

          {/* Awards */}
          {hasAwards && (
            <>
              <View style={styles.section}>
                <SectionHeading
                  icon={<Trophy size={18} color={theme.textSecondary} weight="regular" />}
                  title="Awards & Honors"
                  theme={theme}
                />
                <View style={styles.listCardGroup}>
                  {instructor.awards.map((award) => (
                    <AwardCard key={award.id} item={award} />
                  ))}
                </View>
              </View>
              {hasServices && (
                <View style={[styles.sep, { backgroundColor: theme.surfaceEl }]} />
              )}
            </>
          )}

          {/* Services */}
          {hasServices && (
            <View style={styles.section}>
              <SectionHeading
                icon={<CurrencyInr size={18} color={theme.textSecondary} weight="regular" />}
                title="Services"
                theme={theme}
              />
              <View style={styles.serviceList}>
                {instructor.services.map((svc) => (
                  <ServiceCard key={svc.id} item={svc} />
                ))}
              </View>
            </View>
          )}

        </View>
      </ScrollView>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────


const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },

  errText: { color: '#fff', fontSize: 16, fontFamily: Fonts.regular },
  errBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    borderRadius: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  errBtnLabel: { color: '#fff', fontSize: 14, fontFamily: Fonts.semiBold },

  /* ── Hero ── */
  hero: {
    backgroundColor: HERO_BG,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 30,
    gap: 12,
  },
  backBtn: { alignSelf: 'flex-start', padding: 4, marginBottom: 2 },

  avatarWrap: { position: 'relative', marginTop: 4 },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarPlaceholder: {
    backgroundColor: '#2849EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: { color: '#fff', fontSize: 34, fontFamily: Fonts.extraBold },
  verifiedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2849EA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: HERO_BG,
  },

  heroName: {
    color: '#fff',
    fontSize: 22,
    fontFamily: Fonts.extraBold,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  heroTitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
    fontFamily: Fonts.medium,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: -4,
  },
  heroCredibility: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: -4,
  },
  heroRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroRatingNum: { color: '#FFB800', fontSize: 14, fontFamily: Fonts.bold },
  heroStars: { flexDirection: 'row', gap: 1 },
  heroRatingLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontFamily: Fonts.regular,
  },

  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 14,
    paddingHorizontal: 8,
    width: '100%',
  },
  statPill: { flex: 1, alignItems: 'center', gap: 3 },
  statValue: { color: '#fff', fontSize: 17, fontFamily: Fonts.extraBold, letterSpacing: -0.3 },
  statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: Fonts.regular },
  statsDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.1)' },

  socialRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  socialBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },

  /* ── Body ── */
  body: {},
  sep: { height: 8 },
  section: { paddingHorizontal: 20, paddingVertical: 22, gap: 16 },

  sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionHeadingText: { fontSize: 17, fontFamily: Fonts.extraBold, letterSpacing: -0.2 },
  sectionHeadingWithAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seeAllText: { fontSize: 13, fontFamily: Fonts.semiBold },

  carousel: { paddingHorizontal: 20, paddingVertical: 4 },

  /* ── Timeline entries ── */
  tlList: { gap: 14 },
  tlCard: { gap: 4 },
  tlTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  tlTitle: { fontSize: 15, fontFamily: Fonts.bold, color: '#1C1D1F', lineHeight: 21, flex: 1 },
  tlOrg: { fontSize: 13, fontFamily: Fonts.semiBold, color: '#444' },
  tlMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  tlMeta: { fontSize: 12, fontFamily: Fonts.regular, color: '#888' },
  tlMetaDot: { color: '#ccc', fontSize: 12 },
  tlDesc: { marginTop: 6 },

  currentBadge: {
    backgroundColor: '#EEF1FD',
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  currentBadgeText: { fontSize: 10, fontFamily: Fonts.bold, color: '#2849EA' },

  /* ── List cards (certs, awards) ── */
  listCardGroup: { gap: 10 },
  listCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#F7F9FA',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8ECEF',
  },
  listCardTitle: { fontSize: 14, fontFamily: Fonts.bold, color: '#1C1D1F', lineHeight: 20 },
  listCardSub: { fontSize: 13, fontFamily: Fonts.medium, color: '#555' },
  listCardMeta: { gap: 1, marginTop: 2 },
  listCardMetaText: { fontSize: 11, fontFamily: Fonts.regular, color: '#888' },

  /* ── Services ── */
  serviceList: { gap: 10 },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: '#F7F9FA',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8ECEF',
  },
  serviceCardName: { fontSize: 14, fontFamily: Fonts.bold, color: '#1C1D1F', lineHeight: 20 },
  serviceCardDesc: { fontSize: 13, fontFamily: Fonts.regular, color: '#666', lineHeight: 19 },
  servicePriceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    backgroundColor: '#EEF1FD',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexShrink: 0,
  },
  servicePriceText: { fontSize: 13, fontFamily: Fonts.bold, color: '#2849EA' },
});
