import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../src/hooks/useAuth';
import { useNotifications } from '../../src/hooks/useNotifications';
import { supabase } from '../../src/lib/supabase';
import { COLORS, SPACING, RADIUS, FONT } from '../../src/utils/theme';

export default function SettingsScreen() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { requestPermissions, cancelAll } = useNotifications();
  const [saving, setSaving] = useState(false);

  const escalationEnabled = profile?.escalation_enabled ?? true;

  async function toggleEscalation(val: boolean) {
    if (!user) return;
    setSaving(true);
    try {
      await supabase
        .from('profiles')
        .update({ escalation_enabled: val })
        .eq('id', user.id);
      await refreshProfile();
    } catch {
      Alert.alert('Error', 'Could not update setting.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRequestNotifications() {
    const granted = await requestPermissions();
    Alert.alert(
      granted ? 'Notifications enabled' : 'Notifications blocked',
      granted
        ? 'You will receive reminder notifications.'
        : 'Go to your device Settings to enable notifications for Lifestream.'
    );
  }

  async function handleClearAll() {
    Alert.alert(
      'Clear all notifications?',
      'All scheduled reminders will be cleared from your device. Your reminder data is safe.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await cancelAll();
            Alert.alert('Done', 'All scheduled notifications cleared.');
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Settings</Text>

      {/* Account */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View>
              <Text style={styles.rowLabel}>{profile?.display_name ?? 'User'}</Text>
              <Text style={styles.rowSub}>{user?.email}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <Text style={styles.rowValue}>
            {profile?.subscription === 'pro' ? '⭐ Pro' : 'Free plan'}
          </Text>
        </View>
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.rowLabel}>Escalating nudges</Text>
              <Text style={styles.rowSub}>
                Increase urgency when you keep snoozing
              </Text>
            </View>
            {saving ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : (
              <Switch
                value={escalationEnabled}
                onValueChange={toggleEscalation}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor="#fff"
              />
            )}
          </View>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.row} onPress={handleRequestNotifications}>
            <Text style={styles.rowLabel}>Enable notifications</Text>
            <Text style={styles.rowChevron}>›</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.row} onPress={handleClearAll}>
            <Text style={[styles.rowLabel, { color: COLORS.danger }]}>
              Clear all scheduled notifications
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quiet hours info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quiet Hours</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>No notifications between</Text>
            <Text style={styles.rowValue}>
              {profile?.quiet_hours_start ?? '22:00'} – {profile?.quiet_hours_end ?? '08:00'}
            </Text>
          </View>
          <View style={styles.divider} />
          <Text style={styles.infoText}>
            Quiet hours editing coming in a future update.
          </Text>
        </View>
      </View>

      {/* Sign out */}
      <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Lifestream v1.0.0 · Phase 1 Alpha</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingTop: 60,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
    gap: SPACING.xl,
  },
  pageTitle: {
    fontSize: FONT.xxl,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  section: {
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT.sm,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
  },
  rowLabel: {
    fontSize: FONT.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  rowSub: {
    fontSize: FONT.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  rowValue: {
    fontSize: FONT.sm,
    color: COLORS.textMuted,
    padding: SPACING.md,
  },
  rowChevron: {
    fontSize: 20,
    color: COLORS.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.md,
  },
  infoText: {
    fontSize: FONT.sm,
    color: COLORS.textMuted,
    padding: SPACING.md,
    paddingTop: SPACING.sm,
  },
  signOutButton: {
    backgroundColor: COLORS.dangerLight,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  signOutText: {
    color: COLORS.danger,
    fontWeight: '700',
    fontSize: FONT.md,
  },
  version: {
    textAlign: 'center',
    fontSize: FONT.sm,
    color: COLORS.textMuted,
  },
});
