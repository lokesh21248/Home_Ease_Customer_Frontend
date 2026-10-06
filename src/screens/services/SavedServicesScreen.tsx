import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { useSavedServices } from '../../context/SavedServicesContext';
import { useBooking } from '../../context/BookingContext';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { Header } from '../../components/common/Header';
import { ServiceCard } from '../../components/home/ServiceCard';
import { EmptyState } from '../../components/common/EmptyState';
import { SPACING } from '../../constants/theme';

type SavedNavProp = StackNavigationProp<RootStackParamList, 'SavedServices'>;

interface Props {
  navigation: SavedNavProp;
}

export const SavedServicesScreen: React.FC<Props> = ({ navigation }) => {
  const { savedServices, toggleSave, isSaved } = useSavedServices();
  const { setService } = useBooking();

  return (
    <ScreenWrapper>
      <Header title="Wishlist" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {savedServices.length === 0 ? (
          <EmptyState
            iconName="heart-outline"
            title="Your Wishlist is Empty"
            description="You haven't added any services to your wishlist yet. Tap the heart icon on any service to add it here."
            actionTitle="Browse Services"
            onAction={() => navigation.navigate('MainTabs', { screen: 'ExploreTab' })}
          />
        ) : (
          savedServices.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onPress={() => {
                setService(service);
                navigation.navigate('ServiceDetails', { serviceId: service.id, service });
              }}
              onBookPress={() => {
                setService(service);
                navigation.navigate('AddressSelection');
              }}
              onFavoritePress={() => toggleSave(service)}
              isFavorite={isSaved(service.id)}
            />
          ))
        )}
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: SPACING.xs,
    paddingBottom: 40,
  },
});
