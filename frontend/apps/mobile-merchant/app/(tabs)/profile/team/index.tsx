import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Card } from '../../../../components/Card';
import { PressableScale } from '../../../../components/PressableScale';
import { LoadingState } from '../../../../components/LoadingState';
import { EmptyState, ErrorState } from '../../../../components/EmptyState';
import { colors, layout, motion, radius, spacing, typography } from '../../../../constants/theme';
import { confirmAsync, notify } from '../../../../lib/alerts';
import { getStoreStaff, removeStoreStaff } from '../../../../lib/services/staff';
import { useStore } from '../../../../lib/storeContext';
import { StoreStaffMember } from '../../../../lib/types';

// Team management is owner-only — the backend 403s a manager/staff account
// on every one of these endpoints (see requireStoreRole(['owner']) on
// staffRoutes.ts), and the Profile menu already hides this entry for them.
// This guard only covers the (very unlikely) case of a stale role reaching
// this screen directly, e.g. a deep link or a role change without an app
// restart.
export default function TeamListScreen() {
  const router = useRouter();
  const { store, storeId } = useStore();
  const [staff, setStaff] = useState<StoreStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const isOwner = !store?.myRole || store.myRole === 'owner';

  const load = useCallback(async () => {
    if (!storeId || !isOwner) {
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const data = await getStoreStaff(storeId);
      setStaff(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load your team.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [storeId, isOwner]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const handleRemove = (member: StoreStaffMember) => {
    confirmAsync('Remove teammate?', `Remove ${member.email} from this store? They will lose access immediately.`, 'Remove').then(
      async (confirmed) => {
        if (!confirmed || !storeId) return;
        setRemovingId(member._id);
        try {
          await removeStoreStaff(storeId, member._id);
          setStaff((prev) => prev.filter((s) => s._id !== member._id));
          notify('Removed', `${member.email} no longer has access to this store.`);
        } catch (err: any) {
          notify('Failed to remove', err?.response?.data?.message || 'Please try again.');
        } finally {
          setRemovingId(null);
        }
      }
    );
  };

  if (!isOwner) {
    return (
      <View style={styles.screen}>
        <EmptyState
          icon="shield-outline"
          title="Owner access required"
          message="Only the store owner can manage team access."
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>{staff.length} teammate{staff.length === 1 ? '' : 's'}</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => router.push('/(tabs)/profile/team/invite')}>
          <Ionicons name="person-add-outline" size={16} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Invite</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <LoadingState label="Loading your team…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <FlatList
          data={staff}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#FFFFFF" />}
          ListEmptyComponent={
            <EmptyState icon="people-outline" title="No teammates yet" message="Invite a manager or staff member to help run this store." />
          }
          renderItem={({ item, index }) => (
            <Card style={styles.memberCard} delay={Math.min(index, 6) * motion.stagger}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.email} numberOfLines={1}>{item.email}</Text>
                  <Text style={styles.role}>{item.role === 'manager' ? 'Manager' : 'Staff'}</Text>
                </View>
                <View style={[styles.statusPill, item.status === 'active' ? styles.statusActive : styles.statusPending]}>
                  <Text style={[styles.statusText, item.status === 'active' ? styles.statusActiveText : styles.statusPendingText]}>
                    {item.status === 'active' ? 'Active' : 'Pending'}
                  </Text>
                </View>
              </View>
              <PressableScale onPress={() => handleRemove(item)} disabled={removingId === item._id} style={styles.removeRow}>
                <Ionicons name="trash-outline" size={15} color={colors.danger} />
                <Text style={styles.removeText}>{removingId === item._id ? 'Removing…' : 'Remove'}</Text>
              </PressableScale>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  headerTitle: {
    ...typography.bodyBold,
    color: colors.textInverse,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  addButtonText: {
    ...typography.bodyBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  listContent: {
    padding: spacing.md,
    paddingTop: 0,
    paddingBottom: layout.tabBarClearance,
  },
  memberCard: {
    marginBottom: spacing.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  email: {
    ...typography.bodyBold,
    fontSize: 15,
    color: colors.text,
  },
  role: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'none',
    fontWeight: '500',
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginLeft: spacing.sm,
  },
  statusActive: { backgroundColor: '#DCFCE7' },
  statusPending: { backgroundColor: '#FEF3C7' },
  statusText: { fontSize: 11, fontWeight: '700' },
  statusActiveText: { color: '#166534' },
  statusPendingText: { color: '#92400E' },
  removeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignSelf: 'flex-start',
  },
  removeText: {
    ...typography.bodyBold,
    fontSize: 13,
    color: colors.danger,
  },
});
