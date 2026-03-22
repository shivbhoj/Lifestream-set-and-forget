import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { useNotifications } from '../../src/hooks/useNotifications';
import { supabase } from '../../src/lib/supabase';
import {
  ALL_CATEGORIES,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  type ReminderCategory,
} from '../../src/types';
import { COLORS, SPACING, RADIUS, FONT } from '../../src/utils/theme';

const TOTAL_STEPS = 3;

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const { requestPermissions } = useNotifications();

  const [step, setStep] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState<ReminderCategory[]>([]);
  const [notifGranted, setNotifGranted] = useState(false);
  const [loading, setLoading] = useState(false);

  function toggleCategory(cat: ReminderCategory) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  async function handleEnableNotifications() {
    const granted = await requestPermissions();
    setNotifGranted(granted);
    if (!granted) {
      Alert.alert(
        'Notifications off',
        'You can enable them later in Settings → Notifications.',
        [{ text: 'OK' }]
      );
    }
    await finishOnboarding(granted);
  }

  async function finishOnboarding(notifEnabled: boolean) {
    if (!user) return;
    setLoading(true);
    try {
      await supabase.from('profiles').update({
        onboarding_completed: true,
        selected_categories: selectedCategories,
        notification_channels: notifEnabled ? ['push'] : [],
      }).eq('id', user.id);
      await refreshProfile();
      router.replace('/(app)');
    } catch {
      Alert.alert('Error', 'Could not save your preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressRow}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View
            key={i}
            style={[styles.progressDot, i + 1 <= step && styles.progressDotActive]}
          />
        ))}
      </View>

      {/* Step 1 — Pick categories */}
      {step === 1 && (
        <ScrollView contentContainerStyle={styles.stepContent}>
          <Text style={styles.stepTitle}>What do you want to track?</Text>
          <Text style={styles.stepSubtitle}>
            Pick the life areas you care about. You can always change this later.
          </Text>

          <View style={styles.categoryGrid}>
            {ALL_CATEGORIES.map((cat) => {
              const selected = selectedCategories.includes(cat);
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryChip, selected && styles.categoryChipSelected]}
                  onPress={() => toggleCategory(cat)}
                >
                  <Text style={styles.categoryIcon}>{CATEGORY_ICONS[cat]}</Text>
                  <Text
                    style={[
                      styles.categoryLabel,
                      selected && styles.categoryLabelSelected,
                    ]}
                  >
                    {CATEGORY_LABELS[cat]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.button, selectedCategories.length === 0 && styles.buttonDisabled]}
            onPress={() => setStep(2)}
            disabled={selectedCategories.length === 0}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Step 2 — How it works */}
      {step === 2 && (
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>How Lifestream works</Text>
          <Text style={styles.stepSubtitle}>
            Add a deadline once. We handle the rest — escalating reminders until you act.
          </Text>

          <View style={styles.featureList}>
            {[
              { icon: '📅', label: 'Smart intervals', desc: 'Reminders ramp up as your deadline approaches' },
              { icon: '🔔', label: 'Escalating nudges', desc: 'Snooze too many times? We turn up the pressure' },
              { icon: '✅', label: 'One-tap complete', desc: 'Mark done and reset — or set the next cycle' },
            ].map((f) => (
              <View key={f.label} style={styles.featureRow}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.featureLabel}>{f.label}</Text>
                  <Text style={styles.featureDesc}>{f.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.button} onPress={() => setStep(3)}>
            <Text style={styles.buttonText}>Got it</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Step 3 — Notifications */}
      {step === 3 && (
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Enable reminders</Text>
          <Text style={styles.stepSubtitle}>
            Allow notifications so Lifestream can nudge you before deadlines hit.
          </Text>

          <View style={styles.notifIllustration}>
            <Text style={{ fontSize: 64 }}>🔔</Text>
          </View>

          {loading ? (
            <ActivityIndicator color={COLORS.primary} size="large" />
          ) : (
            <>
              <TouchableOpacity
                style={styles.button}
                onPress={handleEnableNotifications}
              >
                <Text style={styles.buttonText}>Enable Notifications</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.skipButton}
                onPress={() => finishOnboarding(false)}
              >
                <Text style={styles.skipText}>Skip for now</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 60,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  progressDotActive: {
    backgroundColor: COLORS.primary,
    width: 24,
  },
  stepContent: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  stepTitle: {
    fontSize: FONT.xxl,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  stepSubtitle: {
    fontSize: FONT.md,
    color: COLORS.textMuted,
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  categoryChipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  categoryIcon: {
    fontSize: 18,
  },
  categoryLabel: {
    fontSize: FONT.sm,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  categoryLabelSelected: {
    color: COLORS.primary,
  },
  featureList: {
    gap: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  featureIcon: {
    fontSize: 28,
    marginTop: 2,
  },
  featureLabel: {
    fontSize: FONT.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  featureDesc: {
    fontSize: FONT.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  notifIllustration: {
    alignItems: 'center',
    marginVertical: SPACING.xxl,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#fff',
    fontSize: FONT.md,
    fontWeight: '700',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  skipText: {
    color: COLORS.textMuted,
    fontSize: FONT.sm,
  },
});
