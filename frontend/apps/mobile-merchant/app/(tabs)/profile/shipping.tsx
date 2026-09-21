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
import { ShippingProvider, Store, StoreShippingCredentials } from '../../../lib/types';

// One entry per provider the grid renders. `accent` is that courier's real
// brand color, used only as a tile accent/wordmark color — no logo artwork.
const SHIPPING_PROVIDERS: {
  id: ShippingProvider;
  name: string;
  tagline: string;
  accent: string;
  hasCredentials: boolean;
}[] = [
  { id: 'local', name: 'Local Delivery', tagline: 'Your own fleet', accent: colors.textMuted, hasCredentials: false },
  { id: 'bosta', name: 'Bosta', tagline: 'Waybills & tracking', accent: '#E4312B', hasCredentials: true },
  { id: 'aramex', name: 'Aramex', tagline: 'Global courier network', accent: '#C8102E', hasCredentials: true },
  { id: 'mylerz', name: 'Mylerz', tagline: 'Last-mile delivery', accent: '#F4511E', hasCredentials: true },
  { id: 'jt_express', name: 'J&T Express', tagline: 'Regional express courier', accent: '#E30613', hasCredentials: true },
];

export default function ShippingSettingsScreen() {
  const { storeId, refresh: refreshStoreContext } = useStore();
  const [store, setStoreState] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [enabled, setEnabled] = useState(false);
  const [provider, setProvider] = useState<ShippingProvider>('local');

  // Bosta
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasSavedKey, setHasSavedKey] = useState(false);

  // Aramex (accountNumber/accountEntity/accountCountryCode are plain text;
  // username/password/accountPin are masked, shared with Mylerz's own
  // username/password below since they live under the same
  // `shipping.credentials` object).
  const [accountNumberInput, setAccountNumberInput] = useState('');
  const [accountEntityInput, setAccountEntityInput] = useState('');
  const [accountCountryCodeInput, setAccountCountryCodeInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [hasSavedUsername, setHasSavedUsername] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [hasSavedPassword, setHasSavedPassword] = useState(false);
  const [accountPinInput, setAccountPinInput] = useState('');
  const [hasSavedAccountPin, setHasSavedAccountPin] = useState(false);

  // J&T Express
  const [apiAccountInput, setApiAccountInput] = useState('');
  const [customerCodeInput, setCustomerCodeInput] = useState('');
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [hasSavedPrivateKey, setHasSavedPrivateKey] = useState(false);

  const load = useCallback(async () => {
    if (!storeId) return;
    try {
      const data = await getStore(storeId);
      setStoreState(data);
      const shipping = data.settings?.shipping;
      const creds = shipping?.credentials;

      setEnabled(!!shipping?.enabled);
      setProvider(SHIPPING_PROVIDERS.some((p) => p.id === shipping?.provider) ? (shipping!.provider as ShippingProvider) : 'local');

      setHasSavedKey(!!creds?.apiKey);
      setApiKeyInput('');

      setAccountNumberInput(creds?.accountNumber || '');
      setAccountEntityInput(creds?.accountEntity || '');
      setAccountCountryCodeInput(creds?.accountCountryCode || '');
      setHasSavedUsername(!!creds?.username);
      setUsernameInput('');
      setHasSavedPassword(!!creds?.password);
      setPasswordInput('');
      setHasSavedAccountPin(!!creds?.accountPin);
      setAccountPinInput('');

      setApiAccountInput(creds?.apiAccount || '');
      setCustomerCodeInput(creds?.customerCode || '');
      setHasSavedPrivateKey(!!creds?.privateKey);
      setPrivateKeyInput('');
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

  const validate = (): string | null => {
    if (provider === 'bosta' && !hasSavedKey && !apiKeyInput.trim()) {
      return 'Enter your Bosta API key, or switch the provider to Local delivery.';
    }
    if (provider === 'aramex') {
      const missingAccount = !accountNumberInput.trim() || !accountEntityInput.trim() || !accountCountryCodeInput.trim();
      const missingLogin =
        (!hasSavedUsername && !usernameInput.trim()) ||
        (!hasSavedPassword && !passwordInput.trim()) ||
        (!hasSavedAccountPin && !accountPinInput.trim());
      if (missingAccount || missingLogin) {
        return 'Fill in all Aramex account and login fields, or switch the provider.';
      }
    }
    if (provider === 'mylerz') {
      if ((!hasSavedUsername && !usernameInput.trim()) || (!hasSavedPassword && !passwordInput.trim())) {
        return 'Enter your Mylerz username and password, or switch the provider.';
      }
    }
    if (provider === 'jt_express') {
      if (!apiAccountInput.trim() || !customerCodeInput.trim() || (!hasSavedPrivateKey && !privateKeyInput.trim())) {
        return 'Fill in all J&T Express fields, or switch the provider.';
      }
    }
    return null;
  };

  const handleSave = async () => {
    if (!store) return;
    if (enabled) {
      const validationError = validate();
      if (validationError) {
        notify('Missing details', validationError);
        return;
      }
    }
    setSaving(true);
    setError(null);
    try {
      const existingCredentials = store.settings?.shipping?.credentials || {};
      const credentials: StoreShippingCredentials = { ...existingCredentials };

      if (provider === 'bosta') {
        if (apiKeyInput.trim()) credentials.apiKey = apiKeyInput.trim();
      } else if (provider === 'aramex') {
        credentials.accountNumber = accountNumberInput.trim();
        credentials.accountEntity = accountEntityInput.trim();
        credentials.accountCountryCode = accountCountryCodeInput.trim();
        if (usernameInput.trim()) credentials.username = usernameInput.trim();
        if (passwordInput.trim()) credentials.password = passwordInput.trim();
        if (accountPinInput.trim()) credentials.accountPin = accountPinInput.trim();
      } else if (provider === 'mylerz') {
        if (usernameInput.trim()) credentials.username = usernameInput.trim();
        if (passwordInput.trim()) credentials.password = passwordInput.trim();
      } else if (provider === 'jt_express') {
        credentials.apiAccount = apiAccountInput.trim();
        credentials.customerCode = customerCodeInput.trim();
        if (privateKeyInput.trim()) credentials.privateKey = privateKeyInput.trim();
      }

      const updated = await updateStore(store._id, {
        settings: {
          ...store.settings,
          shipping: {
            enabled,
            provider,
            zones: store.settings?.shipping?.zones || [],
            credentials,
          },
        },
      });
      setStoreState(updated);
      const updatedCreds = updated.settings?.shipping?.credentials;
      setHasSavedKey(!!updatedCreds?.apiKey);
      setApiKeyInput('');
      setHasSavedUsername(!!updatedCreds?.username);
      setUsernameInput('');
      setHasSavedPassword(!!updatedCreds?.password);
      setPasswordInput('');
      setHasSavedAccountPin(!!updatedCreds?.accountPin);
      setAccountPinInput('');
      setHasSavedPrivateKey(!!updatedCreds?.privateKey);
      setPrivateKeyInput('');
      setAccountNumberInput(updatedCreds?.accountNumber || '');
      setAccountEntityInput(updatedCreds?.accountEntity || '');
      setAccountCountryCodeInput(updatedCreds?.accountCountryCode || '');
      setApiAccountInput(updatedCreds?.apiAccount || '');
      setCustomerCodeInput(updatedCreds?.customerCode || '');
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

  const selectedMeta = SHIPPING_PROVIDERS.find((p) => p.id === provider);

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
          <View style={styles.grid}>
            {SHIPPING_PROVIDERS.map((p) => (
              <ProviderTile
                key={p.id}
                name={p.name}
                tagline={p.tagline}
                accent={p.accent}
                isLocal={p.id === 'local'}
                hasCredentials={p.hasCredentials}
                active={provider === p.id}
                onPress={() => setProvider(p.id)}
              />
            ))}
          </View>

          {provider === 'local' ? (
            <Text style={[styles.muted, { marginTop: spacing.md }]}>
              Orders will need their tracking number entered manually from the order screen.
            </Text>
          ) : null}

          {provider === 'bosta' ? (
            <View style={styles.credentialsBlock}>
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
          ) : null}

          {provider === 'aramex' ? (
            <View style={styles.credentialsBlock}>
              <View style={styles.noticeBox}>
                <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
                <Text style={styles.noticeText}>
                  Connect your own existing Aramex account — get these details from your Aramex merchant
                  dashboard. Buildora doesn't sign accounts up with Aramex on your behalf.
                </Text>
              </View>

              <Text style={styles.groupLabel}>Account</Text>
              <Text style={styles.label}>Account number</Text>
              <TextInput
                style={styles.input}
                value={accountNumberInput}
                onChangeText={setAccountNumberInput}
                placeholder="e.g. 123456"
                placeholderTextColor={colors.textFaint}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.label}>Account entity</Text>
              <TextInput
                style={styles.input}
                value={accountEntityInput}
                onChangeText={setAccountEntityInput}
                placeholder="e.g. CAI"
                placeholderTextColor={colors.textFaint}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <Text style={styles.label}>Account country code</Text>
              <TextInput
                style={styles.input}
                value={accountCountryCodeInput}
                onChangeText={setAccountCountryCodeInput}
                placeholder="e.g. EG"
                placeholderTextColor={colors.textFaint}
                autoCapitalize="characters"
                autoCorrect={false}
              />

              <Text style={[styles.groupLabel, { marginTop: spacing.md }]}>Login</Text>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                value={usernameInput}
                onChangeText={setUsernameInput}
                placeholder={hasSavedUsername ? '•••••••••••••••••••• (saved)' : 'Aramex account email/username'}
                placeholderTextColor={colors.textFaint}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={passwordInput}
                onChangeText={setPasswordInput}
                placeholder={hasSavedPassword ? '•••••••••••••••••••• (saved)' : 'Enter password'}
                placeholderTextColor={colors.textFaint}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.label}>Account PIN</Text>
              <TextInput
                style={styles.input}
                value={accountPinInput}
                onChangeText={setAccountPinInput}
                placeholder={hasSavedAccountPin ? '•••••••••••••••••••• (saved)' : 'Enter PIN'}
                placeholderTextColor={colors.textFaint}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="number-pad"
              />
              <Text style={styles.hint}>
                Saved secrets show blank here — leave a field blank to keep it, or type a new value to replace it.
              </Text>
            </View>
          ) : null}

          {provider === 'mylerz' ? (
            <View style={styles.credentialsBlock}>
              <View style={styles.noticeBox}>
                <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
                <Text style={styles.noticeText}>
                  Connect your own existing Mylerz account — get these details from your Mylerz merchant
                  dashboard. Buildora doesn't sign accounts up with Mylerz on your behalf.
                </Text>
              </View>

              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                value={usernameInput}
                onChangeText={setUsernameInput}
                placeholder={hasSavedUsername ? '•••••••••••••••••••• (saved)' : 'Mylerz account email/username'}
                placeholderTextColor={colors.textFaint}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={passwordInput}
                onChangeText={setPasswordInput}
                placeholder={hasSavedPassword ? '•••••••••••••••••••• (saved)' : 'Enter password'}
                placeholderTextColor={colors.textFaint}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.hint}>
                Saved secrets show blank here — leave a field blank to keep it, or type a new value to replace it.
              </Text>
            </View>
          ) : null}

          {provider === 'jt_express' ? (
            <View style={styles.credentialsBlock}>
              <View style={styles.noticeBox}>
                <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
                <Text style={styles.noticeText}>
                  Connect your own existing J&T Express account — get these details from your J&T Express
                  merchant dashboard. Buildora doesn't sign accounts up with J&T Express on your behalf.
                </Text>
              </View>

              <Text style={styles.label}>API account</Text>
              <TextInput
                style={styles.input}
                value={apiAccountInput}
                onChangeText={setApiAccountInput}
                placeholder="e.g. 640xxxxxxxxxxxx"
                placeholderTextColor={colors.textFaint}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.label}>Customer code</Text>
              <TextInput
                style={styles.input}
                value={customerCodeInput}
                onChangeText={setCustomerCodeInput}
                placeholder="e.g. EGXXXXXXXX"
                placeholderTextColor={colors.textFaint}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.label}>Private key</Text>
              <TextInput
                style={styles.input}
                value={privateKeyInput}
                onChangeText={setPrivateKeyInput}
                placeholder={hasSavedPrivateKey ? '•••••••••••••••••••• (saved)' : 'Enter private key'}
                placeholderTextColor={colors.textFaint}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.hint}>
                {hasSavedPrivateKey
                  ? 'A private key is already saved. Leave this blank to keep it, or paste a new one to replace it.'
                  : 'Required to generate waybills and track shipments automatically.'}
              </Text>
            </View>
          ) : null}
        </Card>
      ) : (
        <Card style={styles.section}>
          <Text style={styles.muted}>
            Shipping is off. Enable it to connect a courier for automatic waybills, or to track fulfillment manually.
          </Text>
        </Card>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <GradientButton title="Save changes" onPress={handleSave} loading={saving} style={{ marginTop: spacing.sm }} />
    </ScrollView>
  );
}

function ProviderTile({
  name,
  tagline,
  accent,
  isLocal,
  hasCredentials,
  active,
  onPress,
}: {
  name: string;
  tagline: string;
  accent: string;
  isLocal: boolean;
  hasCredentials: boolean;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.tile, active && { borderColor: accent, backgroundColor: `${accent}1A`, borderWidth: 1.5 }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {active ? <Ionicons name="checkmark-circle" size={16} color={accent} style={styles.tileCheck} /> : null}
      {hasCredentials ? (
        <Ionicons name="settings-outline" size={13} color={colors.textFaint} style={styles.tileGear} />
      ) : null}
      {isLocal ? (
        <Ionicons name="car-outline" size={22} color={active ? accent : colors.textMuted} />
      ) : (
        <Text style={[styles.tileWordmark, { color: accent }]} numberOfLines={1}>
          {name}
        </Text>
      )}
      <Text style={styles.tileTagline} numberOfLines={2}>
        {tagline}
      </Text>
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  tile: {
    position: 'relative',
    width: '31%',
    minHeight: 92,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.glassFillStrong,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    gap: 4,
  },
  tileCheck: {
    position: 'absolute',
    top: 6,
    left: 6,
  },
  tileGear: {
    position: 'absolute',
    top: 7,
    right: 7,
  },
  tileWordmark: {
    fontSize: 13,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  tileTagline: {
    fontSize: 9.5,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 12,
  },
  credentialsBlock: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  groupLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.xs,
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
    marginTop: spacing.sm,
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
