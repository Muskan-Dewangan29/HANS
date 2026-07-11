import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n'; // make sure this path points to your i18n.ts file

import { useColorScheme } from '@/hooks/use-color-scheme';

import { useEffect } from 'react';
import * as Location from 'expo-location';
import { Alert, Platform } from 'react-native';
import { LOCATION_TASK_NAME } from '../tasks/LocationTask'; // <-- make sure the path is correct

export const unstable_settings = {
  anchor: 'index',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    const startBackgroundLocation = async () => {
      // Request foreground permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required.');
        return;
      }

      // Request background permissions
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus !== 'granted') {
        Alert.alert('Permission denied', 'Background location permission is required.');
        return;
      }

      // Start background tracking
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.High,
        distanceInterval: 50, // meters
        deferredUpdatesInterval: 1000, // milliseconds
        showsBackgroundLocationIndicator: true, // iOS only
        foregroundService: {
          notificationTitle: 'Tracking location',
          notificationBody: 'Your location is being tracked in the background',
          notificationColor: '#FF0000',
        },
      });

      console.log('Background location tracking started!');
    };

    startBackgroundLocation();
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="ParentDashboard" options={{ headerShown: false }} />
          <Stack.Screen name="StudentDashboard" options={{ headerShown: false }} />
          <Stack.Screen name="WardenDashboard" options={{ headerShown: false }} />
          <Stack.Screen name="GuardDashboard" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </I18nextProvider>
  );
}
