import { Stack } from 'expo-router';
import { colors } from '../../../../constants/theme';

export default function TeamLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bgBottom },
        headerTintColor: colors.textInverse,
        headerTitleStyle: { color: colors.textInverse },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Team' }} />
      <Stack.Screen name="invite" options={{ title: 'Invite teammate' }} />
    </Stack>
  );
}
