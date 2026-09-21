import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../lib/authContext';

export default function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (!isLoading && isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="two-factor" />
    </Stack>
  );
}
