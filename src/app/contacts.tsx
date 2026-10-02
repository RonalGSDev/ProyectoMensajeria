import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  FlatList,
  Image,
  ListRenderItem,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAppContext } from "../global/global"; // Importamos el contexto global

// Diccionario de traducciones
const TRANSLATIONS = {
  es: { searchPlaceholder: "Apodo o correo" },
  en: { searchPlaceholder: "Nickname or email" },
  zh: { searchPlaceholder: "昵称或电子邮件" },
  ru: { searchPlaceholder: "Никнейм или email" },
  hi: { searchPlaceholder: "उपनाम या ईमेल" },
};

interface Contact {
  id: string;
  name: string;
  isAdded: boolean;
  avatar: string;
}

//Lista de contactos de ejemplo
const CONTACTS_DATA: Contact[] = [
  {
    id: "1",
    name: "Contacto 1",
    isAdded: true,
    avatar: "",
  },
  {
    id: "2",
    name: "Contacto 2",
    isAdded: true,
    avatar: "",
  },
  {
    id: "3",
    name: "Nuevo Contacto 1",
    isAdded: false,
    avatar: "",
  },
];

export default function ContactsScreen() {
  const [searchQuery, setSearchQuery] = useState("");

  const { theme, lang } = useAppContext();

  const isDark = theme === "dark";
  const currentStyles = getStyles(isDark);
  const t = TRANSLATIONS[lang];

  const renderContactItem: ListRenderItem<Contact> = ({ item }) => (
    <View style={currentStyles.contactItem}>
      <View style={currentStyles.contactLeft}>
        <Image source={{ uri: item.avatar }} style={currentStyles.avatar} />
        <Text style={currentStyles.contactName}>{item.name}</Text>
      </View>

      <TouchableOpacity
        style={currentStyles.actionButton}
        onPress={() => console.log(`Acción en: ${item.name}`)}
      >
        <Ionicons
          name={item.isAdded ? "close-circle" : "add-circle"}
          size={32}
          color={item.isAdded ? "#FF4444" : "#00C851"}
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={currentStyles.safeArea}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <View style={currentStyles.container}>
        {/* ENCABEZADO Y BUSCADOR */}
        <View style={currentStyles.header}>
          <View style={currentStyles.searchContainer}>
            <Ionicons
              name="search"
              size={20}
              color={isDark ? "#888" : "#555"}
              style={currentStyles.searchIcon}
            />
            <TextInput
              style={currentStyles.searchInput}
              placeholder={t.searchPlaceholder} // Aplicamos traducción
              placeholderTextColor={isDark ? "#888" : "#999"}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />
          </View>
        </View>

        <FlatList
          data={CONTACTS_DATA}
          keyExtractor={(item) => item.id}
          renderItem={renderContactItem}
          contentContainerStyle={currentStyles.listContainer}
        />
      </View>
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
      flex: 1,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 10,
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark ? "#1E1E1E" : "#FFFFFF",
      borderRadius: 20,
      paddingHorizontal: 15,
      height: 45,
      borderWidth: 1,
      borderColor: isDark ? "#333" : "#DDD",
    },
    searchIcon: {
      marginRight: 10,
    },
    searchInput: {
      flex: 1,
      color: isDark ? "#FFF" : "#000",
      fontSize: 16,
    },
    listContainer: {
      paddingHorizontal: 20,
      paddingTop: 10,
    },
    contactItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: isDark ? "#1E1E1E" : "#FFFFFF",
      padding: 15,
      borderRadius: 15,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: isDark ? "#333" : "#DDD",
    },
    contactLeft: {
      flexDirection: "row",
      alignItems: "center",
    },
    avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      marginRight: 15,
      backgroundColor: "#333",
    },
    contactName: {
      color: isDark ? "#FFF" : "#000",
      fontSize: 16,
      fontWeight: "600",
    },
    actionButton: {
      padding: 5,
    },
  });
