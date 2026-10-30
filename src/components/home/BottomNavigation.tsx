import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, LayoutGrid, Calendar, Heart, User } from 'lucide-react-native';
import { HomeColors } from './types';
import { Typography } from '../../constants/theme';
import { LayoutConstants } from '../../constants/layout';
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
      icon: (color) => <Home size={22} color={color} strokeWidth={currentTab === 'index' ? 2.4 : 2} />,
    },
    {
      key: 'categories',
      label: 'Categories',
      route: '/(tabs)/categories',
      icon: (color) => <LayoutGrid size={22} color={color} strokeWidth={currentTab === 'categories' ? 2.4 : 2} />,
    },
    {
      key: 'bookings',
      label: 'Bookings',
      route: '/(tabs)/bookings',
      icon: (color) => <Calendar size={22} color={color} strokeWidth={currentTab === 'bookings' ? 2.4 : 2} />,
    },
    {
      key: 'wishlist',
      label: 'Wishlist',
      route: '/(tabs)/wishlist',
      icon: (color) => <Heart size={22} color={color} strokeWidth={currentTab === 'wishlist' ? 2.4 : 2} />,
    },
    {
      key: 'profile',
      label: 'Profile',
      route: '/(tabs)/profile',
      icon: (color) => <User size={22} color={color} strokeWidth={currentTab === 'profile' ? 2.4 : 2} />,
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
          const color = isActive ? HomeColors.activeBlue : HomeColors.secondaryGray;

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

              {/* Small blue active indicator below */}
              {isActive ? (
                <View style={styles.activeIndicator} />
              ) : (
                <View style={styles.indicatorPlaceholder} />
              )}
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: LayoutConstants.TAB_BAR_TOP_PADDING,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.04)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
    }),
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: LayoutConstants.TAB_BAR_BASE_HEIGHT,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
  },
  iconContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  labelActive: {
    fontFamily: Typography.fontFamily.bold,
    color: HomeColors.activeBlue,
  },
  labelInactive: {
    fontFamily: Typography.fontFamily.medium,
    color: HomeColors.secondaryGray,
  },
  activeIndicator: {
    marginTop: 4,
    width: 18,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: HomeColors.activeBlue,
  },
  indicatorPlaceholder: {
    marginTop: 4,
    width: 18,
    height: 3,
  },
});
