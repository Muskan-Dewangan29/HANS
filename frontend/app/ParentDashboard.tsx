import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from 'expo-router';
import React, { useEffect, useState, useRef } from "react";
import * as Location from 'expo-location';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Button,
  View,
} from "react-native";
import API_URL from "../config/server";
const HOSTEL_LOCATION = {
  latitude: 21.133389, // replace with your hostel latitude
  longitude: 81.670116, // replace with your hostel longitude
};
const GEOFENCE_RADIUS = 30; // in meters, e.g., 30m

const ParentDashboard: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"home" | "child">("home");
  const [loading, setLoading] = useState(true);
const [student, setStudent] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [checkInOuts, setCheckInOuts] = useState<any[]>([]);
  const [parentName, setParentName] = useState<string>("Parent Dashboard");
  const [showNotifications, setShowNotifications] = useState(false);
  const [isOutsideHostel, setIsOutsideHostel] = useState(false);
const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
const [selectedChild, setSelectedChild] = useState("all");
const [parentLat, setParentLat] = useState<number | null>(null);
const [parentLng, setParentLng] = useState<number | null>(null);


const getDistanceFromLatLonInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371000; // Radius of the earth in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // distance in meters
};
const checkParentLocation = async () => {
  try {
    // Request location permission
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      console.log("Location permission not granted");
      setIsOutsideHostel(false);
      return;
    }

    // Get current parent location
    const location = await Location.getCurrentPositionAsync({});
    setParentLat(location.coords.latitude);
setParentLng(location.coords.longitude);
    const parentId = await AsyncStorage.getItem("user_id");

    if (!parentId) {
      console.log("Parent ID missing");
      setIsOutsideHostel(false);
      return;
    }

    // Call backend to get hostel coordinates and radius
    const response = await fetch(`${API_URL}/api/parent_dashboard.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: parentId,
        action: "check_parent_location",
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      }),
    });

    const data = await response.json();

    if (!data.success) {
      console.log("Backend check failed:", data.message);
      setIsOutsideHostel(false);
      return;
    }

    // Convert DB radius from degrees to meters (approx.)
    const hostelRadiusMeters = (data.radius || 0) * 111000; // 1 degree ≈ 111km
    const buffer = 20; // Optional buffer in meters
    const effectiveThreshold = hostelRadiusMeters + buffer;

    const insideHostel = data.distance <= effectiveThreshold;

    // Debug logs
    console.log("Parent Location Debug Info:");
    console.log("Latitude:", location.coords.latitude, "Longitude:", location.coords.longitude);
    console.log("Distance from hostel (m):", data.distance);
    console.log("Hostel radius (m):", hostelRadiusMeters);
    console.log("Buffer applied (m):", buffer);
    console.log("Threshold (radius + buffer) (m):", effectiveThreshold);
    console.log("Inside hostel:", insideHostel);

    // Update state
    setIsOutsideHostel(!insideHostel);

  } catch (err) {
    console.log("Location check failed:", err);
    setIsOutsideHostel(false);
  }
};




const fetchParentData = async () => {
  try {
    const parentId = await AsyncStorage.getItem("user_id");
    if (!parentId) {
      Alert.alert("Error", "Parent ID not found");
      return;
    }

    const response = await fetch(`${API_URL}/api/parent_dashboard.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: parentId, action: "get_dashboard" }),
    });

    const data = await response.json();

    if (data.success) {
      const children = (data.children || []).map((c: any) => ({
        ...c,
        status:
          c.current_status === "location_disabled"
            ? "Location Disabled"
            : c.current_status,
      }));
      setStudent(children);

      if (data.user && data.user.name) {
        setParentName(data.user.name);
      }

      // Combine pending approvals + leave history
      const allRequests = [
        ...(data.pendingApprovals || []),
        ...(data.leaveHistory || []),
      ];

      const mappedRequests = allRequests.map((r: any) => {
  // Determine status
  let status: string;
  if (r.status === "cancelled" || r.parent_approval === -1) {
    status = "cancelled"; // moved to history
  } else if (r.parent_approval === null || r.parent_approval === 0) {
    status = "pending";
  } else if (r.parent_approval === 1) {
    status = "parent_approved";
  } else {
    status = "rejected";
  }

  return {
    ...r,
    status,
    studentName: r.studentName || r.student_name || r.name || r.student || "Student",
    startDate: r.start_date,
    endDate: r.end_date,
    startTime: r.start_time,
    endTime: r.end_time,
    rejectComment: r.parent_comment || "",
    showOptions: false,
    showRejectComment: false,
    photo: r.photo || null,
    requestType: r.request_type || r.requestType || r.type || r.leave_type || "Leave Request",
  };
});

// Now separate pending vs history
const pending = mappedRequests.filter(r => r.status === "pending");
const history = mappedRequests.filter(r => r.status !== "pending");

// Set state
setRequests([...pending, ...history]);


    } else {
      Alert.alert("Error", data.message);
    }
  } catch (e) {
    Alert.alert("Error", "Unable to fetch data");
  } finally {
    setLoading(false);
  }
};



useEffect(() => {
  // Initial load
  fetchParentData();
  checkParentLocation();

  // Refresh every 10 seconds
  refreshIntervalRef.current = setInterval(() => {
    fetchParentData();
    checkParentLocation();
  }, 10000); // 10 seconds

  // Cleanup when screen unmounts
  return () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }
  };
}, []);



  // const formatDate = (ts: string) => {
  //   const d = new Date(ts);
  //   return d.toLocaleString();
  // };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const handleToggleOptions = (id: string) => {
    setRequests((prev) =>
      prev.map((req) =>
        req.id === id ? { ...req, showOptions: !req.showOptions } : req
      )
    );
  };

  const handleApprove = async (id: number) => {
     if (!isOutsideHostel) {
      Alert.alert("Action blocked", "You must be outside the hostel to approve requests.");
      return;
    }
  try {
    const res = await fetch(`${API_URL}/api/parent_dashboard.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: await AsyncStorage.getItem("user_id"),
        action: "approve_request",
        requestId: id,
        latitude: parentLat,
        longitude: parentLng,
      }),
    });
    const data = await res.json();
    if (data.success) {
      Alert.alert("Success", "Request approved successfully.");
      fetchParentData(); // refresh dashboard
    } else {
      Alert.alert("Error", data.message);
    }
  } catch (e) {
    Alert.alert("Error", "Could not connect to server");
  }
};

const submitReject = async (id: number, comment: string) => {
  if (!isOutsideHostel) {
      Alert.alert("Action blocked", "You must be outside the hostel to reject requests.");
      return;
    }
  try {
    const res = await fetch(`${API_URL}/api/parent_dashboard.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: await AsyncStorage.getItem("user_id"),
        action: "reject_request",
        requestId: id,
        reason: comment,
        latitude: parentLat,
        longitude: parentLng,
      }),
    });
    const data = await res.json();
    if (data.success) {
      Alert.alert("Rejected", "Request rejected successfully.");
      fetchParentData(); // refresh dashboard
    } else {
      Alert.alert("Error", data.message);
    }
  } catch (e) {
    Alert.alert("Error", "Could not connect to server");
  }
};


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
    Alert.alert("Logout", "You have been logged out.");
    router.replace("/login");
  } catch (err) {
    console.log("Parent logout error:", err);
    await AsyncStorage.clear();
    router.replace("/login");
  }
};

  // 🔔 Pending notification count
const pendingNotificationCount = requests.filter(
  (r) => r.status === "pending"
).length;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
      {/* Header */}
      <View
  style={{
    backgroundColor: "#f9f9faff",
    flexDirection: "row",
    justifyContent: "space-between", // title/logo left, logout right
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    paddingTop: 40, // for status bar
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  }}
>
  {/* Left: Logo + Title */}
  <View style={{ flexDirection: "row", alignItems: "center" }}>
    <Image
      source={require('../assets/logo.jpg')} // replace with your logo path
      style={{ width: 50, height: 50, borderRadius: 25, marginRight: 12 }}
      resizeMode="contain"
    />
    <View>
        <Text style={{ color: "black", fontSize: 16, fontWeight: "bold" }}>
          Welcome to HANS
        </Text>
        <Text style={{ color: "black", fontSize: 18, fontWeight: "bold" }}>
  {parentName}!
</Text>
</View>

        </View>
        {/* Right */}
        <View style={{ flexDirection: "row", alignItems: "center" }}>
  {/* Notification Bell */}
  <TouchableOpacity
  onPress={() => setShowNotifications(!showNotifications)}
  style={{ marginRight: 10 }}
>
  <View style={{ position: "relative" }}>
    <Ionicons name="notifications-outline" size={22} color="#2563eb" />

    {pendingNotificationCount > 0 && (
      <View
        style={{
          position: "absolute",
          top: -6,
          right: -6,
          backgroundColor: "#dc2626",
          borderRadius: 10,
          minWidth: 18,
          height: 18,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 4,
        }}
      >
        <Text
          style={{
            color: "white",
            fontSize: 10,
            fontWeight: "700",
          }}
        >
          {pendingNotificationCount}
        </Text>
      </View>
    )}
  </View>
</TouchableOpacity>


        <TouchableOpacity onPress={handleLogout} style={{ flexDirection: "row", alignItems: "center" }}>
          <MaterialIcons name="logout" size={20} color="#2563EB"/>
          <Button title="Logout" onPress={handleLogout} />
        </TouchableOpacity>
      </View>
      </View>
{showNotifications && (
  <View
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.3)", // dim background
      zIndex: 100,
    }}
  >
    <View
      style={{
        width: "85%",
        backgroundColor: "white",
        borderRadius: 14,
        padding: 16,
        elevation: 8,
      }}
    >
      <Text
        style={{
          fontSize: 16,
          fontWeight: "700",
          marginBottom: 12,
          textAlign: "center",
        }}
      >
        Notifications
      </Text>

      {requests.filter((r) => r.status === "pending").length === 0 ? (
  <Text style={{ color: "#6b7280", textAlign: "center" }}>
    No new notifications
  </Text>
) : (
  <ScrollView
    style={{ maxHeight: 250 }}
    showsVerticalScrollIndicator={true}
  >
    {requests
      .filter((r) => r.status === "pending")
      .map((r, index) => (
        <View
          key={index}
          style={{
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: "#e5e7eb",
          }}
        >
          <Text style={{ fontWeight: "600", textAlign: "center" }}>
            {r.studentName}
          </Text>
          <Text
            style={{
              color: "#4b5563",
              fontSize: 12,
              textAlign: "center",
            }}
          >
            New {r.requestType}
          </Text>
        </View>
      ))}
  </ScrollView>
)}


      <TouchableOpacity
        onPress={() => setShowNotifications(false)}
        style={{
          marginTop: 16,
          backgroundColor: "#2563eb",
          paddingVertical: 10,
          borderRadius: 8,
        }}
      >
        <Text
          style={{
            color: "white",
            textAlign: "center",
            fontWeight: "600",
          }}
        >
          Close
        </Text>
      </TouchableOpacity>
    </View>
  </View>
)}


      

      {/* Main Content */}
      <ScrollView style={{ flex: 1, padding: 16 }}>
        {activeTab === "home" ? (
          <>
            {/* Children Info */}
            <View
              style={{
                backgroundColor: "white",
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                elevation: 2,
              }}
            >
              <Text
                style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}
              >
                Your Children
              </Text>
              {student.length === 1 ? (
  // ----------------- SINGLE CHILD ------------------
  <>
    <Text style={{ fontWeight: "600" }}>{student[0].name}</Text>
    <Text style={{ color: "#4b5563" }}>{student[0].RollNumber}</Text>
    <Text style={{ color: "#4b5563" }}>
      {student[0].branch}, Year {student[0].year}
    </Text>
    <Text
      style={{
        color:
          student[0].current_status === "Out of Hostel"
            ? "#dc2626"
            : student[0].current_status === "location_disabled"
            ? "#f97316" // orange
            : "#16a34a",
        fontWeight: "500",
      }}
    >
      Status:{" "}
      {student[0].current_status === "location_disabled"
        ? "Location Disabled"
        : student[0].current_status}
    </Text>
  </>
) : (
  // ---------------- MULTIPLE CHILDREN ----------------
  student.map((child:any, index:number) => (
    <View key={index} style={{ marginBottom: 10 }}>
      <Text style={{ fontWeight: "700" }}>{child.name}</Text>
      <Text style={{ color: "#4b5563" }}>{child.RollNumber}</Text>
      <Text style={{ color: "#4b5563" }}>
        {child.branch}, Year {child.year}
      </Text>
      <Text
        style={{
          color:
            child.status === "Out of Hostel"
              ? "#dc2626"
              : child.status === "Location Disabled"
              ? "#f97316"
              : "#16a34a",
          fontWeight: "500",
        }}
      >
        Status: {child.status}
      </Text>

  {/* 🔹 Grey Separator */}
                {index !== student.length - 1 && (
                  <View
                    style={{
                      height: 1,
                      backgroundColor: "#e5e7eb",
                      marginVertical: 12,
                    }}
                  />
                )}
    </View>
  ))
)}

            </View>
{!isOutsideHostel && (
  <Text
    style={{
      color: "#dc2626",
      fontSize: 12,
      marginBottom: 8,
      fontWeight: "600",
    }}
  >
    You must be outside the hostel to approve or reject requests.
  </Text>
)}

            {/* Pending Approvals */}
<View
  style={{
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  }}
>
  <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}>
    Pending Approvals
  </Text>

  {requests.filter((r) => r.status === "pending").length === 0 ? (
    <Text style={{ color: "#6b7280" }}>No pending requests</Text>
  ) : (
    requests
      .filter((r) => r.status === "pending")
      .map((r) => (
        <View
          key={r.id}
          style={{
            borderWidth: 1,
            borderColor: "#facc15",
            backgroundColor: "#fef9c3",
            borderRadius: 8,
            padding: 12,
            marginBottom: 12,
          }}
        >
        {r.photo && (
  <Image
    source={{ uri: `${API_URL}/${r.photo}` }}
    style={{ width: 150, height: 150, borderRadius: 12, marginBottom: 8 }}
    resizeMode="cover"
  />
)}
  <Text style={{ fontWeight: "600", marginBottom: 4 }}>
            Request Type : {r.requestType}
          </Text>


          <Text style={{ fontWeight: "600", marginBottom: 4 }}>
            Reason : {r.reason}
          </Text>
          <Text style={{ color: "#000711ff" ,fontWeight: "600"}}>
            {r.startDate} {r.startTime} - {r.endDate} {r.endTime}
          </Text>
          <Text style={{ color: "#01060eff" , fontWeight:"600" }}>By: {r.studentName}</Text>

          {!r.showOptions && !r.showRejectComment ? (
            <TouchableOpacity
              onPress={() =>
                setRequests((prev) =>
                  prev.map((req) =>
                    req.id === r.id ? { ...req, showOptions: true } : req
                  )
                )
              }
              style={{
                marginTop: 10,
                backgroundColor: "#2563eb",
                padding: 8,
                borderRadius: 8,
              }}
            >
              <Text
                style={{
                  color: "white",
                  textAlign: "center",
                  fontWeight: "600",
                }}
              >
                Review Request
              </Text>
            </TouchableOpacity>
          ) : r.showRejectComment ? (
            <View style={{ marginTop: 10 }}>
              <TextInput
                placeholder="Enter rejection reason"
                value={r.rejectComment}
                onChangeText={(text) =>
                  setRequests((prev) =>
                    prev.map((req) =>
                      req.id === r.id ? { ...req, rejectComment: text } : req
                    )
                  )
                }
                style={{
                  borderWidth: 1,
                  borderColor: "#d1d5db",
                  borderRadius: 8,
                  padding: 8,
                  marginBottom: 8,
                }}
              />
              <TouchableOpacity
                onPress={() => submitReject(r.id, r.rejectComment)}
                style={{
                  backgroundColor: "#dc2626",
                  padding: 8,
                  borderRadius: 8,
                }}
              >
                <Text
                  style={{
                    color: "white",
                    textAlign: "center",
                    fontWeight: "600",
                  }}
                >
                  Submit Rejection
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-around",
                marginTop: 10,
              }}
            >
              <TouchableOpacity
  disabled={!isOutsideHostel}
  onPress={() => handleApprove(r.id)}
  style={{
    backgroundColor: isOutsideHostel ? "#16a34a" : "#9ca3af",
    padding: 8,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  }}
>

                <Text
                  style={{
                    color: "white",
                    textAlign: "center",
                    fontWeight: "600",
                  }}
                >
                  Approve
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
  disabled={!isOutsideHostel}
  onPress={() =>
    setRequests((prev) =>
      prev.map((req) =>
        req.id === r.id ? { ...req, showRejectComment: true } : req
      )
    )
  }
  style={{
    backgroundColor: isOutsideHostel ? "#dc2626" : "#9ca3af",
    padding: 8,
    borderRadius: 8,
    flex: 1,
  }}
>

                <Text
                  style={{
                    color: "white",
                    textAlign: "center",
                    fontWeight: "600",
                  }}
                >
                  Reject
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))
  )}
</View>


          </>
        ) : (
          <>
            {/* Child Tab Screen */}
            <View
              style={{
                backgroundColor: "white",
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                elevation: 2,
              }}
            >
              <Text
                style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}
              >
                Child Details
              </Text>
              {student.length === 1 ? (
  // Single Child
  <>
    <Text style={{ fontWeight: "600" }}>{student[0].name}</Text>
    <Text style={{ color: "#4b5563" }}>{student[0].RollNumber}</Text>
    <Text style={{ color: "#4b5563" }}>
      {student[0].branch}, Year {student[0].year}
    </Text>
    <Text style={{ color: "#4b5563" }}>
      Room: {student[0].hostelRoom}
    </Text>
  </>
) : (
  // Multi Child Listing
  student.map((child:any, idx:number) => (
    <View
      key={idx}
      style={{
        backgroundColor: "#f1f5f9",
        padding: 10,
        borderRadius: 8,
        marginBottom: 10,
      }}
    >
      <Text style={{ fontWeight: "700" }}>{child.name}</Text>
      <Text>{child.RollNumber}</Text>
      <Text>
        {child.branch}, Year {child.year}
      </Text>
      <Text>Room: {child.hostelRoom}</Text>
    </View>
  ))
)}

            </View>

            {/* Leave History */}
            <View
              style={{
                backgroundColor: "white",
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                elevation: 2,
              }}
            >
              <Text
                style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}
              >
                Leave History
              </Text>
              {requests.length === 0 ? (
                <Text style={{ color: "#6b7280" }}>No leave history</Text>
              ) : (
                requests.slice(0, 5).map((r) => (
                  <View
                    key={r.id}
                    style={{
                      borderWidth: 1,
                      borderColor:
                        r.status === "approved"
                          ? "#16a34a"
                          : r.status === "rejected"
                          ? "#dc2626"
                          : r.status === "parent_approved"
                          ? "#2563eb"
                          : r.status === "cancelled"
                          ? "#6b7280"
                          : "#facc15",

                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 8,
                    }}
                  >
                    <Text style={{ fontWeight: "700", marginBottom: 4 }}>
                      Student: {r.studentName}
                    </Text>

                    <Text style={{ fontWeight: "600", marginBottom: 4 }}>
                      Request Type : {r.requestType}
                    </Text>
                    <Text style={{ fontWeight: "600", marginBottom: 4 }}>
                      Reason : {r.reason}
                    </Text>
                    <Text style={{ color: "#4b5563" }}>
                      {r.startDate} {r.startTime} - {r.endDate} {r.endTime}
                    </Text>
                    <Text
                      style={{
                        color:
                          r.status === "approved"
                            ? "#16a34a"
                            : r.status === "rejected"
                            ? "#dc2626"
                            : r.status === "parent_approved"
                            ? "#2563eb"
                            : "#facc15",
                        fontWeight: "600",
                      }}
                    >
                     {r.status === "approved"
                        ? "Approved"
                        : r.status === "rejected"
                        ? "Rejected"
                        : r.status === "parent_approved"
                        ? "Parent Approved"
                        : r.status === "cancelled"
                        ? "Cancelled"
                        : "Pending"}

                    </Text>
                    {r.rejectComment ? (
                      <Text style={{ color: "#6b7280", marginTop: 2 }}>
                        Reason: {r.rejectComment}
                      </Text>
                    ) : null}
                  </View>
                ))
              )}
            </View>

          </>
        )}
      </ScrollView>

      {/* Bottom Nav */}
<View
  style={{
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "white",
    padding: 12,
    borderTopWidth: 1,
    borderColor: "#e5e7eb",
    paddingVertical: 14,
    paddingBottom: 50,
  }}
>
  {/* Home Tab */}
  <TouchableOpacity
    onPress={() => setActiveTab("home")}
    style={{
      alignItems: "center",
      borderBottomWidth: activeTab === "home" ? 2 : 0,
      borderBottomColor: activeTab === "home" ? "#2563eb" : "transparent",
      paddingBottom: 4,
    }}
  >
    <Ionicons
      name="home-outline"
      size={24}
      color={activeTab === "home" ? "#2563eb" : "#6b7280"}
    />
    <Text
      style={{
        color: activeTab === "home" ? "#2563eb" : "#6b7280",
        fontWeight: activeTab === "home" ? "bold" : "normal",
      }}
    >
      Home
    </Text>
  </TouchableOpacity>

  {/* Child Tab */}
  <TouchableOpacity
    onPress={() => setActiveTab("child")}
    style={{
      alignItems: "center",
      borderBottomWidth: activeTab === "child" ? 2 : 0,
      borderBottomColor: activeTab === "child" ? "#2563eb" : "transparent",
      paddingBottom: 4,
    }}
  >
    <MaterialIcons
      name="child-care"
      size={24}
      color={activeTab === "child" ? "#2563eb" : "#6b7280"}
    />
    <Text
      style={{
        color: activeTab === "child" ? "#2563eb" : "#6b7280",
        fontWeight: activeTab === "child" ? "bold" : "normal",
      }}
    >
      Child
    </Text>
  </TouchableOpacity>
</View>

    </View>
  );
};

export default ParentDashboard;