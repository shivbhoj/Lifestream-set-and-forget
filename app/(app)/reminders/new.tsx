import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useAuth } from '../../../src/hooks/useAuth';
import { createReminder } from '../../../src/services/reminders';
import { scheduleAllNotifications } from '../../../src/services/notifications';
import {
  ALL_CATEGORIES,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  type ReminderCategory,
} from '../../../src/types';
import { COLORS, SPACING, RADIUS, FONT } from '../../../src/utils/theme';

export default function NewReminderScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ReminderCategory>('custom');
  const [expirationDate, setExpirationDate] = useState<Date>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tagsInput, setTagsInput] = useState('');
  const [loading, setLoading] = useState(false);

  function onDateChange(_: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selected) setExpirationDate(selected);
  }

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert('Title required', 'Please enter a title for your reminder.');
      return;
    }
    if (!user) return;

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    setLoading(true);
    try {
      const reminder = await createReminder(user.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        expiration_date: expirationDate,
        tags,
      });

      // Schedule local notifications
      await scheduleAllNotifications(reminder);

      router.back();
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not create reminder');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Navbar */}
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBack}>
          <Text style={styles.navBackText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>New Reminder</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={loading || !title.trim()}
          style={[styles.navSave, (!title.trim() || loading) && styles.navSaveDisabled]}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.primary} size="small" />
          ) : (
            <Text style={styles.navSaveText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Title */}
        <View style={styles.field}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Renew passport"
            placeholderTextColor={COLORS.textMuted}
            value={title}
            onChangeText={setTitle}
            maxLength={120}
            editable={!loading}
          />
        </View>

        {/* Category */}
        <View style={styles.field}>
          <Text style={styles.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.categoryRow}>
              {ALL_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryChip, category === cat && styles.categoryChipSelected]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={styles.catIcon}>{CATEGORY_ICONS[cat]}</Text>
                  <Text style={[styles.catLabel, category === cat && styles.catLabelSelected]}>
                    {CATEGORY_LABELS[cat]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Expiration date */}
        <View style={styles.field}>
          <Text style={styles.label}>Expiration / Deadline</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              {expirationDate.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
            <Text style={styles.dateButtonIcon}>📅</Text>
          </TouchableOpacity>

          {(showDatePicker || Platform.OS === 'ios') && (
            <DateTimePicker
              value={expirationDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              minimumDate={new Date()}
              onChange={onDateChange}
            />
          )}
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>Description (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Any notes about this reminder..."
            placeholderTextColor={COLORS.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            editable={!loading}
          />
        </View>

        {/* Tags */}
        <View style={styles.field}>
          <Text style={styles.label}>Tags (optional, comma-separated)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. travel, documents, urgent"
            placeholderTextColor={COLORS.textMuted}
            value={tagsInput}
            onChangeText={setTagsInput}
            autoCapitalize="none"
            editable={!loading}
          />
        </View>

        {/* Intervals preview */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>
            {CATEGORY_ICONS[category]} Reminder schedule for{' '}
            <Text style={{ fontWeight: '800' }}>{CATEGORY_LABELS[category]}</Text>
          </Text>
          <Text style={styles.infoBody}>
            You&apos;ll be reminded at: {getIntervalPreview(category)} days before the deadline.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function getIntervalPreview(category: ReminderCategory): string {
  const intervals: Record<ReminderCategory, number[]> = {
    identity: [180, 90, 60, 30, 14, 7, 3, 1],
    vehicle:  [60, 30, 14, 7, 3, 1],
    health:   [30, 14, 7, 3, 1],
    finance:  [30, 14, 7, 1],
    home:     [90, 30, 7, 1],
    legal:    [90, 30, 14, 7, 1],
    custom:   [30, 7, 1],
  };
  return intervals[category].join(', ');
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  navBack: {
    minWidth: 60,
  },
  navBackText: {
    color: COLORS.textMuted,
    fontSize: FONT.md,
  },
  navTitle: {
    fontSize: FONT.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  navSave: {
    minWidth: 60,
    alignItems: 'flex-end',
  },
  navSaveDisabled: {
    opacity: 0.4,
  },
  navSaveText: {
    color: COLORS.primary,
    fontSize: FONT.md,
    fontWeight: '700',
  },
  content: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  field: {
    gap: SPACING.xs,
  },
  label: {
    fontSize: FONT.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    fontSize: FONT.md,
    color: COLORS.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categoryRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  catIcon: {
    fontSize: 16,
  },
  catLabel: {
    fontSize: FONT.sm,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  catLabelSelected: {
    color: COLORS.primary,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
  },
  dateButtonText: {
    fontSize: FONT.md,
    color: COLORS.text,
  },
  dateButtonIcon: {
    fontSize: 18,
  },
  infoBox: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: 4,
    marginTop: SPACING.sm,
  },
  infoTitle: {
    fontSize: FONT.sm,
    color: COLORS.text,
  },
  infoBody: {
    fontSize: FONT.sm,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
});
