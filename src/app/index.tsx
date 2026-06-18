import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/lib/auth/context';
import { useTheme } from '@/hooks/use-theme';

export default function RootIndex() {
  const { state } = useAuth();
  const theme = useTheme();

  if (state.status === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (state.status === 'authenticated') {
    if (state.user.role === 'TUTOR') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return <Redirect href={'/(tutor)' as any} />;
    }
    return <Redirect href="/(student)" />;
  }

  return <Redirect href="/(auth)/role-select" />;
}
