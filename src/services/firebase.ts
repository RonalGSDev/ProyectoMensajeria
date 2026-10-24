import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyASkzfkth_8uD8PDCrsa_JSNl4QW3O5wQw",
  authDomain: "proyectochats-7fb31.firebaseapp.com",
  projectId: "proyectochats-7fb31",
  storageBucket: "proyectochats-7fb31.firebasestorage.app",
  messagingSenderId: "1002368423461",
  appId: "1:1002368423461:web:c73e3dcda1e959569a91cc"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let authInstance: any;
if (Platform.OS === "web") {
  authInstance = getAuth(app);
} else {
  try {
    // @ts-ignore
    const rnAuth = require("@firebase/auth");
    const getReactNativePersistence = rnAuth?.getReactNativePersistence;
    if (getReactNativePersistence) {
      authInstance = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } else {
      authInstance = getAuth(app);
    }
  } catch {
    authInstance = getAuth(app);
  }
}

export const auth = authInstance;
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);

export const getCachedOfflineUser = async () => {
  try {
    const raw = await AsyncStorage.getItem("@offline_auth_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setCachedOfflineUser = async (user: any) => {
  try {
    if (user) {
      await AsyncStorage.setItem(
        "@offline_auth_user",
        JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split("@")[0] || "Usuario",
          photoURL: user.photoURL || "",
        })
      );
    } else {
      await AsyncStorage.removeItem("@offline_auth_user");
    }
  } catch {}
};
