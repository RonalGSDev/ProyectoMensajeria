import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
} from "firebase/firestore";
import { auth, db } from "../src/services/firebase";
import { useApp } from "../src/context/AppContext";

export default function ChatsScreen() {
  const { colors } = useApp();
  const router = useRouter();
  const [chats, setChats] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<{ [key: string]: any }>({});
  const [failedImages, setFailedImages] = useState<{ [key: string]: boolean }>({});
  const [filterText, setFilterText] = useState("");

  const currentUser = auth.currentUser;

  // 1. Escuchar los chats en tiempo real sin requerir índice compuesto
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      // Ordenar manualmente del más reciente al más antiguo
      list.sort((a: any, b: any) => {
        const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
        const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
        return timeB - timeA;
      });

      setChats(list);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // 2. Escuchar en tiempo real los perfiles de la colección 'users'
  useEffect(() => {
    if (chats.length === 0 || !currentUser) return;

    // Extraer UIDs únicos de los contactos
    const otherUserIds = Array.from(
      new Set(
        chats
          .map((c) => c.participants?.find((id: string) => id !== currentUser.uid))
          .filter(Boolean)
      )
    );

    const unsubscribes = otherUserIds.map((userId) => {
      return onSnapshot(doc(db, "users", userId as string), (docSnap) => {
        if (docSnap.exists()) {
          setProfiles((prev) => ({
            ...prev,
            [userId as string]: docSnap.data(),
          }));
        }
      });
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [chats, currentUser]);

  const formatTime = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const openChat = (chatId: string, name: string, photo: string) => {
    router.push({
      pathname: "/chat",
      params: {
        chatId,
        userName: name,
        userPhoto: photo,
      },
    });
  };

  // Marcar imagen como fallida si no logra cargar
  const handleImageError = (userId: string) => {
    setFailedImages((prev) => ({ ...prev, [userId]: true }));
  };

  // Filtrar chats según la búsqueda
  const filteredChats = chats.filter((chat) => {
    const otherUserId = chat.participants?.find((id: string) => id !== currentUser?.uid);
    const profile = profiles[otherUserId];
    const name = profile?.displayName || profile?.email || chat.targetName || "";
    return name.toLowerCase().includes(filterText.toLowerCase());
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Buscador de conversaciones */}
      <View style={[styles.searchContainer, { backgroundColor: colors.header, borderColor: colors.border }]}>
        <Ionicons name="search" size={20} color={colors.subText} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Nombre de usuario a buscar..."
          placeholderTextColor={colors.subText}
          value={filterText}
          onChangeText={setFilterText}
        />
      </View>

      {/* Lista de Chats */}
      <FlatList
        data={filteredChats}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.subText }]}>
            No tienes conversaciones activas.
          </Text>
        }
        renderItem={({ item }) => {
          const otherUserId = item.participants?.find((id: string) => id !== currentUser?.uid);
          const profile = profiles[otherUserId];

          const name = profile?.displayName || profile?.email || item.targetName || "Usuario";
          const photo = profile?.photoURL || item.targetPhoto || "";
          const isOnline = profile?.isOnline || false;
          const hasImageError = failedImages[otherUserId];

          const showPhoto = photo && photo.trim() !== "" && !hasImageError;

          return (
            <TouchableOpacity
              style={[styles.chatCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => openChat(item.id, name, photo)}
              activeOpacity={0.7}
            >
              <View style={styles.avatarContainer}>
                {showPhoto ? (
                  <Image
                    source={{ uri: photo }}
                    style={styles.avatar}
                    onError={() => handleImageError(otherUserId)}
                  />
                ) : (
                  <View style={[styles.avatar, styles.defaultAvatar, { backgroundColor: colors.primary }]}>
                    <Text style={styles.avatarLetter}>
                      {name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                {isOnline && <View style={[styles.onlineBadge, { borderColor: colors.card }]} />}
              </View>

              <View style={styles.chatInfo}>
                <View style={styles.chatHeader}>
                  <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                    {name}
                  </Text>
                  <Text style={[styles.timeText, { color: colors.subText }]}>
                    {formatTime(item.updatedAt)}
                  </Text>
                </View>
                <Text style={[styles.lastMessage, { color: colors.subText }]} numberOfLines={1}>
                  {item.lastMessage || "Sin mensajes aún"}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    margin: 12,
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 15 },
  emptyText: { textAlign: "center", marginTop: 40, fontSize: 14 },
  chatCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  avatarContainer: { position: "relative", marginRight: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  defaultAvatar: { justifyContent: "center", alignItems: "center" },
  avatarLetter: { fontSize: 20, fontWeight: "bold", color: "#000" },
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
  chatInfo: { flex: 1 },
  chatHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  userName: { fontWeight: "bold", fontSize: 16, flex: 1, marginRight: 8 },
  timeText: { fontSize: 12 },
  lastMessage: { fontSize: 14 },
});