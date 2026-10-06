import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { RootStackParamList } from './types';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { AllCategoriesScreen } from '../screens/home/AllCategoriesScreen';
import { ServiceListingScreen } from '../screens/services/ServiceListingScreen';
import { ServiceDetailsScreen } from '../screens/services/ServiceDetailsScreen';
import { AddressSelectionScreen } from '../screens/booking/AddressSelectionScreen';
import { DateTimeSlotScreen } from '../screens/booking/DateTimeSlotScreen';
import { BookingSummaryScreen } from '../screens/booking/BookingSummaryScreen';
import { PaymentScreen } from '../screens/booking/PaymentScreen';
import { BookingConfirmationScreen } from '../screens/booking/BookingConfirmationScreen';
import { LiveTrackingScreen } from '../screens/booking/LiveTrackingScreen';
import { BookingDetailsScreen } from '../screens/booking/BookingDetailsScreen';
import { MyAddressesScreen } from '../screens/profile/MyAddressesScreen';
import { PaymentsScreen } from '../screens/profile/PaymentsScreen';
import { SavedServicesScreen } from '../screens/services/SavedServicesScreen';
import { OffersCouponsScreen } from '../screens/profile/OffersCouponsScreen';
import { ReferEarnScreen } from '../screens/profile/ReferEarnScreen';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';
import { HelpSupportScreen } from '../screens/profile/HelpSupportScreen';
import { SettingsScreen } from '../screens/profile/SettingsScreen';

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Auth"
        screenOptions={{
          headerShown: false,
          cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
          cardStyle: { backgroundColor: 'transparent' },
        }}
      >
        <Stack.Screen name="Auth" component={AuthNavigator} />
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        <Stack.Screen name="AllCategories" component={AllCategoriesScreen} />
        <Stack.Screen name="ServiceListing" component={ServiceListingScreen} />
        <Stack.Screen name="ServiceDetails" component={ServiceDetailsScreen} />
        <Stack.Screen name="AddressSelection" component={AddressSelectionScreen} />
        <Stack.Screen name="DateTimeSlot" component={DateTimeSlotScreen} />
        <Stack.Screen name="BookingSummary" component={BookingSummaryScreen} />
        <Stack.Screen name="Payment" component={PaymentScreen} />
        <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
        <Stack.Screen name="LiveTracking" component={LiveTrackingScreen} />
        <Stack.Screen name="BookingDetails" component={BookingDetailsScreen} />
        <Stack.Screen name="MyAddresses" component={MyAddressesScreen} />
        <Stack.Screen name="PaymentsHistory" component={PaymentsScreen} />
        <Stack.Screen name="SavedServices" component={SavedServicesScreen} />
        <Stack.Screen name="OffersCoupons" component={OffersCouponsScreen} />
        <Stack.Screen name="ReferEarn" component={ReferEarnScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
