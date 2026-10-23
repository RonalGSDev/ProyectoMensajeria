import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Modal,
  TouchableWithoutFeedback,
  Alert,
  ImageBackground,
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  Keyboard,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc } from "firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { VideoView, useVideoPlayer } from "expo-video";
import { useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, useAudioRecorderState, RecordingPresets, AudioModule } from "expo-audio";
import { auth, db } from "../src/services/firebase";
import { useApp } from "../src/context/AppContext";
import { uploadFileToStorage } from "../src/services/storage";

// Función auxiliar para formatear los milisegundos a mm:ss
const formatAudioTime = (millis: number) => {
  if (!millis) return "00:00";
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes < 10 ? "0" : ""}${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
};

// Subcomponente de video
function ChatVideoItem({ url, onPress }: { url: string; onPress: () => void }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
  });

  return (
    <TouchableOpacity activeOpacity={0.9} style={styles.videoContainer} onPress={onPress}>
      <VideoView player={player} style={styles.chatVideo} nativeControls={false} contentFit="cover" />
      <View style={styles.playOverlay}>
        <Ionicons name="play-circle" size={48} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  );
}

// Subcomponente de video para Modal
function ModalVideoItem({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => {
    p.play();
  });

  return <VideoView player={player} style={styles.fullVideo} nativeControls={true} contentFit="contain" />;
}

// Subcomponente para reproducir Audio en las burbujas
function ChatAudioItem({ url, isMe, colors }: { url: string; isMe: boolean; colors: any }) {
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);

  const togglePlayback = () => {
    if (status.playing) {
      player.pause();
    } else {
      if (status.currentTime >= status.duration && status.duration > 0) {
        player.seekTo(0);
      }
      player.play();
    }
  };

  const durationMillis = Math.round((status.duration ?? 0) * 1000);
  const positionMillis = Math.round((status.currentTime ?? 0) * 1000);

  return (
    <TouchableOpacity style={styles.audioContainer} onPress={togglePlayback}>
      <Ionicons name={status.playing ? "pause-circle" : "play-circle"} size={36} color={isMe ? "#000" : colors.primary} />
      <View style={styles.audioWaveform}>
        <Text style={{ color: isMe ? "#000" : colors.text, fontWeight: "500", marginLeft: 8 }}>
          {durationMillis > 0 
            ? formatAudioTime(positionMillis) + " / " + formatAudioTime(durationMillis)
            : "Nota de voz"}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function ChatScreen() {
  const { colors, chatBackground, t } = useApp();
  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setIsKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setIsKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
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

  // Estados de Grabación
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder, 100);
  const [isRecording, setIsRecording] = useState(false); // NUEVO: Estado del cronómetro

  const [selectedMediaModal, setSelectedMediaModal] = useState<{ url: string; type: "image" | "video" } | null>(null);

  const [selectedFile, setSelectedFile] = useState<{
    fileToUpload: any;
    uri: string;
    name: string;
    type: "image" | "video" | "document" | "audio";
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
    const q = query(collection(db, "chats", chatId as string, "messages"), orderBy("createdAt", "desc"));
    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
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
      type === "text" ? msgText
      : type === "image" ? "📷 Imagen"
      : type === "video" ? "🎥 Video"
      : type === "audio" ? "🎤 Nota de voz"
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
    await setDoc(doc(db, "chats", chatId as string), {
      participants,
      lastMessage: lastMsgText,
      updatedAt: serverTimestamp(),
      targetName: chatUser.name,
      targetPhoto: chatUser.photo,
    }, { merge: true });
  };

  const startRecording = async () => {
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permiso denegado", "Se necesita acceso al micrófono para grabar audios.");
        return;
      }
      await AudioModule.setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsRecording(true);
    } catch (err) {
      console.error("Error al grabar", err);
      Alert.alert("Error", "No se pudo iniciar la grabación.");
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (uri) {
        setSelectedFile({
          fileToUpload: uri,
          uri: uri,
          name: "audio_" + Date.now() + ".m4a",
          type: "audio",
        });
      }
    } catch (err) {
      console.error("Error al detener", err);
    }
  };

  const handleDocument = async () => {
    setAttachModalVisible(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSelectedFile({
          fileToUpload: file.uri,
          uri: file.uri,
          name: file.name,
          type: "document",
        });
      }
    } catch (error: any) {
      console.error("Error al seleccionar documento:", error);
      Alert.alert("Error", error?.message || "No se pudo seleccionar el documento.");
    }
  };

  const handleGallery = async () => {
    setAttachModalVisible(false);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        quality: 0.8,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const isVideo = asset.type === "video" || asset.mimeType?.includes("video");
        setSelectedFile({
          fileToUpload: asset.uri,
          uri: asset.uri,
          name: asset.fileName || (isVideo ? `video_${Date.now()}.mp4` : `imagen_${Date.now()}.jpg`),
          type: isVideo ? "video" : "image",
        });
      }
    } catch (error: any) {
      console.error("Error al abrir galería:", error);
      Alert.alert("Error", error?.message || "No se pudo seleccionar el archivo.");
    }
  };

  const handleCamera = async () => {
    setAttachModalVisible(false);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permiso requerido", "Se necesita permiso de cámara para tomar fotos.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedFile({
          fileToUpload: asset.uri,
          uri: asset.uri,
          name: asset.fileName || `foto_${Date.now()}.jpg`,
          type: "image",
        });
      }
    } catch (error: any) {
      console.error("Error al abrir cámara:", error);
      Alert.alert("Error", error?.message || "No se pudo abrir la cámara.");
    }
  };

  const handleSendPress = async () => {
    if (selectedFile) {
      const fileToSend = selectedFile;
      try {
        setUploading(true);
        const { fileToUpload, name, type } = fileToSend;
        setSelectedFile(null);
        const extension = name.split(".").pop() || "file";
        const storagePath = `chats/${chatId}/${type}s/${Date.now()}.${extension}`;
        const downloadUrl = await uploadFileToStorage(fileToUpload, storagePath);
        await sendMessage(type, downloadUrl, name);
      } catch (error: any) {
        console.error("Error al subir archivo:", error);
        setSelectedFile(fileToSend);
        const errMsg = error?.message || "No se pudo subir el archivo.";
        if (Platform.OS === "web") {
           window.alert("Error: " + errMsg);
        } else {
           Alert.alert("Error al subir archivo", errMsg);
        }
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
    if (isToday) return `${t("last_seen_today") || "Hoy"} ${timeStr}`;
    return `${t("last_seen_date") || "El"} ${date.toLocaleDateString([], { day: "2-digit", month: "2-digit" })} ${timeStr}`;
  };

  const formatDateLabel = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return t("today") || "HOY";
    if (date.toDateString() === yesterday.toDateString()) return t("yesterday") || "AYER";
    return date.toLocaleDateString([], { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const renderMessageContent = (item: any, isMe: boolean) => {
    if (item.type === "image") {
      return (
        <TouchableOpacity activeOpacity={0.9} onPress={() => setSelectedMediaModal({ url: item.fileUrl, type: "image" })}>
          <Image source={{ uri: item.fileUrl }} style={styles.chatImage} resizeMode="cover" />
        </TouchableOpacity>
      );
    }
    if (item.type === "video") {
      return <ChatVideoItem url={item.fileUrl} onPress={() => setSelectedMediaModal({ url: item.fileUrl, type: "video" })} />;
    }
    if (item.type === "audio") {
      return <ChatAudioItem url={item.fileUrl} isMe={isMe} colors={colors} />;
    }
    if (item.type === "document") {
      const handleDownload = () => {
        let downloadUrl = item.fileUrl;
        if (downloadUrl.includes("/upload/")) downloadUrl = downloadUrl.replace("/upload/", "/upload/fl_attachment/");
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
            <Text numberOfLines={1} style={[styles.documentName, { color: isMe ? "#000" : colors.text }]}>{item.fileName || "Documento"}</Text>
            <Text style={{ fontSize: 11, color: isMe ? "rgba(0,0,0,0.6)" : colors.subText }}>Toca para descargar</Text>
          </View>
          <Ionicons name="download-outline" size={20} color={isMe ? "rgba(0,0,0,0.7)" : colors.primary} />
        </TouchableOpacity>
      );
    }
    return <Text style={isMe ? styles.myMsgText : [styles.theirMsgText, { color: colors.text }]}>{item.text}</Text>;
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
          const showDateHeader = currentDateLabel ? currentDateLabel !== prevDateLabel : false;

          return (
            <View key={item.id}>
              {showDateHeader ? (
                <View style={[styles.dateHeaderContainer, { backgroundColor: colors.card }]}>
                  <Text style={[styles.dateHeaderText, { color: colors.subText }]}>{currentDateLabel}</Text>
                </View>
              ) : null}
              
              <View style={[styles.bubble, isMe ? [styles.myMsg, { backgroundColor: colors.primary }] : [styles.theirMsg, { backgroundColor: colors.card }]]}>
                {renderMessageContent(item, isMe)}
                <Text style={[styles.timeText, isMe ? styles.myTimeText : [styles.theirTimeText, { color: colors.subText }]]}>
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
    return <View style={{ flex: 1, backgroundColor: chatBackground?.type === "color" ? chatBackground.value : colors.bg }}>{listContent}</View>;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.header, borderColor: colors.border, paddingTop: Math.max(insets.top, 12) }]}>
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
            {chatUser.isOnline ? t("online") || "En línea" : formatLastSeen(chatUser.lastSeen)}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuBtn}>
          <Ionicons name="ellipsis-vertical" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {uploading && (
        <View style={[styles.uploadingBar, { backgroundColor: colors.card }]}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={{ marginLeft: 10, color: colors.text, fontSize: 13 }}>Enviando archivo...</Text>
        </View>
      )}

      {/* Visor multimedia pantalla completa */}
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

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ flex: 1, position: "relative" }}>
          {renderChatContent()}


      </View>

      {/* Previsualización del archivo */}
      {selectedFile && (
        <View style={[styles.previewBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {selectedFile.type === "image" ? (
            <Image source={{ uri: selectedFile.uri }} style={styles.previewImage} />
          ) : selectedFile.type === "video" ? (
            <Ionicons name="videocam-outline" size={32} color={colors.primary} />
          ) : selectedFile.type === "audio" ? (
            <Ionicons name="mic-outline" size={32} color={colors.primary} />
          ) : (
            <Ionicons name="document-text-outline" size={32} color={colors.primary} />
          )}
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text numberOfLines={1} style={[styles.previewText, { color: colors.text }]}>{selectedFile.name}</Text>
            <Text style={{ fontSize: 11, color: colors.subText }}>Listo para enviar</Text>
          </View>
          <TouchableOpacity onPress={() => setSelectedFile(null)} style={{ padding: 6 }}>
            <Ionicons name="close-circle" size={24} color="#FF5252" />
          </TouchableOpacity>
        </View>
      )}


      {/* Modal de Opciones para Adjuntar */}
      <Modal
        visible={attachModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAttachModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.attachModalBackdrop}
          activeOpacity={1}
          onPress={() => setAttachModalVisible(false)}
        >
          <View
            style={[
              styles.attachCardFloating,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                bottom: (isKeyboardVisible ? 6 : Math.max(insets.bottom, 12)) + 54,
              },
            ]}
          >
            <TouchableOpacity style={styles.attachOption} onPress={handleDocument}>
              <Ionicons name="document-text-outline" size={22} color={colors.primary} style={styles.attachIcon} />
              <Text style={[styles.attachOptionText, { color: colors.text }]}>{t("attach_docs") || "Documentos"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachOption} onPress={handleGallery}>
              <Ionicons name="images-outline" size={22} color={colors.primary} style={styles.attachIcon} />
              <Text style={[styles.attachOptionText, { color: colors.text }]}>{t("attach_gallery") || "Galería"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachOption} onPress={handleCamera}>
              <Ionicons name="camera-outline" size={22} color={colors.primary} style={styles.attachIcon} />
              <Text style={[styles.attachOptionText, { color: colors.text }]}>{t("attach_camera") || "Cámara"}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      {/* Input Inferior con lógica de grabación dinámica */}
      <View style={[styles.inputRow, { backgroundColor: colors.header, borderColor: colors.border, paddingBottom: isKeyboardVisible ? 6 : Math.max(insets.bottom, 12), paddingTop: 6 }]}>
        {!isRecording && (
          <TouchableOpacity onPress={() => setAttachModalVisible(!attachModalVisible)} style={styles.actionIconBtn}>
            <Ionicons name="attach-outline" size={26} color={attachModalVisible ? colors.primary : colors.subText} />
          </TouchableOpacity>
        )}

        {isRecording ? (
          <View style={[styles.input, styles.recordingIndicator, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.redDot} />
            <Text style={{ color: colors.text, fontStyle: "italic", marginLeft: 8 }}>
              Grabando... {formatAudioTime(recorderState.durationMillis)}
            </Text>
          </View>
        ) : (
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            value={text}
            onChangeText={setText}
            placeholder={selectedFile ? "Añadir un comentario..." : t("type_message") || "Escribe un mensaje..."}
            placeholderTextColor={colors.subText}
            multiline
            onFocus={() => setAttachModalVisible(false)}
          />
        )}

        {text.trim().length > 0 || selectedFile ? (
          <TouchableOpacity style={styles.sendBtn} onPress={handleSendPress} disabled={uploading}>
            <Ionicons name="send" size={20} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.actionIconBtn} onPress={isRecording ? stopRecording : startRecording}>
            <Ionicons name={isRecording ? "stop-circle" : "mic-outline"} size={26} color={isRecording ? "#FF5252" : colors.subText} />
          </TouchableOpacity>
        )}
      </View>
      </KeyboardAvoidingView>
    </View>
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

  uploadingBar: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 8 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "flex-start", alignItems: "flex-end" },
  menuContainer: { marginTop: 50, marginRight: 15, borderRadius: 10, paddingVertical: 8, width: 160, borderWidth: 1, elevation: 5 },
  menuOption: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 15 },
  menuIcon: { marginRight: 10 },
  menuOptionText: { fontSize: 14, fontWeight: "500" },

  fullMediaContainer: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center", alignItems: "center", width: "100%", height: "100%" },
  modalContentWrapper: { width: "90%", height: "80%", justifyContent: "center", alignItems: "center" },
  fullImage: { width: "100%", height: "100%" },
  fullVideo: { width: "100%", height: "100%" },
  closeFullMediaBtn: { position: "absolute", top: 40, right: 20, zIndex: 10, padding: 8 },

  attachModalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)" },
  attachCardFloating: { position: "absolute", left: 12, width: 200, borderRadius: 16, borderWidth: 1, paddingVertical: 8, elevation: 15, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  attachOption: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16 },
  attachIcon: { marginRight: 14 },
  attachOptionText: { fontSize: 15, fontWeight: "500" },

  dateHeaderContainer: { alignSelf: "center", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginVertical: 12 },
  dateHeaderText: { fontSize: 11, fontWeight: "bold" },
  bubble: { padding: 10, borderRadius: 14, marginVertical: 4, marginHorizontal: 12, maxWidth: "78%" },
  myMsg: { alignSelf: "flex-end", borderBottomRightRadius: 2 },
  theirMsg: { alignSelf: "flex-start", borderBottomLeftRadius: 2 },
  myMsgText: { color: "#000", fontSize: 15 },
  theirMsgText: { fontSize: 15 },

  chatImage: { width: 220, height: 160, borderRadius: 10 },
  videoContainer: { width: 220, height: 160, borderRadius: 10, overflow: "hidden", position: "relative", justifyContent: "center", alignItems: "center", backgroundColor: "#000000" },
  chatVideo: { width: "100%", height: "100%" },
  playOverlay: { position: "absolute", justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.3)", width: "100%", height: "100%" },
  documentContainer: { flexDirection: "row", alignItems: "center", padding: 4 },
  documentName: { fontSize: 14, fontWeight: "bold" },

  audioContainer: { flexDirection: "row", alignItems: "center", paddingRight: 10 },
  audioWaveform: { flex: 1, justifyContent: "center" },

  previewBar: { flexDirection: "row", alignItems: "center", padding: 10, borderTopWidth: 1, marginHorizontal: 8, borderRadius: 10, marginBottom: 4 },
  previewImage: { width: 42, height: 42, borderRadius: 8 },
  previewText: { fontSize: 14, fontWeight: "bold" },

  timeText: { fontSize: 10, marginTop: 4, alignSelf: "flex-end" },
  myTimeText: { color: "rgba(0,0,0,0.6)" },
  theirTimeText: {},
  inputRow: { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 8, alignItems: "center", borderTopWidth: 1 },
  actionIconBtn: { paddingHorizontal: 8, justifyContent: "center", alignItems: "center" },
  input: { flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, maxHeight: 100, fontSize: 15, marginHorizontal: 4 },
  
  recordingIndicator: { flexDirection: "row", alignItems: "center" },
  redDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#FF5252" },
  
  sendBtn: { justifyContent: "center", alignItems: "center", paddingHorizontal: 10 },
});