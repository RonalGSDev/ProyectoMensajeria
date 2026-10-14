import React, { createContext, useContext, useState } from "react";

export type ThemeKey = "dark" | "light";
export type LangKey = "es" | "en" | "zh" | "ru" | "hi";

// 1. UN SOLO DICCIONARIO PARA TODA LA APP
export const TRANSLATIONS = {
  es: {
    langName: "Español",
    profile: "Nombre/Alias",
    lang: "Idioma",
    theme: "Tema de la app",
    customization: "Personalización",
    chatBg: "Fondo de los chats",
    solidColors: "Colores sólidos",
    pickImage: "Elegir imagen de galería",
    resetBg: "Restablecer fondo original",
    logout: "Cerrar sesión",
    dark: "Oscuro",
    light: "Claro",
    selected: "Seleccionado",
    online: "En línea",
    placeholder: "Escribe un mensaje...",
    contact: "Contacto",
    searchUser: "Nombre de usuario a buscar",
    searchContact: "Apodo o correo",
  },
  en: {
    langName: "English",
    profile: "Name/Alias",
    lang: "Language",
    theme: "App Theme",
    customization: "Customization",
    chatBg: "Chat background",
    solidColors: "Solid colors",
    pickImage: "Pick image from gallery",
    resetBg: "Reset original background",
    logout: "Log out",
    dark: "Dark",
    light: "Light",
    selected: "Selected",
    online: "Online",
    placeholder: "Type a message...",
    contact: "Contact",
    searchUser: "Username to search",
    searchContact: "Nickname or email",
  },
  zh: {
    langName: "中文 (Mandarín)",
    profile: "姓名/昵称",
    lang: "语言",
    theme: "应用主题",
    customization: "个性化",
    chatBg: "聊天背景",
    solidColors: "纯色",
    pickImage: "从图库中选择图片",
    resetBg: "重置原始背景",
    logout: "登出",
    dark: "暗",
    light: "亮",
    selected: "已选",
    online: "在线",
    placeholder: "输入消息...",
    contact: "联系人",
    searchUser: "要搜索的用户名",
    searchContact: "昵称或电子邮件",
  },
  ru: {
    langName: "Русский (Ruso)",
    profile: "Имя/Псевдоним",
    lang: "Язык",
    theme: "Тема приложения",
    customization: "Персонализация",
    chatBg: "Фон чатов",
    solidColors: "Сплошные цвета",
    pickImage: "Выбрать изображение",
    resetBg: "Сбросить исходный фон",
    logout: "Выйти",
    dark: "Темный",
    light: "Светлый",
    selected: "Выбранный",
    online: "В сети",
    placeholder: "Введите сообщение...",
    contact: "Контакт",
    searchUser: "Имя пользователя для поиска",
    searchContact: "Никнейм или email",
  },
  hi: {
    langName: "हिन्दी (Hindi)",
    profile: "नाम/उपनाम",
    lang: "भाषा",
    theme: "ऐप थीम",
    customization: "निजीकरण",
    chatBg: "चैट पृष्ठभूमि",
    solidColors: "ठोस रंग",
    pickImage: "गैलरी से छवि चुनें",
    resetBg: "मूल पृष्ठभूमि रीसेट करें",
    logout: "लॉग आउट",
    dark: "अंधेरा",
    light: "रोशनी",
    selected: "चयनित",
    online: "ऑनलाइन",
    placeholder: "एक संदेश लिखें...",
    contact: "संपर्क",
    searchUser: "खोजने के लिए उपयोगकर्ता नाम",
    searchContact: "उपनाम या ईमेल",
  },
};

interface AppContextType {
  theme: ThemeKey;
  setTheme: (theme: ThemeKey) => void;
  lang: LangKey;
  setLang: (lang: LangKey) => void;
  chatBackground: string | null;
  setChatBackground: (bg: string | null) => void;
  t: typeof TRANSLATIONS["es"]; // <-- Exportamos "t" con autocompletado automático
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeKey>("dark");
  const [lang, setLang] = useState<LangKey>("es");
  const [chatBackground, setChatBackground] = useState<string | null>(null);

  // Selecciona automáticamente el paquete de idioma actual
  const t = TRANSLATIONS[lang] || TRANSLATIONS.es;

  return (
    <AppContext.Provider value={{ theme, setTheme, lang, setLang, chatBackground, setChatBackground, t }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext debe usarse dentro de AppProvider");
  return context;
}