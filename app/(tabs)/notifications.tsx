import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import { bookingApi, catalogApi } from '../../src/api/client';

type Tab = 'All' | 'Bookings' | 'Offers' | 'Updates';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;
  icon: string;
  read: boolean;
  type: 'Bookings' | 'Offers' | 'Updates';
  iconBg: string;
  targetId?: string;
}

const TABS: Tab[] = ['All', 'Bookings', 'Offers', 'Updates'];

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('All');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const [bookings, banners] = await Promise.all([
        bookingApi.getMyBookings().catch(() => []),
        catalogApi.getBanners().catch(() => []),
      ]);

      const items: NotificationItem[] = [];

      // Transform real bookings into notifications
      bookings.forEach((b) => {
        const shortId = b.bookingId.slice(0, 6).toUpperCase();
        const date = new Date(b.scheduledAt).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
        });

        if (b.status === 'SEARCHING') {
          items.push({
            id: `booking-${b.bookingId}`,
            title: 'Booking Placed',
            body: `Your booking #${shortId} for ${b.serviceName} is scheduled for ${date}. Finding nearby partner.`,
            time: 'Active',
            icon: '📋',
            read: false,
            type: 'Bookings',
            iconBg: '#EFF6FF',
            targetId: b.bookingId,
          });
        } else if (b.status === 'ACCEPTED') {
          items.push({
            id: `booking-${b.bookingId}`,
            title: 'Partner Assigned!',
            body: `${b.workerName || 'A partner'} accepted your booking for ${b.serviceName}. Share PIN ${b.pinCode} upon arrival.`,
            time: 'Upcoming',
            icon: '🚗',
            read: false,
            type: 'Bookings',
            iconBg: '#ECFDF5',
            targetId: b.bookingId,
          });
        } else if (b.status === 'IN_PROGRESS') {
          items.push({
            id: `booking-${b.bookingId}`,
            title: 'Service in Progress',
            body: `Partner is currently delivering service for ${b.serviceName}.`,
            time: 'Ongoing',
            icon: '⚡',
            read: false,
            type: 'Bookings',
            iconBg: '#FEF3C7',
            targetId: b.bookingId,
          });
        } else if (b.status === 'COMPLETED') {
          items.push({
            id: `booking-${b.bookingId}`,
            title: 'Service Completed',
            body: `Your service for ${b.serviceName} was completed. Total paid: ₹${b.totalAmount}.`,
            time: 'Completed',
            icon: '✅',
            read: true,
            type: 'Bookings',
            iconBg: '#F0FDF4',
            targetId: b.bookingId,
          });
        }
      });

      // Transform active banners into offers/updates
      banners.forEach((banner, idx) => {
        items.push({
          id: `banner-${banner.bannerId || idx}`,
          title: banner.title || 'Special Promotion',
          body: `Explore exclusive offers on HomeEase today!`,
          time: 'Featured',
          icon: '🎟️',
          read: true,
          type: 'Offers',
          iconBg: '#FFF7ED',
          targetId: banner.targetId,
        });
      });

      setNotifications(items);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const filtered = tab === 'All' ? notifications : notifications.filter((n) => n.type === tab);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((ns) => ns.map((n) => ({ ...n, read: true })));
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 ? (
          <Pressable onPress={markAllRead}>
            <Text style={styles.markAll}>Mark all read</Text>
          </Pressable>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {TABS.map((t) => (
          <Pressable
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </Pressable>
        ))}
      </View>

      {/* Notifications list */}
      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(n) => n.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.notifCard, !item.read && styles.notifCardUnread]}
              onPress={() => {
                setNotifications((ns) =>
                  ns.map((n) => (n.id === item.id ? { ...n, read: true } : n))
                );
                if (item.type === 'Bookings' && item.targetId) {
                  router.push(`/booking/track/${item.targetId}`);
                }
              }}
            >
              <View style={[styles.notifIconBox, { backgroundColor: item.iconBg }]}>
                <Text style={styles.notifIconText}>{item.icon}</Text>
                {!item.read && <View style={styles.unreadDot} />}
              </View>
              <View style={styles.notifContent}>
                <View style={styles.notifTopRow}>
                  <Text style={[styles.notifTitle, !item.read && styles.notifTitleBold]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.notifTime}>{item.time}</Text>
                </View>
                <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🔔</Text>
              <Text style={styles.emptyTitle}>No notifications</Text>
              <Text style={styles.emptySub}>
                {tab === 'All'
                  ? 'Your booking updates and offers will appear here.'
                  : `No ${tab.toLowerCase()} notifications found.`}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.textPrimary,
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
  markAll: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
  },

  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceLight,
  },
  tabBtnActive: { backgroundColor: Colors.primary },
  tabText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontFamily: Typography.fontFamily.semiBold,
  },

  list: {
    padding: Spacing.base,
    gap: Spacing.sm,
  },

  notifCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    gap: Spacing.md,
    alignItems: 'flex-start',
    ...Shadows.sm,
  },
  notifCardUnread: {
    backgroundColor: Colors.primaryFade2,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  notifIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    flexShrink: 0,
  },
  notifIconText: { fontSize: 22 },
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: '#fff',
  },
  notifContent: { flex: 1, gap: 4 },
  notifTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  notifTitle: {
    flex: 1,
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  notifTitleBold: {
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  notifTime: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    flexShrink: 0,
  },
  notifBody: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: Spacing.md,
  },
  emptyIcon: { fontSize: 56 },
  emptyTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.lg,
    color: Colors.textSecondary,
  },
  emptySub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
});
