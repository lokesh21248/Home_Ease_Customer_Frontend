/**
 * Reminders Screen — Pronto-style service reminders management.
 * Route: /profile/reminders
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Switch,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import { bookingApi } from '../../src/api/client';

interface ReminderItem {
  id: string;
  serviceTitle: string;
  datetimeText: string;
  description: string;
  isEnabled: boolean;
  type: 'upcoming' | 'past';
}

export default function RemindersScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'create'>('upcoming');
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [loading, setLoading] = useState(true);

  // New reminder modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('');

  const fetchBookingsAsReminders = React.useCallback(async () => {
    try {
      const bookings = await bookingApi.getMyBookings();
      const items: ReminderItem[] = bookings.map((b) => {
        const d = new Date(b.scheduledAt);
        const dateStr = d.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
        const timeStr = d.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        });
        const isPast = b.status === 'COMPLETED' || b.status === 'CANCELLED';

        return {
          id: b.bookingId,
          serviceTitle: b.serviceName,
          datetimeText: `${dateStr} • ${timeStr}`,
          description: isPast
            ? `Status: ${b.status} (Total: ₹${b.totalAmount})`
            : b.status === 'ARRIVED' && b.pinCode && b.pinCode !== '****'
            ? `Service partner arrived (PIN: ${b.pinCode})`
            : 'Scheduled service appointment',
          isEnabled: !isPast,
          type: isPast ? 'past' : 'upcoming',
        };
      });
      setReminders(items);
    } catch {
      setReminders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchBookingsAsReminders();
  }, [fetchBookingsAsReminders]);

  const toggleReminder = (id: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isEnabled: !r.isEnabled } : r))
    );
  };

  const handleAddReminder = () => {
    if (!newTitle.trim()) {
      Alert.alert('Required', 'Please enter a service name.');
      return;
    }
    const newRem: ReminderItem = {
      id: Date.now().toString(),
      serviceTitle: newTitle.trim(),
      datetimeText: newTime.trim() || 'Tomorrow • 10:00 AM',
      description: 'Scheduled reminder for home service.',
      isEnabled: true,
      type: 'upcoming',
    };
    setReminders([newRem, ...reminders]);
    setNewTitle('');
    setNewTime('');
    setModalVisible(false);
    setActiveTab('upcoming');
  };

  const filteredList =
    activeTab === 'create'
      ? reminders
      : reminders.filter((r) => r.type === activeTab);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Reminders</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {(['upcoming', 'past', 'create'] as const).map((tab) => {
          const isActive = activeTab === tab;
          const label = tab === 'upcoming' ? 'Upcoming' : tab === 'past' ? 'Past' : 'Create';
          return (
            <Pressable
              key={tab}
              style={[styles.tabPill, isActive && styles.tabPillActive]}
              onPress={() => {
                if (tab === 'create') {
                  setModalVisible(true);
                } else {
                  setActiveTab(tab);
                }
              }}
            >
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Reminders List */}
      <FlatList
        data={filteredList}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.bellIconWrap}>
              <Text style={styles.bellIcon}>🔔</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.serviceTitle}>{item.serviceTitle}</Text>
              <Text style={styles.datetimeText}>{item.datetimeText}</Text>
              {item.description ? (
                <Text style={styles.descText}>{item.description}</Text>
              ) : null}
            </View>
            <Switch
              value={item.isEnabled}
              onValueChange={() => toggleReminder(item.id)}
              trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
              thumbColor={item.isEnabled ? Colors.primary : '#FFFFFF'}
            />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>No reminders in this tab</Text>
            <Text style={styles.emptySub}>Set reminders so you never miss a service visit.</Text>
          </View>
        }
      />

      {/* Add Reminder Bottom Button */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.addBtnText}>+ Add Reminder</Text>
        </TouchableOpacity>
      </View>

      {/* Add Reminder Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set New Reminder</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Service Name (e.g. RO Filter Cleaning)"
              placeholderTextColor={Colors.textMuted}
              value={newTitle}
              onChangeText={setNewTitle}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Date & Time (e.g. Nov 5 • 10:00 AM)"
              placeholderTextColor={Colors.textMuted}
              value={newTime}
              onChangeText={setNewTime}
            />
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleAddReminder}
              >
                <Text style={styles.modalConfirmText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 26,
    color: Colors.textPrimary,
    lineHeight: 28,
  },
  headerTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.textPrimary,
  },
  headerRightPlaceholder: {
    width: 36,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  tabPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabPillActive: {
    backgroundColor: Colors.primary,
  },
  tabLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: Spacing.base,
    gap: 12,
    paddingBottom: 100,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: '#ECEFF3',
    gap: 12,
  },
  bellIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellIcon: {
    fontSize: 20,
  },
  infoCol: {
    flex: 1,
    gap: 2,
  },
  serviceTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  datetimeText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
  },
  descText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.base,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F5',
  },
  addBtn: {
    height: 50,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.blue,
  },
  addBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: '#FFFFFF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 10,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.textPrimary,
  },
  emptySub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    padding: Spacing.xl,
    gap: 14,
  },
  modalTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xl,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  modalInput: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: BorderRadius.md,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },
  modalConfirmBtn: {
    flex: 1,
    height: 46,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.base,
    color: '#FFFFFF',
  },
});
