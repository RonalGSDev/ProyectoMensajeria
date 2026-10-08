import React, { createContext, useContext, useState } from "react";

type Theme = "dark" | "light";
type Language = "es" | "en";

interface AppContextType {
  theme: Theme;
  toggleTheme: () => void;
  language: Language;
  toggleLanguage: () => void;
  colors: typeof darkColors;
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
    search_user: "Nombre de usuario a buscar",
    search_nickname: "Apodo o correo",
    no_users: "No hay usuarios registrados",
    language: "Idioma",
    language_selected: "Español (Seleccionado)",
    theme: "Tema de fondo",
    theme_dark: "Oscuro (Seleccionado)",
    theme_light: "Claro (Seleccionado)",
    delete_account: "Eliminar cuenta",
    logout: "Cerrar sesión",
    login_google: "Iniciar sesión con Google",
    welcome: "Bienvenido a AppChat",
    login_subtitle: "Inicia sesión para continuar",
    type_message: "Escribe un mensaje...",
  },
  en: {
    chats: "Chats",
    contacts: "Contacts",
    settings: "Settings",
    search_user: "Search username",
    search_nickname: "Nickname or email",
    no_users: "No registered users",
    language: "Language",
    language_selected: "English (Selected)",
    theme: "Background Theme",
    theme_dark: "Dark (Selected)",
    theme_light: "Light (Selected)",
    delete_account: "Delete account",
    logout: "Log out",
    login_google: "Sign in with Google",
    welcome: "Welcome to AppChat",
    login_subtitle: "Sign in to continue",
    type_message: "Type a message...",
  },
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>("dark");
  const [language, setLanguage] = useState<Language>("es");

  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  const toggleLanguage = () => setLanguage((prev) => (prev === "es" ? "en" : "es"));

  const colors = theme === "dark" ? darkColors : lightColors;
  const t = (key: string) => translations[language][key] || key;

  return (
    <AppContext.Provider value={{ theme, toggleTheme, language, toggleLanguage, colors, t }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp debe usarse dentro de un AppProvider");
  return context;
};