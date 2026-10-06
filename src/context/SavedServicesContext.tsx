import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Service } from '../types';
import { MOCK_SERVICES } from '../constants/mockData';

interface SavedServicesContextType {
  savedServices: Service[];
  isSaved: (serviceId: string) => boolean;
  toggleSave: (service: Service) => Promise<void>;
}

const SavedServicesContext = createContext<SavedServicesContextType | undefined>(undefined);

export const SavedServicesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [savedIds, setSavedIds] = useState<string[]>([
    '3a2b1c0d-9e8f-4a7b-6c5d-4e3f2a1b0c9d',
    '8f7a6b5c-4d3e-4f2a-1b0c-9d8e7f6a5b4c',
  ]);

  const loadSaved = async () => {
    try {
      const data = await AsyncStorage.getItem('@homeease_saved_services');
      if (data) {
        setSavedIds(JSON.parse(data));
      }
    } catch (e) {
      console.warn('Error reading saved services:', e);
    }
  };

  useEffect(() => {
    loadSaved();
  }, []);

  const isSaved = (serviceId: string) => savedIds.includes(serviceId);

  const toggleSave = async (service: Service) => {
    let next: string[];
    if (savedIds.includes(service.id)) {
      next = savedIds.filter((id) => id !== service.id);
    } else {
      next = [...savedIds, service.id];
    }
    setSavedIds(next);
    await AsyncStorage.setItem('@homeease_saved_services', JSON.stringify(next));
  };

  const savedServices = MOCK_SERVICES.filter((s) => savedIds.includes(s.id));

  return (
    <SavedServicesContext.Provider value={{ savedServices, isSaved, toggleSave }}>
      {children}
    </SavedServicesContext.Provider>
  );
};

export const useSavedServices = () => {
  const ctx = useContext(SavedServicesContext);
  if (!ctx) throw new Error('useSavedServices must be used within SavedServicesProvider');
  return ctx;
};
