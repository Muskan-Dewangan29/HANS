# 🏨 HANS – Hostel Authentication and Notification System

An intelligent **Hostel Authentication and Notification System (HANS)** designed to streamline hostel management through secure authentication, digital leave management, QR-based verification, geofencing, and real-time notifications.

The application enables seamless communication between **Students, Parents, Wardens, and Security Guards**, providing a secure and efficient hostel management experience.

---

## 📱 Live Application

🚀 **Status:** Deployed on AWS Cloud

🏪 **App Store:** Available (https://apps.apple.com/in/app/hansapp/id6759252267)

🌐 **Backend:** Hosted on AWS

---

# 📌 Overview

HANS is a full-stack mobile application that digitizes hostel operations by replacing manual processes with an automated and secure workflow.

The system supports multiple user roles with dedicated dashboards and ensures transparency throughout the leave approval and hostel entry/exit process.

---

# ✨ Key Features

## 🔐 Secure Authentication

- Student Login
- Parent Login
- Warden Login
- Guard Login
- Role-Based Access Control

---

## 👨‍🎓 Student Module

- View Profile
- Apply for Leave
- View Leave Status
- Generate QR Code
- Hostel Entry & Exit Tracking
- Receive Notifications

---

## 👨‍👩‍👧 Parent Module

- View Student Details
- Approve/Reject Leave Requests
- Track Student Leave Status
- Receive Notifications

---

## 🛡 Warden Module

- Manage Leave Requests
- Approve/Reject Applications
- Monitor Hostel Records
- View Student Information
- Notification Management

---


## 📍 Geofencing

- Location-based hostel verification
- Secure campus boundary detection
- Prevent unauthorized check-ins

---

## 🔔 Notification System

- Leave Status Updates
- Parent Notifications
- Warden Notifications
- Student Alerts

---

## 📷 QR Code Authentication

- Dynamic QR Code Generation
- Secure Hostel Verification
- Fast Student Check-In/Check-Out

---

# 🏗 System Architecture

```
                    Mobile App (React Native + Expo)
                              │
                              │
               ┌──────────────┴──────────────┐
               │                             │
         Authentication API          Notification Service
               │                             │
               └──────────────┬──────────────┘
                              │
                        PHP Backend APIs
                              │
                              │
                         MySQL Database
                              │
                         AWS Cloud Server
```

---

# 🛠 Tech Stack

## Mobile App

- React Native
- Expo
- TypeScript

## Backend

- PHP
- REST API

## Database

- MySQL

## Cloud

- AWS Cloud

## Tools

- XAMPP
- phpMyAdmin
- Android Studio
- Expo CLI

---

# 📂 Project Structure

```
HANS/
│
├── frontend/
│   ├── app/
│   ├── assets/
│   ├── components/
│   ├── config/
│   ├── constants/
│   ├── hooks/
│   ├── services/
│   ├── translations/
│   ├── utils/
│   ├── package.json
│   ├── app.json
│   └── eas.json
│
├── backend/
│   ├── api/
│   ├── assets/
│   ├── config/
│   ├── helpers/
│   ├── config.php
│   └── package.json
│
├── screenshots/
│
├── README.md
└── LICENSE
```

---



# 🚀 Getting Started

## Prerequisites

- Node.js
- Expo CLI
- PHP
- MySQL
- XAMPP
- Android Studio (optional)

---

## Clone Repository

```bash
git clone https://github.com/yourusername/HANS.git
```

---

## Install Frontend Dependencies

```bash
cd frontend
npm install
```

---

## Start Expo

```bash
npx expo start
```

---

## Backend Setup

1. Copy the backend folder into your PHP server directory (e.g., XAMPP `htdocs`) or configure it on your preferred web server.
2. Update the backend configuration with your own MySQL database credentials.
3. Start Apache and MySQL.

---

# 🔒 Database

The production database is securely hosted on AWS and is **not included** in this repository.

To run the project locally:

- Create your own MySQL database.
- Configure the database connection in the backend.
- Import your own schema if required.

---

# 🔐 Security

Sensitive information such as:

- Database credentials
- AWS configuration
- API keys
- Environment variables

has been excluded from this repository.

---

# 🚀 Future Enhancements

- Face Recognition Authentication
- Push Notifications
- AI-based Leave Approval Assistant
- Hostel Attendance Analytics
- Visitor Management
- Admin Dashboard

---

# 🎯 Project Highlights

- 📱 Cross-platform Mobile Application
- 🔐 Secure Authentication System
- ☁ AWS Cloud Deployment
- 📷 QR Code-Based Verification
- 📍 Geofencing Support
- 🔔 Real-Time Notifications
- 👥 Multi-Role User Management
- 🌐 RESTful API Integration

---

# 👩‍💻 Developers

**Muskan Dewangan**
**Anamika**
**Ritesh Kumar Nayak**
**Kashifa Fatima**
**Sejal Choudhari**
**Tantresh Kumar Sahu**
**Abhineet Shrivastava**
**Rajat Kumar Verma**

B.Tech – Computer Science Engineering (AI/ML)

### Interests

- Artificial Intelligence
- Machine Learning
- Deep Learning
- Full-Stack Development
- Cloud Computing
- Mobile Application Development

---

# 🤝 Contributing

Contributions, suggestions, and feature requests are welcome.

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Open a Pull Request

---

# 📄 License

This project is licensed under the MIT License.

---

# ⭐ Support

If you found this project helpful, consider giving it a ⭐ on GitHub!