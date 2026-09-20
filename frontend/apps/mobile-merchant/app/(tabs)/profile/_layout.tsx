import { Stack } from 'expo-router';
import { colors } from '../../../constants/theme';

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bgBottom },
        headerTintColor: colors.textInverse,
        headerTitleStyle: { color: colors.textInverse },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="analytics" options={{ title: 'Analytics' }} />
      <Stack.Screen name="store-settings" options={{ title: 'Store settings' }} />
    </Stack>
  );
}
