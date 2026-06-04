import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/main/HomeScreen';
import SessionsScreen from '../screens/main/SessionsScreen';
import SessionDetailScreen from '../screens/main/SessionDetailScreen';
import AppointmentsScreen from '../screens/main/AppointmentsScreen';
import HealthBookScreen from '../screens/main/HealthBookScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import NotificationsScreen from '../screens/main/NotificationsScreen';
import QueueScreen from '../screens/main/QueueScreen';

import { preferencesService } from '../services/preferencesService';
import { mobileNotificationService } from '../services/mobileNotificationService';
import { colors, typography, spacing, borderRadius } from '../theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const translations = {
  fr: {
    home: 'Accueil',
    sessions: 'Sessions',
    appointments: 'Rendez-vous',
    healthBook: 'Carnet',
    profile: 'Profil',
  },
  ar: {
    home: 'الرئيسية',
    sessions: 'الحصص',
    appointments: 'المواعيد',
    healthBook: 'الدفتر',
    profile: 'الملف',
  },
};

const TabIcon = ({ emoji, focused, badge }) => (
  <View style={tabStyles.iconWrapper}>
    <View style={[tabStyles.iconBox, focused && tabStyles.iconBoxActive]}>
      <Text style={tabStyles.emoji}>{emoji}</Text>
    </View>
    {badge > 0 && (
      <View style={tabStyles.badge}>
        <Text style={tabStyles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
      </View>
    )}
  </View>
);

const SessionsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
    <Stack.Screen name="SessionsList" component={SessionsScreen} />
    <Stack.Screen name="SessionDetail" component={SessionDetailScreen} />
  </Stack.Navigator>
);

const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
    <Stack.Screen name="HomeMain" component={HomeScreen} />
    <Stack.Screen name="SessionDetail" component={SessionDetailScreen} />
    <Stack.Screen name="Queue" component={QueueScreen} />
  </Stack.Navigator>
);

const ProfileStack = ({ onLanguageChange, onUnreadCountChange }) => (
  <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
    <Stack.Screen name="ProfileMain">
      {(props) => <ProfileScreen {...props} onLanguageChange={onLanguageChange} />}
    </Stack.Screen>
    <Stack.Screen name="Notifications">
      {(props) => <NotificationsScreen {...props} onUnreadCountChange={onUnreadCountChange} />}
    </Stack.Screen>
  </Stack.Navigator>
);

const MainNavigator = () => {
  const [language, setLanguage] = useState('fr');
  const [unreadCount, setUnreadCount] = useState(0);
  const t = translations[language] || translations.fr;

  useEffect(() => {
    preferencesService
      .getLanguage()
      .then(setLanguage)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const loadUnreadCount = () => {
      mobileNotificationService
        .getUnreadCount()
        .then(setUnreadCount)
        .catch(() => {});
    };
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: tabStyles.tabBar,
        tabBarLabelStyle: tabStyles.tabLabel,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textHint,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarLabel: t.home,
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Sessions"
        component={SessionsStack}
        options={{
          tabBarLabel: t.sessions,
          tabBarIcon: ({ focused }) => <TabIcon emoji="💉" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Appointments"
        component={AppointmentsScreen}
        options={{
          tabBarLabel: t.appointments,
          tabBarIcon: ({ focused }) => <TabIcon emoji="📅" focused={focused} badge={2} />,
        }}
      />
      <Tab.Screen
        name="HealthBook"
        component={HealthBookScreen}
        options={{
          tabBarLabel: t.healthBook,
          tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        options={{
          tabBarLabel: t.profile,
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} badge={unreadCount} />,
        }}
      >
        {() => <ProfileStack onLanguageChange={setLanguage} onUnreadCountChange={setUnreadCount} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

const tabStyles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    height: Platform.OS === 'ios' ? 84 : 64,
    paddingBottom: Platform.OS === 'ios' ? 24 : spacing.sm,
    paddingTop: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  tabLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
    marginTop: 2,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBoxActive: { backgroundColor: colors.primaryLight },
  emoji: { fontSize: 20 },
  badge: {
    position: 'absolute',
    top: -2,
    right: -6,
    backgroundColor: colors.danger,
    borderRadius: borderRadius.full,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: typography.fontWeights.bold,
  },
});

export default MainNavigator;
