import React, { useState, useEffect , useRef} from "react";
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Alert } from "react-native";
import API_URL from "../config/server";
import { useRouter } from 'expo-router';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image,Button } from 'react-native';
import { FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';
interface AdminDashboardProps {
  onLogout?: () => void;
}
const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<"users" | "requests" | "overview">("overview");
  const [users, setUsers] = useState<any[]>([]);
  const router = useRouter();
  const [admin, setAdmin] = useState<{ id: number; name: string } | null>(null);
  const [adminName, setAdminName] = useState("Admin");
  const [requests, setRequests] = useState<any[]>([]);
  const [adminData, setAdminData] = useState<any>(null);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationsSeen, setNotificationsSeen] = useState(false);
  const [counts, setCounts] = useState({
    totalUsers: 0,
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
  });

  // Fetch data from backend
  const fetchData = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin_dashboard.php`);
      const data = await res.json();
      setUsers(data.users || []);
      setRequests(data.requests || []);
      setAdminName(data.admin?.name || "Admin");
      setCounts({
        totalUsers: data.totalUsers || 0,
        totalRequests: data.totalRequests || 0,
        pendingRequests: data.pendingRequests || 0,
        approvedRequests: data.approvedRequests || 0,
        rejectedRequests: data.rejectedRequests || 0,
      });
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
  // Initial load
  fetchData();

  // Refresh every 10 seconds
  refreshIntervalRef.current = setInterval(() => {
    fetchData();
  }, 10000); // 10 sec

  // Cleanup on unmount
  return () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }
  };
}, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem("id");
    router.replace('/login');
    if (onLogout) onLogout();
  };
  const handleApprove = async (requestId: string) => {
    try {
      await fetch(`${API_URL}/api/admin_dashboard.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, status: "approved" }),
      });
      Alert.alert("Approved", "Request has been approved.");
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await fetch(`${API_URL}/api/admin_dashboard.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, status: "rejected" }),
      });
      Alert.alert("Rejected", "Request has been rejected.");
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddUser = async () => {
    Alert.alert("Add User", "This feature will open the add user form.");
  };

  const renderOverview = () => (
    <View>
      <Text style={styles.heading}>Admin Overview</Text>
      <Text>Total Users: {counts.totalUsers}</Text>
      <Text>Total Requests: {counts.totalRequests}</Text>
      <Text>Pending Requests: {counts.pendingRequests}</Text>
      <Text>Approved Requests: {counts.approvedRequests}</Text>
      <Text>Rejected Requests: {counts.rejectedRequests}</Text>
    </View>
  );

  const renderUsers = () => (
    <View>
      <Text style={styles.heading}>All Users</Text>
      <TouchableOpacity style={styles.addButton} onPress={handleAddUser}>
        <Text style={{ color: "white" }}>+ Add New User</Text>
      </TouchableOpacity>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text>{item.role}</Text>
            <Text>{item.email}</Text>
          </View>
        )}
      />
    </View>
  );

  const renderRequests = () => (
    <View>
      <Text style={styles.heading}>Leave Requests</Text>
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text>Reason: {item.reason}</Text>
            <Text>Status: {item.status}</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.approveButton} onPress={() => handleApprove(item.id)}>
                <Text style={{ color: "white" }}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rejectButton} onPress={() => handleReject(item.id)}>
                <Text style={{ color: "white" }}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );

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
        {adminName}!
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

      {/* {adminData.notifications &&
        adminData.notifications.length > 0 &&
        !notificationsSeen && (
          <View style={styles.notificationBadge}>
            <Text style={{ color: "#2563EB", fontSize: 10 }}>
              {adminData.notifications.length}
            </Text>
          </View>
        )} */}
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


      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity onPress={() => setActiveTab("overview")} style={[styles.tab, activeTab === "overview" && styles.activeTab]}>
          <Text>Overview</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab("users")} style={[styles.tab, activeTab === "users" && styles.activeTab]}>
          <Text>Users</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab("requests")} style={[styles.tab, activeTab === "requests" && styles.activeTab]}>
          <Text>Requests</Text>
        </TouchableOpacity>
      </View>

      {/* Tab content */}
      {activeTab === "overview" && renderOverview()}
      {activeTab === "users" && renderUsers()}
      {activeTab === "requests" && renderRequests()}
    </View>
    
  );
};


const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#F9FAFB" },
  title: { fontSize: 22, fontWeight: "bold", textAlign: "center", marginBottom: 16 },
  heading: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  tabContainer: { flexDirection: "row", justifyContent: "space-around", marginBottom: 10 },
  tab: { padding: 10, borderRadius: 8, backgroundColor: "#E5E7EB" },
  header: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 12,
},
  // notificationBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: 'red', width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },

  activeTab: { backgroundColor: "#A7F3D0" },
  card: { backgroundColor: "white", padding: 12, marginVertical: 6, borderRadius: 8, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4 },
  cardTitle: { fontWeight: "bold", fontSize: 16 },
  buttonRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  approveButton: { backgroundColor: "#10B981", padding: 8, borderRadius: 6 },
  rejectButton: { backgroundColor: "#EF4444", padding: 8, borderRadius: 6 },
  addButton: { backgroundColor: "#2563EB", padding: 10, borderRadius: 6, alignItems: "center", marginBottom: 10 },
});

export default AdminDashboard;
