import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  FlatList,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Pressable,
  Alert,
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

const ATTACH_OPTIONS = [
  { id: "docs", label: "Documentos", icon: "document-text-outline" },
  { id: "gallery", label: "Galería", icon: "images-outline" },
  { id: "location", label: "Ubicación", icon: "location-outline" },
  { id: "camera", label: "Cámara", icon: "camera-outline" },
] as const;

interface Message {
  id: string;
  text: string;
  time: string;
  isMe: boolean;
}

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
  const { theme, lang, chatBackground } = useAppContext();

  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState("");
  const [attachMenuVisible, setAttachMenuVisible] = useState(false);

  const isDark = theme === "dark";
  const currentStyles = getStyles(isDark);
  const t = TRANSLATIONS[lang as keyof typeof TRANSLATIONS];

  const hasValidText = inputText.trim().length > 0;

  const handleAttachmentOption = (optionLabel: string) => {
    setAttachMenuVisible(false);
    if (Platform.OS === "web") {
      window.alert(`Próximamente podrás enviar: ${optionLabel}`);
    } else {
      Alert.alert(optionLabel, `Próximamente podrás enviar ${optionLabel.toLowerCase()}.`);
    }
  };

  const handleSendOrRecord = () => {
    if (hasValidText) {
      console.log("Mensaje enviado:", inputText.trim());
      setInputText(""); 
    } else {
      if (Platform.OS === "web") {
        window.alert("Próximamente podrás grabar notas de voz.");
      } else {
        Alert.alert("Nota de voz", "Próximamente podrás grabar notas de voz.");
      }
    }
  };

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

  const hasImageBackground = chatBackground && (chatBackground.startsWith('file') || chatBackground.startsWith('http'));

  return (
    <SafeAreaView style={currentStyles.safeArea}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <KeyboardAvoidingView
        style={currentStyles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* ENCABEZADO */}
        <View style={currentStyles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={currentStyles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#00E5FF" />
          </TouchableOpacity>

          {userAvatar ? (
            <Image
              source={{ uri: userAvatar as string }}
              style={currentStyles.headerAvatar}
            />
          ) : (
            <View style={[currentStyles.headerAvatar, currentStyles.defaultAvatar]}>
              <Ionicons name="person" size={20} color={isDark ? "#888" : "#999"} />
            </View>
          )}

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

        {/* LISTA DE MENSAJES */}
        <View style={{ flex: 1, backgroundColor: chatBackground || (isDark ? "#121212" : "#F5F5F5") }}>
          {hasImageBackground ? (
             <ImageBackground source={{ uri: chatBackground }} style={{ flex: 1 }} resizeMode="cover">
                <FlatList
                  data={messages}
                  keyExtractor={(item) => item.id}
                  renderItem={renderMessage}
                  contentContainerStyle={currentStyles.messagesList}
                  inverted={false}
                />
             </ImageBackground>
          ) : (
              <FlatList
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderMessage}
                contentContainerStyle={currentStyles.messagesList}
                inverted={false}
              />
          )}

          {/* MENÚ FLOTANTE DE ADJUNTOS */}
          {attachMenuVisible && (
            <View style={[StyleSheet.absoluteFill, { zIndex: 999, elevation: 999 }]}>
              <Pressable 
                style={StyleSheet.absoluteFill} 
                onPress={() => setAttachMenuVisible(false)} 
              />
              <View style={currentStyles.attachMenuContainer}>
                {ATTACH_OPTIONS.map((item) => (
                  <TouchableOpacity 
                    key={item.id} 
                    style={currentStyles.attachOption} 
                    onPress={() => handleAttachmentOption(item.label)}
                  >
                    <Ionicons name={item.icon as any} size={22} color="#00E5FF" style={currentStyles.attachIcon} />
                    <Text style={currentStyles.attachOptionText}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* BARRA INFERIOR DE ESCRITURA */}
        <View style={currentStyles.inputContainer}>
          <TouchableOpacity 
            style={currentStyles.iconButton}
            onPress={() => setAttachMenuVisible(!attachMenuVisible)}
          >
            <Ionicons
              name="attach-outline"
              size={28}
              color={attachMenuVisible ? "#00E5FF" : (isDark ? "#888" : "#555")}
            />
          </TouchableOpacity>

          <TextInput
            style={currentStyles.textInput}
            placeholder={t.placeholder}
            placeholderTextColor={isDark ? "#888" : "#999"}
            value={inputText}
            onChangeText={setInputText}
            multiline
            onFocus={() => setAttachMenuVisible(false)}
          />

          <TouchableOpacity 
            style={currentStyles.iconButton}
            onPress={handleSendOrRecord}
          >
            <Ionicons
              name={hasValidText ? "send" : "mic-outline"}
              size={28}
              color="#00E5FF"
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

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
      backgroundColor: isDark ? "#333" : "#DDD",
    },
    defaultAvatar: {
      justifyContent: "center",
      alignItems: "center",
    },
    headerInfo: { flex: 1 },
    headerName: {
      color: isDark ? "#FFF" : "#000",
      fontSize: 18,
      fontWeight: "bold",
    },
    headerStatus: { color: "#00E5FF", fontSize: 12 },
    
    attachMenuContainer: {
      position: "absolute",
      bottom: 10,
      left: 15,
      borderRadius: 14,
      paddingVertical: 8,
      width: 220,
      backgroundColor: isDark ? "#1E1E1E" : "#FFFFFF",
      borderWidth: 1,
      borderColor: isDark ? "#333" : "#DDD",
      elevation: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
    },
    attachOption: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    attachIcon: { marginRight: 16 },
    attachOptionText: {
      fontSize: 16,
      color: isDark ? "#FFF" : "#000",
    },

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
      zIndex: 10,
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