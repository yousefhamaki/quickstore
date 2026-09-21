import React, { useCallback, useState } from 'react';
import { FlatList, Image, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { GradientHeader } from '../../../components/GradientHeader';
import { Card } from '../../../components/Card';
import { PressableScale } from '../../../components/PressableScale';
import { StatusBadge } from '../../../components/StatusBadge';
import { LoadingState } from '../../../components/LoadingState';
import { EmptyState, ErrorState } from '../../../components/EmptyState';
import { colors, formatEGP, layout, motion, radius, spacing, typography } from '../../../constants/theme';
import { getProducts } from '../../../lib/services/products';
import { useStore } from '../../../lib/storeContext';
import { Product, ProductStatus } from '../../../lib/types';

const STATUS_FILTERS: { label: string; value: ProductStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Draft', value: 'draft' },
  { label: 'Archived', value: 'archived' },
];

const STOCK_FILTERS: { label: string; value: 'low' | 'out' | undefined }[] = [
  { label: 'Low stock', value: 'low' },
  { label: 'Out of stock', value: 'out' },
];

export default function ProductsListScreen() {
  const router = useRouter();
  const { storeId } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductStatus | 'all'>('all');
  const [stockFilter, setStockFilter] = useState<'low' | 'out' | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (pageNumber: number, append: boolean) => {
      setError(null);
      try {
        const data = await getProducts({
          page: pageNumber,
          limit: 20,
          status: statusFilter === 'all' ? undefined : statusFilter,
          stockLevel: stockFilter,
          search: search.trim() || undefined,
        });
        setProducts((prev) => (append ? [...prev, ...data.products] : data.products));
        setPage(data.pagination.page);
        setPages(data.pagination.pages);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load products.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [statusFilter, stockFilter, search]
  );

  useFocusEffect(
    // `storeId` re-triggers this the instant the merchant switches their
    // active store, even if this screen was already focused when they did.
    useCallback(() => {
      setLoading(true);
      load(1, false);
    }, [load, storeId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load(1, false);
  };

  const loadMore = () => {
    if (loadingMore || page >= pages) return;
    setLoadingMore(true);
    load(page + 1, true);
  };

  return (
    <View style={styles.screen}>
      <GradientHeader
        title="Products"
        right={
          <TouchableOpacity style={styles.addButton} onPress={() => router.push('/(tabs)/products/create')}>
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        }
      />

      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={colors.textInverseMuted} style={{ marginRight: spacing.xs }} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => {
            setLoading(true);
            load(1, false);
          }}
          placeholder="Search products or SKU"
          placeholderTextColor={colors.textInverseFaint}
          returnKeyType="search"
        />
      </View>

      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, statusFilter === f.value && styles.filterChipActive]}
            onPress={() => setStatusFilter(f.value)}
          >
            <Text style={[styles.filterChipText, statusFilter === f.value && styles.filterChipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
        {STOCK_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.label}
            style={[styles.filterChip, stockFilter === f.value && styles.filterChipActive]}
            onPress={() => setStockFilter(stockFilter === f.value ? undefined : f.value)}
          >
            <Text style={[styles.filterChipText, stockFilter === f.value && styles.filterChipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <LoadingState label="Loading products…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" />}
          onEndReachedThreshold={0.4}
          onEndReached={loadMore}
          ListEmptyComponent={
            <EmptyState icon="cube-outline" title="No products yet" message="Add your first product to start selling." />
          }
          renderItem={({ item, index }) => {
            const mainImage = item.images?.find((img) => img.isMain) || item.images?.[0];
            const quantity = item.totalAvailable ?? item.inventory?.quantity ?? 0;
            return (
              <PressableScale onPress={() => router.push(`/(tabs)/products/${item._id}`)}>
                <Card style={styles.productCard} delay={Math.min(index, 6) * motion.stagger}>
                  <View style={styles.productRow}>
                    {mainImage ? (
                      <Image source={{ uri: mainImage.url }} style={styles.thumb} />
                    ) : (
                      <View style={[styles.thumb, styles.thumbPlaceholder]}>
                        <Ionicons name="cube-outline" size={22} color={colors.textFaint} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.productName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.productPrice}>{formatEGP(item.price)}</Text>
                      <Text style={[styles.stockText, quantity <= (item.inventory?.lowStockThreshold ?? 5) && styles.stockLow]}>
                        {quantity} in stock
                      </Text>
                    </View>
                    <StatusBadge status={item.status} />
                  </View>
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.glassFillSubtle,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  searchInput: {
    flex: 1,
    color: colors.textInverse,
    fontSize: 14,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.glassFillSubtle,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    ...typography.caption,
    color: colors.textInverseMuted,
    textTransform: 'none',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: spacing.md,
    paddingTop: 0,
    paddingBottom: layout.tabBarClearance,
  },
  productCard: {
    marginBottom: spacing.sm,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: radius.sm,
  },
  thumbPlaceholder: {
    backgroundColor: 'rgba(15,23,42,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productName: {
    ...typography.bodyBold,
    fontSize: 15,
    color: colors.text,
  },
  productPrice: {
    ...typography.bodyBold,
    color: colors.primary,
    marginTop: 2,
  },
  stockText: {
    ...typography.caption,
    fontWeight: '500',
    color: colors.textMuted,
    textTransform: 'none',
    marginTop: 2,
  },
  stockLow: {
    color: colors.warning,
  },
});
