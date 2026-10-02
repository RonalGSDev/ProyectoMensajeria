import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
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
  es: {
    online: "En línea",
    placeholder: "Escribe un mensaje...",
    contact: "Contacto",
  },
  en: {
    online: "Online",
    placeholder: "Type a message...",
    contact: "Contact",
  },
  zh: { online: "在线", placeholder: "输入消息...", contact: "联系人" },
  ru: {
    online: "В сети",
    placeholder: "Введите сообщение...",
    contact: "Контакт",
  },
  hi: { online: "ऑनलाइन", placeholder: "एक संदेश लिखें...", contact: "संपर्क" },
};

interface Message {
  id: string;
  text: string;
  time: string;
  isMe: boolean;
}

//Lista de mensajes iniciales para la conversación
const INITIAL_MESSAGES: Message[] = [
  { id: "1", text: "¡Hola! ¿Cómo estás?", time: "11:40 AM", isMe: false },
  {
    id: "2",
    text: "Todo muy bien, ¿y tú? ¿Listo para la reunión?",
    time: "11:42 AM",
    isMe: true,
  },
  { id: "3", text: "¡Nos vemos allí!", time: "11:45 AM", isMe: false },
];

export default function ChatScreen() {
  const router = useRouter();
  const { userName, userAvatar } = useLocalSearchParams();

  const { theme, lang } = useAppContext();

  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState("");

  const isDark = theme === "dark";
  const currentStyles = getStyles(isDark);
  const t = TRANSLATIONS[lang];

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        currentStyles.messageBubble,
        item.isMe ? currentStyles.messageMe : currentStyles.messageThem,
      ]}
    >
      <Text
        style={
          item.isMe
            ? currentStyles.messageTextMe
            : currentStyles.messageTextThem
        }
      >
        {item.text}
      </Text>
      <Text style={currentStyles.messageTime}>{item.time}</Text>
    </View>
  );

  return (
    <SafeAreaView style={currentStyles.safeArea}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <KeyboardAvoidingView
        style={currentStyles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={currentStyles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={currentStyles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#00E5FF" />
          </TouchableOpacity>

          <Image
            source={{
              uri: (userAvatar as string) || "",
            }}
            style={currentStyles.headerAvatar}
          />

          <View style={currentStyles.headerInfo}>
            <Text style={currentStyles.headerName}>
              {userName || t.contact}
            </Text>
            <Text style={currentStyles.headerStatus}>{t.online}</Text>
          </View>
          <TouchableOpacity>
            <Ionicons
              name="ellipsis-vertical"
              size={24}
              color={isDark ? "#FFF" : "#000"}
            />
          </TouchableOpacity>
        </View>

        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={currentStyles.messagesList}
          inverted={false}
        />

        <View style={currentStyles.inputContainer}>
          <TouchableOpacity style={currentStyles.iconButton}>
            <Ionicons
              name="attach-outline"
              size={28}
              color={isDark ? "#888" : "#555"}
            />
          </TouchableOpacity>

          <TextInput
            style={currentStyles.textInput}
            placeholder={t.placeholder}
            placeholderTextColor={isDark ? "#888" : "#999"}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />

          <TouchableOpacity style={currentStyles.iconButton}>
            <Ionicons
              name={inputText.length > 0 ? "send" : "mic-outline"}
              size={28}
              color="#00E5FF"
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Estilos dinámicos según el tema
const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: isDark ? "#121212" : "#F5F5F5" },
    container: { flex: 1 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 15,
      paddingVertical: 15,
      backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF",
      borderBottomWidth: 1,
      borderBottomColor: isDark ? "#333" : "#DDD",
    },
    backButton: { marginRight: 10 },
    headerAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 12,
      backgroundColor: "#333",
    },
    headerInfo: { flex: 1 },
    headerName: {
      color: isDark ? "#FFF" : "#000",
      fontSize: 18,
      fontWeight: "bold",
    },
    headerStatus: { color: "#00E5FF", fontSize: 12 },
    messagesList: { padding: 15, paddingBottom: 20 },
    messageBubble: {
      maxWidth: "80%",
      padding: 12,
      borderRadius: 15,
      marginBottom: 10,
    },
    messageMe: {
      alignSelf: "flex-end",
      backgroundColor: "#005C66",
      borderBottomRightRadius: 0,
    },
    messageThem: {
      alignSelf: "flex-start",
      backgroundColor: isDark ? "#1E1E1E" : "#FFFFFF",
      borderWidth: isDark ? 0 : 1,
      borderColor: "#DDD",
      borderBottomLeftRadius: 0,
    },
    messageTextMe: { color: "#FFF", fontSize: 15 },
    messageTextThem: { color: isDark ? "#FFF" : "#000", fontSize: 15 },
    messageTime: {
      color: isDark ? "#A0A0A0" : "#888",
      fontSize: 10,
      alignSelf: "flex-end",
      marginTop: 5,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
      paddingVertical: 10,
      backgroundColor: isDark ? "#121212" : "#F5F5F5",
      borderTopWidth: 1,
      borderTopColor: isDark ? "#333" : "#DDD",
    },
    iconButton: { padding: 5 },
    textInput: {
      flex: 1,
      backgroundColor: isDark ? "#1E1E1E" : "#FFFFFF",
      color: isDark ? "#FFF" : "#000",
      borderRadius: 20,
      paddingHorizontal: 15,
      paddingTop: 10,
      paddingBottom: 10,
      marginHorizontal: 10,
      minHeight: 45,
      maxHeight: 100,
      borderWidth: 1,
      borderColor: isDark ? "#333" : "#DDD",
    },
  });
