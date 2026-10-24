import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import { auth, googleProvider, db, setCachedOfflineUser } from "../src/services/firebase";
import { useApp } from "../src/context/AppContext";
import { useRouter } from "expo-router";

const GOOGLE_CLIENT_ID =
  "1002368423461-ude2kfft3rbi06177r9kd9h8kfbsqj5n.apps.googleusercontent.com";

if (Platform.OS !== "web") {
  GoogleSignin.configure({
    webClientId: GOOGLE_CLIENT_ID,
  });
}

export default function LoginScreen() {
  const { colors, t } = useApp();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCredentialLogin = async (idToken: string) => {
    setLoading(true);
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const res = await signInWithCredential(auth, credential);
      const user = res.user;

      if (user) {
        await setDoc(
          doc(db, "users", user.uid),
          {
            uid: user.uid,
            displayName: user.displayName || user.email,
            email: user.email,
            photoURL: user.photoURL || "",
          },
          { merge: true }
        );
        await setCachedOfflineUser(user);
        router.replace("/");
      }
    } catch (err: any) {
      console.error("Error al autenticar credencial:", err);
      Alert.alert("Error de inicio de sesión", err.message || "Error al conectar con Firebase.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      if (Platform.OS === "web") {
        const res = await signInWithPopup(auth, googleProvider);
        const user = res.user;

        if (user) {
          await setDoc(
            doc(db, "users", user.uid),
            {
              uid: user.uid,
              displayName: user.displayName || user.email,
              email: user.email,
              photoURL: user.photoURL || "",
            },
            { merge: true }
          );
          router.replace("/");
        }
      } else {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        try { await GoogleSignin.signOut(); } catch {}
        const signInResult = await GoogleSignin.signIn();
        if (signInResult.type === "success") {
          const idToken = signInResult.data.idToken;
          if (idToken) {
            await handleCredentialLogin(idToken);
          } else {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      }
    } catch (err: any) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        // Cancelado por el usuario
      } else if (err.code === statusCodes.IN_PROGRESS) {
        // En progreso
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert("Error", "Los servicios de Google Play no están disponibles o deben actualizarse.");
      } else {
        console.error("Error al iniciar sesión con Google:", err);
        Alert.alert("Error de inicio de sesión", err.message || "Error al iniciar sesión con Google.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="chatbubbles" size={60} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>{t("welcome")}</Text>
        <Text style={[styles.subtitle, { color: colors.subText }]}>{t("login_subtitle")}</Text>

        <TouchableOpacity
          style={[styles.loginBtn, { backgroundColor: colors.primary }]}
          onPress={handleGoogleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="logo-google" size={24} color="#FFF" style={styles.googleIcon} />
              <Text style={styles.loginBtnText}>{t("login_google")}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { width: "85%", alignItems: "center" },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: { fontSize: 26, fontWeight: "bold", marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 15, marginBottom: 32, textAlign: "center" },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: 52,
    borderRadius: 26,
  },
  googleIcon: { marginRight: 12 },
  loginBtnText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
});
