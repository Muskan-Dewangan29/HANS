import axios from 'axios';

const API_BASE = 'YOUR_BACKEND_URL'; // Replace with your backend URL

// Axios instance
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ===================== Auth =====================

// Admin login
export const adminLogin = async (email, password) => {
  const res = await api.post('/admin_login.php', { email, password });
  return res.data;
};

// Student login
export const studentLogin = async (email, password) => {
  const res = await api.post('/student_login.php', { email, password });
  return res.data;
};

// Warden login
export const wardenLogin = async (email, password) => {
  const res = await api.post('/warden_login.php', { email, password });
  return res.data;
};

// ===================== Users =====================

// Add user (admin)
export const addUser = async (name, email, password, role) => {
  const res = await api.post('/add_user.php', { name, email, password, role });
  return res.data;
};

// Get all students
export const getStudents = async () => {
  const res = await api.get('/get_students.php');
  return res.data;
};

// Get all wardens
export const getWardens = async () => {
  const res = await api.get('/get_wardens.php');
  return res.data;
};

// Update user
export const updateUser = async (userId, data) => {
  const res = await api.post('/update_user.php', { userId, ...data });
  return res.data;
};

// ===================== Leaves =====================

// Student submits leave request
export const requestLeave = async (student_id, from_date, to_date, reason, destination, contact_number) => {
  const res = await api.post('/request_leave.php', { student_id, from_date, to_date, reason, destination, contact_number });
  return res.data;
};

// Get leave requests
export const getLeaves = async (filter = 'all') => {
  const res = await api.get(`/get_leaves.php?filter=${filter}`);
  return res.data;
};

// Warden/Admin handles leave (approve/reject)
export const handleLeave = async (leave_id, action, comment = '') => {
  const res = await api.post('/handle_leave.php', { leave_id, action, comment });
  return res.data;
};
