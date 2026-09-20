import React, { useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Card } from './Card';
import { GradientButton } from './GradientButton';
import { colors, layout, radius, spacing, typography } from '../constants/theme';
import { notify } from '../lib/alerts';
import { uploadProductImages } from '../lib/services/products';
import { ProductImage, ProductStatus } from '../lib/types';

export interface ProductFormValues {
  name: string;
  description: string;
  price: string;
  compareAtPrice: string;
  costPerItem: string;
  sku: string;
  category: string;
  quantity: string;
  lowStockThreshold: string;
  status: ProductStatus;
  images: ProductImage[];
}

const STATUS_OPTIONS: ProductStatus[] = ['draft', 'active', 'archived'];

/**
 * Shared by app/(tabs)/products/create.tsx and app/(tabs)/products/[id].tsx
 * so the (fairly long) product form only exists once. The parent owns what
 * happens on submit (create vs. update) and passes a submit label/handler.
 */
export function ProductForm({
  initialValues,
  submitLabel,
  onSubmit,
}: {
  initialValues: ProductFormValues;
  submitLabel: string;
  onSubmit: (values: ProductFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState(initialValues);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const handlePick = async (fromCamera: boolean) => {
    try {
      const permission = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        notify('Permission needed', fromCamera ? 'Camera access is required to take a photo.' : 'Photo library access is required to choose a photo.');
        return;
      }

      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsMultipleSelection: true });

      if (result.canceled || result.assets.length === 0) return;

      setUploading(true);
      setError(null);
      const files = result.assets.map((asset, idx) => ({
        uri: asset.uri,
        name: asset.fileName || `photo-${Date.now()}-${idx}.jpg`,
        type: asset.mimeType || 'image/jpeg',
      }));
      const uploaded = await uploadProductImages(files);
      setValues((prev) => ({
        ...prev,
        images: [
          ...prev.images,
          ...uploaded.map((img, idx) => ({ ...img, isMain: prev.images.length === 0 && idx === 0 })),
        ],
      }));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to upload photo.');
    } finally {
      setUploading(false);
    }
  };

  const setMainImage = (publicId: string) => {
    setValues((prev) => ({
      ...prev,
      images: prev.images.map((img) => ({ ...img, isMain: img.publicId === publicId })),
    }));
  };

  const removeImage = (publicId: string) => {
    setValues((prev) => {
      const images = prev.images.filter((img) => img.publicId !== publicId);
      if (images.length > 0 && !images.some((img) => img.isMain)) images[0].isMain = true;
      return { ...prev, images };
    });
  };

  const handleSubmit = async () => {
    if (!values.name.trim()) {
      setError('Product name is required.');
      return;
    }
    const priceNumber = Number(values.price);
    if (!Number.isFinite(priceNumber) || priceNumber < 0) {
      setError('Enter a valid price.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(values);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save product.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.sectionTitle}>Photos</Text>
        <View style={styles.imageGrid}>
          {values.images.map((img) => (
            <View key={img.publicId} style={styles.imageWrap}>
              <Image source={{ uri: img.url }} style={styles.image} />
              {img.isMain ? (
                <View style={styles.mainBadge}>
                  <Text style={styles.mainBadgeText}>Main</Text>
                </View>
              ) : (
                <TouchableOpacity style={styles.setMainButton} onPress={() => setMainImage(img.publicId)}>
                  <Text style={styles.setMainButtonText}>Set main</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.removeButton} onPress={() => removeImage(img.publicId)}>
                <Ionicons name="close" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.addImageButton} onPress={() => handlePick(false)} disabled={uploading}>
            {uploading ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="images-outline" size={22} color={colors.primary} />}
            <Text style={styles.addImageText}>Library</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addImageButton} onPress={() => handlePick(true)} disabled={uploading}>
            <Ionicons name="camera-outline" size={22} color={colors.primary} />
            <Text style={styles.addImageText}>Camera</Text>
          </TouchableOpacity>
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Basics</Text>
        <Field label="Name" value={values.name} onChangeText={(v) => set('name', v)} placeholder="Product name" />
        <Field
          label="Description"
          value={values.description}
          onChangeText={(v) => set('description', v)}
          placeholder="What makes this product great?"
          multiline
        />
        <Field label="Category" value={values.category} onChangeText={(v) => set('category', v)} placeholder="e.g. Electronics" />
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Pricing</Text>
        <Field label="Price (EGP)" value={values.price} onChangeText={(v) => set('price', v)} keyboardType="decimal-pad" placeholder="0.00" />
        <Field
          label="Compare-at price (EGP)"
          value={values.compareAtPrice}
          onChangeText={(v) => set('compareAtPrice', v)}
          keyboardType="decimal-pad"
          placeholder="Optional"
        />
        <Field label="Cost per item (EGP)" value={values.costPerItem} onChangeText={(v) => set('costPerItem', v)} keyboardType="decimal-pad" placeholder="Optional" />
        <Field label="SKU" value={values.sku} onChangeText={(v) => set('sku', v)} placeholder="Optional" autoCapitalize="characters" />
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Inventory</Text>
        <Field label="Quantity in stock" value={values.quantity} onChangeText={(v) => set('quantity', v)} keyboardType="number-pad" placeholder="0" />
        <Field
          label="Low-stock threshold"
          value={values.lowStockThreshold}
          onChangeText={(v) => set('lowStockThreshold', v)}
          keyboardType="number-pad"
          placeholder="5"
        />
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Status</Text>
        <View style={styles.statusRow}>
          {STATUS_OPTIONS.map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.statusChip, values.status === status && styles.statusChipActive]}
              onPress={() => set('status', status)}
            >
              <Text style={[styles.statusChipText, values.status === status && styles.statusChipTextActive]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <GradientButton title={submitLabel} onPress={handleSubmit} loading={submitting} style={{ marginTop: spacing.sm }} />
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'decimal-pad' | 'number-pad';
  multiline?: boolean;
  autoCapitalize?: 'none' | 'characters';
}) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textArea]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        keyboardType={keyboardType}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    paddingBottom: layout.tabBarClearance,
    gap: spacing.md,
  },
  section: { marginTop: 0 },
  sectionTitle: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: colors.glassFillStrong,
    color: colors.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  imageWrap: {
    width: 84,
    height: 84,
    borderRadius: radius.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  mainBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(37,99,235,0.85)',
    paddingVertical: 2,
    alignItems: 'center',
  },
  mainBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  setMainButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15,23,42,0.6)',
    paddingVertical: 2,
    alignItems: 'center',
  },
  setMainButtonText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '600',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(15,23,42,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageButton: {
    width: 84,
    height: 84,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addImageText: {
    ...typography.caption,
    color: colors.primary,
    textTransform: 'none',
    fontSize: 10,
  },
  statusRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusChipText: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'none',
  },
  statusChipTextActive: {
    color: '#FFFFFF',
  },
  error: {
    ...typography.body,
    color: colors.danger,
    textAlign: 'center',
  },
});
