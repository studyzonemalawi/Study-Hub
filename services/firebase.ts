import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCooyOsChHkNC7j7GZCqJdQ05Lw1z4MTpY",
  authDomain: "studyhubmalawi2026.firebaseapp.com",
  projectId: "studyhubmalawi2026",
  storageBucket: "studyhubmalawi2026.firebasestorage.app",
  messagingSenderId: "358940824378",
  appId: "1:358940824378:web:bcb9829f73b490cadcf603",
  measurementId: "G-HTXD0FM7LC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, analytics, auth, googleProvider };
