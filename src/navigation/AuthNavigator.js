import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import OTPVerificationScreen from '../screens/auth/OTPVerificationScreen';
import ProfileSetupScreen from '../screens/auth/ProfileSetupScreen'; // NOUVEAU
import { Colors } from '../constants/theme';

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen
        name="OTPVerification"
        component={OTPVerificationScreen}
        options={{
          headerShown: true,
          title: 'Retour',
          headerTintColor: Colors.surface,
          headerStyle: { backgroundColor: '#2C5FBF' }
        }}
      />
      <Stack.Screen
        name="ProfileSetup"
        component={ProfileSetupScreen}
        options={{
          headerShown: true,
          title: 'Retour',
          headerTintColor: Colors.surface,
          headerStyle: { backgroundColor: '#2C5FBF' }
        }}
      />
    </Stack.Navigator>
  );
}