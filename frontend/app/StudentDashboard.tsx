import { FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useEffect,useRef, useState } from 'react';
import { ActivityIndicator, Alert, Button, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View ,KeyboardAvoidingView} from 'react-native';
import QRCode from 'react-qr-code';
import API_URL from "../config/server"; // ✅ Make sure this points to your backend base URL
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ScreenCapture from 'expo-screen-capture';
import { GestureResponderEvent } from 'react-native';

interface NavButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onPress: (event: GestureResponderEvent) => void;
}


interface StudentDashboardProps {
  onLogout?: () => void;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ onLogout }) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'home' | 'request' | 'history' | 'profile'>('home');
  const [studentData, setStudentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationsSeen, setNotificationsSeen] = useState(false);
  const [currentStatus, setCurrentStatus] = useState("Checking...");
  const [leaveState, setLeaveState] = useState({
  latestLeave: studentData?.latestLeave || null,
  submitStatus: null,
  showExtendForm: false,
});
const [hostelConfig, setHostelConfig] = useState<{
  latitude: number;
  longitude: number;
  tolerance: number;
} | null>(null);
const isAtHostel = (lat: number, lon: number) => {
  if (!hostelConfig) return false;

  return (
    Math.abs(lat - hostelConfig.latitude) <= hostelConfig.tolerance &&
    Math.abs(lon - hostelConfig.longitude) <= hostelConfig.tolerance
  );
};




useEffect(() => {
  let interval: number;
  
  const checkLocationStatus = async () => {
    if (!hostelConfig) return;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setCurrentStatus("Location Disabled");
        syncStatusToBackend("location_disabled");
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      if (isAtHostel(latitude, longitude)) {
  setCurrentStatus("In Hostel");
  syncStatusToBackend("In Hostel");   // ✅ ADD
} else {
  setCurrentStatus("Out of Hostel");
  syncStatusToBackend("Out of Hostel"); // ✅ ADD
}

    } catch (err) {
      console.log("Location check error:", err);
      setCurrentStatus("Location Disabled");
      syncStatusToBackend("location_disabled");
    }
  };

  // run immediately
  checkLocationStatus();

  // run every 20 seconds
  interval = setInterval(checkLocationStatus, 20000);

  return () => clearInterval(interval);
}, [hostelConfig]);
const syncStatusToBackend = async (status: string) => {
  try {
    const id = await AsyncStorage.getItem("user_id");
    if (!id) return;

    await fetch(`${API_URL}/api/student_dashboard.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update_status",
        id: id,
        status: status, // "In Hostel" | "Out of Hostel"
      }),
    });
  } catch (err) {
    console.log("❌ Failed to sync status:", err);
  }
};


  useEffect(() => {
  let interval: number;
    const loadStudentData = async () => {
      try {
        const id = await AsyncStorage.getItem("user_id");
        if (!id) {
          Alert.alert("Error", "No student ID found. Please log in again.");
          router.replace("/login");
          return;
        }

        console.log("Fetching student data for ID:", id);

        const response = await fetch(`${API_URL}/api/student_dashboard.php`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ id, action: 'get_dashboard' }),
});


        const text = await response.text();
        console.log("Raw response:", text);

        const data = JSON.parse(text);

        if (
  data.user?.hostel_latitude &&
  data.user?.hostel_longitude &&
  data.user?.hostel_tolerance
  
) {
  setStudentData(data.user); // ✅ ADD THIS LINE

  setHostelConfig({
    latitude: parseFloat(data.user.hostel_latitude),
    longitude: parseFloat(data.user.hostel_longitude),
    tolerance: parseFloat(data.user.hostel_tolerance),
    
  });
}
 else {
          Alert.alert("Error", data.message || "Unable to load student data");
        }
      } catch (error) {
        console.error("Fetch error:", error);
        Alert.alert("Error", "Failed to connect to server");
      } finally {
        setLoading(false);
      }
    };

    loadStudentData();
    // set interval to refresh every 10 seconds
  interval = setInterval(loadStudentData, 10000); // 10000 ms = 10 sec

  return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
  try {
    const email = await AsyncStorage.getItem("user_email");

    if (email) {
      await fetch(`${API_URL}/api/login.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "logout",
          email: email,
        }),
      });
    }

    await AsyncStorage.clear();
    router.replace("/login");

    if (onLogout) onLogout();
  } catch (err) {
    console.log("Logout error:", err);
    await AsyncStorage.clear();
    router.replace("/login");
  }
};


  const handleTabChange = (tab: 'home' | 'request' | 'history' | 'profile') => setActiveTab(tab);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text>Loading dashboard...</Text>
      </View>
    );
  }

  if (!studentData) {
    return (
      <View style={styles.center}>
        <Text>No student data found.</Text>
        <Button title="Go to Login" onPress={() => router.replace("/login")} />
      </View>
    );
  }

  

  return (
    <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
      {/* Header */}
      <View
  style={{
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: "#faf9fdff",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  }}
>

  {/* College Logo + Welcome Text */}
  <View style={{ flexDirection: "row", alignItems: "center" }}>
    <Image
      source={require('../assets/logo.jpg')}
      style={{ width: 50, height: 50, borderRadius: 25, marginRight: 12 }}
      resizeMode="contain"
    />

    <View>
      <Text style={{ color: "black", fontSize: 16, fontWeight: "bold" }}>
        Welcome to HANS
      </Text>
      <Text style={{ color: "black", fontSize: 14, fontWeight: "bold" }}>
        {studentData.name || "User"}!
      </Text>
    </View>
  </View>

  {/* RIGHT SIDE: Bell + Logout */}
  <View style={{ flexDirection: "row", alignItems: "center" }}>

    {/* 🔔 Notification Bell */}
    <TouchableOpacity
      onPress={() => { setShowNotifications(true); setNotificationsSeen(true); }}
      style={{ marginRight: 10 }}   // ← removed marginLeft:120 ONLY
    >
      <Ionicons name="notifications-outline" size={24} color="#2563EB" />

      {studentData.notifications &&
        studentData.notifications.length > 0 &&
        !notificationsSeen && (
          <View style={styles.notificationBadge}>
            <Text style={{ color: "#2563EB", fontSize: 10 }}>
              {studentData.notifications.length}
            </Text>
          </View>
        )}
    </TouchableOpacity>

    {/* Logout */}
    <TouchableOpacity
      onPress={handleLogout}
      style={{ flexDirection: "row", alignItems: "center" }}
    >
      <MaterialIcons name="logout" size={20} color="#2563EB" />
      <Button title="Logout" onPress={handleLogout} />
    </TouchableOpacity>

  </View>
</View>

      

<ScrollView style={{ flex: 1 }}>
  <View style={{ display: activeTab === 'home' ? 'flex' : 'none' }}>
    <StudentHome
      studentData={studentData}
      activeTab={activeTab}
      currentStatus={currentStatus}
      setCurrentStatus={setCurrentStatus}
      syncStatusToBackend={syncStatusToBackend}
      hostelConfig={hostelConfig}
    />
  </View>

  <View style={{ display: activeTab === 'request' ? 'flex' : 'none' }}>
    <LeaveRequest
      studentData={studentData}
      leaveState={leaveState}
      setLeaveState={setLeaveState}
      hostelConfig={hostelConfig}
    />
  </View>

  <View style={{ display: activeTab === 'history' ? 'flex' : 'none' }}>
    <LeaveHistory />
  </View>

  <View style={{ display: activeTab === 'profile' ? 'flex' : 'none' }}>
    <StudentProfile studentData={studentData} setStudentData={setStudentData} />
  </View>
</ScrollView>


      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <NavButton icon={<Ionicons name="home-outline" size={20} color={activeTab === 'home' ? '#2563EB' : '#6B7280'} />} label="Home" active={activeTab === 'home'} onPress={() => handleTabChange('home')} />
        <NavButton icon={<Ionicons name="time-outline" size={20} color={activeTab === 'request' ? '#2563EB' : '#6B7280'} />} label="Request" active={activeTab === 'request'} onPress={() => handleTabChange('request')} />
        <NavButton icon={<Ionicons name="clipboard-outline" size={20} color={activeTab === 'history' ? '#2563EB' : '#6B7280'} />} label="History" active={activeTab === 'history'} onPress={() => handleTabChange('history')} />
        <NavButton icon={<FontAwesome5 name="user" size={20} color={activeTab === 'profile' ? '#2563EB' : '#6B7280'} />} label="Profile" active={activeTab === 'profile'} onPress={() => handleTabChange('profile')} />
      </View>
    

    
{showNotifications && (
  <View style={styles.notificationOverlay}>
    <View style={styles.notificationPanel}>
      <Text style={styles.notificationTitle}>Notifications</Text>

      <ScrollView style={{ maxHeight: 300 }}>
        {studentData.notifications && studentData.notifications.length ? (
          studentData.notifications.map((note:any, index:any) => (
            <View key={index} style={styles.notificationItem}>
              <Text
  style={[
    styles.notificationText,
    note.message.toLowerCase().includes('rejected')
      ? { color: 'red', fontWeight: '700' }
      : note.message.toLowerCase().includes('approved')
      ? { color: 'green', fontWeight: '700' }
      : { color: '#1F2937' },
  ]}
>
  {note.message}
</Text>

              <Text style={styles.notificationTime}>
              </Text>
            </View>
          ))
        ) : (
          <View style={styles.notificationItem}>
            <Text style={styles.notificationText}>No new notifications</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => setShowNotifications(false)}
      >
        <Text style={{ color: 'white', fontWeight: '600' }}>Close</Text>
      </TouchableOpacity>
    </View>
  </View>
)}


      
</View>
);

  
};

// Navigation Button Component
const NavButton: React.FC<NavButtonProps> = ({
  icon,
  label,
  active,
  onPress,
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      alignItems: 'center',
      borderBottomWidth: active ? 2 : 0,
      borderBottomColor: active ? '#2563EB' : 'transparent',
      paddingBottom: 4,
    }}
  >
    {icon}
    <Text
      style={{
        fontSize: 12,
        color: active ? '#2563EB' : '#6B7280',
        marginTop: 2,
        fontWeight: active ? 'bold' : 'normal',
      }}
    >
      {label}
    </Text>
  </TouchableOpacity>
);



// ===================== Student Home =====================
interface StudentHomeProps {
  studentData: any; // you can strongly type this later
  activeTab: 'home' | 'request' | 'history' | 'profile';
  currentStatus: string;
  setCurrentStatus: React.Dispatch<React.SetStateAction<string>>;
  syncStatusToBackend: (status: string) => void; // ✅ add this
hostelConfig: {
    latitude: number;
    longitude: number;
    tolerance: number;
  } | null;
}

const StudentHome: React.FC<StudentHomeProps> = ({
  studentData,
  activeTab,
  currentStatus,
  setCurrentStatus,
  syncStatusToBackend, // ✅ now available
  hostelConfig,
}) => {

const [checkedIn, setCheckedIn] = useState(false);

const [showQR, setShowQR] = useState(false);
const [timer, setTimer] = useState<string>('00:00:00');
const [timerActive, setTimerActive] = useState(false);
useEffect(() => {
  if (showQR) {
    ScreenCapture.preventScreenCaptureAsync();
  } else {
    ScreenCapture.allowScreenCaptureAsync();
  }

  return () => {
    ScreenCapture.allowScreenCaptureAsync();
  };
}, [showQR]);


const isAtHostel = (lat: number, lon: number) => {
  if (!hostelConfig) return false;

  return (
    Math.abs(lat - hostelConfig.latitude) <= hostelConfig.tolerance &&
    Math.abs(lon - hostelConfig.longitude) <= hostelConfig.tolerance
  );
};

const handleCheckIn = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission Denied", "Location permission is required to check in.");
      return;
    }

    const location = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = location.coords;

    if (!isAtHostel(latitude, longitude)) {
      Alert.alert("Not at Hostel", "You must be inside hostel to check in.");
      return;
    }

    // ✅ SUCCESS CHECK-IN
    setCurrentStatus("In Hostel");
    setCheckedIn(true);               // 🔥 STOP TIMER
    setShowQR(false);                 // 🔥 HIDE QR
    syncStatusToBackend("In Hostel");

    Alert.alert("Success", "Checked in successfully!");

  } catch (err) {
    console.error(err);
    Alert.alert("Error", "Unable to get your location.");
  }
};

const handleCheckOut = async () => {
  if (currentStatus !== "Checked In") {
    Alert.alert("Error", "You can only check out if you are checked in.");
    return;
  }

  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission Denied", "Location permission is required to check out.");
      return;
    }

    const location = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = location.coords;

    // Only allow check out if at hostel
    if (isAtHostel(latitude, longitude)) {
      setCurrentStatus("Out of Hostel");
syncStatusToBackend("Out of Hostel");
      Alert.alert("Success", "You have checked out!");
      // Optionally, call backend API to save check-out
    } else {
      Alert.alert("Error", "You must be at the hostel to check out!");
    }
  } catch (err) {
    console.error(err);
    Alert.alert("Error", "Unable to get your location.");
  }
};

const encryptId = (id: string | number) => {
  return btoa(String(id));
};


// Find the latest leave that is fully approved (both parent & warden)
const latestApprovedLeave = studentData.approvedLeaves?.length
  ? studentData.approvedLeaves[0] // assuming leaves are sorted descending
  : null;

// Generate QR code data only if leave is fully approved
// ✅ Safely generate QR data only if leave exists
const qrData = latestApprovedLeave
  ? `${API_URL}/api/view_leave.php?token=${encryptId(latestApprovedLeave.id)}`
  : null;

useEffect(() => {
  if (!latestApprovedLeave || checkedIn) {
    setTimerActive(false);
    setTimer('00:00:00');
    return;
  }

  const from = new Date(`${latestApprovedLeave.fromDate}T${latestApprovedLeave.fromTime}`);
  const to = new Date(`${latestApprovedLeave.toDate}T${latestApprovedLeave.toTime}`);

  const updateTimer = () => {
    const now = new Date();

    if (now >= from && now <= to && !checkedIn) {
      setTimerActive(true);

      const diff = to.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimer(
        `${hours.toString().padStart(2, '0')}:` +
        `${minutes.toString().padStart(2, '0')}:` +
        `${seconds.toString().padStart(2, '0')}`
      );
    } else {
      setTimerActive(false);
      setTimer('00:00:00');
    }
  };

  updateTimer();
  const interval = setInterval(updateTimer, 1000);

  return () => clearInterval(interval);
}, [latestApprovedLeave, checkedIn]);
useEffect(() => {
  if (!latestApprovedLeave) return;

  const to = new Date(
    `${latestApprovedLeave.toDate}T${latestApprovedLeave.toTime}`
  );

  let alertInterval: ReturnType<typeof setInterval> | null = null;


  const checkLeaveOverAndAlert = () => {
    const now = new Date();

    // ✅ Leave time over AND student still out of hostel AND not checked in
    if (
      now > to &&
      currentStatus === "Out of Hostel" &&
      !checkedIn
    ) {
      Alert.alert(
        "Leave Time Over ⏰",
        "Your leave time has ended and you are still out of the hostel."
      );
    }
  };

  // ⏱️ Start alert every 10 seconds ONLY if leave is over
  if (new Date() > to && currentStatus === "Out of Hostel" && !checkedIn) {
    alertInterval = setInterval(checkLeaveOverAndAlert, 10000);
  }

  // 🧹 Cleanup
  return () => {
    if (alertInterval) clearInterval(alertInterval);
  };
}, [latestApprovedLeave, currentStatus, checkedIn]);






  return (
    <View style={{ padding: 16 }}>
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: '600' }}>Current Status</Text>
<Text
  style={[
    styles.statusBadge,
    currentStatus === "In Hostel"
      ? styles.greenBadge
      : currentStatus === "Out of Hostel"
      ? styles.redBadge
      : currentStatus === "Checked In"
      ? styles.yellowBadge
      : currentStatus === "Location Disabled"
      ? styles.redBadge
      : styles.redBadge // fallback
  ]}
>  {currentStatus}
</Text>

        </View>
        <Text>Hostel: {studentData.hostel}</Text>
        <Text>Room: {studentData.room}</Text>
      </View>

      


     <View style={styles.card}>
  <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>QR Code</Text>

  {latestApprovedLeave && timerActive && !checkedIn ? (
    showQR ? (
      <View style={{ alignItems: 'center' }}>
        {qrData && <QRCode value={qrData} size={200} />}
        <View style={{ marginTop: 16 }}>
          <Button title="Hide QR" onPress={() => setShowQR(false)} />
        </View>
      </View>
    ) : (
      <Button title="Show QR" onPress={() => setShowQR(true)} />
    )
  ) : (
    <Text style={{ color: '#EF4444', marginTop: 8 }}>
      Leave time is over. QR code is no longer valid.
    </Text>
  )}
</View>

     {/* Check In / Check Out Buttons */}
<View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 16 }}>
  <TouchableOpacity
  disabled={checkedIn}
  style={{
    backgroundColor: checkedIn ? '#9CA3AF' : '#2563EB',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 120,
    alignItems: 'center',
  }}
  onPress={handleCheckIn}
>
  <Text style={{ color: 'white', fontSize: 18, fontWeight: '600' }}>
    {checkedIn ? "Checked In" : "Check In"}
  </Text>
</TouchableOpacity>


  {/* <TouchableOpacity
    style={{
      backgroundColor: '#EF4444',
      paddingVertical: 16,
      paddingHorizontal: 32,
      borderRadius: 12,
      minWidth: 120,
      alignItems: 'center',
    }}
onPress={handleCheckOut}
  >
    <Text style={{ color: 'white', fontSize: 18, fontWeight: '600' }}>Check Out</Text>
  </TouchableOpacity> */}
</View>

{timerActive && !checkedIn && (
  <View
    style={{
      marginTop: 24,
      width: 180,
      height: 180,
      borderRadius: 90,               // ✅ makes it round
      backgroundColor: '#fc0c0cff',     // light warning yellow
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 6,
      borderWidth: 4,
      borderColor: '#f50b0bff',         // amber border
    }}
  >
    <Text
      style={{
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fcf8f8ff',
        marginBottom: 6,
        letterSpacing: 1,
      }}
    >
      TIME LEFT
    </Text>

    <Text
      style={{
        fontSize: 34,                 // 🔥 big timer
        fontWeight: '900',
        color: '#fcf8f8ff',              // red
        letterSpacing: 1.5,
      }}
    >
      {timer}
    </Text>
  </View>
)}


      </View>
    );
  
};

// ===================== Leave Request =====================
interface LeaveFormData {
  fromDate: Date;
  fromTime: Date;
  toDate: Date;
  toTime: Date;
  requestType: string;
  reason: string;
  destination: string;
  contactNumber: string;
  latitude: string;
  longitude: string;
}

interface Leave {
  id: number | string;
  fromDate: string;
  fromTime: string;
  toDate: string;
  toTime: string;
  status?: string;
  [key: string]: any; // optional other props
}
interface LeaveRequestProps {
  studentData: any; // replace `any` with your actual student data type if known
  leaveState: {
    latestLeave: any;
    submitStatus: any; // or null
    showExtendForm: boolean;
  };
  setLeaveState: React.Dispatch<React.SetStateAction<{
    latestLeave: any;
    submitStatus: any;
    showExtendForm: boolean;
  }>>;
  hostelConfig: {
    latitude: number;
    longitude: number;
    tolerance: number;
  } | null;
}

const LeaveRequest: React.FC<LeaveRequestProps> = ({ studentData, hostelConfig}) => {
  const [formData, setFormData] = useState({
    fromDate: new Date(),
    fromTime: new Date(),
    toDate: new Date(),
    toTime: new Date(),
    requestType: "",
    reason: '',
    destination: '',
    contactNumber: '',
    latitude: '',
    longitude: '',
  });
  const [locationFetched, setLocationFetched] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<null | 'success'>(null);
  const [showPicker, setShowPicker] = useState<{ field: string; mode: 'date' | 'time' } | null>(null);
  const [confirmedPhoto, setConfirmedPhoto] = useState<string | null>(null);
  const [latestLeave, setLatestLeave] = useState<any>(null);
  const [showExtendForm, setShowExtendForm] = useState(false);

  useEffect(() => {
    if (studentData?.phone) {
      setFormData(prev => ({ ...prev, contactNumber: studentData.phone }));
    }
    if (studentData.latestLeave) {
      setLatestLeave(studentData.latestLeave);
    }
  }, [studentData]);

  // Fetch location
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Location permission is required to submit leave.');
          return;
        }
        const location = await Location.getCurrentPositionAsync({});
        setFormData(prev => ({
          ...prev,
          latitude: location.coords.latitude.toString(),
          longitude: location.coords.longitude.toString(),
        }));
        setLocationFetched(true);
      } catch (err) {
        console.error("Error fetching location:", err);
        Alert.alert("Error", "Unable to fetch your location.");
      }
    })();
  }, []);

  // Cancel Leave
  const handleCancelLeave = async () => {
    try {
      if (!latestLeave) {
        Alert.alert("Error", "No active leave found to cancel.");
        return;
      }

      const RollNumber = await AsyncStorage.getItem("user_id");
      if (!RollNumber) return;

      const response = await fetch(`${API_URL}/api/student_dashboard.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          RollNumber: RollNumber,
          action: 'cancel_leave'
        }),
      });

      const result = await response.json();
      if (result.success) {
        Alert.alert("Success", "Leave request cancelled.");
        setLatestLeave(null);
        setSubmitStatus(null);
        setShowExtendForm(false);
      } else {
        Alert.alert("Error", result.message || "Unable to cancel leave request.");
      }
    } catch (err) {
      console.error("handleCancelLeave error:", err);
      Alert.alert("Error", "Unable to connect to server.");
    }
  };

  // Extend Leave
  const handleExtendLeave = async () => {
    if (!formData.toDate || !formData.toTime) {
      Alert.alert("Missing Fields", "Please select new To Date and Time.");
      return;
    }
    try {
      const RollNumber = await AsyncStorage.getItem("user_id");
      if (!RollNumber || !latestLeave?.id) return;

      const response = await fetch(`${API_URL}/api/student_dashboard.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          RollNumber: RollNumber,
          leave_id: latestLeave.id,
          new_to_date: formatDate(formData.toDate),
          new_to_time: formatTime(formData.toTime),
          action: 'extend_leave'
        }),
      });

      const result = await response.json();
      if (result.success) {
        Alert.alert("Success", "Leave time extended successfully!");
        setLatestLeave((prev: Leave | null) => prev ? { ...prev, toDate: formData.toDate, toTime: formData.toTime } : prev);
        setShowExtendForm(false);
      } else {
        Alert.alert("Error", result.message || "Failed to extend leave");
      }
    } catch (err) {
      console.error("handleExtendLeave error:", err);
      Alert.alert("Error", "Unable to connect to server.");
    }
  };
  const convertToBase64 = async (uri: string) => {
  const response = await fetch(uri);
  const blob = await response.blob();

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};



const isAtHostel = (lat: number, lon: number) => {
  if (!hostelConfig) return false;

  return (
    Math.abs(lat - hostelConfig.latitude) <= hostelConfig.tolerance &&
    Math.abs(lon - hostelConfig.longitude) <= hostelConfig.tolerance
  );
};


  const handleSubmit = async () => {
      //BLOCK REQUEST IF NOT AT HOSTEL
  const lat = parseFloat(formData.latitude);
  const lon = parseFloat(formData.longitude);

  if (!lat || !lon) {
    Alert.alert(
      "Location Error",
      "Unable to verify your location. Please try again."
    );
    return;
  }

  if (!isAtHostel(lat, lon)) {
    Alert.alert(
      "Not At Hostel",
      "You cannot make a request because you are not at hostel location."
    );
    return;
  }
  if (!formData.requestType) {
  Alert.alert("Missing Request Type", "Please select a request type.");
  return;
}
    if (!formData.reason || !formData.destination || !formData.contactNumber) {
      Alert.alert("Missing Fields", "Please fill all the fields before submitting.");
      return;
    }
    if (!confirmedPhoto) {
      Alert.alert("Photo Required", "Please take a live photo before submitting your leave request.");
      return;
    }
      const fromDateTime = new Date(`${formatDate(formData.fromDate)}T${formatTime(formData.fromTime)}`);
  const toDateTime = new Date(`${formatDate(formData.toDate)}T${formatTime(formData.toTime)}`);
  if (toDateTime <= fromDateTime) {
    Alert.alert("Invalid Time", "The 'To' time must be after the 'From' time.");
    return;
  }
    try {
      const RollNumber = await AsyncStorage.getItem("user_id");
      if (!RollNumber) return;

      const payload = {
        RollNumber: RollNumber,
        requestType: formData.requestType,
        reason: formData.reason,
        destination: formData.destination,
        contactNumber: formData.contactNumber,
        fromDate: formatDate(formData.fromDate),
        fromTime: formatTime(formData.fromTime),
        toDate: formatDate(formData.toDate),
        toTime: formatTime(formData.toTime),
        latitude: formData.latitude,
        longitude: formData.longitude,
        photo: await convertToBase64(confirmedPhoto),
      };

      const response = await fetch(`${API_URL}/api/student_dashboard.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, action: 'submit_leave' }),
      });

      const result = await response.json();
      if (result.success) {
        setSubmitStatus('success');
        setLatestLeave(result.leave || { id: result.leave_id, status: 'pending', fromDate: formData.fromDate, fromTime: formData.fromTime, toDate: formData.toDate, toTime: formData.toTime });
        setFormData({
          fromDate: new Date(),
          fromTime: new Date(),
          toDate: new Date(),
          toTime: new Date(),
          requestType: "",
          reason: '',
          destination: '',
          contactNumber: formData.contactNumber,
          latitude: formData.latitude,
          longitude: formData.longitude,
        });
        setConfirmedPhoto(null);
      } else {
        Alert.alert("Error", result.message || "Failed to submit leave request");
      }
    } catch (error) {
      console.error("Error submitting leave request:", error);
      Alert.alert("Error", "Unable to connect to server");
    }
  };

  // Date & Time Picker helpers
  const handleChange = (name: string, value: any) => setFormData(prev => ({ ...prev, [name]: value }));
  const showDateTimePicker = (field: string, mode: 'date' | 'time') => setShowPicker({ field, mode });
  const onPickerChange = (event: any, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setShowPicker(null);
      return;
    }
    if (showPicker && selectedDate) handleChange(showPicker.field, selectedDate);
    setShowPicker(null);
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission Denied", "Camera access is required to take photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, aspect: [1, 1], quality: 0.5 });
    if (!result.canceled) {
      setConfirmedPhoto(result.assets[0].uri);
      Alert.alert("Photo Taken", "Do you want to use this photo?", [
        { text: "Retake", onPress: handleTakePhoto },
        { text: "Use Photo", style: "default" }
      ]);
    }
  };

  const formatDate = (date: Date) => `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')}`;
  const formatTime = (date: Date) => `${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;

  // Check if leave is active (not cancelled & not expired)
  const now = new Date();
  const leaveTo = latestLeave ? new Date(`${latestLeave.toDate}T${latestLeave.toTime}`) : null;
  const isLeaveActive = latestLeave && leaveTo && leaveTo > now && latestLeave.status?.toLowerCase() !== 'cancelled';

  // ---------------- Render ----------------
  if (isLeaveActive) {
    return (
      <View style={{ padding: 16 }}>
        <View style={styles.card}>
          <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 12 }}>Leave Request In Progress</Text>
          <Text>You have an active leave request until {latestLeave.toDate} {latestLeave.toTime}.</Text>
          <View style ={{padding:12}}>
          <Button title="Cancel Leave Request" onPress={handleCancelLeave} color="#EF4444" />
          </View>
          
        </View>
      </View>
    );
  }

  // Show normal leave request form if no active leave
  return (
    <View style={{ padding: 16 }}>
      <View style={styles.card}>
        <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 12 }}>Request Leave Permission</Text>
      {submitStatus === 'success' ? (
  // Treat submitted leave as active leave
  <View style={{ padding: 16 }}>
    <View style={styles.card}>
      <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 12 }}>Leave Request In Progress</Text>
      <Text>You have an active leave request until {formatDate(new Date(latestLeave.toDate))} {formatTime(new Date(latestLeave.toTime))}</Text>
      <View style={{ marginTop: 12 }}>
      <Button title="Cancel Leave Request" onPress={handleCancelLeave} color="#EF4444"  />
      </View>

    </View>
  </View>
        ) : (
          <>
            {/* Date & Time Inputs */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <View style={{ flex: 1, marginRight: 4 }}>
                <Text>From Date</Text>
                <TextInput style={styles.input} value={formatDate(formData.fromDate)} onFocus={() => showDateTimePicker('fromDate', 'date')} />
              </View>
              <View style={{ flex: 1, marginLeft: 4 }}>
                <Text>From Time</Text>
                <TextInput style={styles.input} value={formatTime(formData.fromTime)} onFocus={() => showDateTimePicker('fromTime', 'time')} />
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <View style={{ flex: 1, marginRight: 4 }}>
                <Text>To Date</Text>
                <TextInput style={styles.input} value={formatDate(formData.toDate)} onFocus={() => showDateTimePicker('toDate', 'date')} />
              </View>
              <View style={{ flex: 1, marginLeft: 4 }}>
                <Text>To Time</Text>
                <TextInput style={styles.input} value={formatTime(formData.toTime)} onFocus={() => showDateTimePicker('toTime', 'time')} />
              </View>
            </View>

            {/* Request Type Dropdown */}
<Text>Request Type</Text>
<View
  style={{
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#fff",
    marginBottom: 12,
    overflow: "hidden", // ensures borderRadius works on Android
  }}
>
  <Picker
    selectedValue={formData.requestType}
    onValueChange={(value) => handleChange("requestType", value)}
    style={{
      height: 50,
      color: formData.requestType ? "#000" : "#888", // placeholder color
    }}
  >
    <Picker.Item label="Select the type of request" value="" enabled={true} />
    <Picker.Item label="Leave" value="leave" />
    <Picker.Item label="Outing" value="outing" />
  </Picker>
</View>




            {/* Reason / Destination */}
            <Text>Reason</Text>
            <TextInput style={styles.input} placeholder="Reason" value={formData.reason} onChangeText={v => handleChange('reason', v)} />
            <Text>Destination</Text>
            <TextInput style={styles.input} placeholder="Destination" value={formData.destination} onChangeText={v => handleChange('destination', v)} />

            {/* Contact & Location */}
            <Text>Contact Number</Text>
            <TextInput style={[styles.input, { backgroundColor: '#E5E7EB' }]} value={formData.contactNumber} editable={false} />
            <Text>Latitude</Text>
            <TextInput style={[styles.input, { backgroundColor: '#E5E7EB' }]} value={formData.latitude} editable={false} />
            <Text>Longitude</Text>
            <TextInput style={[styles.input, { backgroundColor: '#E5E7EB' }]} value={formData.longitude} editable={false} />

            {/* Photo */}
            <Text>Photo</Text>
            {confirmedPhoto && <Image source={{ uri: confirmedPhoto }} style={{ width: 200, height: 200, marginBottom: 8, borderRadius: 8 }} />}
            <View style={{ marginBottom: 12 }}>
              <Button title={confirmedPhoto ? "Retake Photo" : "Take Photo"} onPress={handleTakePhoto} />
            </View>

            {/* Submit */}
            <Button title="Submit Request" onPress={handleSubmit} />

            {showPicker && (
              <DateTimePicker
                value={formData[showPicker.field as 'fromDate' | 'fromTime' | 'toDate' | 'toTime']}
                mode={showPicker.mode}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onPickerChange}
              />
            )}
          </>
        )}
      </View>
    </View>
  );
};


// ===================== Leave History =====================
const LeaveHistory = () => {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaves = async () => {
      try {
        const RollNumber = await AsyncStorage.getItem("user_id");
        if (!RollNumber) return;

        const response = await fetch(`${API_URL}/api/student_dashboard.php`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ RollNumber: RollNumber, action: 'get_leave_history' }),
});

        const result = await response.json();
        if (result.success && result.leave_requests) {
          setLeaves(result.leave_requests);
        } else {
          setLeaves([]);
        }
      } catch (error) {
        console.error("Error fetching leave history:", error);
        setLeaves([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaves();
  }, []);

  if (loading) {
    return (
      <View style={{ padding: 16, alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text>Loading leave history...</Text>
      </View>
    );
  }

  if (!leaves.length) {
    return (
      <View style={{ padding: 16 }}>
        <View style={styles.card}>
          <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 12 }}>Leave History</Text>
          <Text>No leave requests found.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ padding: 16 }}>
      <View style={styles.card}>
        <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 12 }}>Leave History</Text>
        {leaves.map((leave) => (
          <View key={leave.id} style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontWeight: '500' }}>{leave.reason || "No reason"}</Text>
                        {/* NEW: Display Request Type */}
        {leave.requestType && (
          <Text style={{ fontSize: 12, color: '#6B7280' }}>
            Request Type: {leave.requestType.charAt(0).toUpperCase() + leave.requestType.slice(1)}
          </Text>
        )}
                <Text style={{ fontSize: 12, color: '#6B7280' }}>
  From: {leave.start_date && leave.start_time
    ? new Date(`${leave.start_date}T${leave.start_time}`).toLocaleString()
    : leave.start_date
      ? new Date(leave.start_date).toLocaleDateString()
      : 'N/A'}
</Text>

<Text style={{ fontSize: 12, color: '#6B7280' }}>
  To: {leave.end_date && leave.end_time
    ? new Date(`${leave.end_date}T${leave.end_time}`).toLocaleString()
    : leave.end_date
      ? new Date(leave.end_date).toLocaleDateString()
      : 'N/A'}
</Text>

<Text style={{ fontSize: 12, color: '#6B7280' }}>
  Requested On: {leave.created_at
    ? new Date(leave.created_at).toLocaleString()
    : 'N/A'}
</Text>

              </View>
              <Text style={[
                styles.statusBadge,
                leave.status === 'approved' ? styles.greenBadge : leave.status === 'pending' ? styles.yellowBadge : styles.redBadge
              ]}>
                {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
              </Text>
            </View>
            {leave.comment && (
  <Text style={{ fontSize: 12, marginTop: 4, backgroundColor: '#F3F4F6', padding: 4, borderRadius: 4 }}>
    Comment: {leave.comment}
  </Text>
)}

{/* QR Code for fully approved leaves */}
{leave.qr_code_data && (
  <View style={{ marginTop: 8, alignItems: 'center' }}>
    <QRCode value={leave.qr_code_data} size={150} />
  </View>
)}


          </View>
        ))}
      </View>
    </View>
  );
};


// ===================== Student Profile =====================
const StudentProfile = ({ studentData, setStudentData}:any) => {
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    year: studentData.year,
    branch: studentData.branch,
    room: studentData.room,
  });
  const [loading, setLoading] = useState(false);
  const handleSave = async () => {
  setLoading(true);
  try {
    const res = await fetch(`${API_URL}/api/student_dashboard.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: studentData.id,
        action: "update_profile",
        year: form.year,
        branch: form.branch,
        room: form.room,
      }),
    });
    const data = await res.json();
    if (data.success) {
      Alert.alert("Success", "Profile updated!");
      setEditMode(false);
      setStudentData((prev: { year: string; branch: string; room: string; [key: string]: any }) => ({
        ...prev,
        year: form.year,
        branch: form.branch,
        room: form.room,
      }));
    } else {
      Alert.alert("Error", data.message);
    }
  } catch (err) {
    console.log(err);
    Alert.alert("Error", "Something went wrong");
  } finally {
    setLoading(false);
  }
};

  return (
        <KeyboardAvoidingView
    style={{ flex: 1, backgroundColor: '#f3f4f6' }}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    keyboardVerticalOffset={100} // adjust if needed
  >
    <ScrollView
      contentContainerStyle={{  paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
  <View style={{ padding: 16 }}>
  <Image
  source={{
    uri: `${API_URL}/api/uploads/student/${studentData.photo}`,
  }}
  style={{
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    backgroundColor: "#ddd",
  }}
  resizeMode="cover"
  onError={() => {
    console.log("❌ Image failed to load");
    console.log("Tried URL:", `${API_URL}/api/uploads/student/${studentData.photo}`);
  }}
/>


    {/* Personal Info */}
      <View style={styles.card}>
        <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Personal Information</Text>
        <Text>Name: {studentData.name}</Text>
        <Text>Email: {studentData.email}</Text>
        <Text>Phone: {studentData.phone}</Text>
        {editMode ? (
          <View style={{ marginBottom: 8 }}>
            <Text style={{ fontWeight: "500" }}>Year:</Text>
            <TextInput
              style={styles.input}
              value={form.year}
              onChangeText={(text) => setForm(prev => ({ ...prev, year: text }))}
            />
          </View>
        ) : (
          <Text>Year: {studentData.year}</Text>
        )}

        {editMode ? (
          <View style={{ marginBottom: 8 }}>
            <Text style={{ fontWeight: "500" }}>Branch:</Text>
            <TextInput
              style={styles.input}
              value={form.branch}
              onChangeText={(text) => setForm(prev => ({ ...prev, branch: text }))}
            />
          </View>
        ) : (
          <Text>Branch: {studentData.branch}</Text>
        )}

        <Text>Blood Group: {studentData.bloodGroup}</Text>
      </View>
      {/* Parent Info */}
      <View style={styles.card}>
        <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Parent/Guardian's Information</Text>
        <Text>Name: {studentData.parentName}</Text>
        <Text>Phone: {studentData.parentPhone}</Text>
      </View>
      {/* Hostel Info */}
      <View style={styles.card}>
        <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Hostel Information</Text>
        <Text>Hostel: {studentData.hostel}</Text>
        {editMode ? (
          <View style={{ marginBottom: 8 }}>
            <Text style={{ fontWeight: "500" }}>Room Number:</Text>
            <TextInput
              style={styles.input}
              value={form.room}
              onChangeText={(text) => setForm(prev => ({ ...prev, room: text }))}
            />
          </View>
        ) : (
          <Text>Room Number: {studentData.room}</Text>
        )}


      </View>
      <View style={{ marginTop: 24, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 12 }}>
  {editMode ? (
    <>
      <Button
        title={loading ? "Saving..." : "Save Changes"}
        onPress={handleSave}
        disabled={loading}
      />
      <Button
        title="Cancel"
        color="#EF4444" // red for cancel
        onPress={() => {
          setForm({
            year: studentData.year,
            branch: studentData.branch,
            room: studentData.room,
          }); // reset the form
          setEditMode(false); // exit edit mode
        }}
      />
    </>
  ) : (
    <Button
      title="Edit Profile"
      onPress={() => setEditMode(true)}
      color="#2563EB"
    />
  )}
</View>


      </View>
      </ScrollView>
    </KeyboardAvoidingView>
    
  );
};
    

// ===================== Styles =====================
const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: 'white', alignItems: 'center',paddingVertical: 16,
    paddingHorizontal: 20,
    paddingTop: 50, },
  headerTitle: { color: '#2563EB', fontSize: 20, fontWeight: 'bold' },
  notificationBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: 'red', width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  bottomNav: { flexDirection: 'row', justifyContent: 'space-around',  borderTopWidth: 1, borderColor: '#E5E7EB', backgroundColor: 'white',paddingVertical: 14,
    paddingBottom: 50, },
  card: { backgroundColor: 'white', borderRadius: 8, padding: 16, marginBottom: 16 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, fontSize: 12 },
  greenBadge: { backgroundColor: '#D1FAE5', color: '#065F46' },
  // Add red and yellow badge styles in your styles object
redBadge: { backgroundColor: '#FECACA', color: '#ff0000ff' }, // light red background, dark red text
yellowBadge: { backgroundColor: '#FEF3C7', color: '#92400E' }, // for "Checked In" or pending
  input: { borderWidth: 1, borderColor: '#D1D5DB', padding: 8, borderRadius: 8, marginBottom: 8 },
  notificationOverlay: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.4)',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 999,
},
notificationPanel: {
  width: '85%',
  backgroundColor: 'white',
  borderRadius: 12,
  padding: 16,
  shadowColor: '#000',
  shadowOpacity: 0.25,
  shadowRadius: 6,
  elevation: 8,
},
notificationTitle: {
  fontSize: 18,
  fontWeight: '700',
  marginBottom: 12,
  color: '#111827',
},
notificationItem: {
  borderBottomWidth: 1,
  borderColor: '#E5E7EB',
  paddingVertical: 8,
},
notificationText: {
  fontSize: 20,
  color: '#1F2937',
},
notificationTime: {
  fontSize: 12,
  color: '#6B7280',
},
closeButton: {
  backgroundColor: '#2563EB',
  padding: 10,
  borderRadius: 8,
  alignItems: 'center',
  marginTop: 12,
},

});

export default StudentDashboard;