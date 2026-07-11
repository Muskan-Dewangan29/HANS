import { AntDesign, Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from "react-native-safe-area-context";


import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Button,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import API_URL from "../config/server";

interface WardenDashboardProps {
  onLogout: () => void;
}
type Student = {
  id: number;
  name: string;
  roomNumber: string;
  current_status: "In Hostel" | "Out of Hostel"| "Location Disabled";
  is_logged_in: "0" | "1"; // string from backend
  [key: string]: any; // optional, in case backend sends extra fields
};

const WardenDashboard: React.FC<WardenDashboardProps> = ({ onLogout }) => {
  const router = useRouter();
  type StudentStatusType = "currentlyIn" | "currentlyOut" | "loggedIn" | "loggedOut";
  const [activeTab, setActiveTab] = useState<"home" | "requests" | "students" | "profile">("home");
  const [wardenData, setWardenData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showStatusList, setShowStatusList] = useState(false);
const [statusType, setStatusType] = useState<StudentStatusType | null>(null);
const [statusStudents, setStatusStudents] = useState<Student[]>([]);
const insets = useSafeAreaInsets();




  // ✅ Fetch real data for the logged-in warden
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
  const fetchWardenData = async () => {
    try {
      // ✅ Step 1: Get ID and Role separately (since you saved them like this)
      const userId = await AsyncStorage.getItem("user_id");
      const userRole = await AsyncStorage.getItem("user_role");

      // ✅ Step 2: If missing or not warden → redirect to login
      if (!userId || userRole !== "warden") {
        Alert.alert("Session expired", "Please login again.");
        router.replace("/login");
        return;
      }

      console.log("🧾 Logged in Warden ID:", userId);

      // ✅ Step 3: Fetch warden data by ID instead of reading 'user'
      const response = await fetch(`${API_URL}/api/warden_dashboard.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId }),
      });

      const result = await response.json();
      console.log("✅ Fetched warden data:", result);

      if (result.success && result.data && result.data.length > 0) {
  setWardenData({
    ...result.data[0],
    currentlyIn: result.data[0].currentlyIn ?? 0,
    currentlyOut: result.data[0].currentlyOut ?? 0,
  });
}
// 🔹 FETCH ALL STUDENTS FOR STATUS POPUP
const studentsResponse = await fetch(`${API_URL}/api/warden_dashboard.php`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ id: userId, action: "get_students_list" }),
});
const studentsData = await studentsResponse.json();

if (studentsData.success && studentsData.students) {
  // Map students and keep their login status
 const mappedStudents = studentsData.students.map((s: any) => ({
  ...s,
  is_logged_in: s.is_logged_in?.toString() ?? "0", // ✅ force string "0" or "1"
  current_status: s.current_status,
}));


  setStatusStudents(mappedStudents); // ✅ THIS IS THE KEY
}





      }  catch (error) {
      console.error("❌ Error fetching warden data:", error);
      Alert.alert("Error fetching data", String(error));
    } finally {
      setLoading(false);
    }
  };

  fetchWardenData();
  // ✅ refresh every 10 seconds
  interval = setInterval(fetchWardenData, 10000);

  // ✅ cleanup
  return () => clearInterval(interval);
}, []);


  const handleTabChange = (tab: typeof activeTab) => setActiveTab(tab);
const handleLogout = async () => {
  try {
    const userId = await AsyncStorage.getItem("user_id");
    const userEmail = await AsyncStorage.getItem("user_email"); // if you stored email at login

    // Optional: inform backend about logout
    if (userId) {
      await fetch(`${API_URL}/api/login.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "logout",
          id: userId,
          email: userEmail,
        }),
      });
    }

    // Clear all local storage to prevent auto-login
    await AsyncStorage.clear();

    Alert.alert("Logout", "You have been logged out.");
    router.replace("/login");

    if (onLogout) onLogout();
  } catch (err) {
    console.error("Warden logout error:", err);
    await AsyncStorage.clear();
    router.replace("/login");
  }
};


  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ marginTop: 10 }}>Loading Warden Data...</Text>
      </View>
    );
  }

  if (!wardenData) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>No data available.</Text>
      </View>
    );
  }

  // // Real data + fallback
  // const data = {
  //   name: wardenData.name || "Unknown",
  //   hostel: wardenData.hostelName || "Not Assigned",
  //   email: wardenData.email || "N/A",
  //   phone: wardenData.phone || "N/A",
  // };

  return (
    <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
          {/* Header */}
         <View
  style={{
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between", // ✅ KEY FIX
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: "#F3F4F6",
  }}
>

      {/* College Logo */}
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
      {wardenData.name || "User"}!
    </Text>
  </View>
</View>

          {/* <View style={styles.notification}>
            <Ionicons name="notifications-outline" size={20} color="white" />
            <Text style={styles.notificationBadge}>{data.pendingRequests}</Text>
          </View> */}
          <TouchableOpacity onPress={handleLogout} style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TouchableOpacity
  onPress={handleLogout}
  style={{
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
  }}
>
  <MaterialIcons name="logout" size={20} color="#2563EB" />
  <Button title="Logout" onPress={handleLogout} />
</TouchableOpacity>

                    </TouchableOpacity>
                  </View>
      

     {/* MAIN CONTENT */}
      <View style={styles.main}>
        {activeTab === "home" && (
          <>
            <ScrollView>
          <WardenHome
  wardenData={wardenData}
  statusStudents={statusStudents}
  onPressStatus={async (type: StudentStatusType) => {
    setStatusType(type);

    // Fetch latest students from backend
    try {
      const userId = await AsyncStorage.getItem("user_id");
      const res = await fetch(`${API_URL}/api/warden_dashboard.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, action: "get_students_list" }),
      });
      const result = await res.json();
      if (result.success && result.students) {
       const mapped = result.students.map((s: any) => ({
  ...s,
  is_logged_in: s.is_logged_in?.toString() ?? "0", // ✅ force string
  current_status: s.current_status,
}));

        setStatusStudents(mapped); // update state so popup has correct list
      } else {
        setStatusStudents([]);
      }
    } catch (err) {
      console.error("Failed to fetch students:", err);
      setStatusStudents([]);
    }

    setShowStatusList(true);
  }}
/>



            </ScrollView>

            {/* ✅ STATUS POPUP */}
            {showStatusList && (
              <View style={styles.overlay}>
                <View style={styles.popup}>
                  <Text style={styles.popupTitle}>
                  {{
                    currentlyIn: "Students Currently In Hostel",
                    currentlyOut: "Students Currently Out of Hostel",
                    loggedIn: "Students Logged In",
                    loggedOut: "Students Logged Out",
                  }[statusType ?? "currentlyIn"]}
                </Text>


                  <ScrollView>
                   {statusStudents
                    .filter((s) => {
                      if (statusType === "currentlyIn") return s.current_status === "In Hostel";
                      if (statusType === "currentlyOut") return s.current_status === "Out of Hostel"|| s.current_status === "Location Disabled";
                      if (statusType === "loggedIn") return s.is_logged_in?.toString() === "1";
                      if (statusType === "loggedOut") return s.is_logged_in?.toString() === "0";
                      return false;
                    })
                    .map((s) => (
                      <View key={s.id} style={styles.popupRow}>
                        <Text style={{ fontWeight: "600" }}>{s.name}</Text>
                        <Text style={{ color: "#6b7280" }}>Room {s.roomNumber}</Text>
                      </View>
                  ))}

                  </ScrollView>

                  <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={() => setShowStatusList(false)}
                  >
                    <Text style={{ color: "#fff", textAlign: "center" }}>
                      Close
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}

  <View style={{ flex: 1, display: activeTab === "requests" ? "flex" : "none" }}>
  <LeaveRequests />
</View>
<View style={{ flex: 1, display: activeTab === "students" ? "flex" : "none" }}>
  <StudentsList />
</View>

  {activeTab === "profile" && (
    <ScrollView>
      <WardenProfile wardenData={wardenData} />
    </ScrollView>
  )}
</View>



      {/* Bottom Navigation */}
      <View
        style={[
          styles.bottomNav,
          {
            paddingBottom: Math.max(insets.bottom, 12), // ✅ avoids clash on all devices
          },
        ]}
      >

        <NavButton
          icon={<Ionicons name="home-outline" size={20} />}
          label="Home"
          active={activeTab === "home"}
          onPress={() => handleTabChange("home")}
        />
        <NavButton
          icon={<Feather name="clipboard" size={20} />}
          label="Requests"
          active={activeTab === "requests"}
          onPress={() => handleTabChange("requests")}
        />
        <NavButton
          icon={<Ionicons name="people-outline" size={20} />}
          label="Students"
          active={activeTab === "students"}
          onPress={() => handleTabChange("students")}
        />
        <NavButton
          icon={<AntDesign name="user" size={20} />}
          label="Profile"
          active={activeTab === "profile"}
          onPress={() => handleTabChange("profile")}
        />
      </View>
    </View>
  );
};

// ✅ Components
const NavButton = ({ icon, label, active, onPress }: any) => {
  // Clone the icon element and change its color if active
  const coloredIcon = React.cloneElement(icon, {
    color: active ? "#3b82f6" : "#4b5563", // ✅ active = blue, inactive = gray
  });

  return (
    <TouchableOpacity
      style={[
        styles.navButton,
        {
          borderBottomWidth: active ? 2 : 0,
          borderBottomColor: active ? "#2563eb" : "transparent",
          paddingBottom: 4,
        },
      ]}
      onPress={onPress}
    >
      {coloredIcon}
      <Text
        style={{
          color: active ? "#3b82f6" : "#4b5563",
          fontSize: 12,
          fontWeight: active ? "bold" : "normal",
          marginTop: 4,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const WardenHome = ({ wardenData, statusStudents, onPressStatus }: any) => {
  // ✅ Counts from PHP
 const loggedInCount = statusStudents.filter((s: Student) => s.is_logged_in === "1").length;
const loggedOutCount = statusStudents.filter((s: Student) => s.is_logged_in === "0").length;



  // ✅ Counts from current_status
  const currentlyInCount = wardenData.currentlyIn ?? 0;
  const currentlyOutCount = wardenData.currentlyOut ?? 0;

  return (
    <View style={{ padding: 16 }}>
      {/* Welcome Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Welcome, {wardenData.name}</Text>
      </View>
      <Text
  style={{
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#111827",
  }}
>
  In/Out Status 
</Text>

      {/* Currently In / Out Cards */}
      <View style={{ flexDirection: "row", marginTop: 10 , marginBottom:30}}>
        <TouchableOpacity
          style={[styles.statsCard, { backgroundColor: "#16a34a" }]}
          onPress={() => onPressStatus("currentlyIn")}
        >
          <Text style={styles.statsLabel}>Currently In</Text>
          <Text style={styles.statsValue}>{currentlyInCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statsCard, { backgroundColor: "#dc2626" }]}
          onPress={() => onPressStatus("currentlyOut")}
        >
          <Text style={styles.statsLabel}>Currently Out</Text>
          <Text style={styles.statsValue}>{currentlyOutCount}</Text>
        </TouchableOpacity>
      </View>
      



      <Text
  style={{
    fontSize: 16,
    fontWeight: "bold",
    marginTop:12,
    marginBottom: 12,
    color: "#111827",
  }}
>
  Login Status 
</Text>

      {/* Logged In / Out Cards */}
      <View style={{ flexDirection: "row", marginTop: 10 }}>
        <TouchableOpacity
          style={[styles.statsCard, { backgroundColor: "#0f50a4" }]}
          onPress={() => onPressStatus("loggedIn")}
        >
          <Text style={styles.statsLabel}>Logged In</Text>
          <Text style={styles.statsValue}>{loggedInCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statsCard, { backgroundColor: "#dc2693" }]}
          onPress={() => onPressStatus("loggedOut")}
        >
          <Text style={styles.statsLabel}>Logged Out</Text>
          <Text style={styles.statsValue}>{loggedOutCount}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};




const LeaveRequests = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [filter, setFilter] = useState<"all" | "approved" | "rejected" | "pending">("all");
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);

  const options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  };

  return date.toLocaleString("en-IN", options);
};
  // ✅ Fetch parent-approved requests for this warden's hostel
  useFocusEffect(
  useCallback(() => {
    let isActive = true;

    const fetchRequests = async () => {
      try {
        setLoading(true);
        const userId = await AsyncStorage.getItem("user_id");
        const response = await fetch(`${API_URL}/api/warden_dashboard.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: userId, action: "get_parent_approved_requests" }),
        });
        const result = await response.json();

        if (isActive) {
          if (result.success && result.leave_requests) {
            setRequests(result.leave_requests);
          } else {
            setRequests([]);
          }
        }
      } catch (error) {
        console.error("Error fetching leave requests:", error);
        if (isActive) setRequests([]);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    fetchRequests();

    // Cleanup when component loses focus
    return () => {
      isActive = false;
    };
  }, [])
);


  // ✅ Update request status (approve/reject)
  const updateRequestStatus = async (requestId: number, status: "approved" | "rejected") => {
    try {
      const response = await fetch(`${API_URL}/api/warden_dashboard.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: await AsyncStorage.getItem("user_id"),
          action: "update_request_status",
          request_id: requestId,
          status,
        }),
      });
      const result = await response.json();
      if (result.success) {
        // ✅ Update local state to reflect the change
        setRequests((prev) =>
          prev.map((r) =>
            r.id === requestId ? { ...r, warden_approval: status, status } : r
          )
        );
        Alert.alert("Success", "Request updated successfully");
      } else {
        Alert.alert("Error", result.message || "Failed to update request");
      }
    } catch (error) {
      console.error("Error updating request:", error);
      Alert.alert("Error", "Failed to update request");
    }
  };

 // ✅ Filter requests based on search and date
  const filteredRequests = requests.filter((r) => {
  const matchesSearch = r.student_name.toLowerCase().includes(searchTerm.toLowerCase());

  // ✅ Status filter
  const matchesStatus =
    filter === "all" ||
    (filter === "approved" && r.status === "approved") ||
    (filter === "rejected" && r.status === "rejected") ||
(filter === "pending" && r.status === "pending");

  // ✅ Date filter
  let matchesDate = true;
  if (selectedDate) {
    const reqDate = new Date(r.created_at);
    matchesDate =
      reqDate.getFullYear() === selectedDate.getFullYear() &&
      reqDate.getMonth() === selectedDate.getMonth() &&
      reqDate.getDate() === selectedDate.getDate();
  }

  return matchesSearch && matchesStatus && matchesDate;
});

  if (loading) {
    return (
      <View style={{ padding: 16, alignItems: "center" }}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ marginTop: 10 }}>Loading Requests...</Text>
      </View>
    );
  }

  return (
    <View style={{ padding: 16 }}>
      <TextInput
        placeholder="Search..."
        style={styles.input}
        value={searchTerm}
        onChangeText={setSearchTerm}
      />
<View style={{ flexDirection: "row", flexWrap: "wrap", marginVertical: 10 }}>
  {/* Status buttons */}
  {["all", "approved", "rejected", "pending"].map((f) => (
    <TouchableOpacity
      key={f}
      onPress={() => setFilter(f as any)}
      style={{
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 20,
        backgroundColor: filter === f ? "#2563eb" : "#e5e7eb",
        marginRight: 6,
        marginBottom: 6,
      }}
    >
      <Text style={{ color: filter === f ? "white" : "black", textTransform: "capitalize" }}>
        {f}
      </Text>
    </TouchableOpacity>
  ))}

  {/* Date picker button */}
  <TouchableOpacity
    style={{
      paddingVertical: 6,
      paddingHorizontal: 14,
      borderRadius: 20,
      backgroundColor: "#2563eb",
      marginBottom: 6,
    }}
    onPress={() => setShowDatePicker(true)}
  >
    <Text style={{ color: "white" }}>
      {selectedDate ? selectedDate.toDateString() : "Filter by Date"}
    </Text>
  </TouchableOpacity>

  {/* Clear date filter */}
  {selectedDate && (
    <TouchableOpacity
      style={{
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 20,
        backgroundColor: "#ef4444",
        marginBottom: 6,
      }}
      onPress={() => setSelectedDate(null)}
    >
      <Text style={{ color: "white" }}>Clear Date</Text>
    </TouchableOpacity>
  )}
</View>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) setSelectedDate(date);
          }}
        />
      )}


      {/* Requests List */}
      <FlatList
        data={filteredRequests}
keyExtractor={(item) => item.id.toString()}         renderItem={({ item }) => (
          <View style={styles.card}>
  <Text style={{ fontWeight: "bold", fontSize: 15 }}>
    {item.student_name}
  </Text>

  {/* ✅ REQUEST TYPE */}
  <Text style={{ marginTop: 4 , fontWeight:"600"}}>
    Request Type: {item.request_type}
  </Text>

  {/* ✅ STATUS WITH COLOR */}
  <Text
    style={{
      marginTop: 4,
      fontWeight: "600",
      color:
        item.status === "approved"
          ? "#16a34a" // green
          : item.status === "rejected"
          ? "#dc2626" // red
          : "#d97706", // yellow (pending)
    }}
  >
    Status: {item.status}
  </Text>

  <Text style={{ marginTop: 4 , fontWeight:"600"}}>
  Date: {formatDateTime(item.created_at)}
</Text>


            {/* ✅ SHOW STUDENT PHOTO HERE */}
    {item.photo && (
      <Image
        source={{ uri: `${API_URL}/${item.photo}` }}
        style={{
          width: 150,
          height: 150,
          borderRadius: 8,
          marginVertical: 10,
          alignSelf: "center"
        }}
      />
    )}
            {item.warden_approval === "pending" && (
              <View style={{ flexDirection: "row", marginTop: 8 }}>
                <TouchableOpacity
                  style={{ backgroundColor: "green", padding: 8, borderRadius: 5, marginRight: 8 }}
                  onPress={() => updateRequestStatus(item.id, "approved")}
                >
                  <Text style={{ color: "white" }}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ backgroundColor: "red", padding: 8, borderRadius: 5 }}
                  onPress={() => updateRequestStatus(item.id, "rejected")}
                >
                  <Text style={{ color: "white" }}>Reject</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 100 }} // gives space for bottom nav
  showsVerticalScrollIndicator={true}
      />
    </View>
  );
};



const StudentsList = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCourse, setFilterCourse] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [sortBy, setSortBy] = useState("name_asc");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [parentDetails, setParentDetails] = useState<any>(null);
  const [parentLoading, setParentLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const fetchStudents = async () => {
        try {
          setLoading(true);
          const userId = await AsyncStorage.getItem("user_id");
          const response = await fetch(`${API_URL}/api/warden_dashboard.php`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: userId, action: "get_students_list" }),
          });

          const result = await response.json();
          if (result?.success) {
  const mapped = (result.students || []).map((s: any) => ({
    ...s,
    status: s.current_status, // 👈 IMPORTANT LINE
  }));
  setStudents(mapped);
} else {
  setStudents([]);
}

        } catch (err) {
          console.error(err);
          setStudents([]);
        } finally {
          setLoading(false);
        }
      };

      fetchStudents();
    }, [])
  );
const fetchParentDetails = async (studentId: number) => {
  try {
    setParentLoading(true);
    setParentDetails(null);

    const res = await fetch(`${API_URL}/api/warden_dashboard.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "get_registered_parent",
        student_id: studentId,
      }),
    });

    const data = await res.json();

  if (
  data.success &&
  data.parent &&
  (data.parent.parentName || data.parent.parentPhone)
) {
  setParentDetails({
    name: data.parent.parentName,
    phone: data.parent.parentPhone,
    email: data.parent.parentEmail || data.parent.email || "N/A",
    address: data.parent.parentAddress || "N/A", 
    city: data.parent.parentCity || "N/A",       
    state: data.parent.parentState || "N/A", 
  });
} else {
  setParentDetails({ notRegistered: true });
}

  } catch (e) {
    setParentDetails({ notRegistered: true });
  } finally {
    setParentLoading(false);
  }
};

  // -------------------------
  //     FILTERING LOGIC
  // -------------------------
  let filtered = students.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.RollNumber && s.RollNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchCourse = filterCourse === "all" || s.Course === filterCourse;
const matchYear = filterYear === "all" || String(s.year) === String(filterYear);

    return matchSearch && matchCourse && matchYear;
  });

  // -------------------------
  //       SORTING LOGIC
  // -------------------------
  filtered.sort((a, b) => {
    if (sortBy === "name_asc") return a.name.localeCompare(b.name);
    if (sortBy === "name_desc") return b.name.localeCompare(a.name);
    if (sortBy === "room_asc") return a.roomNumber - b.roomNumber;
    if (sortBy === "room_desc") return b.roomNumber - a.roomNumber;
    return 0;
  });

  // -------------------------
  //     GROUP BY ROOMS
  // -------------------------
  const rooms: { [key: string]: any[] } = {};
  filtered.forEach((s) => {
    if (!rooms[s.roomNumber]) rooms[s.roomNumber] = [];
    rooms[s.roomNumber].push(s);
  });

  if (loading) {
    return (
      <View style={{ padding: 16, alignItems: "center" }}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text>Loading students...</Text>
      </View>
    );
  }

  return (
    <View style={{ padding: 16 }}>

      {/* Total Students */}
      <Text style={{ fontSize: 16, fontWeight: "bold", marginBottom: 10 }}>
        Total Students: {students.length}
      </Text>

      {/* Search */}
      <TextInput
        placeholder="Search students..."
        style={styles.input}
        value={searchTerm}
        onChangeText={setSearchTerm}
      />

      {/* Filters + Sort */}
      <ScrollView horizontal style={{ marginBottom: 10 }}>
        {/* Course Filter */}
        {["all", "BTech", "MTech", "BSc", "BBA", "MBA", "BCom", "Nursing"].map((course) => (
  <TouchableOpacity
    key={course}
    onPress={() => setFilterCourse(course)}
    style={{
      padding: 6,
      paddingHorizontal: 10,
      marginRight: 6,
      borderRadius: 20,
      backgroundColor: filterCourse === course ? "#2563eb" : "#e5e7eb",
    }}
  >
    <Text style={{ color: filterCourse === course ? "white" : "black" }}>
      {course.toUpperCase()}
    </Text>
  </TouchableOpacity>
))}

        {/* Year Filter */}
        {["all", "1", "2", "3", "4"].map((y) => (
          <TouchableOpacity
            key={y}
            onPress={() => setFilterYear(y)}
            style={{
              padding: 6,
              paddingHorizontal: 10,
              marginRight: 6,
              borderRadius: 20,
              backgroundColor: filterYear === y ? "#2563eb" : "#e5e7eb",
            }}
          >
            <Text style={{ color: filterYear === y ? "white" : "black" }}>
              Year {y}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Sorting */}
        {[
          ["A → Z", "name_asc"],
          ["Z → A", "name_desc"],
          ["Room ↑", "room_asc"],
          ["Room ↓", "room_desc"],
        ].map(([label, key]) => (
          <TouchableOpacity
            key={key}
            onPress={() => setSortBy(key)}
            style={{
              padding: 6,
              paddingHorizontal: 10,
              marginRight: 6,
              borderRadius: 20,
              backgroundColor: sortBy === key ? "#2563eb" : "#e5e7eb",
            }}
          >
            <Text style={{ color: sortBy === key ? "white" : "black" }}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ROOM GROUP LIST */}
      <ScrollView style={{ marginBottom: 100 }}>
        {Object.keys(rooms).map((room) => (
          <View key={room} style={{ marginBottom: 14 }}>
            <Text style={{ fontWeight: "bold", fontSize: 16, marginBottom: 6 }}>
              Room {room}
            </Text>

            {rooms[room].map((item) => (
<TouchableOpacity
  key={item.id}
  style={{
    flexDirection: "row",
    alignItems: "center",
    padding: 10,

    // ✅ FULL BOX COLOR BASED ON STATUS
    backgroundColor:
      item.status === "Out of Hostel" || item.status === "Location Disabled"
        ? "#fee2e2"  // 🔴 light red
        : "#dcfce7", // 🟢 light green

    borderLeftWidth: 6, // optional but looks nice
    borderLeftColor:
      item.status === "Out of Hostel" || item.status === "Location Disabled"
        ? "#dc2626"  // 🔴 dark red
        : "#16a34a", // 🟢 dark green

    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
  }}
  onPress={() => setSelectedStudent(item)}
>


  {/* Student Photo */}
  {item.photo ? (
    <Image
      source={{ uri: `${API_URL}/api/uploads/student/${item.photo}` }}
      style={{
        width: 70,
        height: 70,
        borderRadius: 35,
        marginRight: 12,
      }}
    />
  ) : (
    <Ionicons
      name="person-circle-outline"
      size={70}
      color="#777"
      style={{ marginRight: 12 }}
    />
  )}

  {/* Student Details */}
  <View style={{ flex: 1 }}>
    <Text style={{ fontWeight: "bold", fontSize: 15 }}>{item.name}</Text>
    <Text>Roll: {item.RollNumber}</Text>
    <Text>Course: {item.Course} | Year : {item.year}</Text>
    <Text>Room: {item.roomNumber}</Text>
    <View
  style={{
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  }}
>
  <Text style={{ fontWeight: "600", color: "#374151" }}>
    Status : {item.status}
  </Text>

  
  
  
</View>


  </View>

</TouchableOpacity>

            ))}
          </View>
        ))}
      </ScrollView>

      {/* STUDENT DETAILS POPUP */}
      {selectedStudent && (
        <View
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              width: "100%",
              backgroundColor: "#fff",
              padding: 20,
              borderRadius: 10,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "bold" }}>
              {selectedStudent.name}
            </Text>

            {selectedStudent.photo && (
              <Image
                source={{ uri: `${API_URL}/api/uploads/student/${selectedStudent.photo}` }}
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  alignSelf: "center",
                  marginVertical: 10,
                }}
              />
            )}

            <Text>Roll: {selectedStudent.RollNumber}</Text>
            <Text>Course: {selectedStudent.Course}</Text>
            <Text>Year: {selectedStudent.year}</Text>
            <Text>Room: {selectedStudent.roomNumber}</Text>
            <TouchableOpacity
              onPress={() => {
                if (selectedStudent.parentName || selectedStudent.parentPhone) {
                  setParentDetails({
                    name: selectedStudent.parentName,
                    phone: selectedStudent.parentPhone,
                    email: selectedStudent.parentEmail,
                    address: selectedStudent.parentAddress,
                    city: selectedStudent.parentCity,
                    state: selectedStudent.parentState
                  });
                } else {
                  setParentDetails({ notRegistered: true });
                }
              }}

              style={{
                marginTop: 12,
                backgroundColor: "#2563eb",
                padding: 10,
                borderRadius: 6,
              }}
            >
              <Text style={{ color: "white", textAlign: "center" }}>
                View Parent Details
              </Text>
            </TouchableOpacity>

            {parentLoading && (
              <Text style={{ marginTop: 10, textAlign: "center" }}>
                Loading parent details...
              </Text>
            )}

            {parentDetails?.notRegistered && (
              <Text
                style={{
                  marginTop: 10,
                  textAlign: "center",
                  color: "#dc2626",
                  fontWeight: "600",
                }}
              >
                No registered parent exists
              </Text>
            )}

            {parentDetails && !parentDetails.notRegistered && (
              <View style={{ marginTop: 10 }}>
                <Text>Parent Name: {parentDetails.name}</Text>
                <Text>Parent Phone: {parentDetails.phone}</Text>
                <Text>Parent Email: {parentDetails.email}</Text>
                <Text>Parent Address: {parentDetails.address}</Text>   
                <Text>Parent City: {parentDetails.city}</Text>         
                <Text>Parent State: {parentDetails.state}</Text>
              </View>
            )}


            <TouchableOpacity
              onPress={() => {
                setSelectedStudent(null);
                setParentDetails(null);
              }}

              style={{
                marginTop: 20,
                backgroundColor: "#2563eb",
                padding: 10,
                borderRadius: 6,
              }}
            >
              <Text style={{ color: "white", textAlign: "center" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};



const WardenProfile = ({ wardenData }: any) =>  {
  return (
  <View style={{ padding: 16 }}>
  <Image
  source={{
    uri: `${API_URL}/api/uploads/warden/${wardenData.photo}`,
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
    console.log("Tried URL:", `${API_URL}/api/uploads/student/${wardenData.photo}`);
  }}
/>

    {/* Name and Role */}
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{wardenData.name}</Text>
      <Text style={styles.cardSubtitle}>{wardenData.hostelName}'s Warden</Text>
      {/* <Text style={{ marginTop: 8 }}>Role: {wardenData.role}</Text>
      <Text>ID: {wardenData.id}</Text> */}
    </View>

    {/* Contact & Address */}
    <View style={styles.card}>
      <Text>Email: {wardenData.email}</Text>
      <Text>Phone: {wardenData.phone}</Text>
      <Text>City: {wardenData.city}</Text>
      <Text>State: {wardenData.state}</Text>
      <Text>Address: {wardenData.address}</Text>
    </View>
  </View>
);
};


// ✅ Styles (same as before)
const styles = StyleSheet.create({
    main: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
bottomNav: {
  flexDirection: "row",
  justifyContent: "space-around",
  paddingTop: 12,
  backgroundColor: "#fff",
  borderTopWidth: 1,
  borderTopColor: "#e5e7eb",
},
  card: { backgroundColor: "#fff", padding: 16, borderRadius: 8 },
  cardTitle: { fontSize: 16, fontWeight: "bold" },
  statsCard: {
    flex: 1,
    marginHorizontal: 4,
    padding: 16,
    borderRadius: 8,
  },
  statsLabel: { color: "#fff" ,fontSize:20},
  statsValue: { fontSize: 22, color: "#fff", fontWeight: "bold" },

  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  popup: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    maxHeight: "80%",
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  popupRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  closeBtn: {
    marginTop: 10,
    backgroundColor: "#2563eb",
    padding: 10,
    borderRadius: 6,
  },
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#2563eb",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    paddingTop: 30, 
  },
  headerTitle: { color: "white", fontSize: 18, fontWeight: "bold" },
  headerRight: { flexDirection: "row", alignItems: "center" },
  notification: { position: "relative", marginRight: 16 },
  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "red",
    color: "white",
    fontSize: 10,
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  logoutBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  // main: { flex: 1 },
  // bottomNav: {
  //   flexDirection: "row",
  //   justifyContent: "space-around",
  //   backgroundColor: "#fff",
  //   borderTopWidth: 1,
  //   borderTopColor: "#e5e7eb",
  //   paddingVertical: 14,
  //   paddingBottom: 50,
  // },
  navButton: { alignItems: "center" },
  // card: { backgroundColor: "#fff", padding: 16, borderRadius: 8, marginBottom: 8 },
  // cardTitle: { fontSize: 16, fontWeight: "bold" },
  cardSubtitle: { fontSize: 12, color: "#6b7280" },
  // statsCard: {
  //   flex: 1,
  //   backgroundColor: "#fff",
  //   padding: 16,
  //   borderRadius: 8,
  //   marginHorizontal: 4,
  // },
  // statsLabel: { fontSize: 15, color: "#f5f7faff" },
  // statsValue: { fontSize: 20, fontWeight: "bold" },
  input: {
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 8,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  countCard: {
  backgroundColor: "#fff",
  padding: 12,
  borderRadius: 8,
  alignItems: "center",
  width: "45%",
  elevation: 2, // shadow for Android
  shadowColor: "#000", // shadow for iOS
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.2,
  shadowRadius: 1.41,
},

  requestCard: { backgroundColor: "#fff", padding: 12, borderRadius: 8, marginVertical: 4 },
});

export default WardenDashboard;