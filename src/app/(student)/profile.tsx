import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  PencilSimple,
  Lock,
  Bell,
  CircleHalf,
  Certificate,
  Receipt,
  Heart,
  Question,
  Shield,
  FileText,
  SignOut,
  CaretRight,
  Books,
  CheckCircle,
  Trophy,
  Clock,
} from 'phosphor-react-native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/lib/auth/context';
import { getMyLearning } from '@/lib/api/enrollment';

type PhosphorIcon = typeof PencilSimple;

type MenuItemProps = {
  icon: PhosphorIcon;
  label: string;
  subtitle?: string;
  onPress: () => void;
  destructive?: boolean;
  isLast?: boolean;
};

function MenuItem({ icon: Icon, label, subtitle, onPress, destructive, isLast }: MenuItemProps) {
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
        <Text style={[styles.menuLabel, { color: destructive ? theme.error : theme.text }]}>
          {label}
        </Text>
        {subtitle && (
          <Text style={[styles.menuSub, { color: theme.textSecondary }]}>{subtitle}</Text>
        )}
      </View>
      {!destructive && <CaretRight size={14} color={theme.border} weight="bold" />}
    </Pressable>
  );
}

function MenuGroup({ title, children, theme }: { title: string; children: React.ReactNode; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={styles.menuGroup}>
      <Text style={[styles.menuGroupTitle, { color: theme.textSecondary }]}>{title}</Text>
      <View style={[styles.menuGroupCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {children}
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { state, logout } = useAuth();
  const user = state.status === 'authenticated' ? state.user : null;

  const { data: learningData } = useQuery({
    queryKey: ['my-learning'],
    queryFn: () => getMyLearning({ limit: 200 }),
    enabled: state.status === 'authenticated',
  });

  const courses = learningData?.items ?? [];
  const enrolledCount = courses.length;
  const completedCount = courses.filter(c => c.completedAt != null).length;

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  function handleLogout() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  const STATS = [
    { icon: Books, label: 'Enrolled', value: String(enrolledCount) },
    { icon: CheckCircle, label: 'Completed', value: String(completedCount) },
    { icon: Trophy, label: 'Certificates', value: String(completedCount) },
    { icon: Clock, label: 'Hours', value: '—' },
  ];

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        {/* ─── Header ────────────────────────────────── */}
        <View style={[styles.headerStrip, { paddingTop: insets.top + 14, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Account</Text>
        </View>

        {/* ─── Profile card ──────────────────────────── */}
        <View style={[styles.profileCard, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <View style={[styles.avatarCircle, { backgroundColor: theme.primary }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.userName, { color: theme.text }]}>{user?.name ?? 'Student'}</Text>
            <Text style={[styles.userEmail, { color: theme.textSecondary }]}>{user?.email ?? ''}</Text>
          </View>
          <Pressable
            style={[styles.editBtn, { borderColor: theme.border }]}
            onPress={() => router.push('/(student)/edit-profile')}
            hitSlop={8}
          >
            <PencilSimple size={15} color={theme.text} weight="regular" />
            <Text style={[styles.editBtnText, { color: theme.text }]}>Edit</Text>
          </Pressable>
        </View>

        {/* ─── Stats ─────────────────────────────────── */}
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

        {/* ─── Menu ──────────────────────────────────── */}
        <View style={styles.menuSections}>
          <MenuGroup title="ACCOUNT" theme={theme}>
            <MenuItem
              icon={PencilSimple}
              label="Edit Profile"
              subtitle="Name, bio, phone number"
              onPress={() => router.push('/(student)/edit-profile')}
            />
            <MenuItem
              icon={Lock}
              label="Change Password"
              onPress={() => router.push('/(student)/change-password')}
            />
            <MenuItem
              icon={Bell}
              label="Notifications"
              onPress={() => router.push('/(student)/notification-settings')}
            />
            <MenuItem
              icon={CircleHalf}
              label="Appearance"
              subtitle="Light, dark, or system"
              onPress={() => router.push('/(student)/appearance-settings')}
              isLast
            />
          </MenuGroup>

          <MenuGroup title="LEARNING" theme={theme}>
            <MenuItem
              icon={Certificate}
              label="My Certificates"
              onPress={() => router.push('/(student)/certificates')}
            />
            <MenuItem
              icon={Receipt}
              label="Purchase History"
              onPress={() => router.push('/(student)/purchase-history')}
            />
            <MenuItem
              icon={Heart}
              label="Wishlist"
              onPress={() => router.push('/(student)/wishlist')}
              isLast
            />
          </MenuGroup>

          <MenuGroup title="SUPPORT" theme={theme}>
            <MenuItem
              icon={Question}
              label="Help Centre"
              onPress={() => Linking.openURL('https://tutorgram.app/help')}
            />
            <MenuItem
              icon={Shield}
              label="Privacy Policy"
              onPress={() => Linking.openURL('https://tutorgram.app/privacy')}
            />
            <MenuItem
              icon={FileText}
              label="Terms of Service"
              onPress={() => Linking.openURL('https://tutorgram.app/terms')}
              isLast
            />
          </MenuGroup>

          <View style={[styles.menuGroupCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <MenuItem icon={SignOut} label="Sign Out" onPress={handleLogout} destructive isLast />
          </View>
        </View>

        <Text style={[styles.version, { color: theme.border }]}>Tutorgram v1.0.0</Text>
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
  version: { textAlign: 'center', fontSize: 12, fontFamily: Fonts.regular, marginTop: 32 },
});
