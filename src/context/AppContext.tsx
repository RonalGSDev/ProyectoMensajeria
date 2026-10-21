import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Theme = "dark" | "light";
export type Language = "es" | "en" | "zh" | "ru" | "hi";
export type BackgroundConfig = { type: "color" | "image"; value: string } | null;

interface AppContextType {
  theme: Theme;
  toggleTheme: () => void;
  language: Language;
  toggleLanguage: (lang?: Language) => void;
  colors: typeof darkColors;
  chatBackground: BackgroundConfig;
  setChatBackground: (bg: BackgroundConfig) => Promise<void>;
  t: (key: string) => string;
}

const darkColors = {
  bg: "#121212",
  card: "#1C1C1E",
  text: "#FFFFFF",
  subText: "#888888",
  border: "#2A2A2A",
  primary: "#00E5FF",
  header: "#181818",
  inputBg: "#1E1E1E",
};

const lightColors = {
  bg: "#F2F2F7",
  card: "#FFFFFF",
  text: "#000000",
  subText: "#666666",
  border: "#E5E5EA",
  primary: "#007AFF",
  header: "#FFFFFF",
  inputBg: "#EFEFF4",
};

const translations: Record<Language, Record<string, string>> = {
  es: {
    chats: "Chats",
    contacts: "Contactos",
    settings: "Ajustes",
    search_user: "Nombre de usuario a buscar...",
    search_nickname: "Apodo o correo",
    no_users: "No hay usuarios registrados",
    language: "Idioma",
    selected_label: "Seleccionado",
    theme: "Tema de fondo",
    theme_dark: "Oscuro",
    theme_light: "Claro",
    customization: "Personalización",
    chat_bg: "Fondo de los chats",
    delete_account: "Eliminar cuenta",
    logout: "Cerrar sesión",
    solid_colors: "Colores sólidos",
    choose_gallery: "Elegir imagen de galería",
    reset_bg: "Restablecer fondo original",
    type_message: "Escribe un mensaje...",
    online: "En línea",
    last_seen_today: "Últ. vez hoy a las",
    last_seen_date: "Últ. vez el",
    view_contact: "Ver contacto",
    clear_chat: "Vaciar chat",
    today: "HOY",
    yesterday: "AYER",
  },
  en: {
    chats: "Chats",
    contacts: "Contacts",
    settings: "Settings",
    search_user: "Search username...",
    search_nickname: "Nickname or email",
    no_users: "No registered users",
    language: "Language",
    selected_label: "Selected",
    theme: "App Theme",
    theme_dark: "Dark",
    theme_light: "Light",
    customization: "Customization",
    chat_bg: "Chat Background",
    delete_account: "Delete account",
    logout: "Log out",
    solid_colors: "Solid colors",
    choose_gallery: "Choose image from gallery",
    reset_bg: "Reset original background",
    type_message: "Type a message...",
    online: "Online",
    last_seen_today: "Last seen today at",
    last_seen_date: "Last seen on",
    view_contact: "View contact",
    clear_chat: "Clear chat",
    today: "TODAY",
    yesterday: "YESTERDAY",
  },
  zh: {
    chats: "聊天",
    contacts: "联系人",
    settings: "设置",
    search_user: "搜索用户名...",
    search_nickname: "昵称或邮箱",
    no_users: "未找到用户",
    language: "语言",
    selected_label: "已选择",
    theme: "主题",
    theme_dark: "深色",
    theme_light: "浅色",
    customization: "个性化",
    chat_bg: "聊天背景",
    delete_account: "删除账户",
    logout: "退出登录",
    solid_colors: "纯色",
    choose_gallery: "从相册选择图片",
    reset_bg: "恢复默认背景",
    type_message: "输入消息...",
    online: "在线",
    last_seen_today: "今天上次在线",
    last_seen_date: "上次在线",
    view_contact: "查看联系人",
    clear_chat: "清空聊天记录",
    today: "今天",
    yesterday: "昨天",
  },
  ru: {
    chats: "Чаты",
    contacts: "Контакты",
    settings: "Настройки",
    search_user: "Поиск по имени пользователя...",
    search_nickname: "Псевдоним или email",
    no_users: "Зарегистрированных пользователей нет",
    language: "Язык",
    selected_label: "Выбрано",
    theme: "Тема оформления",
    theme_dark: "Тёмная",
    theme_light: "Светлая",
    customization: "Персонализация",
    chat_bg: "Фон чатов",
    delete_account: "Удалить аккаунт",
    logout: "Выйти",
    solid_colors: "Сплошные цвета",
    choose_gallery: "Выбрать из галереи",
    reset_bg: "Сбросить фон",
    type_message: "Введите сообщение...",
    online: "В сети",
    last_seen_today: "Был(а) сегодня в",
    last_seen_date: "Был(а) в сети",
    view_contact: "Просмотреть контакт",
    clear_chat: "Очистить чат",
    today: "СЕГОДНЯ",
    yesterday: "ВЧЕРА",
  },
  hi: {
    chats: "चैट",
    contacts: "संपर्क",
    settings: "सेटिंग्स",
    search_user: "उपयोगकर्ता नाम खोजें...",
    search_nickname: "उपनाम या ईमेल",
    no_users: "कोई पंजीकृत उपयोगकर्ता नहीं",
    language: "भाषा",
    selected_label: "चयनित",
    theme: "थीम",
    theme_dark: "डार्क",
    theme_light: "लाइट",
    customization: "निजीकरण",
    chat_bg: "चैट बैकग्राउंड",
    delete_account: "खाताएं",
    logout: "लॉग आउट",
    solid_colors: "ठोस रंग",
    choose_gallery: "गैलरी से छवि चुनें",
    reset_bg: "मूल बैकग्राउंड रीसेट करें",
    type_message: "एक संदेश टाइप करें...",
    online: "ऑनलाइन",
    last_seen_today: "अंतिम बार देखा आज",
    last_seen_date: "अंतिम बार देखा",
    view_contact: "संपर्क देखें",
    clear_chat: "चैट साफ करें",
    today: "आज",
    yesterday: "कल",
  },
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>("dark");
  const [language, setLanguage] = useState<Language>("es");
  const [chatBackground, setChatBackgroundState] = useState<BackgroundConfig>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedBg = await AsyncStorage.getItem("chat_background");
        if (savedBg) setChatBackgroundState(JSON.parse(savedBg));

        const savedLang = await AsyncStorage.getItem("app_language");
        if (savedLang) setLanguage(savedLang as Language);
      } catch (error) {
        console.error("Error al cargar configuración:", error);
      }
    };
    loadSettings();
  }, []);

  const setChatBackground = async (bg: BackgroundConfig) => {
    try {
      setChatBackgroundState(bg);
      if (bg) {
        await AsyncStorage.setItem("chat_background", JSON.stringify(bg));
      } else {
        await AsyncStorage.removeItem("chat_background");
      }
    } catch (error) {
      console.error("Error al guardar el fondo:", error);
    }
  };

  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  const toggleLanguage = async (lang?: Language) => {
    const newLang = lang || (language === "es" ? "en" : "es");
    setLanguage(newLang);
    try {
      await AsyncStorage.setItem("app_language", newLang);
    } catch (e) {
      console.error("Error guardando idioma:", e);
    }
  };

  const colors = theme === "dark" ? darkColors : lightColors;
  const t = (key: string) => translations[language]?.[key] || translations["es"]?.[key] || key;

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        language,
        toggleLanguage,
        colors,
        chatBackground,
        setChatBackground,
        t,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp debe usarse dentro de un AppProvider");
  return context;
};