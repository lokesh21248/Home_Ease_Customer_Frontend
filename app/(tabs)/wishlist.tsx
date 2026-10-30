/**
 * Wishlist Screen — Saved favorite services list connected to Catalog API.
 * Route: /(tabs)/wishlist
 */

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
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, Shadows } from '../../src/constants/theme';
import { LayoutConstants, getScrollBottomPadding, getHeaderTopPadding } from '../../src/constants/layout';
import { catalogApi, ServiceCategory } from '../../src/api/client';

const WISHLIST_STORAGE_KEY = '@homeease/wishlist_ids';
const PRIMARY_BLUE = LayoutConstants.BRAND_BLUE;

export default function WishlistScreen() {
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [cats, storedFavsRaw] = await Promise.all([
        catalogApi.getCategories().catch(() => []),
        AsyncStorage.getItem(WISHLIST_STORAGE_KEY),
      ]);
      const storedFavs: string[] = storedFavsRaw ? JSON.parse(storedFavsRaw) : [];
      setCategories(cats.filter((c) => c.isActive));
      setFavoriteIds(storedFavs);
    } catch {
      setCategories([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleFavorite = async (serviceId: string) => {
    const isFav = favoriteIds.includes(serviceId);
    const updated = isFav
      ? favoriteIds.filter((id) => id !== serviceId)
      : [...favoriteIds, serviceId];
    setFavoriteIds(updated);
    await AsyncStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(updated));
  };

  const handleItemPress = (item: ServiceCategory) => {
    router.push({
      pathname: '/category/[id]',
      params: { id: item.serviceId, name: item.name },
    });
  };

  // Favorited categories
  const wishlistItems = categories.filter((c) => favoriteIds.includes(c.serviceId));

  const headerTopPadding = getHeaderTopPadding(insets.top, 10);
  const bottomScrollPadding = getScrollBottomPadding(insets.bottom);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Top Blue StatusBar filler */}
      <View style={[styles.topBarFill, { height: insets.top, backgroundColor: PRIMARY_BLUE }]} />

      {/* Blue Header Section */}
      <View style={[styles.headerContainer, { paddingTop: headerTopPadding }]}>
        <Text style={styles.headerTitle}>My Wishlist</Text>
        <Text style={styles.headerSubtitle}>Saved services and favorite categories</Text>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={PRIMARY_BLUE} size="large" />
          <Text style={styles.loadingText}>Loading saved services…</Text>
        </View>
      ) : (
        <FlatList
          data={wishlistItems}
          keyExtractor={(item) => item.serviceId}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomScrollPadding }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadData();
              }}
              colors={[PRIMARY_BLUE]}
              tintColor={PRIMARY_BLUE}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => handleItemPress(item)}
              accessibilityRole="button"
              accessibilityLabel={item.name}
            >
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.cardImage}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View style={[styles.cardImage, styles.cardImageFallback]}>
                  <Ionicons name="sparkles" size={24} color={PRIMARY_BLUE} />
                </View>
              )}

              <View style={styles.cardInfo}>
                <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                {item.description ? (
                  <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
                ) : null}
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={13} color="#F59E0B" />
                  <Text style={styles.ratingText}>4.8 (120+ reviews)</Text>
                </View>
              </View>

              <Pressable
                style={styles.favBtn}
                onPress={() => toggleFavorite(item.serviceId)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Remove from wishlist"
              >
                <Ionicons name="heart" size={22} color="#EF4444" />
              </Pressable>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="heart-outline" size={44} color="#9CA3AF" />
              </View>
              <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
              <Text style={styles.emptySub}>
                Explore categories and tap the heart icon to save services for quick booking anytime.
              </Text>
              <Pressable
                style={styles.browseBtn}
                onPress={() => router.push('/(tabs)/categories')}
                accessibilityRole="button"
                accessibilityLabel="Explore Services"
              >
                <Text style={styles.browseBtnText}>Explore Services</Text>
              </Pressable>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  topBarFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99,
  },
  headerContainer: {
    backgroundColor: PRIMARY_BLUE,
    paddingHorizontal: LayoutConstants.HORIZONTAL_PADDING,
    paddingBottom: 22,
    borderBottomLeftRadius: LayoutConstants.HEADER_BORDER_RADIUS + 4,
    borderBottomRightRadius: LayoutConstants.HEADER_BORDER_RADIUS + 4,
  },
  headerTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 26,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255, 255, 255, 0.9)',
  },

  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 14,
    color: '#6B7280',
  },

  listContent: {
    padding: LayoutConstants.HORIZONTAL_PADDING,
    paddingTop: 16,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ECEFF3',
    alignItems: 'center',
    ...Shadows.sm,
    gap: 12,
  },
  cardPressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.95,
  },
  cardImage: {
    width: 68,
    height: 68,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
  },
  cardImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
  },
  cardInfo: {
    flex: 1,
    gap: 3,
  },
  cardName: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  cardDesc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 11.5,
    color: Colors.textSecondary,
  },
  favBtn: {
    padding: 6,
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  emptySub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  browseBtn: {
    backgroundColor: PRIMARY_BLUE,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 22,
    marginTop: 8,
    ...Shadows.sm,
  },
  browseBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: '#FFFFFF',
  },
});
