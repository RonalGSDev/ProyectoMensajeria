import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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
import { useAppContext } from "../global/global";

const TRANSLATIONS = {
  es: { search: "Nombre de usuario a buscar" },
  en: { search: "Username to search" },
  zh: { search: "要搜索的用户名" },
  ru: { search: "Имя пользователя для поиска" },
  hi: { search: "खोजने के लिए उपयोगकर्ता नाम" },
};

//Lista de chats de prueba
interface Chat {
  id: string;
  name: string;
  message: string;
  time: string;
  unread: boolean;
  avatar: string;
}

const CHATS_DATA: Chat[] = [
  {
    id: "1",
    name: "Angel",
    message: "¡Nos vemos allí!",
    time: "11:45 AM",
    unread: false,
    avatar: "",
  },
  {
    id: "2",
    name: "Dayana",
    message: "De acuerdo, suena bien.",
    time: "10:30 AM",
    unread: false,
    avatar: "",
  },
  {
    id: "3",
    name: "Vini",
    message: "Reunión a las 3 pm.",
    time: "Ayer",
    unread: true,
    avatar: "",
  },
];

export default function ChatsScreen() {
  const router = useRouter();

  const { theme, lang } = useAppContext();

  const isDark = theme === "dark";
  const currentStyles = getStyles(isDark);
  const t = TRANSLATIONS[lang];

  const renderChatItem: ListRenderItem<Chat> = ({ item }) => (
    <TouchableOpacity
      style={currentStyles.chatItem}
      onPress={() =>
        router.push({
          pathname: "/chat",
          params: { userName: item.name, userAvatar: item.avatar },
        })
      }
    >
      <Image source={{ uri: item.avatar }} style={currentStyles.avatar} />

      <View style={currentStyles.chatInfo}>
        <Text style={currentStyles.chatName}>{item.name}</Text>
        <Text style={currentStyles.chatMessage} numberOfLines={1}>
          {item.message}
        </Text>
      </View>

      <View style={currentStyles.chatMeta}>
        <Text style={currentStyles.chatTime}>{item.time}</Text>
        <Ionicons
          name="checkmark-done"
          size={16}
          color={item.unread ? "#555" : "#00E5FF"}
        />
      </View>
    </TouchableOpacity>
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
              placeholder={t.search}
              placeholderTextColor={isDark ? "#888" : "#999"}
            />
          </View>
        </View>

        <FlatList
          data={CHATS_DATA}
          keyExtractor={(item) => item.id}
          renderItem={renderChatItem}
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
    chatItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark ? "#1E1E1E" : "#FFFFFF",
      padding: 15,
      borderRadius: 15,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: isDark ? "#333" : "#DDD",
    },
    avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      marginRight: 15,
      backgroundColor: isDark ? "#333" : "#DDD", // Fondo gris por defecto si no hay imagen
    },
    chatInfo: {
      flex: 1,
      justifyContent: "center",
    },
    chatName: {
      color: isDark ? "#FFF" : "#000",
      fontSize: 16,
      fontWeight: "bold",
      marginBottom: 4,
    },
    chatMessage: {
      color: isDark ? "#A0A0A0" : "#666",
      fontSize: 14,
    },
    chatMeta: {
      alignItems: "flex-end",
      justifyContent: "space-between",
      height: 40,
    },
    chatTime: {
      color: isDark ? "#A0A0A0" : "#888",
      fontSize: 12,
      marginBottom: 5,
    },
  });
