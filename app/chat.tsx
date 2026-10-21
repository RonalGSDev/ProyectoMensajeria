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
  ImageBackground,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc } from "firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { VideoView, useVideoPlayer } from "expo-video";
import { auth, db } from "../src/services/firebase";
import { useApp } from "../src/context/AppContext";
import { uploadFileToStorage } from "../src/services/storage";

// Subcomponente de video para las burbujas pequeñas del chat
function ChatVideoItem({ url, onPress }: { url: string; onPress: () => void }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
  });

  return (
    <TouchableOpacity activeOpacity={0.9} style={styles.videoContainer} onPress={onPress}>
      <VideoView
        player={player}
        style={styles.chatVideo}
        nativeControls={false}
        contentFit="cover"
      />
      <View style={styles.playOverlay}>
        <Ionicons name="play-circle" size={48} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  );
}

// Subcomponente de video para el Modal en pantalla completa
function ModalVideoItem({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => {
    p.play();
  });

  return (
    <VideoView
      player={player}
      style={styles.fullVideo}
      nativeControls={true}
      contentFit="contain" // 👈 Ajusta el video 100% visible sin cortes ni zoom
    />
  );
}

export default function ChatScreen() {
  const { colors, chatBackground, t } = useApp();
  const router = useRouter();
  const { chatId, userName, userPhoto } = useLocalSearchParams<{
    chatId: string;
    userName: string;
    userPhoto?: string;
  }>();

  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [menuVisible, setMenuVisible] = useState(false);
  const [attachModalVisible, setAttachModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Estado para visor multimedia activo en el Modal
  const [selectedMediaModal, setSelectedMediaModal] = useState<{
    url: string;
    type: "image" | "video";
  } | null>(null);

  // Estado para el archivo pendiente de confirmación antes de enviar
  const [selectedFile, setSelectedFile] = useState<{
    fileToUpload: any;
    uri: string;
    name: string;
    type: "image" | "video" | "document";
  } | null>(null);

  const [chatUser, setChatUser] = useState<{ name: string; photo: string; isOnline?: boolean; lastSeen?: any }>({
    name: (userName as string) || "Chat",
    photo: (userPhoto as string) || "",
    isOnline: false,
    lastSeen: null,
  });

  const currentUser = auth.currentUser;

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

  useEffect(() => {
    if (!chatId) return;

    setMessages([]);

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

    return () => {
      setMessages([]);
      unsubscribeMessages();
    };
  }, [chatId]);

  const sendMessage = async (type: string = "text", fileUrl: string = "", fileName: string = "") => {
    if (type === "text" && !text.trim()) return;
    if (!currentUser || !chatId) return;

    const msgText = text.trim();
    if (type === "text") setText("");

    const lastMsgText =
      type === "text"
        ? msgText
        : type === "image"
        ? "📷 Imagen"
        : type === "video"
        ? "🎥 Video"
        : "📄 Documento";

    await addDoc(collection(db, "chats", chatId as string, "messages"), {
      senderId: currentUser.uid,
      text: type === "text" ? msgText : "",
      type,
      fileUrl,
      fileName,
      createdAt: serverTimestamp(),
    });

    const participants = (chatId as string).split("_");
    await setDoc(
      doc(db, "chats", chatId as string),
      {
        participants,
        lastMessage: lastMsgText,
        updatedAt: serverTimestamp(),
        targetName: chatUser.name,
        targetPhoto: chatUser.photo,
      },
      { merge: true }
    );
  };

  // 📄 Seleccionar Documentos
  const handleDocument = async () => {
    setAttachModalVisible(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const fileToUpload = file.file || file.uri;

        setSelectedFile({
          fileToUpload,
          uri: file.uri,
          name: file.name,
          type: "document",
        });
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo seleccionar el documento.");
    }
  };

  // 🖼️ Seleccionar Imagen o Video de Galería
  const handleGallery = async () => {
    setAttachModalVisible(false);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permiso requerido", "Se necesitan permisos para acceder a la galería.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const isVideo = asset.type === "video" || asset.mimeType?.includes("video");
        const fileType = isVideo ? "video" : "image";
        const extension = isVideo ? "mp4" : "jpg";
        const fileToUpload = (asset as any).file || asset.uri;

        setSelectedFile({
          fileToUpload,
          uri: asset.uri,
          name: asset.fileName || `${fileType}.${extension}`,
          type: fileType,
        });
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo seleccionar el archivo.");
    }
  };

  // 🚀 Función para procesar y enviar
  const handleSendPress = async () => {
    if (selectedFile) {
      try {
        setUploading(true);
        const { fileToUpload, name, type } = selectedFile;
        setSelectedFile(null);

        const extension = name.split(".").pop() || "file";
        const storagePath = `chats/${chatId}/${type}s/${Date.now()}.${extension}`;

        const downloadUrl = await uploadFileToStorage(fileToUpload, storagePath);
        await sendMessage(type, downloadUrl, name);
      } catch (error) {
        Alert.alert("Error", "No se pudo subir el archivo.");
      } finally {
        setUploading(false);
      }
    } else if (text.trim().length > 0) {
      await sendMessage("text");
    }
  };

  const handleLocation = () => {
    setAttachModalVisible(false);
    Alert.alert("Ubicación", "Próximamente podrás compartir tu ubicación actual.");
  };

  const handleCamera = () => {
    setAttachModalVisible(false);
    Alert.alert("Cámara", "Próximamente podrás tomar fotos desde la cámara.");
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
      return `${t("last_seen_today")} ${timeStr}`;
    } else {
      const dateStr = date.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
      return `${t("last_seen_date")} ${dateStr} ${timeStr}`;
    }
  };

  const formatDateLabel = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return t("today");
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t("yesterday");
    } else {
      return date.toLocaleDateString([], { day: "2-digit", month: "2-digit", year: "numeric" });
    }
  };

  // Renderizador dinámico del contenido del mensaje
  const renderMessageContent = (item: any, isMe: boolean) => {
    if (item.type === "image") {
      return (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setSelectedMediaModal({ url: item.fileUrl, type: "image" })}
        >
          <Image source={{ uri: item.fileUrl }} style={styles.chatImage} resizeMode="cover" />
        </TouchableOpacity>
      );
    }

    if (item.type === "video") {
      return (
        <ChatVideoItem
          url={item.fileUrl}
          onPress={() => setSelectedMediaModal({ url: item.fileUrl, type: "video" })}
        />
      );
    }

    if (item.type === "document") {
      const handleDownload = () => {
        let downloadUrl = item.fileUrl;
        if (downloadUrl.includes("/upload/")) {
          downloadUrl = downloadUrl.replace("/upload/", "/upload/fl_attachment/");
        }

        if (typeof window !== "undefined" && window.document) {
          const a = document.createElement("a");
          a.href = downloadUrl;
          a.download = item.fileName || "documento";
          a.target = "_blank";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } else {
          Linking.openURL(downloadUrl);
        }
      };

      return (
        <TouchableOpacity style={styles.documentContainer} onPress={handleDownload}>
          <Ionicons name="document-text-outline" size={32} color={isMe ? "#000" : colors.primary} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text numberOfLines={1} style={[styles.documentName, { color: isMe ? "#000" : colors.text }]}>
              {item.fileName || "Documento"}
            </Text>
            <Text style={{ fontSize: 11, color: isMe ? "rgba(0,0,0,0.6)" : colors.subText }}>
              Toca para descargar
            </Text>
          </View>
          <Ionicons name="download-outline" size={20} color={isMe ? "rgba(0,0,0,0.7)" : colors.primary} />
        </TouchableOpacity>
      );
    }

    return (
      <Text style={isMe ? styles.myMsgText : [styles.theirMsgText, { color: colors.text }]}>
        {item.text}
      </Text>
    );
  };

  const renderChatContent = () => {
    const listContent = (
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        inverted
        contentContainerStyle={{ paddingVertical: 10 }}
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
                {renderMessageContent(item, isMe)}

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
    );

    if (chatBackground?.type === "image" && chatBackground?.value) {
      return (
        <ImageBackground source={{ uri: chatBackground.value }} style={{ flex: 1 }} resizeMode="cover">
          {listContent}
        </ImageBackground>
      );
    }

    const backgroundColor = chatBackground?.type === "color" ? chatBackground.value : colors.bg;

    return (
      <View style={{ flex: 1, backgroundColor }}>
        {listContent}
      </View>
    );
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
            {chatUser.isOnline ? t("online") : formatLastSeen(chatUser.lastSeen)}
          </Text>
        </View>

        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuBtn}>
          <Ionicons name="ellipsis-vertical" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Indicador de carga al subir archivo */}
      {uploading && (
        <View style={[styles.uploadingBar, { backgroundColor: colors.card }]}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={{ marginLeft: 10, color: colors.text, fontSize: 13 }}>Subiendo archivo...</Text>
        </View>
      )}

      {/* Menú de opciones de cabecera */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.menuContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity style={styles.menuOption} onPress={() => setMenuVisible(false)}>
                <Ionicons name="person-outline" size={18} color={colors.text} style={styles.menuIcon} />
                <Text style={[styles.menuOptionText, { color: colors.text }]}>{t("view_contact")}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuOption} onPress={() => setMenuVisible(false)}>
                <Ionicons name="trash-outline" size={18} color="#FF5252" style={styles.menuIcon} />
                <Text style={[styles.menuOptionText, { color: "#FF5252" }]}>{t("clear_chat")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal Visor de Multimedia en Pantalla Completa */}
      <Modal visible={!!selectedMediaModal} transparent animationType="fade">
        <View style={styles.fullMediaContainer}>
          <TouchableOpacity style={styles.closeFullMediaBtn} onPress={() => setSelectedMediaModal(null)}>
            <Ionicons name="close-circle" size={36} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.modalContentWrapper}>
            {selectedMediaModal?.type === "image" ? (
              <Image source={{ uri: selectedMediaModal.url }} style={styles.fullImage} resizeMode="contain" />
            ) : selectedMediaModal?.type === "video" ? (
              <ModalVideoItem url={selectedMediaModal.url} />
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Área del chat */}
      <TouchableWithoutFeedback onPress={() => attachModalVisible && setAttachModalVisible(false)}>
        <View style={{ flex: 1, position: "relative" }}>
          {renderChatContent()}

          {/* Menú flotante de adjuntos */}
          {attachModalVisible && (
            <View style={[styles.attachCardFloating, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity style={styles.attachOption} onPress={handleDocument}>
                <Ionicons name="document-text-outline" size={22} color={colors.primary} style={styles.attachIcon} />
                <Text style={[styles.attachOptionText, { color: colors.text }]}>Documentos</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.attachOption} onPress={handleGallery}>
                <Ionicons name="image-outline" size={22} color={colors.primary} style={styles.attachIcon} />
                <Text style={[styles.attachOptionText, { color: colors.text }]}>Galería</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.attachOption} onPress={handleLocation}>
                <Ionicons name="location-outline" size={22} color={colors.primary} style={styles.attachIcon} />
                <Text style={[styles.attachOptionText, { color: colors.text }]}>Ubicación</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.attachOption} onPress={handleCamera}>
                <Ionicons name="camera-outline" size={22} color={colors.primary} style={styles.attachIcon} />
                <Text style={[styles.attachOptionText, { color: colors.text }]}>Cámara</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>

      {/* Barra de previsualización de archivo antes de enviar */}
      {selectedFile && (
        <View style={[styles.previewBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {selectedFile.type === "image" ? (
            <Image source={{ uri: selectedFile.uri }} style={styles.previewImage} />
          ) : selectedFile.type === "video" ? (
            <Ionicons name="videocam-outline" size={32} color={colors.primary} />
          ) : (
            <Ionicons name="document-text-outline" size={32} color={colors.primary} />
          )}

          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text numberOfLines={1} style={[styles.previewText, { color: colors.text }]}>
              {selectedFile.name}
            </Text>
            <Text style={{ fontSize: 11, color: colors.subText }}>Listo para enviar</Text>
          </View>

          <TouchableOpacity onPress={() => setSelectedFile(null)} style={{ padding: 6 }}>
            <Ionicons name="close-circle" size={24} color="#FF5252" />
          </TouchableOpacity>
        </View>
      )}

      {/* Input inferior */}
      <View style={[styles.inputRow, { backgroundColor: colors.header, borderColor: colors.border }]}>
        <TouchableOpacity onPress={() => setAttachModalVisible(!attachModalVisible)} style={styles.actionIconBtn}>
          <Ionicons
            name="attach-outline"
            size={26}
            color={attachModalVisible ? colors.primary : colors.subText}
          />
        </TouchableOpacity>

        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          value={text}
          onChangeText={setText}
          placeholder={selectedFile ? "Añadir un comentario..." : t("type_message")}
          placeholderTextColor={colors.subText}
          multiline
        />

        {text.trim().length > 0 || selectedFile ? (
          <TouchableOpacity style={styles.sendBtn} onPress={handleSendPress} disabled={uploading}>
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
  header: { flexDirection: "row", alignItems: "center", padding: 12, borderBottomWidth: 1 },
  backBtn: { marginRight: 10 },
  avatarContainer: { position: "relative", marginRight: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  defaultAvatar: { justifyContent: "center", alignItems: "center" },
  onlineBadge: { position: "absolute", bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: "#00E676", borderWidth: 2 },
  headerInfo: { flex: 1 },
  title: { fontSize: 16, fontWeight: "bold" },
  statusText: { fontSize: 12, marginTop: 1 },
  menuBtn: { padding: 6, marginLeft: 8 },

  uploadingBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "flex-start", alignItems: "flex-end" },
  menuContainer: { marginTop: 50, marginRight: 15, borderRadius: 10, paddingVertical: 8, width: 160, borderWidth: 1, elevation: 5 },
  menuOption: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 15 },
  menuIcon: { marginRight: 10 },
  menuOptionText: { fontSize: 14, fontWeight: "500" },

  // Visor multimedia modal
  fullMediaContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
  },
  modalContentWrapper: {
    width: "90%",
    height: "80%",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: "100%",
    height: "100%",
  },
  fullVideo: {
    width: "100%",
    height: "100%",
  },
  closeFullMediaBtn: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 8,
  },

  attachCardFloating: {
    position: "absolute",
    bottom: 10,
    left: 12,
    width: 200,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 8,
    elevation: 10,
    zIndex: 999,
  },
  attachOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  attachIcon: { marginRight: 14 },
  attachOptionText: { fontSize: 15, fontWeight: "500" },

  dateHeaderContainer: { alignSelf: "center", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginVertical: 12 },
  dateHeaderText: { fontSize: 11, fontWeight: "bold" },
  bubble: { padding: 10, borderRadius: 14, marginVertical: 4, marginHorizontal: 12, maxWidth: "78%" },
  myMsg: { alignSelf: "flex-end" },
  theirMsg: { alignSelf: "flex-start" },
  myMsgText: { color: "#000", fontSize: 15 },
  theirMsgText: { fontSize: 15 },

  // Adjuntos en chat (Imagen, Video, Doc)
  chatImage: { width: 220, height: 160, borderRadius: 10 },
  videoContainer: {
    width: 220,
    height: 160,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000000",
  },
  chatVideo: { width: "100%", height: "100%" },
  playOverlay: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    width: "100%",
    height: "100%",
  },
  documentContainer: { flexDirection: "row", alignItems: "center", padding: 4 },
  documentName: { fontSize: 14, fontWeight: "bold" },

  // Previsualización antes de enviar
  previewBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderTopWidth: 1,
    marginHorizontal: 8,
    borderRadius: 10,
    marginBottom: 4,
  },
  previewImage: { width: 42, height: 42, borderRadius: 8 },
  previewText: { fontSize: 14, fontWeight: "bold" },

  timeText: { fontSize: 10, marginTop: 4, alignSelf: "flex-end" },
  myTimeText: { color: "rgba(0,0,0,0.6)" },
  theirTimeText: {},
  inputRow: { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 8, alignItems: "center", borderTopWidth: 1 },
  actionIconBtn: { paddingHorizontal: 8, justifyContent: "center", alignItems: "center" },
  input: { flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, maxHeight: 100, fontSize: 15, marginHorizontal: 4 },
  sendBtn: { justifyContent: "center", alignItems: "center", paddingHorizontal: 10 },
});