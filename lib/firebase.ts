// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDhj2xBBfH7_-m1QkkiXfcSYjONwTZjZQ4",
    authDomain: "consortium-a214c.firebaseapp.com",
    projectId: "consortium-a214c",
    storageBucket: "consortium-a214c.firebasestorage.app",
    messagingSenderId: "190711086632",
    appId: "1:190711086632:web:ffcab9d8f730aee0c1ff1d",
    measurementId: "G-7PM3GE5K5D"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize services
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Analytics is only supported in the browser
const analytics = typeof window !== "undefined" ? isSupported().then(yes => yes ? getAnalytics(app) : null) : null;

export { app, db, auth, storage, analytics };
