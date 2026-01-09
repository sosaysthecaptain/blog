import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBueCOsB9el4gw0kF1TCp-maa2mfeunHxU",
  authDomain: "marcs-blog-6b4e4.firebaseapp.com",
  projectId: "marcs-blog-6b4e4",
  storageBucket: "marcs-blog-6b4e4.firebasestorage.app",
  messagingSenderId: "341793197828",
  appId: "1:341793197828:web:8b49351c34e3f5e5194a51",
  measurementId: "G-5V8Q0659LH",
};

// Initialize Firebase (prevent re-initialization in dev)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
export default app;
