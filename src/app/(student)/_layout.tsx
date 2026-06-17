import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { House, MagnifyingGlass, Books, UserCircle } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';

type TabIconProps = { focused: boolean; color: string };

function HomeIcon({ focused, color }: TabIconProps) {
  return <House size={24} color={color} weight={focused ? 'fill' : 'regular'} />;
}
function SearchIcon({ focused, color }: TabIconProps) {
  return <MagnifyingGlass size={24} color={color} weight={focused ? 'bold' : 'regular'} />;
}
function LearningIcon({ focused, color }: TabIconProps) {
  return <Books size={24} color={color} weight={focused ? 'fill' : 'regular'} />;
}
function ProfileIcon({ focused, color }: TabIconProps) {
  return <UserCircle size={24} color={color} weight={focused ? 'fill' : 'regular'} />;
}

const TAB_CONTENT_HEIGHT = 56;

export default function StudentLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // Add bottom inset so the tab bar clears the phone's gesture nav bar / home indicator
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
          title: 'Home',
          tabBarIcon: ({ focused, color }) => <HomeIcon focused={focused} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ focused, color }) => <SearchIcon focused={focused} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="my-learning"
        options={{
          title: 'My Learning',
          tabBarIcon: ({ focused, color }) => <LearningIcon focused={focused} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Account',
          tabBarIcon: ({ focused, color }) => <ProfileIcon focused={focused} color={color as string} />,
        }}
      />
      {/* Sub-screens — hidden from the tab bar */}
      <Tabs.Screen name="appearance-settings" options={{ href: null }} />
      <Tabs.Screen name="edit-profile" options={{ href: null }} />
      <Tabs.Screen name="change-password" options={{ href: null }} />
      <Tabs.Screen name="notification-settings" options={{ href: null }} />
      <Tabs.Screen name="certificates" options={{ href: null }} />
      <Tabs.Screen name="purchase-history" options={{ href: null }} />
      <Tabs.Screen name="wishlist" options={{ href: null }} />
      <Tabs.Screen name="catalog" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({});
