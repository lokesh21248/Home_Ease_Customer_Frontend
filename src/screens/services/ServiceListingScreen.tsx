import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { serviceApi } from '../../api/serviceApi';
import { Service } from '../../types';
import { useBooking } from '../../context/BookingContext';
import { useSavedServices } from '../../context/SavedServicesContext';
import { MOCK_CATEGORIES } from '../../constants/mockData';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { Header } from '../../components/common/Header';
import { ServiceCard } from '../../components/home/ServiceCard';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/common/Button';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

import { toValidUUID } from '../../utils/uuid';

type ServiceListingRouteProp = RouteProp<RootStackParamList, 'ServiceListing'>;
type ServiceListingNavProp = StackNavigationProp<RootStackParamList, 'ServiceListing'>;

interface Props {
  route: ServiceListingRouteProp;
  navigation: ServiceListingNavProp;
}

export const ServiceListingScreen: React.FC<Props> = ({ route, navigation }) => {
  const { categoryId, categoryName = 'Cleaning Services' } = route.params || {};
  const { setService } = useBooking();
  const { isSaved, toggleSave } = useSavedServices();

  const validCatId = toValidUUID(categoryId, 'be8bb640-cc11-4243-ab4a-5cbdf34a0937');
  const currentCategory = MOCK_CATEGORIES.find((c) => c.id === validCatId || c.id === categoryId);
  const tabs = ['All', ...(currentCategory?.subcategories || ['Home', 'Kitchen', 'Bathroom', 'Deep Clean'])];

  const [activeTab, setActiveTab] = useState('All');
  const [services, setServices] = useState<Service[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [sortBy, setSortBy] = useState<'recommended' | 'price_low' | 'price_high' | 'rating'>('recommended');
  const [minRating, setMinRating] = useState<number>(0);

  const loadServices = async () => {
    const list = await serviceApi.getServices({
      categoryId: validCatId,
      sortBy,
      minRating: minRating > 0 ? minRating : undefined,
    });
    setServices(list);
  };

  useEffect(() => {
    loadServices();
  }, [categoryId, sortBy, minRating]);

  const filteredServices = services.filter((s) => {
    // Filter by tab
    if (activeTab !== 'All') {
      const match =
        s.name.toLowerCase().includes(activeTab.toLowerCase()) ||
        s.description.toLowerCase().includes(activeTab.toLowerCase());
      if (!match) return false;
    }
    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.tagline?.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleSelectService = (service: Service) => {
    setService(service);
    navigation.navigate('ServiceDetails', { serviceId: service.id, service });
  };

  return (
    <ScreenWrapper>
      <Header
        title={categoryName}
        onBack={() => navigation.goBack()}
        rightAction={
          <View style={styles.headerRightRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowSearch(!showSearch)}
              style={styles.headerIconBtn}
            >
              <Ionicons name="search" size={20} color={COLORS.primaryDark} />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowFilterModal(true)}
              style={styles.headerIconBtn}
            >
              <Ionicons name="options-outline" size={20} color={COLORS.primaryDark} />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Collapsible Search Input */}
      {showSearch && (
        <View style={styles.searchBarWrapper}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={`Search ${categoryName}...`}
            placeholderTextColor={COLORS.textMuted}
            style={styles.searchInput}
            autoFocus
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {/* Category / Subcategory Tabs Strip */}
      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScrollView}
          contentContainerStyle={styles.tabsStrip}
        >
          {tabs.map((tab) => {
            const isSelected = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                activeOpacity={0.8}
                onPress={() => setActiveTab(tab)}
                style={[
                  styles.tabPill,
                  isSelected && styles.tabPillSelected,
                  SHADOWS.subtle,
                ]}
              >
                <Text style={[styles.tabText, isSelected && styles.tabTextSelected]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Service Listing List */}
      <ScrollView
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      >
        {filteredServices.length === 0 ? (
          <EmptyState
            title="No Services Found"
            description="We couldn't find any services matching your filter criteria. Try adjusting your filters or search query."
            actionTitle="Reset Filters"
            onAction={() => {
              setActiveTab('All');
              setSearchQuery('');
              setMinRating(0);
              setSortBy('recommended');
            }}
          />
        ) : (
          filteredServices.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onPress={() => handleSelectService(service)}
              onFavoritePress={() => toggleSave(service)}
              isFavorite={isSaved(service.id)}
            />
          ))
        )}
      </ScrollView>

      {/* Filter / Sort Modal */}
      <Modal visible={showFilterModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sort & Filter</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.primaryDark} />
              </TouchableOpacity>
            </View>

            <Text style={styles.filterSectionTitle}>Sort By</Text>
            <View style={styles.sortOptions}>
              {[
                { label: 'Recommended', value: 'recommended' },
                { label: 'Price: Low to High', value: 'price_low' },
                { label: 'Price: High to Low', value: 'price_high' },
                { label: 'Highest Rated', value: 'rating' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setSortBy(opt.value as any)}
                  style={[
                    styles.filterChip,
                    sortBy === opt.value && styles.filterChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      sortBy === opt.value && styles.filterChipTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterSectionTitle}>Minimum Rating</Text>
            <View style={styles.sortOptions}>
              {[0, 4.0, 4.5, 4.8].map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setMinRating(r)}
                  style={[
                    styles.filterChip,
                    minRating === r && styles.filterChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      minRating === r && styles.filterChipTextSelected,
                    ]}
                  >
                    {r === 0 ? 'All' : `★ ${r}+`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button
              title="Apply Filters"
              onPress={() => setShowFilterModal(false)}
              variant="primary"
              size="lg"
              style={{ marginTop: SPACING.xl }}
            />
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    marginHorizontal: SPACING.base,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1.5,
    borderColor: 'rgba(50, 100, 80, 0.15)',
    marginBottom: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.primaryDark,
  },
  tabsContainer: {
    height: 46,
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  tabsScrollView: {
    flexGrow: 0,
    height: 40,
  },
  tabsStrip: {
    paddingHorizontal: SPACING.base,
    gap: 8,
    alignItems: 'center',
    flexDirection: 'row',
  },
  tabPill: {
    paddingHorizontal: 16,
    height: 34,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  tabPillSelected: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primaryDark,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryDark,
    textAlign: 'center',
    lineHeight: 18,
  },
  tabTextSelected: {
    color: '#FFFFFF',
  },
  listContainer: {
    paddingTop: 4,
    paddingBottom: 40,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 35, 28, 0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    padding: SPACING.xl,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  filterSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primaryDark,
    marginTop: 12,
    marginBottom: 8,
  },
  sortOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(235, 245, 240, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(50, 100, 80, 0.15)',
  },
  filterChipSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accentHover,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryDark,
  },
  filterChipTextSelected: {
    fontWeight: '700',
  },
});
