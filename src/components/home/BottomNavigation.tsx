import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutGrid, Calendar, Heart, User } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export type TabKey = 'index' | 'categories' | 'bookings' | 'wishlist' | 'profile';

interface NavItemConfig {
  key: TabKey;
  label: string;
  icon: (color: string) => React.ReactNode;
  route: string;
}

interface BottomNavigationProps {
  activeTab?: TabKey;
  onTabPress?: (key: TabKey) => void;
  state?: any; // Expo Router BottomTabBarProps compatibility
  descriptors?: any;
  navigation?: any;
}

export function BottomNavigation({
  activeTab = 'index',
  onTabPress,
  state,
  navigation,
}: BottomNavigationProps) {
  const insets = useSafeAreaInsets();
  // Safe bottom padding: on devices with a physical or software bottom gesture/3-button bar
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 4);

  // If used as Expo Router's custom tabBar, derive activeTab from state
  const currentTab: TabKey = state
    ? (state.routes[state.index]?.name as TabKey) || activeTab
    : activeTab;

  const NAV_ITEMS: NavItemConfig[] = [
    {
      key: 'index',
      label: 'Home',
      route: '/(tabs)',
      icon: (color) => (
        <Ionicons
          name={currentTab === 'index' ? 'home' : 'home-outline'}
          size={24}
          color={color}
        />
      ),
    },
    {
      key: 'categories',
      label: 'Services',
      route: '/(tabs)/categories',
      icon: (color) => <LayoutGrid size={24} color={color} strokeWidth={currentTab === 'categories' ? 2.4 : 1.9} />,
    },
    {
      key: 'bookings',
      label: 'Bookings',
      route: '/(tabs)/bookings',
      icon: (color) => <Calendar size={24} color={color} strokeWidth={currentTab === 'bookings' ? 2.4 : 1.9} />,
    },
    {
      key: 'wishlist',
      label: 'Wishlist',
      route: '/(tabs)/wishlist',
      icon: (color) => <Heart size={24} color={color} strokeWidth={currentTab === 'wishlist' ? 2.4 : 1.9} />,
    },
    {
      key: 'profile',
      label: 'Profile',
      route: '/(tabs)/profile',
      icon: (color) => <User size={24} color={color} strokeWidth={currentTab === 'profile' ? 2.4 : 1.9} />,
    },
  ];

  const handlePress = (item: NavItemConfig) => {
    if (onTabPress) {
      onTabPress(item.key);
    }
    if (navigation && state) {
      const event = navigation.emit({
        type: 'tabPress',
        target: state.routes.find((r: any) => r.name === item.key)?.key,
        canPreventDefault: true,
      });
      if (!event.defaultPrevented) {
        navigation.navigate(item.key);
      }
    } else {
      router.push(item.route as any);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: bottomInset }]}>
      <View style={styles.navRow}>
        {NAV_ITEMS.map((item) => {
          const isActive = currentTab === item.key;
          const color = isActive ? '#0052FF' : '#64748B';

          return (
            <Pressable
              key={item.key}
              style={styles.navItem}
              onPress={() => handlePress(item)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={item.label}
            >
              <View style={styles.iconContainer}>
                {item.icon(color)}
              </View>

              <Text
                style={[
                  styles.label,
                  isActive ? styles.labelActive : styles.labelInactive,
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
    }),
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 54,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  iconContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    marginTop: 3,
    textAlign: 'center',
  },
  labelActive: {
    fontWeight: '700',
    color: '#0052FF',
  },
  labelInactive: {
    fontWeight: '500',
    color: '#64748B',
  },
});
