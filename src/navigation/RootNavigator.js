import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import AuthNavigator from './AuthNavigator';
import AppStack      from './AppStack';
import SplashScreen  from '../screens/SplashScreen';

export default function RootNavigator() {
  const { userToken, isLoading } = useContext(AuthContext);

  if (isLoading) return <SplashScreen />;

  return (
    <NavigationContainer>
      {userToken ? <AppStack /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
