import React from 'react';
// 1. On importe createNativeStackNavigator au lieu de createStackNavigator
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import OTPVerificationScreen from '../screens/auth/OTPVerificationScreen';
import ProfileSetupScreen from '../screens/auth/ProfileSetupScreen';
import { Colors } from '../constants/theme';

// 2. On initialise le Native Stack
const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        // Note: Avec native-stack, on utilise souvent contentStyle au lieu de cardStyle
        contentStyle: { backgroundColor: Colors.primaryDark },
      }}
    >
      {/* 3. Correction de la faute de frappe ici (Stiack -> Stack) */}
      <Stack.Screen name="Login"           component={LoginScreen}         />
      <Stack.Screen name="Register"        component={RegisterScreen}      />
      <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
      <Stack.Screen name="ProfileSetup"    component={ProfileSetupScreen}  />
    </Stack.Navigator>
  );
}