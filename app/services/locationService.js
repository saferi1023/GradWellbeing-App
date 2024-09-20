// app/services/locationService.js
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { FIREBASE_APP } from '../_layout'; // Adjust this import path as necessary

const BACKGROUND_LOCATION_TASK_NAME = 'background-location-task';

const db = getFirestore(FIREBASE_APP);
const auth = getAuth(FIREBASE_APP);

export const getCurrentLocationAndSave = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    console.log('Permission to access location was denied');
    return null;
  }

  try {
    const location = await Location.getCurrentPositionAsync({});
    await saveLocationToFirestore(location);
    return location;
  } catch (error) {
    console.error('Error getting or saving location:', error);
    return null;
  }
};

export const setupBackgroundLocationTracking = async () => {
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus !== 'granted') {
    console.log('Permission to access location was denied');
    return;
  }

  const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
  if (backgroundStatus !== 'granted') {
    console.log('Permission to access location in the background was denied');
    return;
  }

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 300000, // update every 5 minutes
    distanceInterval: 100, // or every 100 meters
    foregroundService: {
      notificationTitle: "Location Tracking",
      notificationBody: "Tracking your location for research purposes",
    },
  });
};

export const stopBackgroundLocationTracking = async () => {
  await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK_NAME);
};

const saveLocationToFirestore = async (location) => {
  const user = auth.currentUser;
  if (!user) {
    console.log('No user logged in, cannot save location');
    return;
  }

  try {
    const docRef = await addDoc(collection(db, "users", user.uid, "locations"), {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      timestamp: serverTimestamp(),
      accuracy: location.coords.accuracy,
      altitude: location.coords.altitude,
      speed: location.coords.speed,
      heading: location.coords.heading
    });
    console.log("Location saved with ID: ", docRef.id);
  } catch (e) {
    console.error("Error adding location: ", e);
  }
};

TaskManager.defineTask(BACKGROUND_LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error(error);
    return;
  }
  if (data) {
    const { locations } = data;
    for (let location of locations) {
      await saveLocationToFirestore(location);
    }
  }
});

export const requestLocationPermissions = async () => {
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus !== 'granted') {
    console.log('Foreground location permission denied');
    return false;
  }

  const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
  if (backgroundStatus !== 'granted') {
    console.log('Background location permission denied');
    return false;
  }

  return true;
};

export const checkLocationPermissions = async () => {
  const foregroundStatus = await Location.getForegroundPermissionsAsync();
  const backgroundStatus = await Location.getBackgroundPermissionsAsync();
  return {
    foreground: foregroundStatus.status === 'granted',
    background: backgroundStatus.status === 'granted'
  };
};