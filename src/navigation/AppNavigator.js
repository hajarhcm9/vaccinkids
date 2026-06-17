import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/app/HomeScreen';
import EnfantsScreen from '../screens/children/EnfantsScreen';
import RdvScreen from '../screens/rdv/RdvScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import { Colors } from '../constants/theme';
import { notificationService } from '../services';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    notificationService.getUnreadCount()
      .then((resp) => { if (resp?.count != null) setUnreadCount(resp.count); })
      .catch(() => {});
  }, []);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size, focused }) => {
          let iconName;
          if (route.name === 'Accueil') iconName = focused ? 'home'          : 'home-outline';
          else if (route.name === 'Enfants') iconName = focused ? 'people'       : 'people-outline';
          else if (route.name === 'RDV')     iconName = focused ? 'medkit'       : 'medkit-outline';
          else if (route.name === 'Notifs')  iconName = focused ? 'notifications': 'notifications-outline';
          else if (route.name === 'Profil')  iconName = focused ? 'person'       : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor:   Colors.primary,
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
      <Tab.Screen name="Accueil" component={HomeScreen} />
      <Tab.Screen name="Enfants" component={EnfantsScreen} />
      <Tab.Screen name="RDV"     component={RdvScreen} />
      <Tab.Screen
        name="Notifs"
        component={NotificationsScreen}
        options={{ tabBarBadge: unreadCount > 0 ? unreadCount : undefined }}
      />
      <Tab.Screen name="Profil"  component={ProfileScreen} />
    </Tab.Navigator>
  );
}
