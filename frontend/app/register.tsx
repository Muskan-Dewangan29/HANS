import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet,
  KeyboardAvoidingView,
  Platform, 
  Animated, 
  Easing,
  Image 
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter ,Stack, useNavigation } from 'expo-router';
import API_URL from '../config/server';
import * as DocumentPicker from 'expo-document-picker';


type RegisterProps = {
  apiUrl: string;
};

export const options = {
  headerShown: false,
};

const Register: React.FC<RegisterProps> = ({ apiUrl }) => {
 const navigation = useNavigation();
  useEffect(() => {
    navigation.setOptions({
     headerShown: false,
    });
  }, []);
  useEffect(() => {
  const interval = setInterval(() => {
    

    // force re-render by updating state safely
    setStep((prev) => prev);

  }, 10000); // 10 seconds

  return () => clearInterval(interval); // cleanup on unmount
}, []);

  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [relationshipOptions, setRelationshipOptions] = useState<string[]>([]);
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [verificationSent, setVerificationSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aadharFile, setAadharFile] = useState<any>(null);
  const [resendTimer, setResendTimer] = useState(30);
const [otpTimer, setOtpTimer] = useState(600); // 10 minutes = 600 sec
const [canResend, setCanResend] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: '',
    gender: '',
    password: '',
    confirmPassword: '',
    otp: '',
    RollNumber:'',
    hostelName: '',
    roomNumber: '',
    parentName: '',
    parentPhone: '',
    aadharNumber: '',
    year: '',
    Course: '',
    branch: '',
    section:'',
    bloodGroup: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    numberOfChildren: '',   // NEW
    childrenIds: [''], 
  });

  // Animation for step fade-in
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [step]);

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    if (formData.role === "student" || formData.role === "warden"){
    if (gender === 'male') {
      setFormData((p: any) => ({ ...p, hostelName: 'Boys Hostel' }));
    } else if (gender === 'female') {
      setFormData((p: any) => ({ ...p, hostelName: 'Girls Hostel' }));
    } else {
      setFormData((p: any) => ({ ...p, hostelName: '' }));
    }
  }
  if (formData.role === "parent"){
    setFormData((p:any) => ({ ...p, hostelName: ""}));
  }
 }, [gender, formData.role]);
  useEffect(() => {
  if (gender === 'female') {
    setRelationshipOptions(['Mother', 'Sister', 'Aunt']);
  } else if (gender === 'male') {
    setRelationshipOptions(['Father', 'Brother', 'Uncle']);
  } else {
    setRelationshipOptions([]);
  }
}, [gender]);

  // Update Aadhar file name whenever RollNumber changes
useEffect(() => {
  if (aadharFile && formData.RollNumber) {
    setAadharFile({
      ...aadharFile,
      name: `${formData.RollNumber.trim()}.jpg`,
    });
  }
}, [formData.RollNumber]);


  // Updated: restrict to JPG and <500 KB, but keep variable names and backend key (aadharFile) unchanged
  const handleAadharUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*'],
      });

      // DocumentPicker may return different shapes depending on versions; try to handle both
      if (result == null) return;
      // older code used result.canceled and result.assets
      // newer API returns { type: 'cancel' } or { type: 'success', uri, name, size, mimeType }

      // handle new API shape
      if ((result as any).type === 'cancel') return;

      // prefer assets array if present (expo-document-picker newer versions)
      const file = (result as any).assets ? (result as any).assets[0] : result;

      if (!file) return;

      // Check file type by MIME if available, else fallback to extension check
      const mimeType = (file.type || file.mimeType || '').toString().toLowerCase();
      const fileName = (file.name || file.uri || '').toString();
      const ext = fileName.split('.').pop()?.toLowerCase() || '';

      const isJpgMime = mimeType.includes('jpeg') || mimeType.includes('jpg');
      const isJpgExt = ext === 'jpg' || ext === 'jpeg';

      if (!isJpgMime && !isJpgExt) {
        alert('Please select a JPG image (file extension .jpg or .jpeg)');
        return;
      }

      // Check file size (500 KB = 512000 bytes)
      const size = file.size || file.fileSize || 0;
      if (size && size > 512000) {
        alert('Photo must be less than 500 KB');
        return;
      }

      setAadharFile(file);
      // Rename file using student's Roll Number
let roll = formData.RollNumber ? formData.RollNumber.trim() : "";

let renamedFile = {
  ...file,
  name: roll ? `${roll}.jpg` : file.name  // if roll exists → rename file
};

setAadharFile(renamedFile);

      alert('Photo selected successfully!');
    } catch (error) {
      console.error('File upload error:', error);
      alert('Error selecting file');
    }
  };


const handleSendVerification = async () => {
  try {
    const form = new FormData();

    // 🔑 MUST be register
    form.append("action", "register");

   // 🔑 SEND EVERYTHING REQUIRED BY BACKEND
    form.append("name", formData.fullName);
    form.append("email", formData.email);
    form.append("phone", formData.phone);
    form.append("password", formData.password);
    form.append("role", formData.role);
    form.append("gender", gender);
    form.append("aadharNumber", formData.aadharNumber);
    form.append("address", formData.address);
    form.append("city", formData.city);
    form.append("state", formData.state);
    form.append("pincode", formData.pincode);

    // Role-specific
    if (formData.role === "student") {
      form.append("RollNumber", formData.RollNumber);
      form.append("hostelName", formData.hostelName);
      form.append("roomNumber", formData.roomNumber);
      form.append("year", formData.year);
      form.append("Course", formData.Course);
      form.append("branch", formData.branch);
      form.append("section", formData.section);
      form.append("bloodGroup", formData.bloodGroup);
      form.append("parentName", formData.parentName);
      form.append("parentPhone", formData.parentPhone);
    }

// RollNumber logic
if (formData.role === 'parent') {
  form.append('RollNumber', formData.childrenIds.join(','));
} else {
  form.append('RollNumber', formData.RollNumber);
}

// Hostel/Room info
form.append('hostelName', formData.hostelName);
form.append('roomNumber', formData.roomNumber);

// Parent info
form.append('parentName', formData.parentName);
form.append('parentPhone', formData.parentPhone);

// Academic info
form.append('year', formData.year);
form.append('Course', formData.Course);
form.append('branch', formData.branch);
form.append('section', formData.section);
form.append('bloodGroup', formData.bloodGroup);
form.append('aadharNumber', formData.aadharNumber);
if (aadharFile) {
  form.append('aadharFile', {
    uri: aadharFile.uri,
    type: aadharFile.type || 'image/jpeg',
    name: aadharFile.name || 'photo.jpg',
  } as any);
}
    

    const response = await fetch(`${API_URL}/api/register.php`, {
      method: "POST",
      body: form,
    });

    const result = await response.json();
    console.log(result);

    if (result.success) {
      setVerificationSent(true);
      alert("OTP sent to your email");
      setStep(3); // move to OTP screen
    } else {
      alert(result.message);
    }
  } catch (e) {
    alert("Failed to send OTP");
  }
};




const registerUserInDB = async () => {
  setLoading(true);
  try {
    const form = new FormData();

// Basic user info
form.append('name', formData.fullName);
form.append('email', formData.email);
form.append('phone', formData.phone);
form.append('password', formData.password);
form.append('gender', gender);
form.append('role', formData.role);
form.append('address', formData.address);
form.append('city', formData.city);
form.append('state', formData.state);
form.append('pincode', formData.pincode);

// RollNumber logic
if (formData.role === 'parent') {
  form.append('RollNumber', formData.childrenIds.join(','));
} else {
  form.append('RollNumber', formData.RollNumber);
}

// Hostel/Room info
form.append('hostelName', formData.hostelName);
form.append('roomNumber', formData.roomNumber);

// Parent info
form.append('parentName', formData.parentName);
form.append('parentPhone', formData.parentPhone);

// Academic info
form.append('year', formData.year);
form.append('Course', formData.Course);
form.append('branch', formData.branch);
form.append('section', formData.section);
form.append('bloodGroup', formData.bloodGroup);
form.append('aadharNumber', formData.aadharNumber);

// Attach Aadhar file if available
if (aadharFile) {
  form.append('aadharFile', {
    uri: aadharFile.uri,
    type: aadharFile.type || 'image/jpeg',
    name: aadharFile.name || 'photo.jpg',
  } as any);
}

// Send the request
const response = await fetch(`${API_URL}/api/register.php`, {
  method: "POST",
  body: form,
});
    const result = await response.json();
    console.log("Response:", result);

    setLoading(false);

    if (result.success) {
      alert(result.message || "Account created successfully!");
      router.push("/login");
    } else {
      alert("Registration failed: " + result.message);
    }
  } catch (error) {
    console.error("Error:", error);
    setLoading(false);
    alert("Cannot connect to server");
  }
};




  const handleNextStep = async () => {

    if (step === 1) {
    // Step 1: Basic info validations
    const fullName = formData.fullName.trim();
    const email = formData.email.trim();
    const phone = formData.phone.trim();

    const nameRegex = /^[A-Za-z ]+$/;
    if (!fullName || !nameRegex.test(fullName)) {
      alert('Please enter a valid Full Name (letters and spaces only)');
      return;
    }

    if (!email || !email.endsWith('.com')) {
      alert('Please enter a valid Email');
      return;
    }

    const phoneRegex = /^91\d{10}$/;
    if (!phone || !phoneRegex.test(phone)) {
      alert('Please enter a valid Phone Number');
      return;
    }

    if (!formData.role || !formData.gender) {
      alert('Please select Gender and Role');
      return;
    }

     setStep(2);
    return;
  } 
  else if (step === 2) {
    // Step 2: Password + photo + role-specific validations

    // Password
    const pass = formData.password;

if (pass.length !== 6) {
  alert("Password must be exactly 6 characters");
  return;
}

if (!/^[A-Za-z0-9]{6}$/.test(pass)) {
  alert("Password must contain only alphanumeric characters");
  return;
}

// MUST contain at least 1 letter and 1 number
if (!/[A-Za-z]/.test(pass) || !/[0-9]/.test(pass)) {
  alert("Password must include both alphabets and numbers");
  return;
}
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    if (!formData.address || !formData.city || !formData.state || !formData.pincode) {
  alert('Please fill Address, City, State, and Pincode');
  return;
}


    // Photo / Aadhar
    if (!aadharFile) {
      alert('Please upload your Photo');
      return;
    }

// Role-specific validations
    if (formData.role === 'student') {
      if (!formData.RollNumber || formData.RollNumber.length < 1) {
  alert('Roll Number is required');
  return;
}
if (formData.RollNumber.length > 12) {
  alert('Roll Number cannot be more than 12 digits');
  return;
}
      if (!formData.hostelName) {
        alert('Please select hostel');
        return;
      }
      if (!formData.roomNumber) {
        alert('Please enter Room Number');
        return;
      }
      if (!formData.year) {
        alert('Please select Year');
        return;
      }
      if (!formData.Course) {
        alert('Please select Course');
        return;
      }
      if (formData.Course === 'BTech' && !formData.branch) {
        alert('Please select Branch');
        return;
      }
      if (formData.branch === 'CSE' && !formData.section) {
        alert('Please select Section');
        return;
      }
      if (!formData.bloodGroup) {
        alert('Please select Blood Group');
        return;
      }
      if (!formData.parentName || !/^[A-Za-z ]+$/.test(formData.parentName)) {
        alert('Please enter valid Parent Name (letters only)');
        return;
      }
      if (!formData.parentPhone || !/^91\d{10}$/.test(formData.parentPhone)) {
        alert('Please enter valid Parent Phone Number (12 digits including 91)');
        return;
      }
    } 
    else if (formData.role === 'parent') {
      if (!formData.childrenIds.length || formData.childrenIds.some(id => !id) || !formData.parentName) {
        alert('Please fill all child student IDs and parent details');
        return;
      }
    } 
    else if (formData.role === 'warden') {
      if (!formData.hostelName) {
        alert('Please fill all required fields for warden');
        return;
      }
    }

     // If all validations pass, move to Step 3
    setStep(3);
    await handleSendVerification();
    return;
  } 
  else if (step === 3) {
  if (!formData.otp) {
    alert('Please enter OTP');
    return;
  }

  await verifyOtp();
  
}

};
const verifyOtp = async () => {
  try {
    const form = new FormData();
    form.append("action", "verify_otp"); // 🔑 REQUIRED
    form.append("email", formData.email);
    form.append("otp", formData.otp);

    const response = await fetch(`${API_URL}/api/register.php`, {
      method: "POST",
      body: form,
    });

    const result = await response.json();

    if (result.success) {
      alert("Registration completed successfully");
      router.push("/login");
    } else {
      alert(result.message);
    }
  } catch (error) {
    alert("OTP verification failed");
  }
};


  


  const renderRoleSpecificFields = () => {

  // Aadhar upload block stays first
  const aadharUpload = (
    <>
    <Text style={styles.label}>Upload Photo(JPG, less than 500KB)</Text>
    <View style={styles.uploadField}>
      <TextInput
        style={styles.uploadInput}
        value={aadharFile ? aadharFile.name : ""}
        editable={false}
      />
      <TouchableOpacity
        onPress={handleAadharUpload}
        style={[styles.chooseFileButton, aadharFile && { backgroundColor: "#16a34a" }]}
      >
        <Text style={styles.chooseFileText}>
          {aadharFile ? "Selected ✅" : "Choose File"}
        </Text>
      </TouchableOpacity>
    </View>
    </>
  );

  // Start returning UI
  return (
    <>
      {/* Address fields - common to all roles */}
      <Text style={styles.label}>Address</Text>
      <TextInput
        value={formData.address}
        onChangeText={(val) => handleInputChange('address', val)}
        style={styles.input}
      />
      <Text style={styles.label}>City</Text>
      <TextInput
        value={formData.city}
        onChangeText={(val) => handleInputChange('city', val)}
        style={styles.input}
      />
      <Text style={styles.label}>State</Text>
      <View style={styles.pickerBox}>
      <Picker
      
  selectedValue={formData.state}
  onValueChange={(val) => handleInputChange("state", val)}
    style={{ height: 50, width: '100%', color: '#111' ,backgroundColor: "#fff"}}
>
  
  <Picker.Item label="Select State" value="" />
  <Picker.Item label="Andhra Pradesh" value="Andhra Pradesh" />
  <Picker.Item label="Arunachal Pradesh" value="Arunachal Pradesh" />
  <Picker.Item label="Assam" value="Assam" />
  <Picker.Item label="Bihar" value="Bihar" />
  <Picker.Item label="Chhattisgarh" value="Chhattisgarh" />
  <Picker.Item label="Goa" value="Goa" />
  <Picker.Item label="Gujarat" value="Gujarat" />
  <Picker.Item label="Haryana" value="Haryana" />
  <Picker.Item label="Himachal Pradesh" value="Himachal Pradesh" />
  <Picker.Item label="Jharkhand" value="Jharkhand" />
  <Picker.Item label="Karnataka" value="Karnataka" />
  <Picker.Item label="Kerala" value="Kerala" />
  <Picker.Item label="Madhya Pradesh" value="Madhya Pradesh" />
  <Picker.Item label="Maharashtra" value="Maharashtra" />
  <Picker.Item label="Manipur" value="Manipur" />
  <Picker.Item label="Meghalaya" value="Meghalaya" />
  <Picker.Item label="Mizoram" value="Mizoram" />
  <Picker.Item label="Nagaland" value="Nagaland" />
  <Picker.Item label="Odisha" value="Odisha" />
  <Picker.Item label="Punjab" value="Punjab" />
  <Picker.Item label="Rajasthan" value="Rajasthan" />
  <Picker.Item label="Sikkim" value="Sikkim" />
  <Picker.Item label="Tamil Nadu" value="Tamil Nadu" />
  <Picker.Item label="Telangana" value="Telangana" />
  <Picker.Item label="Tripura" value="Tripura" />
  <Picker.Item label="Uttar Pradesh" value="Uttar Pradesh" />
  <Picker.Item label="Uttarakhand" value="Uttarakhand" />
  <Picker.Item label="West Bengal" value="West Bengal" />

  {/* Union Territories */}
  <Picker.Item label="Andaman & Nicobar Islands" value="Andaman & Nicobar Islands" />
  <Picker.Item label="Chandigarh" value="Chandigarh" />
  <Picker.Item label="Dadra & Nagar Haveli and Daman & Diu" value="Dadra & Nagar Haveli and Daman & Diu" />
  <Picker.Item label="Delhi" value="Delhi" />
  <Picker.Item label="Jammu & Kashmir" value="Jammu & Kashmir" />
  <Picker.Item label="Ladakh" value="Ladakh" />
  <Picker.Item label="Lakshadweep" value="Lakshadweep" />
  <Picker.Item label="Puducherry" value="Puducherry" />
</Picker>
</View>

      <Text style={styles.label}>Pincode</Text>
      <TextInput
        keyboardType="numeric"
        value={formData.pincode}
        onChangeText={(val) => handleInputChange('pincode', val)}
        style={styles.input}
      />

      {/* ROLE-SPECIFIC FIELDS START HERE */}

      {formData.role === 'student' && (
        <>
          {aadharUpload}
          <Text style={styles.label}>Course</Text>
          <View style={styles.pickerBox}>
            <Picker
              selectedValue={formData.Course}
              onValueChange={(val) => setFormData({ ...formData, Course: val })}
            >
              <Picker.Item label="Select Course" value="" />
              <Picker.Item label="BTech" value="BTech" />
              <Picker.Item label="MTech" value="MTech" />
              <Picker.Item label="BSc" value="BSc" />
              <Picker.Item label="BBA" value="BBA" />
              <Picker.Item label="MBA" value="MBA" />
              <Picker.Item label="BCom" value="BCom" />
              <Picker.Item label="Nursing" value="Nursing" />
            </Picker>
          </View>

          {formData.Course === "BTech" && (
            <View style={styles.pickerBox}>
              <Picker
                selectedValue={formData.branch}
                onValueChange={(val) =>
                  setFormData({ ...formData, branch: val })
                }
              >
                <Picker.Item label="Select Branch" value="" />
                <Picker.Item label="AI" value="AI" />
                <Picker.Item label="AIML" value="AIML" />
                <Picker.Item label="CSE" value="CSE" />
                <Picker.Item label="ECE" value="ECE" />
                <Picker.Item label="ME" value="ME" />
                <Picker.Item label="CE" value="CE" />
                <Picker.Item label="EE" value="EE" />
                <Picker.Item label="IT" value="IT" />
              </Picker>
            </View>
          )}

          {formData.branch === "CSE" && (
            <View style={styles.pickerBox}>
              <Picker
                selectedValue={formData.section}
                onValueChange={(val) =>
                  setFormData({ ...formData, section: val })
                }
              >
                <Picker.Item label="Select Section" value="" />
                <Picker.Item label="A" value="A" />
                <Picker.Item label="B" value="B" />
                <Picker.Item label="C" value="C" />
                <Picker.Item label="D" value="D" />
              </Picker>
            </View>
          )}
          <Text style={styles.label}>Year</Text>
          <View style={styles.pickerBox}>
            <Picker
              selectedValue={formData.year}
              onValueChange={(val) =>
                setFormData({ ...formData, year: val })
              }
            >
              <Picker.Item label="Select Year" value="" />
              {[1, 2, 3, 4].map((s) => (
                <Picker.Item key={s} label={`${s}`} value={`${s}`} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>University Roll Number</Text>
          <TextInput
            keyboardType="numeric"
            value={formData.RollNumber}
            onChangeText={(val) => {
              let digitsOnly = val.replace(/\D/g, '');
              if (digitsOnly.length > 12) digitsOnly = digitsOnly.slice(0, 12);
              handleInputChange('RollNumber', digitsOnly);
            }}
            maxLength={12}
            style={styles.input}
          />
          <Text style={styles.label}>Blood Group</Text>
          <View style={styles.pickerBox}>
            <Picker
              selectedValue={formData.bloodGroup}
              onValueChange={(val) =>
                setFormData({ ...formData, bloodGroup: val })
              }
            >
              <Picker.Item label="Select Blood Group" value="" />
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                <Picker.Item key={bg} label={bg} value={bg} />
              ))}
            </Picker>
          </View>

          <View style={styles.input}>
            <Text>{formData.hostelName}</Text>
          </View>

          <Text style={styles.label}>Room Number</Text>
          <TextInput
            value={formData.roomNumber}
            onChangeText={(val) => handleInputChange('roomNumber', val)}
            style={styles.input}
          />
          <Text style={styles.label}>Parent/Guardian Name</Text>
          <TextInput
            value={formData.parentName}
            onChangeText={(val) => {
              const onlyAlphabets = val.replace(/[^A-Za-z ]/g, "");
              handleInputChange("parentName", onlyAlphabets);
            }}
            style={styles.input}
          />
          <Text style={styles.label}>Parent Phone Number</Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#d1d5db',
              borderRadius: 8,
              marginBottom: 12,
            }}
          >
            
            <Text style={{ padding: 12, color: '#6b7280', fontWeight: 'bold' }}>
              +91
            </Text>
            <TextInput
              keyboardType="phone-pad"
              value={formData.parentPhone.replace(/^91/, '')}
              onChangeText={(val) => {
                let digitsOnly = val.replace(/\D/g, '');
                if (digitsOnly.length > 10) digitsOnly = digitsOnly.slice(0, 10);
                handleInputChange('parentPhone', '91' + digitsOnly);
              }}
              maxLength={10}
              style={{ flex: 1, padding: 12 }}
            />
          </View>
        </>
      )}

      {formData.role === 'parent' && (
        <>
          {aadharUpload}
          <Text style={styles.label}>How many children in hostel?</Text>
          <View style={styles.pickerBox}>
            <Picker
              selectedValue={formData.numberOfChildren}
              onValueChange={(val) => {
                const count = parseInt(val);
                setFormData({
                  ...formData,
                  numberOfChildren: val,
                  childrenIds: Array(count).fill(''),
                });
              }}
            >
              <Picker.Item
                label="How many children in hostel?"
                value=""
              />
              {[1, 2, 3, 4].map((num) => (
                <Picker.Item key={num} label={`${num}`} value={`${num}`} />
              ))}
            </Picker>
          </View>

          {formData.childrenIds.map((id, index) => (
  <View key={index} style={{ marginBottom: 12 }}>
    {/* Label above the box */}
    <Text style={styles.label}>
      Enter Roll Number of Child {index + 1}
    </Text>

    <TextInput
      value={id}
      onChangeText={(val) => {
        const updated = [...formData.childrenIds];
        updated[index] = val;
        setFormData({ ...formData, childrenIds: updated });
      }}
      style={styles.input}
    />
  </View>
))}

          <Text style={styles.label}>Select Relationship</Text>
          <View style={styles.pickerBox}>
            <Picker
              selectedValue={formData.parentName}
              onValueChange={(val) => handleInputChange('parentName', val)}
            >
              <Picker.Item label="Select Relationship" value="" />
              {relationshipOptions.map((rel) => (
                <Picker.Item key={rel} label={rel} value={rel} />
              ))}
            </Picker>
          </View>
        </>
      )}

      {formData.role === 'warden' && (
        <>
          {aadharUpload}
          <View style={styles.input}>
            <Text>{formData.hostelName || 'Select Gender first'}</Text>
          </View>
        </>
      )}
    </>
  );
};

  return (
    <KeyboardAvoidingView
  style={{ flex: 1, backgroundColor: '#f3f4f6' }}
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
>
  <ScrollView
    contentContainerStyle={{ flexGrow: 1 }}
    keyboardShouldPersistTaps="handled"
  >
      <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
        <View style={[
    step > 1 
      ? { flexDirection: 'row', alignItems: 'center', marginBottom: 16 } 
      : { alignItems: 'center', marginBottom: 16 }
  ]}>
    <Image 
      source={require("../assets/logo.jpg")} 
      style={[
        styles.logo, 
        step > 1 && {
          width: 50,
          height: 50,
          borderRadius: 8,
          marginRight: 10,
          marginTop: -5,
          marginBottom: 10,
          alignSelf: 'flex-start',
        }
      ]} 
    />
        {step > 1 ? (
      <View>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111', marginTop: -5 }}>HANS</Text>
        <Text style={{ fontSize: 14,fontWeight: 'bold', color: '#6b7280' , marginTop: 2}}>Hostel Authentication & Notification System</Text>
      </View>
    ) : (
      <>
        <Text style={styles.title}>HANS</Text>
        <Text style={styles.subtitle}>Hostel Authentication & Notification System</Text>
        <Text style={styles.subtitle1}>Create Your Account</Text>
      </>
    )}
  </View>
        {step === 1 && (
          <>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              value={formData.fullName}
              onChangeText={(val) => {
                // Remove all non-alphabetic characters (allow spaces)
                const lettersOnly = val.replace(/[^a-zA-Z\s]/g, '');
                handleInputChange('fullName', lettersOnly);
              }}
              style={styles.input}
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              value={formData.email}
              onChangeText={(val) => {
                // Remove spaces
                const trimmedVal = val.replace(/\s/g, '');

                // Allow only a single '@' and letters, numbers, dots, underscores
                let formatted = trimmedVal.replace(/[^a-zA-Z0-9@._-]/g, '');

                // Optional: Ensure ends with .com while typing
                if (!formatted.endsWith('.com') && formatted.includes('@')) {
                  // Do nothing, let user type domain
                }

                handleInputChange('email', formatted);
              }}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
            />

           <Text style={styles.label}>Phone Number</Text>
          <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, marginBottom: 12 }}>
            <Text style={{ padding: 12, color: '#6b7280', fontWeight: 'bold' }}>+91</Text>
            <TextInput
              keyboardType="phone-pad"
              value={formData.phone.slice(2)}
              onChangeText={(val) => {
                let digitsOnly = val.replace(/\D/g, '');
                if (digitsOnly.length > 10) digitsOnly = digitsOnly.slice(0, 10);
                handleInputChange('phone', '91' + digitsOnly);
              }}
              maxLength={10}
              style={{ flex: 1, padding: 12 }}
            />
          </View>

          <Text style={styles.label}>Gender</Text>
          <View style={styles.pickerBox}>
            <Picker
              selectedValue={formData.gender}
              onValueChange={(val) => {
                setFormData({ ...formData, gender: val });
                setGender(val);
              }}
            >
              <Picker.Item label="Select Gender" value="" />
              <Picker.Item label="Male" value="male" />
              <Picker.Item label="Female" value="female" />
            </Picker>
          </View>

            <Text style={{ marginBottom: 4 }}>Register As</Text>
            {['student', 'parent'].map((role) => (
              <TouchableOpacity key={role} onPress={() => handleInputChange('role', role)} style={formData.role === role ? styles.activeRole : styles.roleButton}>
                <Text style={formData.role === role ? { color: '#fff' } : { color: '#000' }}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        {step === 2 && (
          <>
            <Text>Password must be exactly 6 alphanumeric characters</Text>
            <Text style={styles.label}>Password</Text>
            <TextInput
  secureTextEntry
  value={formData.password}
  onChangeText={(val) => {
    // Keep only letters and numbers
    const alphanumeric = val.replace(/[^a-zA-Z0-9]/g, '');
    // Limit to max 6 characters
    const trimmed = alphanumeric.slice(0, 6);
    handleInputChange('password', trimmed);
  }}
  style={styles.input}
/>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              secureTextEntry
              value={formData.confirmPassword}
              onChangeText={(val) => handleInputChange('confirmPassword', val)}
              style={styles.input}
            />
      <Text style={styles.label}>Enter Aadhaar Number</Text>      
<TextInput
  keyboardType="numeric"
  value={formData.aadharNumber}
  maxLength={12}  // hard limit
  onChangeText={(text) => {
    const onlyNumbers = text.replace(/[^0-9]/g, ""); // allow only digits
    setFormData({ ...formData, aadharNumber: onlyNumbers });
  }}
  style={styles.input}
/>


            {renderRoleSpecificFields()}
          </>
        )}

        {step === 3 && (
          <>
            <Text style={{ fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>Enter OTP</Text>
            <TextInput
              placeholder="Enter OTP"
              placeholderTextColor="#6b7280"
              value={formData.otp}
              onChangeText={(val) => handleInputChange('otp', val)}
              style={styles.input}
              keyboardType="numeric"
            />
            {verificationSent && (
  <TouchableOpacity onPress={handleSendVerification}>
    <Text style={{ color: '#2563EB', textAlign: 'center' }}>
      Resend OTP
    </Text>
  </TouchableOpacity>
)}

          </>
        )}

        <View style={{ flexDirection: 'row', justifyContent: step === 1 ? 'flex-end' : 'space-between', marginTop: 16 }}>
          {step > 1 ? (
            <TouchableOpacity onPress={() => setStep(step - 1)} style={styles.backButton}>
              <Text style={{ color: '#2563EB' }}>Back</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={handleNextStep} style={styles.nextButton}>
            <Text style={{ color: '#fff' }}>{step === 3 ? 'Complete Registration' : 'Next'}</Text>
          </TouchableOpacity>
        </View>


        {step === 1 && (
          <View style={styles.login}>
          <Text style={{fontSize:20}}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/login')} >
            <Text style={{ color: '#2563EB',fontWeight: 'bold', fontSize: 20 }}> Sign In</Text>
          </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    justifyContent: 'center',
    elevation: 5,
  },
  uploadField: {
  flexDirection: 'row',
  alignItems: 'center',
  borderWidth: 1,
  borderColor: '#d1d5db',
  borderRadius: 8,
  overflow: 'hidden',
  marginBottom: 12,
  backgroundColor: '#fff',
},

uploadInput: {
  flex: 1,
  paddingVertical: 12,
  paddingHorizontal: 10,
  color: '#374151',
  fontSize: 14,
},
logo: {
  width: 150,
  height: 150,
  borderRadius: 10,
  alignSelf: "center",
  marginBottom: 24,
},



chooseFileButton: {
  backgroundColor: '#2563EB',
  paddingVertical: 12,
  paddingHorizontal: 16,
  justifyContent: 'center',
},

chooseFileText: {
  backgroundColor: "#2563EB", // blue default
  paddingVertical: 5,
  paddingHorizontal: 16,
  justifyContent: "center",
},


pickerBox: {
  borderWidth: 1,
  borderColor: '#d1d5db',
  borderRadius: 8,
  marginBottom: 12,
  overflow: 'hidden',
},
label: {
  fontSize: 14,
  fontWeight: '600',
  color: '#374151',
  marginBottom: 4,
  marginLeft: 2,
},


 title: { fontSize: 30, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 20, textAlign: 'center', marginBottom: 16, fontWeight: 'bold',color: '#000204ff' },
  subtitle1: { fontSize: 25, textAlign: 'center', marginBottom: 16,color: '#6b7280' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, marginBottom: 12 },
  roleButton: { padding: 12, marginVertical: 4, backgroundColor: '#e5e7eb', borderRadius: 8, alignItems: 'center' },
  activeRole: { padding: 12, marginVertical: 4, backgroundColor: '#2563EB', borderRadius: 8, alignItems: 'center' },
  nextButton: { backgroundColor: '#2563EB', padding: 12, borderRadius: 8, alignItems: 'center' },
  backButton: { borderWidth: 1, borderColor: '#2563EB', padding: 12, borderRadius: 8, alignItems: 'center' },
  login: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
});

export default Register;
