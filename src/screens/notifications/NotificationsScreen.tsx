import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { useNotifications } from '../../context/NotificationContext';
import { NotificationItem } from '../../types';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { Header } from '../../components/common/Header';
import { EmptyState } from '../../components/common/EmptyState';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

type NotificationsNavProp = StackNavigationProp<RootStackParamList, 'Notifications'>;

interface Props {
  navigation: NotificationsNavProp;
}

export const NotificationsScreen: React.FC<Props> = ({ navigation }) => {
  const { notifications, markAsRead, markAllAsRead } = useNotifications();

  const handleNotificationPress = async (item: NotificationItem) => {
    await markAsRead(item.id);
    if (item.targetScreen === 'LiveTracking' && item.targetParams?.bookingId) {
      navigation.navigate('LiveTracking', { bookingId: item.targetParams.bookingId });
    } else if (item.targetScreen === 'BookingDetails' && item.targetParams?.bookingId) {
      navigation.navigate('BookingDetails', { bookingId: item.targetParams.bookingId });
    } else if (item.targetScreen === 'OffersCoupons') {
      navigation.navigate('OffersCoupons');
    }
  };

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'professional':
        return 'person-circle-outline';
      case 'booking':
        return 'calendar-outline';
      case 'payment':
        return 'card-outline';
      case 'offer':
        return 'pricetag-outline';
      default:
        return 'notifications-outline';
    }
  };

  return (
    <ScreenWrapper>
      <Header
        title="Notifications"
        onBack={() => navigation.goBack()}
        rightAction={
          notifications.some((n) => !n.read) ? (
            <TouchableOpacity onPress={markAllAsRead} style={styles.markAllBtn}>
              <Text style={styles.markAllText}>Mark all</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {notifications.length === 0 ? (
          <EmptyState
            iconName="notifications-off-outline"
            title="No Notifications"
            description="You are all caught up! Real-time updates about your bookings and exclusive discounts will show up here."
          />
        ) : (
          notifications.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.8}
              onPress={() => handleNotificationPress(item)}
              style={[
                styles.notifCard,
                !item.read && styles.notifCardUnread,
                SHADOWS.subtle,
              ]}
            >
              <View
                style={[
                  styles.iconCircle,
                  !item.read ? styles.iconCircleUnread : undefined,
                ]}
              >
                <Ionicons
                  name={getIcon(item.type)}
                  size={20}
                  color={!item.read ? COLORS.primaryDark : COLORS.textSecondary}
                />
              </View>

              <View style={styles.contentCol}>
                <View style={styles.titleRow}>
                  <Text style={[styles.title, !item.read && styles.titleBold]}>
                    {item.title}
                  </Text>
                  {!item.read && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.message}>{item.message}</Text>
                <Text style={styles.timestamp}>{item.timestamp}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.xs,
    paddingBottom: 40,
  },
  markAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryDark,
    textDecorationLine: 'underline',
  },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: RADIUS.xl,
    padding: SPACING.base,
    marginBottom: SPACING.sm,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'flex-start',
  },
  notifCardUnread: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: COLORS.accent,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(235, 245, 240, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconCircleUnread: {
    backgroundColor: COLORS.accent,
  },
  contentCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primaryDark,
    flex: 1,
  },
  titleBold: {
    fontWeight: '800',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.error,
    marginLeft: 6,
  },
  message: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginTop: 4,
  },
  timestamp: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 6,
  },
});
