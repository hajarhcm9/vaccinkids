import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen        from '../screens/auth/LoginScreen';
import StaffLoginScreen   from '../screens/auth/StaffLoginScreen';
import ForgotScreen       from '../screens/auth/ForgotScreen';
import ProfileSetupScreen from '../screens/auth/ProfileSetupScreen';
import GuestRdvScreen     from '../screens/auth/GuestRdvScreen';
import { Colors } from '../constants/theme';

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.primaryDark },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Login"        component={LoginScreen} />
      <Stack.Screen name="StaffLogin"   component={StaffLoginScreen} />
      <Stack.Screen name="Forgot"       component={ForgotScreen} />
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      <Stack.Screen name="GuestRdv"     component={GuestRdvScreen} />
    </Stack.Navigator>
  );
}
