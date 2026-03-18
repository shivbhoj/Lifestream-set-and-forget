import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { useReminders } from '../../src/hooks/useReminders';
import type { Reminder, ReminderSection } from '../../src/types';
import { CATEGORY_ICONS } from '../../src/types';
import { relativeDateLabel, formatDate } from '../../src/utils/dates';
import { COLORS, SPACING, RADIUS, FONT } from '../../src/utils/theme';

export default function DashboardScreen() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const { sections, loading, refetch } = useReminders(user?.id ?? null);

  const totalActive = sections.reduce((sum, s) => sum + s.data.length, 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Hey, {profile?.display_name?.split(' ')[0] ?? 'there'} 👋
          </Text>
          <Text style={styles.subtitle}>
            {totalActive === 0
              ? 'All clear — nothing due soon!'
              : `${totalActive} active reminder${totalActive > 1 ? 's' : ''}`}
          </Text>
        </View>
        <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {loading && sections.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : sections.length === 0 ? (
        <EmptyState />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section }) => (
            <SectionHeader section={section as ReminderSection} />
          )}
          renderItem={({ item, section }) => (
            <ReminderCard
              reminder={item}
              type={(section as ReminderSection).type}
              onPress={() => router.push(`/(app)/reminders/${item.id}`)}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={COLORS.primary} />
          }
          stickySectionHeadersEnabled={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(app)/reminders/new')}
        accessibilityLabel="Add reminder"
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

function SectionHeader({ section }: { section: ReminderSection }) {
  const isOverdue = section.type === 'overdue';
  return (
    <View style={[styles.sectionHeader, isOverdue && styles.sectionHeaderOverdue]}>
      <Text style={[styles.sectionTitle, isOverdue && styles.sectionTitleOverdue]}>
        {isOverdue ? '🔴 ' : ''}{section.title}
      </Text>
      <Text style={[styles.sectionCount, isOverdue && styles.sectionCountOverdue]}>
        {section.data.length}
      </Text>
    </View>
  );
}

function ReminderCard({
  reminder,
  type,
  onPress,
}: {
  reminder: Reminder;
  type: ReminderSection['type'];
  onPress: () => void;
}) {
  const isOverdue = type === 'overdue';
  return (
    <TouchableOpacity
      style={[styles.card, isOverdue && styles.cardOverdue]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardLeft}>
        <Text style={styles.cardIcon}>{CATEGORY_ICONS[reminder.category]}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {reminder.title}
        </Text>
        <Text
          style={[styles.cardDate, isOverdue && styles.cardDateOverdue]}
        >
          {relativeDateLabel(reminder.expiration_date)}
        </Text>
        {reminder.tags.length > 0 && (
          <View style={styles.tagRow}>
            {reminder.tags.slice(0, 3).map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.cardExpiry}>{formatDate(reminder.expiration_date)}</Text>
        {reminder.status === 'snoozed' && (
          <Text style={styles.snoozeBadge}>Snoozed</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function EmptyState() {
  const router = useRouter();
  return (
    <View style={styles.emptyContainer}>
      <Text style={{ fontSize: 56 }}>✅</Text>
      <Text style={styles.emptyTitle}>Nothing due</Text>
      <Text style={styles.emptySubtitle}>
        Tap + to add your first reminder — passport, car registration, HVAC filter, anything.
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => router.push('/(app)/reminders/new')}
      >
        <Text style={styles.emptyButtonText}>Add First Reminder</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 60,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  greeting: {
    fontSize: FONT.xl,
    fontWeight: '800',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: FONT.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  signOutBtn: {
    marginTop: 4,
  },
  signOutText: {
    fontSize: FONT.sm,
    color: COLORS.textMuted,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xs,
  },
  sectionHeaderOverdue: {},
  sectionTitle: {
    fontSize: FONT.sm,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionTitleOverdue: {
    color: COLORS.danger,
  },
  sectionCount: {
    fontSize: FONT.sm,
    fontWeight: '700',
    color: COLORS.textMuted,
    backgroundColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  sectionCountOverdue: {
    color: COLORS.danger,
    backgroundColor: COLORS.dangerLight,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardOverdue: {
    borderColor: COLORS.danger,
    backgroundColor: COLORS.dangerLight,
  },
  cardLeft: {
    marginRight: SPACING.md,
  },
  cardIcon: {
    fontSize: 28,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: FONT.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  cardDate: {
    fontSize: FONT.sm,
    color: COLORS.textMuted,
  },
  cardDateOverdue: {
    color: COLORS.danger,
    fontWeight: '600',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: SPACING.xs,
  },
  tag: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
  },
  cardRight: {
    alignItems: 'flex-end',
    marginLeft: SPACING.sm,
  },
  cardExpiry: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  snoozeBadge: {
    fontSize: 10,
    color: COLORS.warning,
    fontWeight: '700',
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: SPACING.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  fabIcon: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 32,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
  emptyTitle: {
    fontSize: FONT.xl,
    fontWeight: '800',
    color: COLORS.text,
  },
  emptySubtitle: {
    fontSize: FONT.md,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyButton: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: SPACING.xl,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: FONT.md,
  },
});
