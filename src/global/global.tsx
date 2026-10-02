import React, { createContext, useContext, useState } from "react";

// Variables de tipos de tema e idioma
type ThemeKey = "dark" | "light";
type LangKey = "es" | "en" | "zh" | "ru" | "hi";

interface AppContextType {
  theme: ThemeKey;
  setTheme: (theme: ThemeKey) => void;
  lang: LangKey;
  setLang: (lang: LangKey) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeKey>("dark");
  const [lang, setLang] = useState<LangKey>("es");

  return (
    <AppContext.Provider value={{ theme, setTheme, lang, setLang }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context)
    throw new Error("useAppContext debe usarse dentro de AppProvider");
  return context;
}
