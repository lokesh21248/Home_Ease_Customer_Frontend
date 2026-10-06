import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { useBooking } from '../../context/BookingContext';
import { useSavedServices } from '../../context/SavedServicesContext';
import { useNotifications } from '../../context/NotificationContext';
import { categoryApi } from '../../api/categoryApi';
import { serviceApi } from '../../api/serviceApi';
import { Category, Service, BannerSlide } from '../../types';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { SearchBar } from '../../components/home/SearchBar';
import { CategoryCard } from '../../components/home/CategoryCard';
import { PromoBannerSlider } from '../../components/home/PromoBanner';
import { ServiceCard } from '../../components/home/ServiceCard';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import { MOCK_BANNERS, MOCK_CATEGORIES, MOCK_SERVICES } from '../../constants/mockData';
import { Ionicons } from '@expo/vector-icons';

type HomeScreenNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'HomeTab'>,
  StackNavigationProp<RootStackParamList>
>;

interface Props {
  navigation: HomeScreenNavProp;
}

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const { setService } = useBooking();
  const { isSaved, toggleSave } = useSavedServices();
  const { unreadCount } = useNotifications();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [banners, setBanners] = useState<BannerSlide[]>(MOCK_BANNERS);
  const [categories, setCategories] = useState<Category[]>(MOCK_CATEGORIES);
  const [popularServices, setPopularServices] = useState<Service[]>(MOCK_SERVICES);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>(MOCK_CATEGORIES[0]?.id || 'be8bb640-cc11-4243-ab4a-5cbdf34a0937');

  const isSearching = isSearchFocused || searchQuery.trim().length > 0;

  const loadData = async () => {
    try {
      const [cats, srvs, bnrs] = await Promise.all([
        categoryApi.getAllCategories(),
        serviceApi.getServices(),
        serviceApi.getBanners(),
      ]);
      if (Array.isArray(cats) && cats.length > 0) {
        setCategories(cats);
      }
      if (Array.isArray(srvs) && srvs.length > 0) {
        setPopularServices(srvs);
      }
      if (Array.isArray(bnrs) && bnrs.length > 0) {
        setBanners(bnrs);
      }
    } catch (e) {
      console.warn('Error loading home data:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSeeAllCategories = () => {
    try {
      const parentNav = navigation.getParent<StackNavigationProp<RootStackParamList>>();
      if (parentNav) {
        parentNav.navigate('AllCategories');
      } else {
        navigation.navigate('AllCategories');
      }
    } catch {
      navigation.navigate('AllCategories');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };


  const handleSelectService = (service: Service) => {
    setService(service);
    navigation.navigate('ServiceDetails', { serviceId: service.id, service });
  };

  const handleBookService = (service: Service) => {
    setService(service);
    navigation.navigate('AddressSelection');
  };

  const handleBannerPress = (banner: BannerSlide) => {
    const targetServiceId = banner.targetId || banner.serviceId;
    if (banner.targetType === 'SERVICE' || banner.serviceId) {
      const found = popularServices.find((s) => s.id === targetServiceId || s.serviceId === targetServiceId);
      if (found) {
        handleSelectService(found);
        return;
      }
    }
    const targetCatId = banner.targetId || banner.categoryId || 'be8bb640-cc11-4243-ab4a-5cbdf34a0937';
    navigation.navigate('ServiceListing', {
      categoryId: targetCatId,
      categoryName: banner.title,
    });
  };

  const filteredServices = popularServices.filter((s) => {
    if (searchQuery.trim()) {
      return (
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.categoryName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return true;
  });

  return (
    <ScreenWrapper>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Top Header Row matching Image 2 */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ProfileTab')}
            style={styles.profileRow}
          >
            <View style={styles.profileTextContainer}>
              <Text style={styles.profileName}>{user?.name || 'Lokesh Reddy'}</Text>
              <Text style={styles.welcomeSubtext}>Welcome back</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.headerRightActions}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Notifications')}
              style={styles.iconCircle}
            >
              <Ionicons name="notifications-outline" size={20} color={COLORS.primaryDark} />
              {unreadCount > 0 && <View style={styles.badgeDot} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero Greeting from Image 2 */}
        <View style={styles.greetingSection}>
          <Text style={styles.heroGreeting}>Welcome Home,</Text>
          <Text style={styles.heroSubGreeting}>Enjoy Services</Text>
        </View>

        {/* Search Bar with Location Pill from Image 2 */}
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          locationName="Hyderabad"
          onLocationPress={() => navigation.navigate('AddressSelection')}
          placeholder="Search Services..."
        />

        {/* Multi-Slide Promotional Banner Carousel - hidden when searching */}
        {!isSearching && (
          <PromoBannerSlider
            banners={banners}
            onPressBanner={handleBannerPress}
          />
        )}

        {/* Categories Section - hidden when searching */}
        {!isSearching && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Category</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleSeeAllCategories}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesStrip}
            >
              {categories.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  category={cat}
                  isSelected={selectedCategory === cat.id}
                  onPress={() => {
                    setSelectedCategory(cat.id);
                    navigation.navigate('ServiceListing', {
                      categoryId: cat.id,
                      categoryName: cat.name,
                    });
                  }}
                />
              ))}
            </ScrollView>
          </>
        )}

        {/* Services Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            {searchQuery.trim() ? `Search Results (${filteredServices.length})` : 'Popular Services'}
          </Text>
          {!searchQuery.trim() && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate('ServiceListing', {
                  categoryId: 'be8bb640-cc11-4243-ab4a-5cbdf34a0937',
                  categoryName: 'All Services',
                })
              }
            >
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.servicesList}>
          {filteredServices.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onPress={() => handleSelectService(service)}
              onBookPress={() => handleBookService(service)}
              onFavoritePress={() => toggleSave(service)}
              isFavorite={isSaved(service.id)}
            />
          ))}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 90,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileTextContainer: {},
  profileName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  welcomeSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.error,
  },
  greetingSection: {
    paddingHorizontal: SPACING.base,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  heroGreeting: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.primaryDark,
    letterSpacing: 0.2,
  },
  heroSubGreeting: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.primaryDark,
    letterSpacing: 0.2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.base,
    marginTop: SPACING.base,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  categoriesStrip: {
    paddingHorizontal: SPACING.base,
    paddingTop: 4,
  },
  servicesList: {
    marginTop: 4,
  },
});
