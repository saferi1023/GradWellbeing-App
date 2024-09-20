import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import * as Health from 'expo-health-kit';

const HealthContext = createContext();

export const useHealth = () => {
  return useContext(HealthContext);
};

export const HealthProvider = ({ children }) => {
  const [sleepData, setSleepData] = useState([]);
  const [screenTimeData, setScreenTimeData] = useState([]);

  useEffect(() => {
    requestAuthorization();
  }, []);

  const requestAuthorization = async () => {
    try {
      const permissions = [
        Health.HealthPermissions.SleepAnalysis,
        Health.HealthPermissions.StandTime
      ];
      const status = await Health.requestPermissionsAsync(permissions);

      if (!status.granted) {
        Alert.alert('Error', 'Permission not granted for Health data');
      } else {
        fetchSleepData();
        fetchScreenTimeData();
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const fetchSleepData = async () => {
    try {
      const data = await Health.getSleepAnalysisAsync();
      setSleepData(data);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const fetchScreenTimeData = async () => {
    // Fetch screen time data using HealthKit API or any other relevant API
    // Currently, HealthKit does not provide a direct way to fetch screen time data.
  };

  return (
    <HealthContext.Provider value={{ sleepData, screenTimeData }}>
      {children}
    </HealthContext.Provider>
  );
};
