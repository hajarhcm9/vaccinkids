import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = async (token, userData) => {
    setUserToken(token);
    setUser(userData);
    await AsyncStorage.setItem('jwtToken', token);
    if (userData) {
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
    }
  };

  const logout = async () => {
    setUserToken(null);
    setUser(null);
    await AsyncStorage.removeItem('jwtToken');
    await AsyncStorage.removeItem('userData');
  };

  const checkLoggedIn = async () => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
      const storedUserData = await AsyncStorage.getItem('userData');
      if (token) {
        setUserToken(token);
        if (storedUserData) {
          setUser(JSON.parse(storedUserData));
        }
      }
    } catch (e) {
      console.log('Erreur lecture token/data', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { checkLoggedIn(); }, []);

  return (
    <AuthContext.Provider value={{ userToken, isLoading, login, logout, user }}>
      {children}
    </AuthContext.Provider>
  );
};