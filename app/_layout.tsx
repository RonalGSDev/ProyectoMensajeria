import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useEffect, useState } from "react";
import { Tabs, useRouter, useSegments } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, updateDoc, serverTimestamp, collection, query, where, onSnapshot } from "firebase/firestore";
import { AppState, View, ActivityIndicator, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { auth, db } from "../src/services/firebase";
import { AppProvider, useApp } from "../src/context/AppContext";

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

function RootLayoutNav() {
  const { colors } = useApp();
  const insets = useSafeAreaInsets();
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

  // Configuración de Notificaciones (Permisos, Canales y Clic)
  useEffect(() => {
    if (Platform.OS === "web") return;

    const setupNotifications = async () => {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "Mensajes",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#25D366",
            sound: "default",
          });
        }
      } catch (err) {
        console.log("Error configurando canal de notificaciones:", err);
      }
    };

    setupNotifications();

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data && data.chatId) {
        router.push({ pathname: "/chat", params: { chatId: String(data.chatId) } });
      }
    });

    return () => {
      responseSubscription.remove();
    };
  }, []);

  // Listener para disparar notificación local cuando llega un mensaje de otro usuario
  useEffect(() => {
    if (!user || Platform.OS === "web") return;

    let isFirstLoad = true;
    const chatsQuery = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
      if (isFirstLoad) {
        isFirstLoad = false;
        return;
      }

      snapshot.docChanges().forEach(async (change) => {
        if (change.type === "modified" || change.type === "added") {
          const data = change.doc.data();
          // Si el mensaje fue enviado por otra persona
          if (data.lastSenderId && data.lastSenderId !== user.uid) {
            const senderName = data.lastSenderName || "Nuevo mensaje";
            const messageBody = data.lastMessage || "Te ha enviado un mensaje";

            try {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: senderName,
                  body: messageBody,
                  data: { chatId: change.doc.id },
                  sound: "default",
                },
                trigger: null,
              });
            } catch (err) {
              console.log("Error al mostrar notificación local:", err);
            }
          }
        }
      });
    }, (err) => {
      console.log("Error en listener de notificaciones:", err);
    });

    return () => unsubscribe();
  }, [user]);

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
          height: 56 + Math.max(insets.bottom, 8),
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 6,
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
      
      {/* Oculta la barra de pestañas al estar dentro de un chat */}
      <Tabs.Screen 
        name="chat" 
        options={{ 
          href: null, 
          tabBarStyle: { display: "none" } 
        }} 
      />
      
      <Tabs.Screen name="login" options={{ href: null, tabBarStyle: { display: "none" } }} />
    </Tabs>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <RootLayoutNav />
      </AppProvider>
    </SafeAreaProvider>
  );
}
