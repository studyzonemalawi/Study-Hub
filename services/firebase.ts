
import { initializeApp } from "firebase/app";
import { getAuth, FacebookAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Your verified Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyA307OYjLK6MH5XRjdpC19FC0mnw-grNGs",
  authDomain: "study-hub-d0338.firebaseapp.com",
  projectId: "study-hub-d0338",
  storageBucket: "study-hub-d0338.firebasestorage.app",
  messagingSenderId: "3054167600",
  appId: "1:3054167600:web:f21f991528b8ba9132eff5",
  measurementId: "G-X5555WDQFR"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const facebookProvider = new FacebookAuthProvider();

// Analytics is optional and only runs in supported environments
if (typeof window !== 'undefined') {
  getAnalytics(app);
}
