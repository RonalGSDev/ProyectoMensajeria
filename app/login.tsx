import React, { useState, useEffect } from "react";
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
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { auth, googleProvider, db } from "../src/services/firebase";
import { useApp } from "../src/context/AppContext";
import { useRouter } from "expo-router";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID =
  "1002368423461-ude2kfft3rbi06177r9kd9h8kfbsqj5n.apps.googleusercontent.com";

const discovery = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
};

export default function LoginScreen() {
  const { colors, t } = useApp();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: "quetzi",
  });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID,
      scopes: ["openid", "profile", "email"],
      responseType: AuthSession.ResponseType.IdToken,
      redirectUri,
      usePKCE: false,
    },
    discovery
  );

  useEffect(() => {
    if (response?.type === "success") {
      const { id_token } = response.params;
      if (id_token) {
        handleCredentialLogin(id_token);
      } else {
        setLoading(false);
      }
    } else if (response?.type === "error") {
      setLoading(false);
      Alert.alert(
        "Error de autenticación",
        response.error?.message || "No se pudo autenticar con Google."
      );
    } else if (response?.type === "cancel" || response?.type === "dismiss") {
      setLoading(false);
    }
  }, [response]);

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
        if (!request) {
          Alert.alert(
            "Cargando",
            "El servicio de inicio de sesión se está preparando. Intenta en un momento."
          );
          setLoading(false);
          return;
        }
        await promptAsync();
      }
    } catch (err: any) {
      console.error("Error al iniciar sesión:", err);
      Alert.alert("Error de inicio de sesión", err.message || "Error al iniciar sesión con Google.");
    } finally {
      if (Platform.OS === "web") {
        setLoading(false);
      }
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
