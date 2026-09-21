import { Stack } from 'expo-router';
import { colors } from '../../../constants/theme';

export default function ProductsLayout() {
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
      <Stack.Screen name="create" options={{ title: 'New product' }} />
      <Stack.Screen name="[id]" options={{ title: 'Edit product' }} />
    </Stack>
  );
}
