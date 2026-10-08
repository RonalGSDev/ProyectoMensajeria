import React, { useEffect, useState } from "react";
import { Tabs, useRouter, useSegments } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { AppState, View, ActivityIndicator, Platform } from "react-native";
import { auth, db } from "../src/services/firebase";
import { AppProvider, useApp } from "../src/context/AppContext";

function RootLayoutNav() {
  const { colors } = useApp();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  // Escuchar estado de autenticación
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Controlar redirección según autenticación
  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === "login";

    if (!user && !inAuthGroup) {
      router.replace("/login");
    } else if (user && inAuthGroup) {
      router.replace("/");
    }
  }, [user, loading, segments]);

  // Manejar presencia en Firestore (Móvil + Web)
  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);

    const setPresence = async (isOnline: boolean) => {
      try {
        await updateDoc(userRef, {
          isOnline,
          lastSeen: serverTimestamp(),
        });
      } catch (error) {
        console.log("Error actualizando presencia:", error);
      }
    };

    // Marcar como 'En línea' al ingresar
    setPresence(true);

    // 1. Manejo en Aplicación Móvil (React Native)
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        setPresence(true);
      } else {
        setPresence(false);
      }
    });

    // 2. Manejo en Web (Cambio de pestaña / Cierre de navegador)
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const handleVisibilityChange = () => {
        if (document.visibilityState === "hidden") {
          setPresence(false);
        } else if (document.visibilityState === "visible") {
          setPresence(true);
        }
      };

      // Al cerrar pestaña/navegador en web
      const handleUnload = () => {
        setPresence(false);
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("pagehide", handleUnload);
      window.addEventListener("beforeunload", handleUnload);

      return () => {
        setPresence(false);
        subscription.remove();
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("pagehide", handleUnload);
        window.removeEventListener("beforeunload", handleUnload);
      };
    }

    return () => {
      setPresence(false);
      subscription.remove();
    };
  }, [user]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.header,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.subText,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "chatbubble" : "chatbubble-outline"} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "people" : "people-outline"} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "settings" : "settings-outline"} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="login" options={{ href: null, tabBarStyle: { display: "none" } }} />
    </Tabs>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <RootLayoutNav />
    </AppProvider>
  );
}