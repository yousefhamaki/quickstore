import { Stack } from 'expo-router';
import { colors } from '../../../../constants/theme';

export default function CouponsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bgBottom },
        headerTintColor: colors.textInverse,
        headerTitleStyle: { color: colors.textInverse },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Coupons' }} />
      <Stack.Screen name="create" options={{ title: 'New coupon' }} />
      <Stack.Screen name="[id]" options={{ title: 'Edit coupon' }} />
    </Stack>
  );
}
