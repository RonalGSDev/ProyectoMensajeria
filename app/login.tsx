import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { signInWithPopup } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, googleProvider, db } from "../src/services/firebase";
import { useApp } from "../src/context/AppContext";
import { useRouter } from "expo-router";

export default function LoginScreen() {
  const { colors, t } = useApp();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
  setLoading(true);
  try {
    const res = await signInWithPopup(auth, googleProvider);
    const user = res.user;

    if (user) {
      // Guardamos photoURL de la cuenta de Google
      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          displayName: user.displayName || user.email,
          email: user.email,
          photoURL: user.photoURL || "", // 👈 Aquí se guarda la foto de Google
        },
        { merge: true }
      );
      router.replace("/");
    }
  } catch (err: any) {
    console.error("Error al iniciar sesión:", err);
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