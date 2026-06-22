import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthContext } from '../context/AuthContext';
import AuthNavigator  from './AuthNavigator';
import AppStack       from './AppStack';
import StaffDashboard from '../screens/staff/StaffDashboard';
import SplashScreen   from '../screens/SplashScreen';

const Stack = createNativeStackNavigator();

function StaffStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="StaffDashboard" component={StaffDashboard} />
    </Stack.Navigator>
  );
}

function isStaff(user) {
  return user?.role === 'infirmier' || user?.role === 'admin' || user?.role === 'medecin';
}

export default function RootNavigator() {
  const { userToken, user, isLoading } = useContext(AuthContext);

  if (isLoading) return <SplashScreen />;

  return (
    <NavigationContainer>
      {userToken
        ? isStaff(user) ? <StaffStack /> : <AppStack />
        : <AuthNavigator />}
    </NavigationContainer>
  );
}
