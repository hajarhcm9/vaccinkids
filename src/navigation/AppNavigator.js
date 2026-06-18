import React, { useState, useEffect } from 'react';
import { View, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/app/HomeScreen';
import EnfantsScreen from '../screens/children/EnfantsScreen';
import RdvScreen from '../screens/rdv/RdvScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import { Colors, Elevation } from '../constants/theme';
import { notificationService } from '../services';

const Tab = createBottomTabNavigator();

const TAB_ITEMS = [
  { name: 'Accueil', icon: 'home',          iconOff: 'home-outline' },
  { name: 'Enfants', icon: 'people',        iconOff: 'people-outline' },
  { name: 'RDV',     icon: 'medkit',        iconOff: 'medkit-outline' },
  { name: 'Notifs',  icon: 'notifications', iconOff: 'notifications-outline' },
  { name: 'Profil',  icon: 'person',        iconOff: 'person-outline' },
];

export default function AppNavigator() {
  const insets       = useSafeAreaInsets();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    notificationService.getUnreadCount()
      .then((resp) => { if (resp?.count != null) setUnreadCount(resp.count); })
      .catch(() => {});
  }, []);

  const tabBarHeight = 56 + insets.bottom;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const meta = TAB_ITEMS.find((t) => t.name === route.name);
        return {
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? meta?.icon : meta?.iconOff} size={22} color={color} />
          ),
          tabBarActiveTintColor:   Colors.primary,
          tabBarInactiveTintColor: Colors.textLight,
          tabBarStyle: {
            backgroundColor: Colors.surface,
            borderTopWidth: 1,
            borderTopColor: Colors.border,
            height: tabBarHeight,
            paddingBottom: insets.bottom || 8,
            paddingTop: 8,
            ...Elevation.md,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '700',
            letterSpacing: 0.2,
          },
        };
      }}
    >
      <Tab.Screen name="Accueil" component={HomeScreen} />
      <Tab.Screen name="Enfants" component={EnfantsScreen} />
      <Tab.Screen name="RDV"     component={RdvScreen} />
      <Tab.Screen
        name="Notifs"
        component={NotificationsScreen}
        options={{ tabBarBadge: unreadCount > 0 ? unreadCount : undefined }}
      />
      <Tab.Screen name="Profil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
