import React from 'react';
import { View, Text, StyleSheet, ImageBackground, TouchableOpacity, Animated, Easing, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator } from "react-native";

const { width, height } = Dimensions.get('window');

const LandingPage: React.FC = () => {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = React.useState(true);
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const fadeTitle = React.useRef(new Animated.Value(0)).current;
  const fadeSubtitle = React.useRef(new Animated.Value(0)).current;
  const fadeOut = React.useRef(new Animated.Value(1)).current; // For fade-out effect

  React.useEffect(() => {
    const checkSession = async () => {
      try {
        const userId = await AsyncStorage.getItem("user_id");
        const role = await AsyncStorage.getItem("user_role");

        if (userId && role) {
          switch (role) {
            case "student":
              router.replace("/StudentDashboard");
              return;
            case "parent":
              router.replace("/ParentDashboard");
              return;
            case "warden":
              router.replace("/WardenDashboard");
              return;
            case "admin":
              router.replace("/AdminDashboard");
              return;
          }
        }
      } finally {
        setCheckingSession(false);
      }
    };

    checkSession();
  }, []);


  React.useEffect(() => {
    // Pulsing button animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Fade-in title and subtitle
    Animated.sequence([
      Animated.timing(fadeTitle, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(fadeSubtitle, { toValue: 1, duration: 1000, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleGetStarted = () => {
    // Animate fade-out before navigating
    Animated.timing(fadeOut, {
      toValue: 0,
      duration: 100,
      useNativeDriver: true,
    }).start(() => {
      router.push('/login'); // Navigate after animation
    });
  };

  if (checkingSession) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }


  return (
    <Animated.View style={{ flex: 1, opacity: fadeOut }}>
      <ImageBackground
        source={require('../assets/landing1-bg.jpg')}
        style={[styles.container, { width, height }]}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          <Animated.Text style={[styles.title, { opacity: fadeTitle }]}>
            Welcome to HANS
          </Animated.Text>
          <Animated.Text style={[styles.subtitle, { opacity: fadeSubtitle }]}>
            Hostel Authentication and Notification System
          </Animated.Text>

          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity style={styles.button} onPress={handleGetStarted}>
              <Text style={styles.buttonText}>Get Started</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ImageBackground>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  overlay: { backgroundColor: 'rgba(0,0,0,0.5)', flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  title: { fontSize: 42, color: '#fff', fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 18, color: '#fff', textAlign: 'center', marginBottom: 50 },
  button: { backgroundColor: '#FFD700', paddingVertical: 18, paddingHorizontal: 60, borderRadius: 50, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8 },
  buttonText: { fontSize: 22, fontWeight: 'bold', color: '#000', textAlign: 'center' },
});

export default LandingPage;
