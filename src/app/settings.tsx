import { useAppContext } from "../global/global";

import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
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

//Lista de traducciones para la pantalla de configuración
const TRANSLATIONS = {
  es: {
    langName: "Español",
    profile: "Nombre/Alias",
    lang: "Idioma",
    theme: "Tema de fondo",
    del: "Eliminar cuenta",
    logout: "Cerrar sesión",
    dark: "Oscuro",
    light: "Claro",
    selected: "Seleccionado",
  },
  en: {
    langName: "English",
    profile: "Name/Alias",
    lang: "Language",
    theme: "Background Theme",
    del: "Delete account",
    logout: "Log out",
    dark: "Dark",
    light: "Light",
    selected: "Selected",
  },
  zh: {
    langName: "中文 (Mandarín)",
    profile: "姓名/昵称",
    lang: "语言",
    theme: "背景主题",
    del: "删除帐户",
    logout: "登出",
    dark: "暗",
    light: "亮",
    selected: "已选",
  },
  ru: {
    langName: "Русский (Ruso)",
    profile: "Имя/Псевдоним",
    lang: "Язык",
    theme: "Тема фона",
    del: "Удалить аккаунт",
    logout: "Выйти",
    dark: "Темный",
    light: "Светлый",
    selected: "Выбранный",
  },
  hi: {
    langName: "हिन्दी (Hindi)",
    profile: "नाम/उपनाम",
    lang: "भाषा",
    theme: "पृष्ठभूमि विषय",
    del: "खाता हटाएं",
    logout: "लॉग आउट",
    dark: "अंधेरा",
    light: "रोशनी",
    selected: "चयनित",
  },
};

type LangKey = keyof typeof TRANSLATIONS;
type ThemeKey = "dark" | "light";

export default function SettingsScreen() {
  const { theme, setTheme, lang, setLang } = useAppContext();

  const [isThemeModalOpen, setThemeModalOpen] = useState(false);
  const [isLangModalOpen, setLangModalOpen] = useState(false);

  const t = TRANSLATIONS[lang];
  const isDark = theme === "dark";
  const currentStyles = getStyles(isDark);

  return (
    <SafeAreaView style={currentStyles.safeArea}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <ScrollView contentContainerStyle={currentStyles.container}>
        <View style={currentStyles.profileCard}>
          <View style={currentStyles.profileInfo}>
            <Image source={{ uri: "" }} style={currentStyles.avatar} />
            <View>
              <Text style={currentStyles.profileName}>{t.profile}</Text>
              <Text style={currentStyles.profileEmail}>usuario@correo.com</Text>
            </View>
          </View>
          <TouchableOpacity style={currentStyles.qrButton}>
            <Ionicons
              name="qr-code-outline"
              size={32}
              color={isDark ? "#A0A0A0" : "#555"}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={currentStyles.settingCard}
          onPress={() => setLangModalOpen(true)}
        >
          <Ionicons
            name="globe-outline"
            size={28}
            color={isDark ? "#FFF" : "#000"}
            style={currentStyles.settingIcon}
          />
          <View style={currentStyles.settingTextContainer}>
            <Text style={currentStyles.settingTitle}>{t.lang}</Text>
            <Text style={currentStyles.settingSubtitle}>
              {t.langName} ({t.selected})
            </Text>
          </View>
        </TouchableOpacity>

        {/* AJUSTE DE TEMA */}
        <TouchableOpacity
          style={currentStyles.settingCard}
          onPress={() => setThemeModalOpen(true)}
        >
          <Ionicons
            name={isDark ? "moon-outline" : "sunny-outline"}
            size={28}
            color={isDark ? "#FFF" : "#000"}
            style={currentStyles.settingIcon}
          />
          <View style={currentStyles.settingTextContainer}>
            <Text style={currentStyles.settingTitle}>{t.theme}</Text>
            <Text style={currentStyles.settingSubtitle}>
              {isDark ? t.dark : t.light} ({t.selected})
            </Text>
          </View>
        </TouchableOpacity>

        {/* SECCIÓN DE CUENTA */}
        <View style={currentStyles.accountSection}>
          <TouchableOpacity style={currentStyles.settingCard}>
            <Ionicons
              name="person-remove"
              size={28}
              color="#00E5FF"
              style={currentStyles.settingIcon}
            />
            <View style={currentStyles.settingTextContainer}>
              <Text style={currentStyles.settingTitle}>{t.del}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={currentStyles.settingCard}>
            <Ionicons
              name="log-out-outline"
              size={28}
              color={isDark ? "#FFF" : "#000"}
              style={currentStyles.settingIcon}
            />
            <View style={currentStyles.settingTextContainer}>
              <Text style={currentStyles.settingTitle}>{t.logout}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={isLangModalOpen} transparent={true} animationType="fade">
        <TouchableOpacity
          style={currentStyles.modalOverlay}
          activeOpacity={1}
          onPress={() => setLangModalOpen(false)}
        >
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
                <Text style={currentStyles.modalOptionText}>
                  {TRANSLATIONS[key].langName}
                </Text>
                {lang === key && (
                  <Ionicons name="checkmark" size={24} color="#00E5FF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={isThemeModalOpen} transparent={true} animationType="fade">
        <TouchableOpacity
          style={currentStyles.modalOverlay}
          activeOpacity={1}
          onPress={() => setThemeModalOpen(false)}
        >
          <View style={currentStyles.modalContent}>
            <TouchableOpacity
              style={currentStyles.modalOption}
              onPress={() => {
                setTheme("dark");
                setThemeModalOpen(false);
              }}
            >
              <Text style={currentStyles.modalOptionText}>{t.dark}</Text>
              {theme === "dark" && (
                <Ionicons name="checkmark" size={24} color="#00E5FF" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={currentStyles.modalOption}
              onPress={() => {
                setTheme("light");
                setThemeModalOpen(false);
              }}
            >
              <Text style={currentStyles.modalOptionText}>{t.light}</Text>
              {theme === "light" && (
                <Ionicons name="checkmark" size={24} color="#00E5FF" />
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// Estilos dinámicos según el tema
const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: isDark ? "#121212" : "#F5F5F5",
    },
    container: {
      padding: 20,
      paddingTop: 40,
    },
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
    avatar: {
      width: 60,
      height: 60,
      borderRadius: 30,
      marginRight: 15,
      backgroundColor: "#333",
    },
    profileName: {
      color: isDark ? "#FFF" : "#000",
      fontSize: 18,
      fontWeight: "bold",
      marginBottom: 4,
    },
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
    settingTitle: {
      color: isDark ? "#FFF" : "#000",
      fontSize: 16,
      fontWeight: "500",
    },
    settingSubtitle: {
      color: isDark ? "#A0A0A0" : "#666",
      fontSize: 13,
      marginTop: 4,
    },
    accountSection: { marginTop: 20 },

    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
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
    modalOptionText: {
      color: isDark ? "#FFF" : "#000",
      fontSize: 16,
    },
  });
