import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ProductForm, ProductFormValues } from '../../../components/ProductForm';
import { LoadingState } from '../../../components/LoadingState';
import { ErrorState } from '../../../components/EmptyState';
import { colors, spacing, typography } from '../../../constants/theme';
import { confirmAsync, notify } from '../../../lib/alerts';
import { deleteProduct, getProduct, updateProduct } from '../../../lib/services/products';
import { Product } from '../../../lib/types';

function toFormValues(product: Product): ProductFormValues {
  return {
    name: product.name || '',
    description: product.description || '',
    price: String(product.price ?? ''),
    compareAtPrice: product.compareAtPrice != null ? String(product.compareAtPrice) : '',
    costPerItem: product.costPerItem != null ? String(product.costPerItem) : '',
    sku: product.sku || '',
    category: product.category || '',
    quantity: String(product.inventory?.quantity ?? 0),
    lowStockThreshold: String(product.inventory?.lowStockThreshold ?? 5),
    status: product.status,
    images: product.images || [],
  };
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getProduct(id);
      setProduct(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load product.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleSubmit = async (values: ProductFormValues) => {
    const updated = await updateProduct(id, {
      name: values.name.trim(),
      description: values.description.trim() || undefined,
      price: Number(values.price) || 0,
      compareAtPrice: values.compareAtPrice ? Number(values.compareAtPrice) : undefined,
      costPerItem: values.costPerItem ? Number(values.costPerItem) : undefined,
      sku: values.sku.trim() || undefined,
      category: values.category.trim() || undefined,
      inventory: {
        quantity: Number(values.quantity) || 0,
        lowStockThreshold: Number(values.lowStockThreshold) || 5,
      },
      status: values.status,
      images: values.images,
    });
    setProduct(updated);
    notify('Saved', 'Product changes were saved.');
  };

  const handleDelete = async () => {
    const confirmed = await confirmAsync('Delete product', "This can't be undone. Delete this product?", 'Delete');
    if (!confirmed) return;
    setDeleting(true);
    try {
      await deleteProduct(id);
      router.replace('/(tabs)/products');
    } catch (err: any) {
      notify('Failed', err?.response?.data?.message || 'Could not delete this product.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <LoadingState label="Loading product…" />
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.center}>
        <ErrorState message={error || 'Product not found.'} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ProductForm initialValues={toFormValues(product)} submitLabel="Save changes" onSubmit={handleSubmit} />
      <TouchableOpacity style={styles.deleteRow} onPress={handleDelete} disabled={deleting}>
        <Text style={styles.deleteText}>{deleting ? 'Deleting…' : 'Delete product'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  deleteRow: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  deleteText: {
    ...typography.bodyBold,
    color: colors.danger,
  },
});
