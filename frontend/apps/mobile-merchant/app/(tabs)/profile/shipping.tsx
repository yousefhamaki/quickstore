import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Card } from '../../../components/Card';
import { GradientButton } from '../../../components/GradientButton';
import { LoadingState } from '../../../components/LoadingState';
import { ErrorState } from '../../../components/EmptyState';
import { colors, layout, radius, spacing, typography } from '../../../constants/theme';
import { notify } from '../../../lib/alerts';
import { getStore, updateStore } from '../../../lib/services/store';
import { useStore } from '../../../lib/storeContext';
import { Store } from '../../../lib/types';

type Provider = 'local' | 'bosta';

export default function ShippingSettingsScreen() {
  const { storeId, refresh: refreshStoreContext } = useStore();
  const [store, setStoreState] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [enabled, setEnabled] = useState(false);
  const [provider, setProvider] = useState<Provider>('local');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasSavedKey, setHasSavedKey] = useState(false);

  const load = useCallback(async () => {
    if (!storeId) return;
    try {
      const data = await getStore(storeId);
      setStoreState(data);
      const shipping = data.settings?.shipping;
      setEnabled(!!shipping?.enabled);
      // 'aramex' is an unimplemented stub server-side — fall back to 'local'
      // so this screen never renders a provider it can't actually offer.
      setProvider(shipping?.provider === 'bosta' ? 'bosta' : 'local');
      setHasSavedKey(!!shipping?.credentials?.apiKey);
      setApiKeyInput('');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load shipping settings.');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleSave = async () => {
    if (!store) return;
    if (enabled && provider === 'bosta' && !hasSavedKey && !apiKeyInput.trim()) {
      notify('API key required', 'Enter your Bosta API key, or switch the provider to Local delivery.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const existingCredentials = store.settings?.shipping?.credentials;
      const updated = await updateStore(store._id, {
        settings: {
          ...store.settings,
          shipping: {
            enabled,
            provider,
            zones: store.settings?.shipping?.zones || [],
            // Only send a new apiKey when the merchant actually typed one —
            // leaving the input blank keeps whatever key (if any) is already
            // saved instead of clobbering it with an empty value.
            credentials: apiKeyInput.trim()
              ? { ...existingCredentials, apiKey: apiKeyInput.trim() }
              : existingCredentials,
          },
        },
      });
      setStoreState(updated);
      setHasSavedKey(!!updated.settings?.shipping?.credentials?.apiKey);
      setApiKeyInput('');
      refreshStoreContext();
      notify('Saved', 'Shipping settings were updated.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save shipping settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <LoadingState label="Loading shipping settings…" />
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
        <View style={styles.rowBetween}>
          <View style={{ flex: 1, marginRight: spacing.md }}>
            <Text style={styles.sectionTitle}>Shipping</Text>
            <Text style={styles.muted}>Turn on courier integration for this store.</Text>
          </View>
          <Switch value={enabled} onValueChange={setEnabled} trackColor={{ true: colors.primary }} />
        </View>
      </Card>

      {enabled ? (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Provider</Text>
          <View style={styles.providerRow}>
            <ProviderOption
              label="Local delivery"
              description="You handle fulfillment & tracking yourself"
              active={provider === 'local'}
              onPress={() => setProvider('local')}
            />
            <ProviderOption
              label="Bosta"
              description="Auto-generate waybills & live tracking"
              active={provider === 'bosta'}
              onPress={() => setProvider('bosta')}
            />
          </View>

          {provider === 'bosta' ? (
            <View style={styles.bostaBlock}>
              <View style={styles.noticeBox}>
                <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
                <Text style={styles.noticeText}>
                  This connects your own Bosta account. Buildora doesn't sign a contract with Bosta on your
                  behalf — sign up at bosta.co and copy your API key from your Bosta dashboard.
                </Text>
              </View>

              <Text style={styles.label}>Bosta API key</Text>
              <TextInput
                style={styles.input}
                value={apiKeyInput}
                onChangeText={setApiKeyInput}
                placeholder={hasSavedKey ? '•••••••••••••••••••• (saved)' : 'Paste your Bosta API key'}
                placeholderTextColor={colors.textFaint}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.hint}>
                {hasSavedKey
                  ? 'A key is already saved. Leave this blank to keep it, or paste a new one to replace it.'
                  : 'Required to generate waybills and track shipments automatically.'}
              </Text>
            </View>
          ) : (
            <Text style={[styles.muted, { marginTop: spacing.md }]}>
              Orders will need their tracking number entered manually from the order screen.
            </Text>
          )}
        </Card>
      ) : (
        <Card style={styles.section}>
          <Text style={styles.muted}>
            Shipping is off. Enable it to connect Bosta for automatic waybills, or to track fulfillment manually.
          </Text>
        </Card>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <GradientButton title="Save changes" onPress={handleSave} loading={saving} style={{ marginTop: spacing.sm }} />
    </ScrollView>
  );
}

function ProviderOption({
  label,
  description,
  active,
  onPress,
}: {
  label: string;
  description: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.providerOption, active && styles.providerOptionActive]} onPress={onPress}>
      <View style={styles.providerHeaderRow}>
        <Text style={[styles.providerLabel, active && styles.providerLabelActive]}>{label}</Text>
        {active ? <Ionicons name="checkmark-circle" size={18} color={colors.primary} /> : null}
      </View>
      <Text style={styles.providerDescription}>{description}</Text>
    </TouchableOpacity>
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
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  muted: {
    ...typography.body,
    fontSize: 13,
    color: colors.textMuted,
  },
  providerRow: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  providerOption: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  providerOptionActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(37, 99, 235, 0.06)',
  },
  providerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  providerLabel: {
    ...typography.bodyBold,
    fontSize: 15,
    color: colors.text,
  },
  providerLabelActive: {
    color: colors.primary,
  },
  providerDescription: {
    ...typography.body,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  bostaBlock: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  noticeBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: 'rgba(37, 99, 235, 0.06)',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  noticeText: {
    ...typography.body,
    fontSize: 12,
    color: colors.textMuted,
    flex: 1,
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
  hint: {
    ...typography.body,
    fontSize: 11,
    color: colors.textFaint,
    marginTop: spacing.xs,
  },
  error: {
    ...typography.body,
    color: colors.danger,
    textAlign: 'center',
  },
});
