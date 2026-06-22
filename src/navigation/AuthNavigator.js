import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WelcomeScreen      from '../screens/auth/WelcomeScreen';
import LoginScreen        from '../screens/auth/LoginScreen';
import RegisterScreen     from '../screens/auth/RegisterScreen';
import ForgotScreen       from '../screens/auth/ForgotScreen';
import ProfileSetupScreen from '../screens/auth/ProfileSetupScreen';
import GuestRdvScreen     from '../screens/auth/GuestRdvScreen';
import { Colors } from '../constants/theme';

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.primaryDark },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Welcome"      component={WelcomeScreen}
        options={{ animation: 'fade' }}
      />
      <Stack.Screen name="Login"        component={LoginScreen} />
      <Stack.Screen name="Register"     component={RegisterScreen} />
      <Stack.Screen name="Forgot"       component={ForgotScreen} />
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      <Stack.Screen name="GuestRdv"     component={GuestRdvScreen} />
    </Stack.Navigator>
  );
}
