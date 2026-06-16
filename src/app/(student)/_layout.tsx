import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { House, Books, UserCircle } from 'phosphor-react-native';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';

type TabIconProps = { focused: boolean; color: string };

function HomeIcon({ focused, color }: TabIconProps) {
  return <House size={24} color={color} weight={focused ? 'fill' : 'regular'} />;
}

function LearningIcon({ focused, color }: TabIconProps) {
  return <Books size={24} color={color} weight={focused ? 'fill' : 'regular'} />;
}

function ProfileIcon({ focused, color }: TabIconProps) {
  return <UserCircle size={24} color={color} weight={focused ? 'fill' : 'regular'} />;
}

export default function StudentLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: Platform.OS === 'android' ? 64 : 80,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'android' ? 10 : 0,
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
    </Tabs>
  );
}

const styles = StyleSheet.create({});
