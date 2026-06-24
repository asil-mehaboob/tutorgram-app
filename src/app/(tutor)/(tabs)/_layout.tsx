import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SquaresFour, BookOpen, ChatCircle, TrendUp, UserCircle } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';

type TabIconProps = { focused: boolean; color: string };

function DashboardIcon({ focused, color }: TabIconProps) {
  return <SquaresFour size={24} color={color} weight={focused ? 'fill' : 'regular'} />;
}
function CoursesIcon({ focused, color }: TabIconProps) {
  return <BookOpen size={24} color={color} weight={focused ? 'fill' : 'regular'} />;
}
function CommsIcon({ focused, color }: TabIconProps) {
  return <ChatCircle size={24} color={color} weight={focused ? 'fill' : 'regular'} />;
}
function PerformanceIcon({ focused, color }: TabIconProps) {
  return <TrendUp size={24} color={color} weight={focused ? 'bold' : 'regular'} />;
}
function AccountIcon({ focused, color }: TabIconProps) {
  return <UserCircle size={24} color={color} weight={focused ? 'fill' : 'regular'} />;
}

const TAB_CONTENT_HEIGHT = 56;

export default function TutorTabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = TAB_CONTENT_HEIGHT + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: tabBarHeight,
          paddingTop: 8,
          paddingBottom: insets.bottom,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -1 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontFamily: Fonts.semiBold,
          fontSize: 10,
          letterSpacing: 0.1,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused, color }) => <DashboardIcon focused={focused} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="courses"
        options={{
          title: 'Courses',
          tabBarIcon: ({ focused, color }) => <CoursesIcon focused={focused} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="communications"
        options={{
          title: 'Inbox',
          tabBarIcon: ({ focused, color }) => <CommsIcon focused={focused} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="performance"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ focused, color }) => <PerformanceIcon focused={focused} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ focused, color }) => <AccountIcon focused={focused} color={color as string} />,
        }}
      />
    </Tabs>
  );
}
