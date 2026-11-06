/**
 * Service Details Screen — Pronto-style hero banner, specs, tabs, checklist, sub-services & Book Now.
 * Route: /service/[id]
 */

import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Animated,
  TouchableOpacity,
  Share,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { SubService, Addon } from '../../src/api/client';
import { useCart } from '../../src/context/CartContext';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import { useSubServices } from '../../src/hooks/useSubServices';
import { DurationSelector, DEFAULT_DURATION_PLANS, DurationPlan } from '../../src/components/common/DurationSelector';

function AddonChip({
  addon,
  selected,
  onToggle,
}: {
  addon: Addon;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      style={[styles.addonChip, selected && styles.addonChipSelected]}
      onPress={onToggle}
    >
      {selected && <Text style={styles.addonCheck}>✓ </Text>}
      <Text style={[styles.addonName, selected && styles.addonNameSelected]}>
        {addon.name}
      </Text>
      <Text style={[styles.addonPrice, selected && styles.addonPriceSelected]}>
        +₹{addon.price}
      </Text>
    </Pressable>
  );
}

function SubServiceCard({
  item,
  selected,
  onSelect,
  onRemove,
  onAddonToggle,
  isAddonSelected,
}: {
  item: SubService;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onAddonToggle: (addon: Addon) => void;
  isAddonSelected: (addonId: string) => boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true }).start();
  const handlePressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, tension: 200, useNativeDriver: true }).start();

  const hrs = Math.floor(item.estimatedMins / 60);
  const mins = item.estimatedMins % 60;
  const duration = hrs > 0 ? `${hrs}h ${mins > 0 ? `${mins}m` : ''}` : `${mins}m`;

  return (
    <Animated.View style={[styles.subCard, selected && styles.subCardSelected, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={() => setExpanded((e) => !e)}>
        <View style={styles.subCardHeader}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.subImage} contentFit="cover" />
          ) : (
            <View style={styles.subImagePlaceholder}>
              <Text style={{ fontSize: 24 }}>🧹</Text>
            </View>
          )}
          <View style={styles.subInfo}>
            <Text style={styles.subName}>{item.name}</Text>
            <View style={styles.subMeta}>
              <View style={styles.metaTag}>
                <Text style={styles.metaText}>⏱ {duration}</Text>
              </View>
              <View style={styles.metaTag}>
                <Text style={styles.metaText}>{item.unitLabel}</Text>
              </View>
            </View>
            <Text style={styles.subPrice}>₹{item.basePrice.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.subAction}>
            {selected ? (
              <Pressable style={styles.removeBtn} onPress={onRemove}>
                <Text style={styles.removeBtnText}>✕</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.addBtn} onPress={onSelect}>
                <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.addBtnGradient}>
                  <Text style={styles.addBtnText}>+</Text>
                </LinearGradient>
              </Pressable>
            )}
          </View>
        </View>

        {/* Addons */}
        {(expanded || selected) && item.addons?.length > 0 && (
          <View style={styles.addonsSection}>
            <Text style={styles.addonsTitle}>Available Add-ons</Text>
            <View style={styles.addonsRow}>
              {item.addons.filter((a) => a.isActive).map((addon) => (
                <AddonChip
                  key={addon.addonId}
                  addon={addon}
                  selected={isAddonSelected(addon.addonId)}
                  onToggle={() => {
                    if (!selected) onSelect();
                    onAddonToggle(addon);
                  }}
                />
              ))}
            </View>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

interface CategoryProfile {
  categoryName: string;
  subtitle: string;
  heroImage: string;
  rating: number;
  reviewsCount: string;
  specs: {
    duration: string;
    partner: string;
    products: string;
  };
  description: string;
  includedPoints: string[];
  reviews: { author: string; rating: number; text: string; date: string }[];
}

function getCategoryType(id?: string, name?: string): 'massage' | 'electrician' | 'ac' | 'cleaning' {
  const n = (name || '').toLowerCase();
  const i = (id || '').toLowerCase();

  if (
    i === '6beaaf16-cb8b-4107-9f8b-617b23c0bd21' ||
    n.includes('massage') ||
    n.includes('spa') ||
    n.includes('swedish') ||
    n.includes('tissue') ||
    n.includes('relaxer')
  ) {
    return 'massage';
  }

  if (
    i === '6e2e370b-7d5e-46d2-944b-afe7c15db6d5' ||
    n.includes('electric') ||
    n.includes('ceiling fan') ||
    n.includes('fan repair')
  ) {
    return 'electrician';
  }

  if (
    i === '9b7f941c-ee83-4ffe-bd1d-2dacba5d4760' ||
    n.includes('ac') ||
    n.includes('air conditioner') ||
    n.includes('jet wash')
  ) {
    return 'ac';
  }

  if (
    i === 'be8bb640-cc11-4243-ab4a-5cbdf34a0937' ||
    n.includes('clean') ||
    n.includes('deep clean') ||
    n.includes('home cleaning')
  ) {
    return 'cleaning';
  }

  return 'cleaning';
}

const CATEGORY_PROFILES: Record<'massage' | 'electrician' | 'ac' | 'cleaning', CategoryProfile> = {
  massage: {
    categoryName: 'Massage & Spa at Home',
    subtitle: 'Certified wellness & therapeutic relaxation at home',
    heroImage: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1000&auto=format&fit=crop&q=80',
    rating: 4.9,
    reviewsCount: '18,420+ reviews',
    specs: {
      duration: '30 - 75 Mins',
      partner: 'Certified Therapists',
      products: 'Aromatic Herbal Oils',
    },
    description:
      'Indulge in professional, therapeutic at-home spa and massage treatments delivered by certified and background-verified therapists. Tailored pressure techniques promote blood circulation, muscle recovery, and profound stress relief.',
    includedPoints: [
      'Certified and background-verified wellness therapist',
      'Single-use disposable hygienic linen and protective sheets',
      'Premium aromatherapy and soothing herbal massage oils',
      'Personalized pressure adjustment & tension knot consultation',
      'Relaxing ambient music and complete post-session clean setup',
    ],
    reviews: [
      {
        author: 'Ananya R.',
        rating: 5.0,
        text: 'The therapist was extremely polite and skilled. My severe shoulder stiffness completely disappeared.',
        date: '2 days ago',
      },
      {
        author: 'Vikram S.',
        rating: 5.0,
        text: '5-star luxury spa experience right in my living room. Punctual, hygienic, and very relaxing.',
        date: '1 week ago',
      },
      {
        author: 'Pooja M.',
        rating: 4.9,
        text: 'Great experience! Herbal oils smelled lovely and left my skin feeling rejuvenated.',
        date: '2 weeks ago',
      },
    ],
  },
  electrician: {
    categoryName: 'Electrician Services',
    subtitle: 'Prompt, certified repairs & electrical installations',
    heroImage: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1000&auto=format&fit=crop&q=80',
    rating: 4.8,
    reviewsCount: '15,800+ reviews',
    specs: {
      duration: '30 - 60 Mins',
      partner: 'Licensed Electricians',
      products: 'Insulated Safety Tools',
    },
    description:
      'Certified and licensed electricians for safe, fast home repairs. Specializing in ceiling fan repair and installation, switchboard repair, MCB tripping resolution, chandelier fittings, and full wiring diagnostics.',
    includedPoints: [
      'Licensed electrician equipped with digital testing meters & safety kit',
      'Comprehensive wiring diagnostic and circuit fault finding',
      'Ceiling fan motor inspection, capacitor replacement & rebalancing',
      'Genuine brand-compatible wiring & heavy-duty insulation tape',
      'Post-service load testing and 30-day HomeEase service guarantee',
    ],
    reviews: [
      {
        author: 'Rahul K.',
        rating: 5.0,
        text: 'Ceiling fan was wobbling and buzzing loudly. Electrician fixed the capacitor and bearing in 20 minutes!',
        date: '3 days ago',
      },
      {
        author: 'Priya N.',
        rating: 5.0,
        text: 'Very professional. Brought all spare parts in his toolkit. Safe and clean workmanship.',
        date: '1 week ago',
      },
      {
        author: 'Deepak T.',
        rating: 4.8,
        text: 'Fixed multiple switches and installed a new ceiling fan cleanly. Worth every rupee.',
        date: '3 weeks ago',
      },
    ],
  },
  ac: {
    categoryName: 'AC Service & Repair',
    subtitle: 'High-pressure jet pump wash & cooling optimization',
    heroImage: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=1000&auto=format&fit=crop&q=80',
    rating: 4.85,
    reviewsCount: '24,190+ reviews',
    specs: {
      duration: '45 - 90 Mins',
      partner: 'AC Specialists',
      products: 'Jet Foam Technology',
    },
    description:
      'Restore icy cooling and eliminate energy waste with our complete AC jet-pump servicing. Includes antibacterial indoor coil foam wash, outdoor condenser pressure rinse, drain pipe flushing, and gas pressure inspection.',
    includedPoints: [
      'High-pressure jet pump deep wash of cooling coil and indoor blower',
      'Antibacterial foam application to eliminate stubborn mold & odor',
      'Outdoor unit power spray & clearing of heat-exchange dust deposits',
      'Refrigerant gas pressure, temperature delta & amperage testing',
      '30-day cooling performance guarantee with zero mess cleanup',
    ],
    reviews: [
      {
        author: 'Karthik V.',
        rating: 5.0,
        text: 'The technician placed a plastic spill jacket around the AC so not a single drop touched the wall. Super cold cooling now!',
        date: '2 days ago',
      },
      {
        author: 'Sneha M.',
        rating: 5.0,
        text: 'Saved our summer! The AC had stopped cooling. Jet wash and gas check made it run like new.',
        date: '1 week ago',
      },
      {
        author: 'Arjun B.',
        rating: 4.8,
        text: 'Fast, efficient, and transparent pricing. Very impressed with the jet pump technology.',
        date: '2 weeks ago',
      },
    ],
  },
  cleaning: {
    categoryName: 'Home Cleaning',
    subtitle: 'Intensive deep sanitization for sparkling fresh spaces',
    heroImage: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1000&auto=format&fit=crop&q=80',
    rating: 4.82,
    reviewsCount: '28,340+ reviews',
    specs: {
      duration: '2 - 4 Hours',
      partner: 'Trained Cleaners',
      products: 'Hospital-Grade Agents',
    },
    description:
      'Comprehensive deep cleaning for apartments and homes. Our verified crew utilizes mechanized single-disc scrubbing, industrial HEPA vacuuming, intensive kitchen degreasing, and bathroom descaling.',
    includedPoints: [
      'Kitchen deep degreasing, chimney exterior, gas stove & countertop scrub',
      'Bathroom tile descaling, grout whitening, faucet polish & sanitization',
      'Floor motorized machine scrubbing and edge dust vacuuming',
      'Living area sofa, upholstery, and mattress HEPA dust extraction',
      'Non-toxic, kid-safe, and pet-friendly hospital-grade disinfectants',
    ],
    reviews: [
      {
        author: 'Meera P.',
        rating: 5.0,
        text: 'The kitchen was full of tough oil stains from cooking. They made the tiles and chimney shine like brand new!',
        date: '4 days ago',
      },
      {
        author: 'Sandeep G.',
        rating: 5.0,
        text: 'Booked full home cleaning before housewarming. Crew was super hardworking and meticulous.',
        date: '1 week ago',
      },
      {
        author: 'Rohit D.',
        rating: 4.8,
        text: 'Bathroom descaling was incredible. Water hard-scale completely removed from glass partitions.',
        date: '3 weeks ago',
      },
    ],
  },
};

export default function ServiceDetailsScreen() {
  const { id, name, subServiceId, price, image } = useLocalSearchParams<{
    id: string;
    name?: string;
    subServiceId?: string;
    price?: string;
    image?: string;
  }>();

  const insets = useSafeAreaInsets();
  const {
    cart,
    addSubService,
    removeSubService,
    toggleAddon,
    isSubServiceSelected,
    isAddonSelected,
    itemCount,
    setCategory,
  } = useCart();

  const [activeTab, setActiveTab] = useState<'overview' | 'included' | 'reviews'>('overview');
  const [isSaved, setIsSaved] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<number>(60);

  // Determine exact category profile
  const categoryType = useMemo(
    () => getCategoryType(id, (name as string) || cart.category?.name),
    [id, name, cart.category?.name]
  );
  const profile = CATEGORY_PROFILES[categoryType];

  const serviceTitle = (name as string) || profile.categoryName;
  const activeHeroImage = (image as string) || profile.heroImage;

  // ── Cached sub-services fetch ────────────────────────────────────────────
  // useSubServices caches results per serviceId for 10 minutes.
  // Navigating back and forward to this screen within that window costs 0 requests.
  const { data: rawSubServices = [], isLoading: loading, refetch: refetchSubServices } = useSubServices(id as string);

  // Sub-services loaded from backend API
  const subServices = useMemo<SubService[]>(() => {
    return rawSubServices.filter((s) => s.isActive);
  }, [rawSubServices]);

  useEffect(() => {
    if (id) {
      setCategory({
        serviceId: id,
        name: serviceTitle,
        description: profile.description,
        imageUrl: activeHeroImage,
        isActive: true,
      });
    }
  }, [id, serviceTitle, profile.description, activeHeroImage, setCategory]);

  const error = '';

  // Auto-select requested sub-service if navigated from a specific Popular Service
  useEffect(() => {
    if (subServices.length > 0) {
      if (subServiceId) {
        const found = subServices.find((s) => s.subServiceId === subServiceId);
        if (found && !isSubServiceSelected(found.subServiceId)) {
          addSubService(found);
        }
      } else if (name) {
        const found = subServices.find(
          (s) => s.name.toLowerCase() === (name as string).toLowerCase()
        );
        if (found && !isSubServiceSelected(found.subServiceId)) {
          addSubService(found);
        }
      }
    }
  }, [subServices, subServiceId, name, isSubServiceSelected, addSubService]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Book ${serviceTitle} on HomeEase! Download HomeEase now.`,
      });
    } catch {
      // ignore
    }
  };

  const handleBookNow = () => {
    if (subServices.length > 0 && itemCount === 0) {
      addSubService(subServices[0]);
    }
    router.push({
      pathname: '/booking/date-time',
      params: { duration: String(selectedDuration) },
    });
  };

  const startingPrice =
    subServices.length > 0
      ? subServices[0].basePrice
      : price
      ? Number(price)
      : 499;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: 85 + Math.max(insets.bottom, 16) }]}
      >
        {/* Hero Image Section */}
        <View style={styles.heroWrap}>
          <Image
            source={{ uri: activeHeroImage }}
            style={styles.heroImage}
            contentFit="cover"
            transition={200}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.25)']}
            style={styles.heroGradient}
          />

          {/* Floating Top Nav Bar */}
          <View style={[styles.navBar, { top: Math.max(insets.top, 16) + 4 }]}>
            <Pressable style={styles.navBtn} onPress={() => router.back()} accessibilityLabel="Go back">
              <Text style={styles.navIcon}>‹</Text>
            </Pressable>
            <View style={styles.navRight}>
              <Pressable style={styles.navBtn} onPress={handleShare} accessibilityLabel="Share service">
                <Text style={styles.navIconSmall}>↗</Text>
              </Pressable>
              <Pressable style={styles.navBtn} onPress={() => setIsSaved(!isSaved)} accessibilityLabel="Favorite service">
                <Text style={styles.navIconSmall}>{isSaved ? '❤️' : '🤍'}</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Content Card */}
        <View style={styles.contentCard}>
          <Text style={styles.serviceTitle}>{serviceTitle}</Text>
          <Text style={styles.serviceSubtitle}>{profile.subtitle}</Text>

          {/* Ratings row */}
          <View style={styles.ratingRow}>
            <View style={styles.starWrap}>
              <Text style={styles.starIcon}>⭐</Text>
              <Text style={styles.starText}>{profile.rating}</Text>
            </View>
            <Text style={styles.reviewCount}>({profile.reviewsCount})</Text>
          </View>

          {/* Pricing Row */}
          <View style={styles.priceRow}>
            <Text style={styles.currentPrice}>
              Starting at ₹{startingPrice.toLocaleString('en-IN')}
            </Text>
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>BEST PRICE</Text>
            </View>
          </View>

          {/* Feature Badges */}
          <View style={styles.featureBadges}>
            <View style={styles.featurePill}>
              <Text style={styles.featureIcon}>⏱</Text>
              <Text style={styles.featureTitle}>{profile.specs.duration}</Text>
              <Text style={styles.featureSub}>Duration</Text>
            </View>
            <View style={styles.featurePill}>
              <Text style={styles.featureIcon}>👥</Text>
              <Text style={styles.featureTitle}>{profile.specs.partner}</Text>
              <Text style={styles.featureSub}>Partners</Text>
            </View>
            <View style={styles.featurePill}>
              <Text style={styles.featureIcon}>🌿</Text>
              <Text style={styles.featureTitle}>{profile.specs.products}</Text>
              <Text style={styles.featureSub}>Products</Text>
            </View>
          </View>

          {/* Tab Bar */}
          <View style={styles.tabsRow}>
            {(['overview', 'included', 'reviews'] as const).map((tab) => {
              const isActive = activeTab === tab;
              const label =
                tab === 'overview'
                  ? 'Overview'
                  : tab === 'included'
                  ? "What's Included"
                  : 'Reviews';
              return (
                <Pressable
                  key={tab}
                  style={[styles.tabItem, isActive && styles.tabItemActive]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                    {label}
                  </Text>
                  {isActive && <View style={styles.tabIndicator} />}
                </Pressable>
              );
            })}
          </View>

          {/* Tab Content */}
          {activeTab === 'overview' ? (
            <View style={styles.overviewSection}>
              <Text style={styles.overviewDescription}>{profile.description}</Text>
              <View style={styles.trustRow}>
                <View style={styles.trustBadge}>
                  <Text style={styles.trustText}>🛡️ 30-Day Guarantee</Text>
                </View>
                <View style={styles.trustBadge}>
                  <Text style={styles.trustText}>⚡ 30-Min Arrival</Text>
                </View>
                <View style={styles.trustBadge}>
                  <Text style={styles.trustText}>💯 Verified Pros</Text>
                </View>
              </View>
            </View>
          ) : activeTab === 'included' ? (
            <View style={styles.checklistSection}>
              {profile.includedPoints.map((pt, idx) => (
                <View key={idx} style={styles.checkItem}>
                  <View style={styles.checkCircle}>
                    <Text style={styles.checkMark}>✓</Text>
                  </View>
                  <Text style={styles.checkText}>{pt}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.reviewsList}>
              {profile.reviews.map((r, idx) => (
                <View key={idx} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewAuthorRow}>
                      <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>{r.author.charAt(0)}</Text>
                      </View>
                      <View>
                        <Text style={styles.reviewAuthor}>{r.author}</Text>
                        <Text style={styles.reviewDate}>{r.date}</Text>
                      </View>
                    </View>
                    <View style={styles.reviewStars}>
                      <Text style={{ fontSize: 12 }}>⭐</Text>
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: Colors.textPrimary }}>
                        {r.rating.toFixed(1)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.reviewBody}>{r.text}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Hourly Duration Selector (30m, 60m, 90m, 120m) */}
          <DurationSelector
            selectedMinutes={selectedDuration}
            onSelect={(plan) => setSelectedDuration(plan.minutes)}
          />

          {/* Sub-services / Customization */}
          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
          ) : error ? (
            <View style={{ alignItems: 'center', marginTop: 20 }}>
              <Text style={{ color: Colors.error, marginBottom: 10 }}>{error}</Text>
              <Pressable onPress={() => refetchSubServices()}>
                <Text style={{ color: Colors.primary, fontWeight: 'bold' }}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.subServicesSection}>
              <Text style={styles.subSectionTitle}>Select Service Options</Text>
              {subServices.map((s) => (
                <SubServiceCard
                  key={s.subServiceId}
                  item={s}
                  selected={isSubServiceSelected(s.subServiceId)}
                  onSelect={() => addSubService(s)}
                  onRemove={() => removeSubService(s.subServiceId)}
                  onAddonToggle={(addon) => toggleAddon(s.subServiceId, addon)}
                  isAddonSelected={(addonId) => isAddonSelected(s.subServiceId, addonId)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity style={styles.bookNowBtn} onPress={handleBookNow} activeOpacity={0.85}>
          <Text style={styles.bookNowText}>
            {itemCount > 0
              ? `Book Now (${itemCount} selected · ₹${cart.subtotal.toLocaleString('en-IN')})`
              : 'Book Now'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    paddingBottom: 20,
  },
  heroWrap: {
    width: '100%',
    height: 280,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    ...StyleSheet.absoluteFill,
  },
  navBar: {
    position: 'absolute',
    left: Spacing.base,
    right: Spacing.base,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  navRight: {
    flexDirection: 'row',
    gap: 10,
  },
  navIcon: {
    fontSize: 26,
    color: Colors.textPrimary,
    lineHeight: 28,
  },
  navIconSmall: {
    fontSize: 18,
    color: Colors.textPrimary,
  },

  contentCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.lg,
  },
  serviceTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 22,
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  starWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  starIcon: {
    fontSize: 14,
  },
  starText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },
  reviewCount: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.lg,
  },
  currentPrice: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 24,
    color: Colors.primary,
  },
  originalPrice: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  discountText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
  },

  featureBadges: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: Spacing.lg,
  },
  featurePill: {
    flex: 1,
    backgroundColor: '#F8F9FC',
    borderRadius: BorderRadius.md,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ECEFF3',
  },
  featureIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  featureTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 11,
    color: Colors.textPrimary,
  },
  featureSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 10,
    color: Colors.textSecondary,
  },

  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
    marginBottom: Spacing.md,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
  },
  tabItemActive: {},
  tabText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
    fontFamily: Typography.fontFamily.bold,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -1,
    height: 2.5,
    width: '60%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },

  checklistSection: {
    gap: 10,
    marginBottom: Spacing.lg,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },

  reviewsPlaceholder: {
    padding: Spacing.md,
    backgroundColor: '#F9FAFB',
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  reviewPlaceholderText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  subServicesSection: {
    marginTop: Spacing.sm,
  },
  subSectionTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  subCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: '#ECEFF3',
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  subCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#F8FAFF',
  },
  subCardHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  subImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  subImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subInfo: {
    flex: 1,
  },
  subName: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  subMeta: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  metaTag: {
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  metaText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 10,
    color: Colors.textSecondary,
  },
  subPrice: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
  },
  subAction: {},
  addBtn: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  addBtnGradient: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#fff',
    fontSize: 20,
    lineHeight: 22,
    fontWeight: 'bold',
  },
  removeBtn: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.md,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: 'bold',
  },

  addonsSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F5',
  },
  addonsTitle: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  addonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  addonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  addonChipSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: Colors.primary,
    borderWidth: 1,
  },
  addonCheck: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  addonName: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textPrimary,
  },
  addonNameSelected: {
    color: Colors.primary,
    fontFamily: Typography.fontFamily.medium,
  },
  addonPrice: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
  },
  addonPriceSelected: {
    color: Colors.primary,
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
    ...Shadows.md,
  },
  bookNowBtn: {
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.blue,
  },
  bookNowText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: '#FFFFFF',
  },
  serviceSubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  overviewSection: {
    marginBottom: Spacing.lg,
  },
  overviewDescription: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13.5,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 14,
  },
  trustRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  trustBadge: {
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  trustText: {
    fontSize: 11.5,
    fontFamily: Typography.fontFamily.medium,
    color: '#0369A1',
  },
  reviewsList: {
    gap: 10,
    marginBottom: Spacing.lg,
  },
  reviewCard: {
    backgroundColor: '#F8F9FC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ECEFF3',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  reviewAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  reviewAuthor: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  reviewDate: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  reviewStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  reviewBody: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12.5,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
