import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import ProfileSetupScreen from '../screens/auth/ProfileSetupScreen';
import GuestRdvScreen from '../screens/auth/GuestRdvScreen';
import { Colors } from '../constants/theme';

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.primaryDark },
      }}
    >
      <Stack.Screen name="Login"        component={LoginScreen} />
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      <Stack.Screen name="GuestRdv"     component={GuestRdvScreen} />
    </Stack.Navigator>
  );
}
