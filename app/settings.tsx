import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../src/services/firebase";
import { useApp } from "../src/context/AppContext";

export default function SettingsScreen() {
  const { colors, theme, toggleTheme, language, toggleLanguage, t } = useApp();
  const currentUser = auth.currentUser;

  const [profile, setProfile] = useState<{ displayName?: string; email?: string; photoURL?: string }>({
    displayName: currentUser?.displayName || "",
    email: currentUser?.email || "",
    photoURL: currentUser?.photoURL || "",
  });
  const [imageError, setImageError] = useState(false);

  // Estados para controlar los Modales de selección
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);

  // Escuchar perfil desde Firestore en tiempo real
  useEffect(() => {
    if (!currentUser) return;

    const userRef = doc(db, "users", currentUser.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfile({
          displayName: data.displayName || currentUser.displayName || "Usuario",
          email: data.email || currentUser.email || "—",
          photoURL: data.photoURL || currentUser.photoURL || "",
        });
        setImageError(false);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleLogout = async () => {
    await signOut(auth);
  };

  const nameToShow = profile.displayName || "Usuario";
  const hasPhoto = profile.photoURL && profile.photoURL.trim() !== "" && !imageError;

  const handleSelectTheme = (selectedTheme: "dark" | "light") => {
    if (theme !== selectedTheme) {
      toggleTheme();
    }
    setThemeModalVisible(false);
  };

  const handleSelectLanguage = (selectedLang: "es" | "en") => {
    if (language !== selectedLang) {
      toggleLanguage();
    }
    setLangModalVisible(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Tarjeta de Perfil */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.avatarContainer}>
          {hasPhoto ? (
            <Image
              source={{ uri: profile.photoURL }}
              style={styles.avatar}
              onError={() => setImageError(true)}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarLetter}>{nameToShow.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.userName, { color: colors.text }]}>{nameToShow}</Text>
          <Text style={[styles.userSub, { color: colors.subText }]}>{profile.email}</Text>
        </View>
        <Ionicons name="qr-code-outline" size={24} color={colors.text} />
      </View>

      {/* Cambiar Idioma */}
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => setLangModalVisible(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="globe-outline" size={24} color={colors.text} style={styles.icon} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.optionTitle, { color: colors.text }]}>{t("language")}</Text>
          <Text style={[styles.optionSub, { color: colors.subText }]}>
            {language === "es" ? "Español (Seleccionado)" : "English (Selected)"}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Cambiar Tema */}
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => setThemeModalVisible(true)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={theme === "dark" ? "moon-outline" : "sunny-outline"}
          size={24}
          color={colors.text}
          style={styles.icon}
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.optionTitle, { color: colors.text }]}>Tema de fondo</Text>
          <Text style={[styles.optionSub, { color: colors.subText }]}>
            {theme === "dark" ? "Oscuro (Seleccionado)" : "Claro (Seleccionado)"}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Eliminar Cuenta */}
      <TouchableOpacity style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="person-remove-outline" size={24} color={colors.primary} style={styles.icon} />
        <Text style={[styles.optionTitle, { color: colors.text }]}>{t("delete_account")}</Text>
      </TouchableOpacity>

      {/* Cerrar Sesión */}
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={handleLogout}
        activeOpacity={0.7}
      >
        <Ionicons name="log-out-outline" size={24} color="#FF3B30" style={styles.icon} />
        <Text style={[styles.optionTitle, { color: "#FF3B30" }]}>{t("logout")}</Text>
      </TouchableOpacity>

      {/* MODAL DE SELECCIÓN DE TEMA */}
      <Modal
        visible={themeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setThemeModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setThemeModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.modalOption, styles.borderBottom, { borderColor: colors.border }]}
                  onPress={() => handleSelectTheme("dark")}
                >
                  <Text style={[styles.modalOptionText, { color: colors.text }]}>Oscuro</Text>
                  {theme === "dark" && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => handleSelectTheme("light")}
                >
                  <Text style={[styles.modalOptionText, { color: colors.text }]}>Claro</Text>
                  {theme === "light" && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* MODAL DE SELECCIÓN DE IDIOMA */}
      <Modal
        visible={langModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLangModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setLangModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.modalOption, styles.borderBottom, { borderColor: colors.border }]}
                  onPress={() => handleSelectLanguage("es")}
                >
                  <Text style={[styles.modalOptionText, { color: colors.text }]}>Español</Text>
                  {language === "es" && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => handleSelectLanguage("en")}
                >
                  <Text style={[styles.modalOptionText, { color: colors.text }]}>English</Text>
                  {language === "en" && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 40 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  avatarContainer: { marginRight: 15 },
  avatar: { width: 55, height: 55, borderRadius: 27.5 },
  avatarPlaceholder: { justifyContent: "center", alignItems: "center" },
  avatarLetter: { fontSize: 24, fontWeight: "bold", color: "#000" },
  profileInfo: { flex: 1 },
  userName: { fontSize: 18, fontWeight: "bold" },
  userSub: { fontSize: 13, marginTop: 2 },
  icon: { marginRight: 15 },
  optionTitle: { fontSize: 16, fontWeight: "600" },
  optionSub: { fontSize: 13, marginTop: 2 },

  /* Estilos del Modal emergente */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  modalCard: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  borderBottom: {
    borderBottomWidth: 0.5,
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: "500",
  },
});