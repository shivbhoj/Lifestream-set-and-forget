import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useAuth } from '../../../src/hooks/useAuth';
import { getReminder, updateReminder, completeReminder, snoozeReminder, deleteReminder } from '../../../src/services/reminders';
import { scheduleAllNotifications, cancelReminderNotifications } from '../../../src/services/notifications';
import type { Reminder, ReminderCategory } from '../../../src/types';
import { CATEGORY_ICONS, CATEGORY_LABELS, ALL_CATEGORIES } from '../../../src/types';
import { relativeDateLabel, formatDateLong } from '../../../src/utils/dates';
import { COLORS, SPACING, RADIUS, FONT } from '../../../src/utils/theme';

const SNOOZE_OPTIONS = [
  { label: '24 hours', hours: 24 },
  { label: '3 days', hours: 72 },
  { label: '1 week', hours: 168 },
];

export default function ReminderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showSnoozeModal, setShowSnoozeModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Editable fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ReminderCategory>('custom');
  const [expirationDate, setExpirationDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tagsInput, setTagsInput] = useState('');

  const fetchReminder = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const r = await getReminder(id);
      setReminder(r);
      setTitle(r.title);
      setDescription(r.description ?? '');
      setCategory(r.category);
      setExpirationDate(new Date(r.expiration_date));
      setTagsInput(r.tags.join(', '));
    } catch {
      Alert.alert('Error', 'Could not load reminder.');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { fetchReminder(); }, [fetchReminder]);

  async function handleSave() {
    if (!user || !id || !title.trim()) return;
    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
    setSaving(true);
    try {
      const updated = await updateReminder(user.id, id, {
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        expiration_date: expirationDate,
        tags,
      });
      setReminder(updated);
      await cancelReminderNotifications(id);
      await scheduleAllNotifications(updated);
      setEditing(false);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save changes');
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete() {
    if (!user || !id) return;
    Alert.alert('Mark as completed?', 'This will move the reminder to your archive.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete',
        onPress: async () => {
          setSaving(true);
          try {
            await completeReminder(user.id, id);
            await cancelReminderNotifications(id);
            router.back();
          } catch (e: unknown) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Failed');
            setSaving(false);
          }
        },
      },
    ]);
  }

  async function handleSnooze(hours: number) {
    if (!user || !id) return;
    setShowSnoozeModal(false);
    setSaving(true);
    try {
      const updated = await snoozeReminder(user.id, id, hours);
      setReminder(updated);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not snooze');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!user || !id) return;
    setShowDeleteConfirm(false);
    setSaving(true);
    try {
      await cancelReminderNotifications(id);
      await deleteReminder(user.id, id);
      router.back();
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not delete');
      setSaving(false);
    }
  }

  function onDateChange(_: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selected) setExpirationDate(selected);
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (!reminder) return null;

  const isOverdue = new Date(reminder.expiration_date) < new Date();
  const escalationWarning =
    reminder.snooze_count > 0 && reminder.snooze_count >= reminder.max_snoozes - 1;

  return (
    <View style={styles.container}>
      {/* Nav */}
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBack}>
          <Text style={styles.navBackText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>
          {editing ? 'Edit Reminder' : reminder.title}
        </Text>
        {editing ? (
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || !title.trim()}
            style={[styles.navAction, (!title.trim() || saving) && { opacity: 0.4 }]}
          >
            {saving ? <ActivityIndicator color={COLORS.primary} size="small" /> : (
              <Text style={styles.navActionText}>Save</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => setEditing(true)}
            style={styles.navAction}
          >
            <Text style={styles.navActionText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status banner */}
        {isOverdue && (
          <View style={styles.overdueBanner}>
            <Text style={styles.overdueText}>🔴 This reminder is overdue</Text>
          </View>
        )}
        {escalationWarning && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              ⚠️ You&apos;ve snoozed this {reminder.snooze_count}×. One more snooze = escalation.
            </Text>
          </View>
        )}

        {editing ? (
          /* ---- Edit mode ---- */
          <View style={styles.editForm}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              maxLength={120}
              editable={!saving}
            />

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

            <Text style={styles.label}>Expiration Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {expirationDate.toLocaleDateString('en-US', {
                  month: 'long', day: 'numeric', year: 'numeric',
                })}
              </Text>
              <Text>📅</Text>
            </TouchableOpacity>
            {(showDatePicker || Platform.OS === 'ios') && editing && (
              <DateTimePicker
                value={expirationDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                minimumDate={new Date()}
                onChange={onDateChange}
              />
            )}

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              editable={!saving}
            />

            <Text style={styles.label}>Tags (comma-separated)</Text>
            <TextInput
              style={styles.input}
              value={tagsInput}
              onChangeText={setTagsInput}
              autoCapitalize="none"
              editable={!saving}
            />
          </View>
        ) : (
          /* ---- View mode ---- */
          <View style={styles.detailView}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailIcon}>{CATEGORY_ICONS[reminder.category]}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailTitle}>{reminder.title}</Text>
                <Text style={styles.detailCategory}>{CATEGORY_LABELS[reminder.category]}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Expires</Text>
              <Text style={[styles.detailValue, isOverdue && { color: COLORS.danger, fontWeight: '700' }]}>
                {formatDateLong(reminder.expiration_date)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status</Text>
              <Text style={styles.detailValue}>
                {relativeDateLabel(reminder.expiration_date)}
              </Text>
            </View>
            {reminder.description && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Notes</Text>
                <Text style={styles.detailNote}>{reminder.description}</Text>
              </View>
            )}
            {reminder.tags.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Tags</Text>
                <View style={styles.tagRow}>
                  {reminder.tags.map((tag) => (
                    <View key={tag} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Snoozes used</Text>
              <Text style={styles.detailValue}>
                {reminder.snooze_count} / {reminder.max_snoozes}
              </Text>
            </View>
          </View>
        )}

        {/* Actions */}
        {!editing && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionComplete}
              onPress={handleComplete}
              disabled={saving}
            >
              <Text style={styles.actionCompleteText}>✅ Mark Complete</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionSnooze}
              onPress={() => setShowSnoozeModal(true)}
              disabled={saving || reminder.snooze_count >= reminder.max_snoozes}
            >
              <Text style={styles.actionSnoozeText}>
                {reminder.snooze_count >= reminder.max_snoozes
                  ? '🔔 Max snoozes reached'
                  : '😴 Snooze'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionDelete}
              onPress={() => setShowDeleteConfirm(true)}
              disabled={saving}
            >
              <Text style={styles.actionDeleteText}>🗑 Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Snooze modal */}
      <Modal
        visible={showSnoozeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSnoozeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Snooze until…</Text>
            {SNOOZE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.hours}
                style={styles.modalOption}
                onPress={() => handleSnooze(opt.hours)}
              >
                <Text style={styles.modalOptionText}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowSnoozeModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete confirm modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Delete this reminder?</Text>
            <Text style={styles.modalBody}>This cannot be undone.</Text>
            <TouchableOpacity style={styles.modalDelete} onPress={handleDelete}>
              <Text style={styles.modalDeleteText}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowDeleteConfirm(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  navBack: { minWidth: 60 },
  navBackText: { fontSize: FONT.md, color: COLORS.primary },
  navTitle: { fontSize: FONT.lg, fontWeight: '700', color: COLORS.text, flex: 1, textAlign: 'center' },
  navAction: { minWidth: 60, alignItems: 'flex-end' },
  navActionText: { fontSize: FONT.md, fontWeight: '700', color: COLORS.primary },
  content: { padding: SPACING.lg, gap: SPACING.md },
  overdueBanner: { backgroundColor: COLORS.dangerLight, borderRadius: RADIUS.md, padding: SPACING.md },
  overdueText: { color: COLORS.danger, fontWeight: '700', fontSize: FONT.sm },
  warningBanner: { backgroundColor: COLORS.warningLight, borderRadius: RADIUS.md, padding: SPACING.md },
  warningText: { color: COLORS.warning, fontWeight: '600', fontSize: FONT.sm },
  detailView: { gap: SPACING.md },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.sm },
  detailIcon: { fontSize: 40 },
  detailTitle: { fontSize: FONT.xl, fontWeight: '800', color: COLORS.text },
  detailCategory: { fontSize: FONT.sm, color: COLORS.textMuted, marginTop: 2 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailSection: { paddingVertical: SPACING.sm },
  detailLabel: { fontSize: FONT.sm, color: COLORS.textMuted, fontWeight: '600' },
  detailValue: { fontSize: FONT.md, color: COLORS.text },
  detailNote: { fontSize: FONT.md, color: COLORS.text, marginTop: 4, lineHeight: 22 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  tag: { backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  editForm: { gap: SPACING.md },
  label: { fontSize: FONT.sm, fontWeight: '600', color: COLORS.text },
  input: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 12, fontSize: FONT.md, color: COLORS.text },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  categoryRow: { flexDirection: 'row', gap: SPACING.sm, paddingVertical: SPACING.xs },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  categoryChipSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  catIcon: { fontSize: 16 },
  catLabel: { fontSize: FONT.sm, fontWeight: '600', color: COLORS.textMuted },
  catLabelSelected: { color: COLORS.primary },
  dateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 12 },
  dateButtonText: { fontSize: FONT.md, color: COLORS.text },
  actions: { gap: SPACING.sm, marginTop: SPACING.lg },
  actionComplete: { backgroundColor: COLORS.success, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center' },
  actionCompleteText: { color: '#fff', fontWeight: '700', fontSize: FONT.md },
  actionSnooze: { backgroundColor: COLORS.warningLight, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.warning },
  actionSnoozeText: { color: COLORS.warning, fontWeight: '700', fontSize: FONT.md },
  actionDelete: { backgroundColor: COLORS.dangerLight, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.danger },
  actionDeleteText: { color: COLORS.danger, fontWeight: '700', fontSize: FONT.md },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg, padding: SPACING.lg, gap: SPACING.sm },
  modalTitle: { fontSize: FONT.lg, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.sm },
  modalBody: { fontSize: FONT.md, color: COLORS.textMuted, marginBottom: SPACING.sm },
  modalOption: { paddingVertical: 14, borderRadius: RADIUS.md, backgroundColor: COLORS.background, alignItems: 'center' },
  modalOptionText: { fontSize: FONT.md, fontWeight: '600', color: COLORS.text },
  modalDelete: { paddingVertical: 14, borderRadius: RADIUS.md, backgroundColor: COLORS.danger, alignItems: 'center' },
  modalDeleteText: { color: '#fff', fontWeight: '700', fontSize: FONT.md },
  modalCancel: { paddingVertical: 14, alignItems: 'center' },
  modalCancelText: { fontSize: FONT.md, color: COLORS.textMuted },
});
