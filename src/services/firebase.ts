import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyASkzfkth_8uD8PDCrsa_JSNl4QW3O5wQw",
  authDomain: "proyectochats-7fb31.firebaseapp.com",
  projectId: "proyectochats-7fb31",
  storageBucket: "proyectochats-7fb31.firebasestorage.app",
  messagingSenderId: "1002368423461",
  appId: "1:1002368423461:web:c73e3dcda1e959569a91cc"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);