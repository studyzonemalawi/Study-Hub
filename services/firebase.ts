import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";

// Your web app's Firebase configuration
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
const auth = getAuth(app);

// Set persistence to local (survives browser restart)
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error("Firebase persistence error:", error);
  });

export { app, auth };