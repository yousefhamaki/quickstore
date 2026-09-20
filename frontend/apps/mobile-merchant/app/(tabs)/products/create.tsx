import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ProductForm, ProductFormValues } from '../../../components/ProductForm';
import { colors, spacing, typography } from '../../../constants/theme';
import { createProduct } from '../../../lib/services/products';
import { useStore } from '../../../lib/storeContext';

const EMPTY_VALUES: ProductFormValues = {
  name: '',
  description: '',
  price: '',
  compareAtPrice: '',
  costPerItem: '',
  sku: '',
  category: '',
  quantity: '0',
  lowStockThreshold: '5',
  status: 'active',
  images: [],
};

export default function CreateProductScreen() {
  const router = useRouter();
  const { storeId } = useStore();

  if (!storeId) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>No store found for this account yet.</Text>
      </View>
    );
  }

  const handleSubmit = async (values: ProductFormValues) => {
    const created = await createProduct(storeId, {
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
    router.replace(`/(tabs)/products/${created._id}`);
  };

  return <ProductForm initialValues={EMPTY_VALUES} submitLabel="Create product" onSubmit={handleSubmit} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  error: { ...typography.body, color: colors.textInverse, textAlign: 'center' },
});
