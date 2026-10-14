import { useAppContext, TRANSLATIONS, LangKey } from "../global/global";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import {
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const CHAT_BG_COLORS = ["#121212", "#1E1E1E", "#0f172a", "#1e3a8a", "#064e3b", "#4c1d95", "#7f1d1d"];

export default function SettingsScreen() {
  // Ahora extraemos "t" directamente del contexto global
  const { theme, setTheme, lang, setLang, setChatBackground, t } = useAppContext();

  const [isThemeModalOpen, setThemeModalOpen] = useState(false);
  const [isLangModalOpen, setLangModalOpen] = useState(false);
  const [isCustomModalOpen, setCustomModalOpen] = useState(false);

  const isDark = theme === "dark";
  const currentStyles = getStyles(isDark);

  const handleSelectBgColor = (color: string | null) => {
    setChatBackground(color);
    setCustomModalOpen(false);
  };

  const handlePickBgImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], // Nota: En versiones nuevas de Expo, ['images'] evita warnings de deprecación
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setChatBackground(result.assets[0].uri);
      setCustomModalOpen(false);
    }
  };

  return (
    <SafeAreaView style={currentStyles.safeArea}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <ScrollView contentContainerStyle={currentStyles.container}>
        {/* PERFIL */}
        <View style={currentStyles.profileCard}>
          <View style={currentStyles.profileInfo}>
            <Image source={{ uri: "" }} style={currentStyles.avatar} />
            <View>
              <Text style={currentStyles.profileName}>{t.profile}</Text>
              <Text style={currentStyles.profileEmail}>usuario@correo.com</Text>
            </View>
          </View>
          <TouchableOpacity style={currentStyles.qrButton}>
            <Ionicons name="qr-code-outline" size={32} color={isDark ? "#A0A0A0" : "#555"} />
          </TouchableOpacity>
        </View>

        {/* AJUSTE DE IDIOMA */}
        <TouchableOpacity style={currentStyles.settingCard} onPress={() => setLangModalOpen(true)}>
          <Ionicons name="globe-outline" size={28} color={isDark ? "#FFF" : "#000"} style={currentStyles.settingIcon} />
          <View style={currentStyles.settingTextContainer}>
            <Text style={currentStyles.settingTitle}>{t.lang}</Text>
            <Text style={currentStyles.settingSubtitle}>
              {t.langName} ({t.selected})
            </Text>
          </View>
        </TouchableOpacity>

        {/* AJUSTE DE TEMA */}
        <TouchableOpacity style={currentStyles.settingCard} onPress={() => setThemeModalOpen(true)}>
          <Ionicons name={isDark ? "moon-outline" : "sunny-outline"} size={28} color={isDark ? "#FFF" : "#000"} style={currentStyles.settingIcon} />
          <View style={currentStyles.settingTextContainer}>
            <Text style={currentStyles.settingTitle}>{t.theme}</Text>
            <Text style={currentStyles.settingSubtitle}>
              {isDark ? t.dark : t.light} ({t.selected})
            </Text>
          </View>
        </TouchableOpacity>

        {/* PERSONALIZACIÓN */}
        <TouchableOpacity style={currentStyles.settingCard} onPress={() => setCustomModalOpen(true)}>
          <Ionicons name="color-palette-outline" size={28} color="#00E5FF" style={currentStyles.settingIcon} />
          <View style={currentStyles.settingTextContainer}>
            <Text style={currentStyles.settingTitle}>{t.customization}</Text>
            <Text style={currentStyles.settingSubtitle}>{t.chatBg}</Text>
          </View>
        </TouchableOpacity>

        {/* SECCIÓN DE CUENTA */}
        <View style={currentStyles.accountSection}>
          <TouchableOpacity style={currentStyles.settingCard}>
            <Ionicons name="log-out-outline" size={28} color="#FF4444" style={currentStyles.settingIcon} />
            <View style={currentStyles.settingTextContainer}>
              <Text style={[currentStyles.settingTitle, { color: "#FF4444" }]}>{t.logout}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* MODAL DE IDIOMA */}
      <Modal visible={isLangModalOpen} transparent animationType="fade">
        <TouchableOpacity style={currentStyles.modalOverlay} activeOpacity={1} onPress={() => setLangModalOpen(false)}>
          <View style={currentStyles.modalContent}>
            {(Object.keys(TRANSLATIONS) as LangKey[]).map((key) => (
              <TouchableOpacity
                key={key}
                style={currentStyles.modalOption}
                onPress={() => {
                  setLang(key);
                  setLangModalOpen(false);
                }}
              >
                <Text style={currentStyles.modalOptionText}>{TRANSLATIONS[key].langName}</Text>
                {lang === key && <Ionicons name="checkmark" size={24} color="#00E5FF" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL DE TEMA */}
      <Modal visible={isThemeModalOpen} transparent animationType="fade">
        <TouchableOpacity style={currentStyles.modalOverlay} activeOpacity={1} onPress={() => setThemeModalOpen(false)}>
          <View style={currentStyles.modalContent}>
            <TouchableOpacity
              style={currentStyles.modalOption}
              onPress={() => {
                setTheme("dark");
                setThemeModalOpen(false);
              }}
            >
              <Text style={currentStyles.modalOptionText}>{t.dark}</Text>
              {theme === "dark" && <Ionicons name="checkmark" size={24} color="#00E5FF" />}
            </TouchableOpacity>
            <TouchableOpacity
              style={currentStyles.modalOption}
              onPress={() => {
                setTheme("light");
                setThemeModalOpen(false);
              }}
            >
              <Text style={currentStyles.modalOptionText}>{t.light}</Text>
              {theme === "light" && <Ionicons name="checkmark" size={24} color="#00E5FF" />}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL DE PERSONALIZACIÓN */}
      <Modal visible={isCustomModalOpen} transparent animationType="fade">
        <TouchableOpacity style={currentStyles.modalOverlay} activeOpacity={1} onPress={() => setCustomModalOpen(false)}>
          <View style={[currentStyles.modalContent, { paddingVertical: 20 }]}>
            <Text style={currentStyles.customizationTitle}>{t.chatBg}</Text>
            <Text style={currentStyles.customizationSubtitle}>{t.solidColors}</Text>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={currentStyles.colorPalette}>
              {CHAT_BG_COLORS.map((color, index) => (
                <TouchableOpacity
                  key={index}
                  style={[currentStyles.colorCircle, { backgroundColor: color, borderColor: isDark ? "#333" : "#DDD" }]}
                  onPress={() => handleSelectBgColor(color)}
                />
              ))}
            </ScrollView>

            <View style={currentStyles.divider} />

            <TouchableOpacity style={currentStyles.galleryButton} onPress={handlePickBgImage}>
              <Ionicons name="images-outline" size={24} color="#00E5FF" style={{ marginRight: 10 }} />
              <Text style={currentStyles.galleryButtonText}>{t.pickImage}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[currentStyles.galleryButton, { marginTop: 10 }]} onPress={() => handleSelectBgColor(null)}>
              <Ionicons name="trash-outline" size={24} color="#FF4444" style={{ marginRight: 10 }} />
              <Text style={[currentStyles.galleryButtonText, { color: "#FF4444" }]}>{t.resetBg}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: isDark ? "#121212" : "#F5F5F5" },
    container: { padding: 20, paddingTop: 40 },
    profileCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: isDark ? "#1E1E1E" : "#FFFFFF",
      padding: 20,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: isDark ? "#333" : "#DDD",
      marginBottom: 30,
    },
    profileInfo: { flexDirection: "row", alignItems: "center" },
    avatar: { width: 60, height: 60, borderRadius: 30, marginRight: 15, backgroundColor: "#333" },
    profileName: { color: isDark ? "#FFF" : "#000", fontSize: 18, fontWeight: "bold", marginBottom: 4 },
    profileEmail: { color: isDark ? "#A0A0A0" : "#666", fontSize: 14 },
    qrButton: { padding: 5 },
    settingCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark ? "#1E1E1E" : "#FFFFFF",
      padding: 15,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: isDark ? "#333" : "#DDD",
      marginBottom: 15,
    },
    settingIcon: { marginRight: 15, width: 35, textAlign: "center" },
    settingTextContainer: { flex: 1, justifyContent: "center" },
    settingTitle: { color: isDark ? "#FFF" : "#000", fontSize: 16, fontWeight: "500" },
    settingSubtitle: { color: isDark ? "#A0A0A0" : "#666", fontSize: 13, marginTop: 4 },
    accountSection: { marginTop: 20 },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
    modalContent: {
      width: "80%",
      backgroundColor: isDark ? "#1E1E1E" : "#FFFFFF",
      borderRadius: 15,
      padding: 10,
      borderWidth: 1,
      borderColor: isDark ? "#333" : "#DDD",
    },
    modalOption: {
      flexDirection: "row",
      justifyContent: "space-between",
      padding: 15,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? "#333" : "#F0F0F0",
    },
    modalOptionText: { color: isDark ? "#FFF" : "#000", fontSize: 16 },
    customizationTitle: { color: isDark ? "#FFF" : "#000", fontSize: 18, fontWeight: "bold", textAlign: "center", marginBottom: 20 },
    customizationSubtitle: { color: isDark ? "#A0A0A0" : "#666", fontSize: 14, marginLeft: 20, marginBottom: 10 },
    colorPalette: { paddingHorizontal: 20, flexDirection: "row", alignItems: "center" },
    colorCircle: { width: 45, height: 45, borderRadius: 22.5, marginRight: 15, borderWidth: 1 },
    divider: { height: 1, width: "100%", backgroundColor: isDark ? "#333" : "#DDD", marginVertical: 20 },
    galleryButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10 },
    galleryButtonText: { color: "#00E5FF", fontSize: 16, fontWeight: "600" },
  });