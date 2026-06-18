import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AppNavigator from './AppNavigator';
import EnfantDetailScreen from '../screens/children/EnfantDetailScreen';
import CalendrierScreen from '../screens/calendar/CalendrierScreen';
import VaccinDetailScreen from '../screens/calendar/VaccinDetailScreen';
import RdvDetailScreen from '../screens/rdv/RdvDetailScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import NotificationSettingsScreen from '../screens/notifications/NotificationSettingsScreen';

const Stack = createNativeStackNavigator();

export default function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs"                    component={AppNavigator} />
      <Stack.Screen name="EnfantDetail"            component={EnfantDetailScreen} />
      <Stack.Screen name="Calendrier"              component={CalendrierScreen} />
      <Stack.Screen name="VaccinDetail"            component={VaccinDetailScreen} />
      <Stack.Screen name="RdvDetail"               component={RdvDetailScreen} />
      <Stack.Screen name="EditProfile"             component={EditProfileScreen} />
      <Stack.Screen name="NotificationSettings"    component={NotificationSettingsScreen} />
    </Stack.Navigator>
  );
}
