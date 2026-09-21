import React, { useCallback, useState } from 'react';
import { Image, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Card } from '../../../components/Card';
import { GradientButton } from '../../../components/GradientButton';
import { LoadingState } from '../../../components/LoadingState';
import { ErrorState } from '../../../components/EmptyState';
import { colors, layout, radius, spacing, typography } from '../../../constants/theme';
import { notify } from '../../../lib/alerts';
import { getStore, updateStore, uploadStoreLogo } from '../../../lib/services/store';
import { useStore } from '../../../lib/storeContext';
import { ShippingZone, Store } from '../../../lib/types';

export default function StoreSettingsScreen() {
  const { storeId, refresh: refreshStoreContext } = useStore();
  const [store, setStoreState] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [shippingEnabled, setShippingEnabled] = useState(false);
  const [zones, setZones] = useState<ShippingZone[]>([]);

  const load = useCallback(async () => {
    if (!storeId) return;
    try {
      const data = await getStore(storeId);
      setStoreState(data);
      setName(data.name || '');
      setDescription(data.description || '');
      setEmail(data.contact?.email || '');
      setPhone(data.contact?.phone || '');
      setAddress(data.contact?.address || '');
      setWhatsapp(data.contact?.whatsapp || '');
      setShippingEnabled(!!data.settings?.shipping?.enabled);
      setZones(data.settings?.shipping?.zones || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load store settings.');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handlePickLogo = async () => {
    if (!store) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      notify('Permission needed', 'Photo library access is required to choose a logo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    setUploadingLogo(true);
    try {
      const response = await uploadStoreLogo(store._id, asset.uri, asset.fileName || 'logo.jpg', asset.mimeType || 'image/jpeg');
      setStoreState((prev) => (prev ? { ...prev, logo: response.logo, favicon: response.favicon } : prev));
    } catch (err: any) {
      notify('Upload failed', err?.response?.data?.message || 'Could not upload the logo.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const addZone = () => {
    setZones((prev) => [...prev, { name: '', cities: [], rate: 0, freeShippingThreshold: undefined }]);
  };

  const updateZone = (index: number, patch: Partial<ShippingZone>) => {
    setZones((prev) => prev.map((z, i) => (i === index ? { ...z, ...patch } : z)));
  };

  const removeZone = (index: number) => {
    setZones((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!store) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateStore(store._id, {
        name: name.trim(),
        description: description.trim() || undefined,
        contact: { email: email.trim(), phone: phone.trim(), address: address.trim(), whatsapp: whatsapp.trim() || undefined },
        settings: {
          ...store.settings,
          shipping: {
            enabled: shippingEnabled,
            provider: store.settings?.shipping?.provider || 'local',
            zones: zones.map((z) => ({
              name: z.name.trim(),
              cities: Array.isArray(z.cities) ? z.cities : [],
              rate: Number(z.rate) || 0,
              freeShippingThreshold: z.freeShippingThreshold != null ? Number(z.freeShippingThreshold) : undefined,
            })),
          },
        },
      });
      setStoreState(updated);
      refreshStoreContext();
      notify('Saved', 'Store settings were updated.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save store settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <LoadingState label="Loading store settings…" />
      </View>
    );
  }

  if (error && !store) {
    return (
      <View style={styles.center}>
        <ErrorState message={error} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.sectionTitle}>Logo</Text>
        <View style={styles.logoRow}>
          {store?.logo?.url ? (
            <Image source={{ uri: store.logo.url }} style={styles.logo} />
          ) : (
            <View style={[styles.logo, styles.logoPlaceholder]}>
              <Ionicons name="storefront-outline" size={24} color={colors.textFaint} />
            </View>
          )}
          <TouchableOpacity style={styles.logoButton} onPress={handlePickLogo} disabled={uploadingLogo}>
            <Text style={styles.logoButtonText}>{uploadingLogo ? 'Uploading…' : 'Change logo'}</Text>
          </TouchableOpacity>
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Basics</Text>
        <Field label="Store name" value={name} onChangeText={setName} />
        <Field label="Description" value={description} onChangeText={setDescription} multiline />
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Contact</Text>
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Field label="WhatsApp" value={whatsapp} onChangeText={setWhatsapp} keyboardType="phone-pad" />
        <Field label="Address" value={address} onChangeText={setAddress} multiline />
      </Card>

      <Card style={styles.section}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Shipping zones</Text>
          <Switch value={shippingEnabled} onValueChange={setShippingEnabled} trackColor={{ true: colors.primary }} />
        </View>
        {shippingEnabled ? (
          <>
            {zones.map((zone, idx) => (
              <View key={idx} style={styles.zoneCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.zoneLabel}>Zone {idx + 1}</Text>
                  <TouchableOpacity onPress={() => removeZone(idx)}>
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  </TouchableOpacity>
                </View>
                <Field label="Name" value={zone.name} onChangeText={(v) => updateZone(idx, { name: v })} placeholder="e.g. Cairo & Giza" />
                <Field
                  label="Cities (comma separated)"
                  value={(zone.cities || []).join(', ')}
                  onChangeText={(v) => updateZone(idx, { cities: v.split(',').map((c) => c.trim()).filter(Boolean) })}
                  placeholder="Cairo, Giza"
                />
                <Field
                  label="Rate (EGP)"
                  value={String(zone.rate ?? 0)}
                  onChangeText={(v) => updateZone(idx, { rate: Number(v) || 0 })}
                  keyboardType="decimal-pad"
                />
                <Field
                  label="Free shipping over (EGP)"
                  value={zone.freeShippingThreshold != null ? String(zone.freeShippingThreshold) : ''}
                  onChangeText={(v) => updateZone(idx, { freeShippingThreshold: v ? Number(v) : undefined })}
                  keyboardType="decimal-pad"
                  placeholder="Optional"
                />
              </View>
            ))}
            <TouchableOpacity style={styles.addZoneButton} onPress={addZone}>
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={styles.addZoneText}>Add shipping zone</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.muted}>Enable shipping to configure zones and rates.</Text>
        )}
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <GradientButton title="Save changes" onPress={handleSave} loading={saving} style={{ marginTop: spacing.sm }} />
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
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'decimal-pad';
  multiline?: boolean;
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: 'transparent' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
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
  textArea: { minHeight: 72, textAlignVertical: 'top' },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
  },
  logoPlaceholder: {
    backgroundColor: 'rgba(15,23,42,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoButtonText: {
    ...typography.bodyBold,
    fontSize: 13,
    color: colors.primary,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  muted: {
    ...typography.body,
    fontSize: 13,
    color: colors.textMuted,
  },
  zoneCard: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  zoneLabel: {
    ...typography.bodyBold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  addZoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  addZoneText: {
    ...typography.bodyBold,
    fontSize: 13,
    color: colors.primary,
  },
  error: {
    ...typography.body,
    color: colors.danger,
    textAlign: 'center',
  },
});
