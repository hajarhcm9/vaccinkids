import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/app/HomeScreen';
import EnfantsScreen from '../screens/children/EnfantsScreen';
import CalendrierScreen from '../screens/calendar/CalendrierScreen';
import RdvScreen from '../screens/rdv/RdvScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import { Colors, Spacing } from '../constants/theme';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size, focused }) => {
          let iconName;
          if (route.name === 'Accueil')     iconName = focused ? 'home'         : 'home-outline';
          else if (route.name === 'Enfants')    iconName = focused ? 'people'      : 'people-outline';
          else if (route.name === 'Calendrier') iconName = focused ? 'calendar'    : 'calendar-outline';
          else if (route.name === 'RDV')        iconName = focused ? 'medkit'      : 'medkit-outline';
          else if (route.name === 'Notifs')     iconName = focused ? 'notifications' : 'notifications-outline';
          else if (route.name === 'Profil')     iconName = focused ? 'person'      : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textLight,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      })}
    >
      <Tab.Screen name="Accueil"     component={HomeScreen}     options={{ headerTitle: 'Accueil' }} />
      <Tab.Screen name="Enfants"     component={EnfantsScreen} />
      <Tab.Screen name="Calendrier"  component={CalendrierScreen} />
      <Tab.Screen name="RDV"         component={RdvScreen} />
      <Tab.Screen name="Notifs"      component={NotificationsScreen} options={{ tabBarBadge: 2 }} />
      <Tab.Screen name="Profil"      component={ProfileScreen} />
    </Tab.Navigator>
  );
}