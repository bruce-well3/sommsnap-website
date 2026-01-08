// Firebase Configuration
// Replace with your Firebase project credentials
const firebaseConfig = {
    apiKey: "AIzaSyBeQRN5skU-WyWXdNk8JXUxIhAMF-GJUus",
    authDomain: "brugu-apps.firebaseapp.com",
    projectId: "brugu-apps",
    storageBucket: "brugu-apps.firebasestorage.app",
    messagingSenderId: "991681236530",
    appId: "1:991681236530:web:0f9b57c6e8c1e6e0d3d8b5"
};

// Simple authentication credentials
// IMPORTANT: Change these before deploying!
const AUTH_CONFIG = {
    username: "admin",
    password: "sommsnap2025"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
