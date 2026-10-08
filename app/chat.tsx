import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Image,
  Modal,
  TouchableWithoutFeedback,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc } from "firebase/firestore";
import { auth, db } from "../src/services/firebase";
import { useApp } from "../src/context/AppContext";

export default function ChatScreen() {
  const { colors } = useApp();
  const router = useRouter();
  const { chatId, userName, userPhoto } = useLocalSearchParams<{
    chatId: string;
    userName: string;
    userPhoto?: string;
  }>();

  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [menuVisible, setMenuVisible] = useState(false);
  const [chatUser, setChatUser] = useState<{ name: string; photo: string; isOnline?: boolean; lastSeen?: any }>({
    name: (userName as string) || "Chat",
    photo: (userPhoto as string) || "",
    isOnline: false,
    lastSeen: null,
  });

  const currentUser = auth.currentUser;

  // Escuchar en tiempo real el estado "En línea" y "Última conexión"
  useEffect(() => {
    if (!chatId || !currentUser) return;

    const participants = (chatId as string).split("_");
    const otherUserId = participants.find((id) => id !== currentUser.uid);

    if (otherUserId) {
      const userRef = doc(db, "users", otherUserId);
      const unsubscribeUser = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setChatUser({
            name: data.displayName || data.email || (userName as string) || "Chat",
            photo: data.photoURL || (userPhoto as string) || "",
            isOnline: data.isOnline || false,
            lastSeen: data.lastSeen || null,
          });
        }
      });

      return () => unsubscribeUser();
    }
  }, [chatId, currentUser, userName, userPhoto]);

  // Escuchar mensajes en tiempo real
  useEffect(() => {
    if (!chatId) return;

    const q = query(
      collection(db, "chats", chatId as string, "messages"),
      orderBy("createdAt", "desc")
    );

    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setMessages(msgs);
    });

    return () => unsubscribeMessages();
  }, [chatId]);

  const sendMessage = async () => {
    if (!text.trim() || !currentUser || !chatId) return;
    const msgText = text.trim();
    setText("");

    await addDoc(collection(db, "chats", chatId as string, "messages"), {
      senderId: currentUser.uid,
      text: msgText,
      createdAt: serverTimestamp(),
    });

    const participants = (chatId as string).split("_");
    await setDoc(
      doc(db, "chats", chatId as string),
      {
        participants,
        lastMessage: msgText,
        updatedAt: serverTimestamp(),
        targetName: chatUser.name,
        targetPhoto: chatUser.photo,
      },
      { merge: true }
    );
  };

  const handleTakePhoto = () => {
    Alert.alert("Cámara", "Próximamente podrás tomar fotos directamente desde la app.");
  };

  const handleAttachMedia = () => {
    Alert.alert("Adjuntar archivo", "Próximamente podrás seleccionar fotos o videos.");
  };

  const handleRecordAudio = () => {
    Alert.alert("Nota de voz", "Próximamente podrás grabar y enviar audios.");
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatLastSeen = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    if (isToday) {
      return `Últ. vez hoy a las ${timeStr}`;
    } else {
      const dateStr = date.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
      return `Últ. vez el ${dateStr} a las ${timeStr}`;
    }
  };

  const formatDateLabel = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "HOY";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "AYER";
    } else {
      return date.toLocaleDateString([], { day: "2-digit", month: "2-digit", year: "numeric" });
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Encabezado */}
      <View style={[styles.header, { backgroundColor: colors.header, borderColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>

        <View style={styles.avatarContainer}>
          {chatUser.photo ? (
            <Image source={{ uri: chatUser.photo }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.defaultAvatar, { backgroundColor: colors.card }]}>
              <Ionicons name="person" size={20} color={colors.subText} />
            </View>
          )}
          {chatUser.isOnline && <View style={[styles.onlineBadge, { borderColor: colors.header }]} />}
        </View>

        <View style={styles.headerInfo}>
          <Text style={[styles.title, { color: colors.text }]}>{chatUser.name}</Text>
          <Text style={[styles.statusText, { color: colors.primary }]}>
            {chatUser.isOnline ? "En línea" : formatLastSeen(chatUser.lastSeen)}
          </Text>
        </View>

        {/* Botón de tres puntos */}
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuBtn}>
          <Ionicons name="ellipsis-vertical" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Menú de opciones emergente */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.menuContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity
                style={styles.menuOption}
                onPress={() => {
                  setMenuVisible(false);
                }}
              >
                <Ionicons name="person-outline" size={18} color={colors.text} style={styles.menuIcon} />
                <Text style={[styles.menuOptionText, { color: colors.text }]}>Ver contacto</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuOption}
                onPress={() => {
                  setMenuVisible(false);
                }}
              >
                <Ionicons name="trash-outline" size={18} color="#FF5252" style={styles.menuIcon} />
                <Text style={[styles.menuOptionText, { color: "#FF5252" }]}>Vaciar chat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Lista de mensajes */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        inverted
        renderItem={({ item, index }) => {
          const isMe = item.senderId === currentUser?.uid;

          const currentDateLabel = formatDateLabel(item.createdAt);
          const nextItemInArray = messages[index + 1];
          const prevDateLabel = nextItemInArray ? formatDateLabel(nextItemInArray.createdAt) : null;
          const showDateHeader = currentDateLabel && currentDateLabel !== prevDateLabel;

          return (
            <View key={item.id}>
              {showDateHeader ? (
                <View style={[styles.dateHeaderContainer, { backgroundColor: colors.card }]}>
                  <Text style={[styles.dateHeaderText, { color: colors.subText }]}>{currentDateLabel}</Text>
                </View>
              ) : null}

              <View
                style={[
                  styles.bubble,
                  isMe
                    ? [styles.myMsg, { backgroundColor: colors.primary }]
                    : [styles.theirMsg, { backgroundColor: colors.card }],
                ]}
              >
                <Text style={isMe ? styles.myMsgText : [styles.theirMsgText, { color: colors.text }]}>
                  {item.text}
                </Text>
                <Text
                  style={[
                    styles.timeText,
                    isMe ? styles.myTimeText : [styles.theirTimeText, { color: colors.subText }],
                  ]}
                >
                  {formatTime(item.createdAt)}
                </Text>
              </View>
            </View>
          );
        }}
      />

      {/* Input inferior con Cámara, Clip, Input y Micrófono/Enviar */}
      <View style={[styles.inputRow, { backgroundColor: colors.header, borderColor: colors.border }]}>

        {/* Botón Clip */}
        <TouchableOpacity onPress={handleAttachMedia} style={styles.actionIconBtn}>
          <Ionicons name="attach-outline" size={24} color={colors.subText} />
        </TouchableOpacity>

        {/* Campo de texto */}
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          value={text}
          onChangeText={setText}
          placeholder="Escribe un mensaje..."
          placeholderTextColor={colors.subText}
          multiline
        />

        {/* Botón Cámara */}
        <TouchableOpacity onPress={handleTakePhoto} style={styles.actionIconBtn}>
          <Ionicons name="camera-outline" size={24} color={colors.subText} />
        </TouchableOpacity>
        
        {/* Enviar o Micrófono */}
        {text.trim().length > 0 ? (
          <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
            <Ionicons name="send" size={20} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.actionIconBtn} onPress={handleRecordAudio}>
            <Ionicons name="mic-outline" size={24} color={colors.subText} />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
  },
  backBtn: { marginRight: 10 },
  avatarContainer: { position: "relative", marginRight: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  defaultAvatar: { justifyContent: "center", alignItems: "center" },
  onlineBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#00E676",
    borderWidth: 2,
  },
  headerInfo: { flex: 1 },
  title: { fontSize: 16, fontWeight: "bold" },
  statusText: { fontSize: 12, marginTop: 1 },
  menuBtn: { padding: 6, marginLeft: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
  },
  menuContainer: {
    marginTop: 50,
    marginRight: 15,
    borderRadius: 10,
    paddingVertical: 8,
    width: 160,
    borderWidth: 1,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  menuOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  menuIcon: { marginRight: 10 },
  menuOptionText: { fontSize: 14, fontWeight: "500" },
  dateHeaderContainer: {
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginVertical: 12,
  },
  dateHeaderText: { fontSize: 11, fontWeight: "bold" },
  bubble: { padding: 10, borderRadius: 14, marginVertical: 4, marginHorizontal: 12, maxWidth: "78%" },
  myMsg: { alignSelf: "flex-end" },
  theirMsg: { alignSelf: "flex-start" },
  myMsgText: { color: "#000", fontSize: 15 },
  theirMsgText: { fontSize: 15 },
  timeText: { fontSize: 10, marginTop: 4, alignSelf: "flex-end" },
  myTimeText: { color: "rgba(0,0,0,0.6)" },
  theirTimeText: {},
  inputRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: "center",
    borderTopWidth: 1,
  },
  actionIconBtn: {
    paddingHorizontal: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 15,
    marginHorizontal: 4,
  },
  sendBtn: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
  },
});