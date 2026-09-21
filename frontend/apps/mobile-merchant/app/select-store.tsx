import React from 'react';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GradientHeader } from '../components/GradientHeader';
import { Card } from '../components/Card';
import { PressableScale } from '../components/PressableScale';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { colors, motion, radius, spacing, typography } from '../constants/theme';
import { useStore } from '../lib/storeContext';
import { Store } from '../lib/types';

/**
 * Reached two ways: (1) forced, right after login, when the merchant owns
 * more than one store and hasn't picked one yet on this device (see
 * app/(tabs)/_layout.tsx's `needsSelection` redirect) — there's nothing to
 * go back to there, so no close button; (2) voluntarily, via the store
 * switcher on Home's header or the "Switch store" row in Profile — there
 * `router.canGoBack()` is true, so a close button is shown.
 */
export default function SelectStoreScreen() {
  const router = useRouter();
  const { stores, storeId, initialized, selectStore } = useStore();
  const canGoBack = router.canGoBack();

  const handleSelect = (store: Store) => {
    selectStore(store);
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.screen}>
      <GradientHeader
        title="Choose a store"
        subtitle={stores.length > 0 ? "You're managing more than one store — pick one." : undefined}
        right={
          canGoBack ? (
            <PressableScale onPress={() => router.back()}>
              <View style={styles.closeButton}>
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </View>
            </PressableScale>
          ) : undefined
        }
      />

      {!initialized ? (
        <LoadingState label="Loading your stores…" />
      ) : stores.length === 0 ? (
        <EmptyState
          icon="storefront-outline"
          title="No stores found"
          message="You don't have a storefront yet. Create your first one from the Buildora web dashboard to start selling."
        />
      ) : (
        <FlatList
          data={stores}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => {
            const isActive = item._id === storeId;
            return (
              <PressableScale onPress={() => handleSelect(item)}>
                <Card style={[styles.storeCard, isActive && styles.storeCardActive]} delay={Math.min(index, 6) * motion.stagger}>
                  <View style={styles.row}>
                    <View style={styles.logoWrap}>
                      {item.logo?.url ? (
                        <Image source={{ uri: item.logo.url }} style={styles.logo} />
                      ) : (
                        <Ionicons name="storefront" size={22} color={colors.primary} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.storeName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.storeDomain} numberOfLines={1}>
                        {item.domain?.subdomain ? `${item.domain.subdomain}.quickstore.live` : item.slug}
                      </Text>
                    </View>
                    <StatusBadge status={item.status} />
                  </View>

                  {item.stats ? (
                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Ionicons name="cube-outline" size={13} color={colors.textMuted} />
                        <Text style={styles.statText}>{item.stats.totalProducts} products</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Ionicons name="receipt-outline" size={13} color={colors.textMuted} />
                        <Text style={styles.statText}>{item.stats.totalOrders} orders</Text>
                      </View>
                    </View>
                  ) : null}

                  {isActive ? (
                    <View style={styles.activeRow}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                      <Text style={styles.activeText}>Currently active</Text>
                    </View>
                  ) : null}
                </Card>
              </PressableScale>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: spacing.md,
    paddingTop: 0,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  storeCard: {
    marginBottom: spacing.sm,
  },
  storeCardActive: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: 44,
    height: 44,
  },
  storeName: {
    ...typography.bodyBold,
    fontSize: 16,
    color: colors.text,
  },
  storeDomain: {
    ...typography.body,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'none',
    fontWeight: '500',
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
  },
  activeText: {
    ...typography.caption,
    color: colors.success,
    textTransform: 'none',
    fontWeight: '700',
  },
});
