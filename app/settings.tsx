import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { auth, db } from "../src/services/firebase";
import { useApp, Language } from "../src/context/AppContext";

const LANGUAGES: { code: Language; label: string }[] = [
  { code: "es", label: "Español" },
  { code: "en", label: "English" },
  { code: "zh", label: "中文 (Mandarín)" },
  { code: "ru", label: "Русский (Ruso)" },
  { code: "hi", label: "हिन्दी (Hindi)" },
];

const SOLID_COLORS = [
  "#121212",
  "#1E1E1E",
  "#0B141B",
  "#0F2027",
  "#064E3B",
  "#4C1D95",
  "#7F1D1D",
];

export default function SettingsScreen() {
  const { colors, theme, toggleTheme, language, toggleLanguage, setChatBackground, t } = useApp();
  const currentUser = auth.currentUser;

  const [profile, setProfile] = useState<{ displayName?: string; email?: string; photoURL?: string }>({
    displayName: currentUser?.displayName || "",
    email: currentUser?.email || "",
    photoURL: currentUser?.photoURL || "",
  });
  const [imageError, setImageError] = useState(false);

  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [bgModalVisible, setBgModalVisible] = useState(false);

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
    try {
      if (Platform.OS !== "web") {
        await GoogleSignin.signOut();
      }
    } catch (err) {
      console.log("Error al cerrar sesion Google:", err);
    }
    await signOut(auth);
  };

  const nameToShow = profile.displayName || "Usuario";
  const hasPhoto = profile.photoURL && profile.photoURL.trim() !== "" && !imageError;

  const handleSelectTheme = (selectedTheme: "dark" | "light") => {
    if (theme !== selectedTheme) toggleTheme();
    setThemeModalVisible(false);
  };

  const handleSelectLanguage = (langCode: Language) => {
    if (language !== langCode) toggleLanguage(langCode);
    setLangModalVisible(false);
  };

  const handleSelectColor = (color: string) => {
    setChatBackground({ type: "color", value: color });
    setBgModalVisible(false);
  };

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert("Permiso denegado", "Se requiere acceso a la galería para cambiar el fondo.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setChatBackground({ type: "image", value: result.assets[0].uri });
      setBgModalVisible(false);
    }
  };

  const handleResetBackground = () => {
    setChatBackground(null);
    setBgModalVisible(false);
  };

  const currentLangObj = LANGUAGES.find((l) => l.code === language);

  return (
    <SafeAreaView edges={["top"]} style={[styles.container, { backgroundColor: colors.bg }]}>
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
            {`${currentLangObj?.label || "Español"} (${t("selected_label")})`}
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
          <Text style={[styles.optionTitle, { color: colors.text }]}>{t("theme")}</Text>
          <Text style={[styles.optionSub, { color: colors.subText }]}>
            {`${theme === "dark" ? t("theme_dark") : t("theme_light")} (${t("selected_label")})`}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Personalización de Fondo */}
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => setBgModalVisible(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="color-palette-outline" size={24} color={colors.primary} style={styles.icon} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.optionTitle, { color: colors.text }]}>{t("customization")}</Text>
          <Text style={[styles.optionSub, { color: colors.subText }]}>{t("chat_bg")}</Text>
        </View>
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

      {/* MODAL SELECCIÓN TEMA */}
      <Modal visible={themeModalVisible} transparent animationType="fade" onRequestClose={() => setThemeModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setThemeModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TouchableOpacity style={[styles.modalOption, styles.borderBottom, { borderColor: colors.border }]} onPress={() => handleSelectTheme("dark")}>
                  <Text style={[styles.modalOptionText, { color: colors.text }]}>{t("theme_dark")}</Text>
                  {theme === "dark" && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalOption} onPress={() => handleSelectTheme("light")}>
                  <Text style={[styles.modalOptionText, { color: colors.text }]}>{t("theme_light")}</Text>
                  {theme === "light" && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* MODAL SELECCIÓN IDIOMA */}
      <Modal visible={langModalVisible} transparent animationType="fade" onRequestClose={() => setLangModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setLangModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {LANGUAGES.map((langItem, index) => (
                  <TouchableOpacity
                    key={langItem.code}
                    style={[styles.modalOption, index < LANGUAGES.length - 1 && styles.borderBottom, { borderColor: colors.border }]}
                    onPress={() => handleSelectLanguage(langItem.code)}
                  >
                    <Text style={[styles.modalOptionText, { color: colors.text }]}>{langItem.label}</Text>
                    {language === langItem.code && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* MODAL FONDO CHAT */}
      <Modal visible={bgModalVisible} transparent animationType="fade" onRequestClose={() => setBgModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setBgModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border, paddingVertical: 20 }]}>
                <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>{t("chat_bg")}</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.subText }]}>{t("solid_colors")}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorRow}>
                  {SOLID_COLORS.map((c) => (
                    <TouchableOpacity key={c} style={[styles.colorCircle, { backgroundColor: c }]} onPress={() => handleSelectColor(c)} />
                  ))}
                </ScrollView>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <TouchableOpacity style={styles.actionRow} onPress={handlePickImage}>
                  <Ionicons name="images-outline" size={22} color={colors.primary} />
                  <Text style={[styles.actionText, { color: colors.primary }]}>{t("choose_gallery")}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionRow} onPress={handleResetBackground}>
                  <Ionicons name="trash-outline" size={22} color="#FF3B30" />
                  <Text style={[styles.actionText, { color: "#FF3B30" }]}>{t("reset_bg")}</Text>
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
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 40 },
  card: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1 },
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
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.6)", justifyContent: "center", alignItems: "center", paddingHorizontal: 25 },
  modalCard: { width: "100%", borderRadius: 16, borderWidth: 1, overflow: "hidden", elevation: 5 },
  modalHeaderTitle: { fontSize: 18, fontWeight: "bold", textAlign: "center", marginBottom: 15 },
  sectionSubtitle: { fontSize: 13, paddingHorizontal: 20, marginBottom: 10 },
  colorRow: { flexDirection: "row", paddingHorizontal: 20, marginBottom: 15 },
  colorCircle: { width: 38, height: 38, borderRadius: 19, marginRight: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  divider: { height: 0.5, width: "100%", marginVertical: 10 },
  actionRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 20 },
  actionText: { fontSize: 15, fontWeight: "600", marginLeft: 12 },
  modalOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 18, paddingHorizontal: 20 },
  borderBottom: { borderBottomWidth: 0.5 },
  modalOptionText: { fontSize: 16, fontWeight: "500" },
});