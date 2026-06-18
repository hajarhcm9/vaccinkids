import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services';

export const AuthContext = createContext();

const DEMO_USER = {
  prenom: 'Asmaa',
  nom: 'Badioui',
  email: 'asmaa.badioui@email.com',
  cin: 'AB123456',
  telephone: '0612345678',
  profileCompleted: true,
};

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = async (token, userData, refreshToken) => {
    setUserToken(token);
    setUser(userData);
    await AsyncStorage.setItem('jwtToken', token);
    if (refreshToken) await AsyncStorage.setItem('refreshToken', refreshToken);
    if (userData) await AsyncStorage.setItem('userData', JSON.stringify(userData));
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (e) {
      // silencieux
    }
    setUserToken(null);
    setUser(null);
    await AsyncStorage.multiRemove(['jwtToken', 'refreshToken', 'userData']);
  };

  const updateUser = async (partial) => {
    const next = { ...user, ...partial };
    setUser(next);
    await AsyncStorage.setItem('userData', JSON.stringify(next));
  };

  const checkLoggedIn = async () => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
      const storedUserData = await AsyncStorage.getItem('userData');
      if (token) {
        try {
          const resp = await authService.getMe();
          const freshUser = resp?.data?.user || resp?.user;
          setUserToken(token);
          setUser(freshUser);
          if (freshUser) await AsyncStorage.setItem('userData', JSON.stringify(freshUser));
        } catch (e) {
          if (e?.isAuth || e?.status === 401) {
            await AsyncStorage.multiRemove(['jwtToken', 'refreshToken', 'userData']);
          } else {
            setUserToken(token);
            if (storedUserData) setUser(JSON.parse(storedUserData));
          }
        }
      }
    } catch (e) {
      console.warn('Erreur lecture token/data', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { checkLoggedIn(); }, []);

  const loginDemo = () => {
    setUserToken('DEMO_TOKEN');
    setUser(DEMO_USER);
  };

  return (
    <AuthContext.Provider value={{ userToken, isLoading, user, login, logout, updateUser, loginDemo }}>
      {children}
    </AuthContext.Provider>
  );
};