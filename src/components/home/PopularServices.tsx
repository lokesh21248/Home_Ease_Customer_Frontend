import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SectionHeader } from './SectionHeader';
import { PopularServiceCard } from './PopularServiceCard';
import { POPULAR_SERVICES_DATA, PopularServiceItem } from './types';
import { LayoutConstants } from '../../constants/layout';

interface PopularServicesProps {
  services?: PopularServiceItem[];
  onSeeAllPress?: () => void;
  onSelectService: (id: string, name: string) => void;
}

export function PopularServices({
  services = POPULAR_SERVICES_DATA,
  onSeeAllPress,
  onSelectService,
}: PopularServicesProps) {
  const cardWidth = 130;

  if (!services || services.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Popular Services"
        actionText="See All →"
        onActionPress={onSeeAllPress}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cardsRow}
      >
        {services.map((service, index) => (
          <View key={service.key || `${service.id}-${index}`} style={{ width: cardWidth }}>
            <PopularServiceCard
              id={service.id}
              name={service.name}
              image={service.image}
              price={service.price}
              width={cardWidth}
              onPress={onSelectService}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 8,
  },
  cardsRow: {
    paddingHorizontal: LayoutConstants.HORIZONTAL_PADDING,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
});
