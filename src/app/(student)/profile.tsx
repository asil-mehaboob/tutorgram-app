import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  PencilSimple,
  Lock,
  Bell,
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
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/lib/auth/context';

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
      <View style={[
        styles.menuIconWrap,
        { backgroundColor: destructive ? '#FEF2F2' : theme.primaryLight },
      ]}>
        <Icon size={16} color={destructive ? theme.error : theme.primary} weight="regular" />
      </View>
      <View style={styles.menuTextBlock}>
        <Text style={[styles.menuLabel, { color: destructive ? theme.error : theme.text }]}>
          {label}
        </Text>
        {subtitle && (
          <Text style={[styles.menuSub, { color: theme.textSecondary }]}>{subtitle}</Text>
        )}
      </View>
      {!destructive && (
        <CaretRight size={15} color={theme.border} weight="bold" />
      )}
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

const STATS = [
  { icon: Books, label: 'Enrolled', value: '12', color: '#4052e6' },
  { icon: CheckCircle, label: 'Completed', value: '4', color: '#1E6B1E' },
  { icon: Trophy, label: 'Certificates', value: '2', color: '#E59819' },
  { icon: Clock, label: 'Hours', value: '38', color: '#DB2777' },
];

export default function ProfileScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { state, logout } = useAuth();
  const user = state.status === 'authenticated' ? state.user : null;

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
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

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        {/* ─── Header strip ──────────────────────────── */}
        <View style={[styles.headerStrip, { paddingTop: insets.top + 14, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Account</Text>
        </View>

        {/* ─── Profile card ──────────────────────────── */}
        <View style={[styles.profileCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Avatar */}
          <View style={[styles.avatarCircle, { backgroundColor: theme.primary }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          <View style={styles.profileInfo}>
            <Text style={[styles.userName, { color: theme.text }]}>{user?.name ?? 'Student'}</Text>
            <Text style={[styles.userEmail, { color: theme.textSecondary }]}>{user?.email ?? ''}</Text>
            <View style={[styles.roleBadge, { backgroundColor: theme.primaryLight }]}>
              <Text style={[styles.roleText, { color: theme.primary }]}>Student</Text>
            </View>
          </View>

          <Pressable style={[styles.editBtn, { borderColor: theme.border }]} hitSlop={8}>
            <PencilSimple size={16} color={theme.text} weight="regular" />
            <Text style={[styles.editBtnText, { color: theme.text }]}>Edit</Text>
          </Pressable>
        </View>

        {/* ─── Stats ─────────────────────────────────── */}
        <View style={[styles.statsRow, { borderTopColor: theme.border, borderBottomColor: theme.border }]}>
          {STATS.map((s, i) => (
            <View
              key={s.label}
              style={[
                styles.statItem,
                i < STATS.length - 1 && { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: theme.border },
              ]}
            >
              <s.icon size={18} color={s.color} weight="fill" />
              <Text style={[styles.statValue, { color: theme.text }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ─── Menu ──────────────────────────────────── */}
        <View style={styles.menuSections}>
          <MenuGroup title="ACCOUNT" theme={theme}>
            <MenuItem icon={PencilSimple} label="Edit Profile" subtitle="Name, photo, bio" onPress={() => {}} />
            <MenuItem icon={Lock} label="Change Password" onPress={() => {}} />
            <MenuItem icon={Bell} label="Notifications" onPress={() => {}} isLast />
          </MenuGroup>

          <MenuGroup title="LEARNING" theme={theme}>
            <MenuItem icon={Certificate} label="My Certificates" onPress={() => {}} />
            <MenuItem icon={Receipt} label="Purchase History" onPress={() => {}} />
            <MenuItem icon={Heart} label="Wishlist" onPress={() => {}} isLast />
          </MenuGroup>

          <MenuGroup title="SUPPORT" theme={theme}>
            <MenuItem icon={Question} label="Help Centre" onPress={() => {}} />
            <MenuItem icon={Shield} label="Privacy Policy" onPress={() => {}} />
            <MenuItem icon={FileText} label="Terms of Service" onPress={() => {}} isLast />
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

  /* Header */
  headerStrip: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: Fonts.extraBold,
    letterSpacing: -0.5,
  },

  /* Profile card */
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  avatarText: {
    color: '#fff',
    fontSize: 22,
    fontFamily: Fonts.extraBold,
  },
  profileInfo: { flex: 1, gap: 3 },
  userName: {
    fontSize: 17,
    fontFamily: Fonts.extraBold,
    letterSpacing: -0.3,
  },
  userEmail: {
    fontSize: 12,
    fontFamily: Fonts.regular,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 99,
    marginTop: 2,
  },
  roleText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    letterSpacing: 0.2,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  editBtnText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
  },

  /* Stats */
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statItem: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontFamily: Fonts.extraBold,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: Fonts.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  /* Menu */
  menuSections: {
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 24,
  },
  menuGroup: { gap: 8 },
  menuGroupTitle: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },
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
    gap: 12,
  },
  menuIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTextBlock: { flex: 1, gap: 1 },
  menuLabel: {
    fontSize: 15,
    fontFamily: Fonts.medium,
    letterSpacing: -0.1,
  },
  menuSub: {
    fontSize: 12,
    fontFamily: Fonts.regular,
  },

  /* Version */
  version: {
    textAlign: 'center',
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 32,
  },
});
