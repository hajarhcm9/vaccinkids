import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/app/HomeScreen';
import EnfantsScreen from '../screens/children/EnfantsScreen';
import CalendrierScreen from '../screens/calendar/CalendrierScreen';
import RdvScreen from '../screens/rdv/RdvScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import { Colors } from '../constants/theme';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Accueil') iconName = 'home-outline';
          else if (route.name === 'Enfants') iconName = 'people-outline';
          else if (route.name === 'Calendrier') iconName = 'calendar-outline';
          else if (route.name === 'RDV') iconName = 'medkit-outline';
          else if (route.name === 'Notifs') iconName = 'notifications-outline';
          else if (route.name === 'Profil') iconName = 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
      })}
    >
      <Tab.Screen
        name="Accueil"
        component={HomeScreen}
        options={{
          headerShown: true,
          title: 'Accueil',
          headerStyle: { backgroundColor: Colors.surface, elevation: 0, shadowOpacity: 0 }, // Pas d'ombre
          headerTintColor: Colors.text,
          headerTitleStyle: { fontWeight: 'bold', fontSize: 24 }, // Titre grand et gras
          headerTitleAlign: 'left', // Aligné à gauche (très aesthetic)
        }}
      />
      <Tab.Screen
        name="Enfants"
        component={EnfantsScreen}
        options={{
          headerShown: true,
          title: 'Mes Enfants',
          headerStyle: { backgroundColor: Colors.surface, elevation: 0, shadowOpacity: 0 },
          headerTintColor: Colors.text,
          headerTitleStyle: { fontWeight: 'bold', fontSize: 24 },
          headerTitleAlign: 'left',
        }}
      />
      <Tab.Screen
        name="Calendrier"
        component={CalendrierScreen}
        options={{
          headerShown: true,
          title: 'Calendrier',
          headerStyle: { backgroundColor: Colors.surface, elevation: 0, shadowOpacity: 0 },
          headerTintColor: Colors.text,
          headerTitleStyle: { fontWeight: 'bold', fontSize: 24 },
          headerTitleAlign: 'left',
        }}
      />
      <Tab.Screen
        name="RDV"
        component={RdvScreen}
        options={{
          headerShown: true,
          title: 'Rendez-vous',
          headerStyle: { backgroundColor: Colors.surface, elevation: 0, shadowOpacity: 0 },
          headerTintColor: Colors.text,
          headerTitleStyle: { fontWeight: 'bold', fontSize: 24 },
          headerTitleAlign: 'left',
        }}
      />
      <Tab.Screen name="Notifs" component={NotificationsScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Profil" component={ProfileScreen} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}