import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Search, ChevronRight, Wrench } from 'lucide-react-native';
import { catalogApi, SubService } from '../../src/api/client';
import { Colors, Typography, Shadows } from '../../src/constants/theme';
import { getHeaderTopPadding } from '../../src/constants/layout';

export default function CategorySubservicesScreen() {
  const { id, name, image } = useLocalSearchParams<{ id: string; name?: string; image?: string }>();
  const insets = useSafeAreaInsets();
  
  const [subServices, setSubServices] = useState<SubService[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchSubServices() {
      if (!id) return;
      try {
        setLoading(true);
        const data = await catalogApi.getSubServices(id);
        if (data && Array.isArray(data)) {
          setSubServices(data.filter((s) => s.isActive));
        } else {
          setSubServices([]);
        }
      } catch (err) {
        console.warn('Failed to fetch sub-services from API:', err);
        setSubServices([]);
      } finally {
        setLoading(false);
      }
    }
    fetchSubServices();
  }, [id]);

  const filteredSubServices = useMemo(() => {
    return subServices.filter((s: SubService) => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [subServices, searchQuery]);

  const categoryName = name || 'Service Options';
  const displaySubtitle = `Choose the right ${categoryName.toLowerCase().split(' ')[0]} service`;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: getHeaderTopPadding(insets.top, 10) }]}>
        <View style={styles.headerTopRow}>
          <Pressable 
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <ArrowLeft color="#fff" size={24} />
          </Pressable>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>{categoryName}</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>{displaySubtitle}</Text>
          </View>
          
          <Pressable style={styles.searchBtn}>
            <Search color={Colors.primary} size={20} />
          </Pressable>
        </View>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search color="#8E93A6" size={20} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${categoryName.toLowerCase()}...`}
            placeholderTextColor="#8E93A6"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>
      
      {/* List */}
      <ScrollView 
        contentContainerStyle={[
          styles.listContent, 
          { paddingBottom: Math.max(insets.bottom, 20) + 80 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : filteredSubServices.length === 0 ? (
          <Text style={styles.emptyText}>No services found.</Text>
        ) : (
          <View style={styles.grid}>
            {filteredSubServices.map((sub) => (
              <Pressable
                key={sub.subServiceId}
                style={styles.card}
                onPress={() => router.push({
                  pathname: '/service/[id]',
                  params: {
                    id: id,
                    name: categoryName,
                    image: image || sub.imageUrl,
                    subServiceId: sub.subServiceId
                  }
                })}
              >
                {sub.imageUrl ? (
                  <Image 
                    source={{ uri: sub.imageUrl }}
                    style={styles.cardImage}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.placeholderContainer}>
                    <Wrench color="#8E93A6" size={28} />
                  </View>
                )}
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {sub.name}
                  </Text>
                  <Text style={styles.cardDesc} numberOfLines={2}>
                    {/* Simulated subtitle since backend doesn't provide a sub-description per subservice */}
                    Complete care and premium service for your home
                  </Text>
                  
                  <View style={styles.cardFooter}>
                    <Text style={styles.priceText}>
                      <Text style={styles.priceBold}>₹{sub.basePrice}</Text> onwards
                    </Text>
                    <View style={styles.arrowBtn}>
                      <ChevronRight color="#0066FF" size={16} strokeWidth={3} />
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  header: {
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 24,
    ...Shadows.md,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '700',
    fontFamily: Typography.fontFamily.bold,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    marginTop: 2,
    fontFamily: Typography.fontFamily.regular,
  },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: Colors.textPrimary,
    fontSize: 15,
    fontFamily: Typography.fontFamily.regular,
  },
  listContent: {
    padding: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  cardImage: {
    width: '100%',
    height: 100,
    backgroundColor: '#F0F2F5',
  },
  placeholderContainer: {
    width: '100%',
    height: 100,
    backgroundColor: '#F0F2F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
    fontFamily: Typography.fontFamily.bold,
  },
  cardDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 12,
    lineHeight: 16,
    fontFamily: Typography.fontFamily.regular,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
  },
  priceBold: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0066FF',
    fontFamily: Typography.fontFamily.bold,
  },
  arrowBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginTop: 40,
    fontSize: 16,
  },
});
