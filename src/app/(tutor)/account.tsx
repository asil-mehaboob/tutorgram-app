import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import {
  PencilSimple, Briefcase, GraduationCap, Certificate, Trophy, Wrench, LinkSimple,
  Gear, Lock, Bell, CreditCard, ShieldCheck, Crown, ArrowUpRight,
  Question, FileText, SignOut, CaretRight,
  BookOpen, Student, Star,
} from 'phosphor-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth/context';
import { Fonts } from '@/constants/theme';
import { getTutorProfile } from '@/lib/api/tutor-profile-api';
import { getUserPlan } from '@/lib/api/tutor-subscription';
import { getDashboardOverview } from '@/lib/api/tutor-dashboard';

type PhosphorIcon = typeof PencilSimple;

type MenuItemProps = {
  icon: PhosphorIcon;
  label: string;
  subtitle?: string;
  onPress: () => void;
  destructive?: boolean;
  isLast?: boolean;
  badge?: string;
};

function MenuItem({ icon: Icon, label, subtitle, onPress, destructive, isLast, badge }: MenuItemProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
        { backgroundColor: pressed ? theme.surfaceEl : 'transparent' },
      ]}
    >
      <Icon size={18} color={destructive ? theme.error : theme.textSecondary} weight="regular" />
      <View style={styles.menuTextBlock}>
        <Text style={[styles.menuLabel, { color: destructive ? theme.error : theme.text }]}>{label}</Text>
        {subtitle && <Text style={[styles.menuSub, { color: theme.textSecondary }]}>{subtitle}</Text>}
      </View>
      {badge && (
        <View style={[styles.badge, { backgroundColor: theme.primaryLight }]}>
          <Text style={[styles.badgeText, { color: theme.primary }]}>{badge}</Text>
        </View>
      )}
      {!destructive && <CaretRight size={14} color={theme.border} weight="bold" />}
    </Pressable>
  );
}

function MenuGroup({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.menuGroup}>
      <Text style={[styles.menuGroupTitle, { color: theme.textSecondary }]}>{title}</Text>
      <View style={[styles.menuGroupCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {children}
      </View>
    </View>
  );
}

export default function TutorAccount() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { state, logout } = useAuth();
  const user = state.status === 'authenticated' ? state.user : null;

  const profileQ = useQuery({ queryKey: ['tutor-profile'], queryFn: getTutorProfile, staleTime: 5 * 60_000 });
  const planQ = useQuery({ queryKey: ['tutor-plan'], queryFn: getUserPlan, staleTime: 5 * 60_000 });
  const dashQ = useQuery({ queryKey: ['tutor-dashboard'], queryFn: getDashboardOverview, staleTime: 5 * 60_000 });

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'T';

  const planName = planQ.data?.planName ?? (planQ.data?.isPaid ? 'Pro' : 'Free');
  const s = dashQ.data?.stats;
  const coursesCount = s?.coursesCreated ?? s?.totalCourses ?? 0;
  const studentsCount = s?.studentsEnrolled ?? s?.totalStudents ?? 0;
  const earnings = s?.totalEarnings ?? 0;

  const STATS = [
    { icon: BookOpen, label: 'Courses', value: String(coursesCount) },
    { icon: Student, label: 'Students', value: String(studentsCount) },
    { icon: Star, label: 'Rating', value: profileQ.data?.rating ? profileQ.data.rating.toFixed(1) : '—' },
    { icon: Crown, label: 'Plan', value: planName },
  ];

  function handleLogout() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/role-select');
        },
      },
    ]);
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        {/* Header */}
        <View style={[styles.headerStrip, { paddingTop: insets.top + 14, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Account</Text>
        </View>

        {/* Profile card */}
        <View style={[styles.profileCard, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <View style={[styles.avatarCircle, { backgroundColor: theme.primary }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.userName, { color: theme.text }]}>
              {profileQ.data?.fullName ?? user?.name ?? 'Tutor'}
            </Text>
            <Text style={[styles.userEmail, { color: theme.textSecondary }]}>
              {profileQ.data?.professionalTitle ?? user?.email ?? ''}
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.editBtn, { borderColor: theme.border, backgroundColor: pressed ? theme.surfaceEl : 'transparent' }]}
            onPress={() => router.push('/(tutor)/profile-edit')}
            hitSlop={8}
          >
            <PencilSimple size={15} color={theme.text} weight="regular" />
            <Text style={[styles.editBtnText, { color: theme.text }]}>Edit</Text>
          </Pressable>
        </View>

        {/* Stats row */}
        <View style={[styles.statsRow, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
          {STATS.map((s, i) => (
            <View
              key={s.label}
              style={[
                styles.statItem,
                i < STATS.length - 1 && { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: theme.border },
              ]}
            >
              <s.icon size={18} color={theme.primary} weight="regular" />
              <Text style={[styles.statValue, { color: theme.text }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Menu */}
        <View style={styles.menuSections}>
          <MenuGroup title="PROFILE">
            <MenuItem icon={PencilSimple} label="Edit Profile" subtitle="Name, title, bio" onPress={() => router.push('/(tutor)/profile-edit')} />
            <MenuItem icon={Briefcase} label="Experience" onPress={() => router.push('/(tutor)/profile-experience')} />
            <MenuItem icon={GraduationCap} label="Education" onPress={() => router.push('/(tutor)/profile-education')} />
            <MenuItem icon={Certificate} label="Certifications" onPress={() => router.push('/(tutor)/profile-certifications')} />
            <MenuItem icon={Trophy} label="Awards & Honors" onPress={() => router.push('/(tutor)/profile-awards')} />
            <MenuItem icon={Wrench} label="Services" onPress={() => router.push('/(tutor)/profile-services')} />
            <MenuItem icon={LinkSimple} label="Social Links" onPress={() => router.push('/(tutor)/profile-social-links')} isLast />
          </MenuGroup>

          <MenuGroup title="SETTINGS">
            <MenuItem icon={Gear} label="Account Settings" onPress={() => router.push('/(tutor)/settings-account')} />
            <MenuItem icon={Lock} label="Change Password" onPress={() => router.push('/(tutor)/settings-password')} />
            <MenuItem icon={Bell} label="Notifications" onPress={() => router.push('/(tutor)/settings-notifications')} />
            <MenuItem icon={CreditCard} label="Payment Settings" onPress={() => router.push('/(tutor)/settings-payment')} />
            <MenuItem icon={ShieldCheck} label="Privacy" onPress={() => router.push('/(tutor)/settings-privacy')} isLast />
          </MenuGroup>

          <MenuGroup title="SUBSCRIPTION">
            <MenuItem
              icon={Crown}
              label="My Plan"
              subtitle={planName}
              badge={planQ.data?.isPaid ? undefined : 'Free'}
              onPress={() => router.push('/(tutor)/subscription')}
            />
            {!planQ.data?.isPaid && (
              <MenuItem icon={ArrowUpRight} label="Upgrade to Pro" subtitle="Unlock unlimited courses & analytics" onPress={() => router.push('/(tutor)/subscription')} isLast />
            )}
            {planQ.data?.isPaid && (
              <MenuItem icon={ArrowUpRight} label="Manage Subscription" onPress={() => router.push('/(tutor)/subscription')} isLast />
            )}
          </MenuGroup>

          <MenuGroup title="SUPPORT">
            <MenuItem icon={Question} label="Help Centre" onPress={() => Linking.openURL('https://tutorgram.com/help')} />
            <MenuItem icon={ShieldCheck} label="Privacy Policy" onPress={() => Linking.openURL('https://tutorgram.com/privacy-policy')} />
            <MenuItem icon={FileText} label="Terms of Service" onPress={() => Linking.openURL('https://tutorgram.com/terms')} isLast />
          </MenuGroup>

          <View style={[styles.menuGroupCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <MenuItem icon={SignOut} label="Sign Out" onPress={handleLogout} destructive isLast />
          </View>
        </View>

        <Text style={[styles.version, { color: theme.border }]}>Tutorgram Tutor v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerStrip: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 26, fontFamily: Fonts.extraBold, letterSpacing: -0.5 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  avatarText: { color: '#fff', fontSize: 20, fontFamily: Fonts.extraBold },
  profileInfo: { flex: 1, gap: 3 },
  userName: { fontSize: 16, fontFamily: Fonts.extraBold, letterSpacing: -0.3 },
  userEmail: { fontSize: 12, fontFamily: Fonts.regular },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  editBtnText: { fontSize: 13, fontFamily: Fonts.semiBold },
  statsRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statItem: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 4,
  },
  statValue: { fontSize: 18, fontFamily: Fonts.extraBold, letterSpacing: -0.3 },
  statLabel: { fontSize: 10, fontFamily: Fonts.medium, textTransform: 'uppercase', letterSpacing: 0.3 },
  menuSections: { paddingHorizontal: 16, paddingTop: 24, gap: 24 },
  menuGroup: { gap: 8 },
  menuGroupTitle: { fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 0.8, paddingHorizontal: 4 },
  menuGroupCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  menuTextBlock: { flex: 1, gap: 1 },
  menuLabel: { fontSize: 15, fontFamily: Fonts.medium, letterSpacing: -0.1 },
  menuSub: { fontSize: 12, fontFamily: Fonts.regular },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 11, fontFamily: Fonts.semiBold },
  version: { textAlign: 'center', fontSize: 12, fontFamily: Fonts.regular, marginTop: 32 },
});
