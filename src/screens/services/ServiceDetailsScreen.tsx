import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { useBooking } from '../../context/BookingContext';
import { useSavedServices } from '../../context/SavedServicesContext';
import { Service, ServicePackage, SubService, Addon } from '../../types';
import { serviceApi } from '../../api/serviceApi';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { Header } from '../../components/common/Header';
import { Rating } from '../../components/common/Rating';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

type ServiceDetailsRouteProp = RouteProp<RootStackParamList, 'ServiceDetails'>;
type ServiceDetailsNavProp = StackNavigationProp<RootStackParamList, 'ServiceDetails'>;

interface Props {
  route: ServiceDetailsRouteProp;
  navigation: ServiceDetailsNavProp;
}

export const ServiceDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { service: initialService } = route.params;
  const { setService, setPackage, setSubServices, setAddons } = useBooking();
  const { isSaved, toggleSave } = useSavedServices();

  const service: Service = initialService || {
    id: '3a2b1c0d-9e8f-4a7b-6c5d-4e3f2a1b0c9d',
    serviceId: '3a2b1c0d-9e8f-4a7b-6c5d-4e3f2a1b0c9d',
    categoryId: 'be8bb640-cc11-4243-ab4a-5cbdf34a0937',
    categoryName: 'Cleaning',
    name: 'Home Deep Cleaning',
    startingPrice: 999,
    duration: '2–3 hours',
    rating: 4.8,
    reviewsCount: 1240,
    imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
    description: 'Our Home Deep Clean service offers thorough, reliable cleaning for every room. We sanitize, refresh, and restore your living spaces, ensuring a sparkling, healthy environment that feels comfortable, welcoming, and spotless for your family.',
    included: [
      'Living room & dining area deep scrub & vacuuming',
      'Bedroom cleaning, wardrobe exterior & mattress dusting',
      'Kitchen degreasing & countertop sanitation',
      'Bathroom tile scrubbing & germ disinfection',
      'Dusting & surface cleaning',
    ],
    excluded: [
      'Internal wardrobe organization',
      'Paint stain removal requiring chemical stripping',
    ],
  };

  const [selectedPkg, setSelectedPkg] = useState<ServicePackage | null>(
    service.packages?.[0] || null
  );
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [subServices, setSubServicesList] = useState<SubService[]>(service.subServices || []);
  const [selectedSubService, setSelectedSubService] = useState<SubService | null>(null);
  const [selectedAddons, setSelectedAddonsList] = useState<Addon[]>([]);

  const loadSubServices = async () => {
    try {
      const data = await serviceApi.getSubServices(service.serviceId || service.id);
      if (data && data.length > 0) {
        setSubServicesList(data);
        setSelectedSubService(data[0]);
      }
    } catch (e) {
      console.warn('Failed to load sub services:', e);
    }
  };

  useEffect(() => {
    loadSubServices();
  }, [service.id]);

  const toggleAddon = (addon: Addon) => {
    setSelectedAddonsList((prev) => {
      const exists = prev.some((a) => a.addonId === addon.addonId);
      if (exists) {
        return prev.filter((a) => a.addonId !== addon.addonId);
      } else {
        return [...prev, addon];
      }
    });
  };

  const activePrice = selectedSubService
    ? (selectedSubService.basePrice || 0) + selectedAddons.reduce((sum, a) => sum + (a.price || 0), 0)
    : selectedPkg?.price || service.startingPrice;

  const activeDuration = selectedSubService?.estimatedMins
    ? `${selectedSubService.estimatedMins} mins`
    : selectedPkg?.duration || service.duration;

  const handleBookNow = () => {
    setService(service);
    setPackage(selectedPkg);
    if (selectedSubService) {
      setSubServices([selectedSubService]);
      setAddons(selectedAddons);
    }
    navigation.navigate('AddressSelection');
  };

  return (
    <ScreenWrapper>
      <Header
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => toggleSave(service)}
            style={styles.favoriteHeaderBtn}
          >
            <Ionicons
              name={isSaved(service.id) ? 'heart' : 'heart-outline'}
              size={22}
              color={isSaved(service.id) ? COLORS.error : COLORS.primaryDark}
            />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Large Hero Image with Rounded Corners */}
        <View style={[styles.heroImageContainer, SHADOWS.card]}>
          <Image source={{ uri: service.imageUrl }} style={styles.heroImage} />
          {service.discountBadge ? (
            <View style={styles.heroBadge}>
              <Badge label={service.discountBadge} variant="discount" />
            </View>
          ) : null}
        </View>

        {/* Title, Rating & Price Header */}
        <View style={styles.mainInfoCard}>
          <Text style={styles.serviceName}>{service.name}</Text>

          <View style={styles.ratingRow}>
            <Rating rating={service.rating} reviewsCount={service.reviewsCount} size={15} />
            <Text style={styles.categoryTag}>{service.categoryName}</Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceText}>₹{activePrice}</Text>
            <Text style={styles.durationText}>· {activeDuration}</Text>
          </View>
        </View>

        {/* Package Options if available */}
        {service.packages && service.packages.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>Select Package</Text>
            <View style={styles.packagesRow}>
              {service.packages.map((pkg) => {
                const isSelected = selectedPkg?.id === pkg.id;
                return (
                  <TouchableOpacity
                    key={pkg.id}
                    activeOpacity={0.8}
                    onPress={() => setSelectedPkg(pkg)}
                    style={[
                      styles.pkgCard,
                      isSelected && styles.pkgCardSelected,
                      SHADOWS.subtle,
                    ]}
                  >
                    {pkg.isPopular && (
                      <View style={styles.popularTag}>
                        <Text style={styles.popularTagText}>Most Popular</Text>
                      </View>
                    )}
                    <Text style={styles.pkgName}>{pkg.name}</Text>
                    <Text style={styles.pkgPrice}>₹{pkg.price}</Text>
                    <Text style={styles.pkgDuration}>{pkg.duration}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Sub-Services Options (Backend API) */}
        {subServices && subServices.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>Select Service Type</Text>
            <View style={styles.subServicesContainer}>
              {subServices.map((sub) => {
                const isSelected = selectedSubService?.subServiceId === sub.subServiceId;
                return (
                  <TouchableOpacity
                    key={sub.subServiceId}
                    activeOpacity={0.8}
                    onPress={() => {
                      setSelectedSubService(sub);
                      setSelectedAddonsList([]);
                    }}
                    style={[
                      styles.subServiceCard,
                      isSelected && styles.subServiceCardSelected,
                      SHADOWS.subtle,
                    ]}
                  >
                    <View style={styles.subServiceLeft}>
                      <View style={[styles.subRadioOuter, isSelected && styles.subRadioOuterSelected]}>
                        {isSelected && <View style={styles.subRadioInner} />}
                      </View>
                      <View style={styles.subInfoCol}>
                        <Text style={[styles.subName, isSelected && styles.subNameSelected]}>{sub.name}</Text>
                        <Text style={styles.subDuration}>
                          {sub.estimatedMins ? `${sub.estimatedMins} mins` : '60–120 mins'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.subPrice}>₹{sub.basePrice}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Add-ons for Selected Sub-Service (Backend API) */}
        {selectedSubService?.addons && selectedSubService.addons.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>Available Add-ons</Text>
            <View style={styles.addonsContainer}>
              {selectedSubService.addons.map((addon) => {
                const isSelected = selectedAddons.some((a) => a.addonId === addon.addonId);
                return (
                  <TouchableOpacity
                    key={addon.addonId}
                    activeOpacity={0.8}
                    onPress={() => toggleAddon(addon)}
                    style={[
                      styles.addonCard,
                      isSelected && styles.addonCardSelected,
                      SHADOWS.subtle,
                    ]}
                  >
                    <View style={styles.addonLeft}>
                      <View style={[styles.checkboxSquare, isSelected && styles.checkboxSquareSelected]}>
                        {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                      </View>
                      <Text style={[styles.addonName, isSelected && styles.addonNameSelected]}>
                        {addon.name}
                      </Text>
                    </View>
                    <Text style={styles.addonPrice}>+₹{addon.price}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* What's Included Checklist from Image 1 Screen 8 */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeading}>{"What's included?"}</Text>
          <View style={styles.checklistCard}>
            {(service.included || []).map((item, idx) => (
              <View key={idx} style={styles.checklistItem}>
                <View style={styles.checkCircle}>
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                </View>
                <Text style={styles.checklistText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Exclusions */}
        {service.excluded && service.excluded.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>{"What's excluded?"}</Text>
            <View style={styles.checklistCard}>
              {service.excluded.map((item, idx) => (
                <View key={idx} style={styles.checklistItem}>
                  <View style={styles.crossCircle}>
                    <Ionicons name="close" size={14} color="#FFFFFF" />
                  </View>
                  <Text style={styles.checklistText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Description */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeading}>Description</Text>
          <View style={styles.descCard}>
            <Text style={styles.descText}>{service.description}</Text>
          </View>
        </View>

        {/* Customer Reviews Section */}
        {service.reviews && service.reviews.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>Customer Reviews</Text>
            {service.reviews.map((rev) => (
              <View key={rev.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewerName}>{rev.userName}</Text>
                  <Rating rating={rev.rating} size={13} />
                </View>
                <Text style={styles.reviewDate}>{rev.date}</Text>
                <Text style={styles.reviewComment}>{rev.comment}</Text>
              </View>
            ))}
          </View>
        )}

        {/* FAQs */}
        {service.faqs && service.faqs.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>Frequently Asked Questions</Text>
            {service.faqs.map((faq, index) => {
              const isOpen = expandedFaq === index;
              return (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.8}
                  onPress={() => setExpandedFaq(isOpen ? null : index)}
                  style={styles.faqCard}
                >
                  <View style={styles.faqHeader}>
                    <Text style={styles.faqQuestion}>{faq.question}</Text>
                    <Ionicons
                      name={isOpen ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={COLORS.primaryDark}
                    />
                  </View>
                  {isOpen && <Text style={styles.faqAnswer}>{faq.answer}</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Sticky Bottom CTA matching Image 1 Screen 8 */}
      <View style={[styles.bottomBar, SHADOWS.card]}>
        <View style={styles.bottomPriceContainer}>
          <Text style={styles.bottomPriceLabel}>Total Price</Text>
          <Text style={styles.bottomPriceValue}>₹{activePrice}</Text>
        </View>
        <Button
          title="Book Now"
          onPress={handleBookNow}
          variant="primary"
          size="lg"
          style={styles.bookNowButton}
        />
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 110,
  },
  favoriteHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImageContainer: {
    marginHorizontal: SPACING.base,
    height: 220,
    borderRadius: RADIUS.xxl,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    marginTop: SPACING.xs,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
  },
  mainInfoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    marginHorizontal: SPACING.base,
    borderRadius: RADIUS.xl,
    padding: SPACING.base,
    marginTop: SPACING.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  serviceName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primaryDark,
    letterSpacing: 0.2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  categoryTag: {
    fontSize: 12,
    color: COLORS.textSecondary,
    backgroundColor: 'rgba(235, 245, 240, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
    marginLeft: 10,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 10,
  },
  priceText: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  durationText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 6,
    fontWeight: '500',
  },
  sectionContainer: {
    marginHorizontal: SPACING.base,
    marginTop: SPACING.lg,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.primaryDark,
    marginBottom: SPACING.sm,
  },
  packagesRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pkgCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderRadius: RADIUS.lg,
    padding: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    position: 'relative',
  },
  pkgCardSelected: {
    borderColor: COLORS.primaryDark,
    backgroundColor: '#FFFFFF',
  },
  popularTag: {
    position: 'absolute',
    top: -9,
    right: 8,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
  },
  popularTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  pkgName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryDark,
    marginBottom: 4,
  },
  pkgPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  pkgDuration: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  checklistCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderRadius: RADIUS.xl,
    padding: SPACING.base,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    gap: 10,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  crossCircle: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checklistText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  descCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderRadius: RADIUS.xl,
    padding: SPACING.base,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  descText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  reviewCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderRadius: RADIUS.lg,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  reviewDate: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    marginBottom: 6,
  },
  reviewComment: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  faqCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primaryDark,
    flex: 1,
    paddingRight: 8,
  },
  faqAnswer: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(50, 100, 80, 0.1)',
    paddingTop: 8,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    paddingBottom: 24,
  },
  bottomPriceContainer: {
    flexDirection: 'column',
  },
  bottomPriceLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  bottomPriceValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  bookNowButton: {
    minWidth: 160,
  },
  subServicesContainer: {
    gap: 10,
  },
  subServiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  subServiceCardSelected: {
    borderColor: COLORS.primaryDark,
    backgroundColor: 'rgba(235, 245, 238, 0.9)',
  },
  subServiceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  subRadioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subRadioOuterSelected: {
    borderColor: COLORS.primaryDark,
  },
  subRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primaryDark,
  },
  subInfoCol: {
    flex: 1,
  },
  subName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primaryDark,
  },
  subNameSelected: {
    fontWeight: '700',
  },
  subDuration: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  subPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primaryDark,
    marginLeft: 8,
  },
  addonsContainer: {
    gap: 8,
  },
  addonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  addonCardSelected: {
    borderColor: COLORS.primaryDark,
    backgroundColor: 'rgba(235, 245, 238, 0.9)',
  },
  addonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  checkboxSquare: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSquareSelected: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primaryDark,
  },
  addonName: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  addonNameSelected: {
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  addonPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
});
