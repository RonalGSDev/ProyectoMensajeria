import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db, getCachedOfflineUser } from "../src/services/firebase";
import { useApp } from "../src/context/AppContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function ChatsScreen() {
  const { colors, t } = useApp();
  const router = useRouter();
  const [chats, setChats] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<{ [key: string]: any }>({});
  const [failedImages, setFailedImages] = useState<{ [key: string]: boolean }>({});
  const [filterText, setFilterText] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(auth.currentUser);

  // 1. Cargar caché offline inmediatamente al montar la pantalla
  useEffect(() => {
    // Cargar usuario autenticado en caché si aún no está en memoria
    getCachedOfflineUser().then((cachedUser) => {
      if (cachedUser) {
        setCurrentUser((prev: any) => prev || cachedUser);
      }
    });

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
      }
    });

    // Cargar chats en caché inmediatamente
    AsyncStorage.getItem("@offline_chats_list").then((cached) => {
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setChats(parsed);
          }
        } catch {}
      }
    });

    // Cargar perfiles de usuarios en caché inmediatamente
    AsyncStorage.getItem("@offline_user_profiles").then((cached) => {
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === "object") {
            setProfiles(parsed);
          }
        } catch {}
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // 2. Escuchar los chats en tiempo real de Firestore
  useEffect(() => {
    if (!currentUser?.uid) return;

    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        list.sort((a: any, b: any) => {
          const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : (a.updatedAt?.seconds ? a.updatedAt.seconds * 1000 : 0);
          const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : (b.updatedAt?.seconds ? b.updatedAt.seconds * 1000 : 0);
          return timeB - timeA;
        });

        setChats(list);
        AsyncStorage.setItem("@offline_chats_list", JSON.stringify(list)).catch(() => {});
      },
      (error) => {
        console.log("Firestore chats en modo offline:", error);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // 3. Escuchar en tiempo real los perfiles de la colección 'users' y persistirlos
  useEffect(() => {
    if (chats.length === 0 || !currentUser?.uid) return;

    const otherUserIds = Array.from(
      new Set(
        chats
          .map((c) => c.participants?.find((id: string) => id !== currentUser.uid))
          .filter(Boolean)
      )
    );

    const unsubscribes = otherUserIds.map((userId) => {
      return onSnapshot(
        doc(db, "users", userId as string),
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setProfiles((prev) => {
              const updated = { ...prev, [userId as string]: data };
              AsyncStorage.setItem("@offline_user_profiles", JSON.stringify(updated)).catch(() => {});
              return updated;
            });
          }
        },
        (err) => {
          console.log("Perfiles en modo offline:", err);
        }
      );
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [chats, currentUser?.uid]);

  const formatTime = (timestamp: any) => {
    if (!timestamp) return "";
    let date: Date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else {
      date = new Date(timestamp);
    }
    if (isNaN(date.getTime())) return "";
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

  const handleImageError = (userId: string) => {
    setFailedImages((prev) => ({ ...prev, [userId]: true }));
  };

  const filteredChats = chats.filter((chat) => {
    const otherUserId = chat.participants?.find((id: string) => id !== (currentUser?.uid || ""));
    const profile = otherUserId ? profiles[otherUserId] : null;
    const name = profile?.displayName || profile?.email || chat.targetName || chat.lastSenderName || "Usuario";
    return name.toLowerCase().includes(filterText.toLowerCase());
  });

  return (
    <SafeAreaView edges={["top"]} style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Buscador de conversaciones traducido dinámicamente */}
      <View style={[styles.searchContainer, { backgroundColor: colors.header, borderColor: colors.border }]}>
        <Ionicons name="search" size={20} color={colors.subText} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={t("search_user")}
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
            {t("no_users")}
          </Text>
        }
        renderItem={({ item }) => {
          const otherUserId = item.participants?.find((id: string) => id !== (currentUser?.uid || ""));
          const profile = otherUserId ? profiles[otherUserId] : null;

          const name = profile?.displayName || profile?.email || item.targetName || item.lastSenderName || "Usuario";
          const photo = profile?.photoURL || item.targetPhoto || "";
          const isOnline = profile?.isOnline || false;
          const hasImageError = otherUserId ? failedImages[otherUserId] : false;

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
                    onError={() => otherUserId && handleImageError(otherUserId)}
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
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: "100%",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
  },
  chatCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  defaultAvatar: {
    justifyContent: "center",
    alignItems: "center",
  },
  avatarLetter: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  onlineBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#25D366",
    borderWidth: 2,
  },
  chatInfo: {
    flex: 1,
    justifyContent: "center",
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    fontSize: 12,
  },
  lastMessage: {
    fontSize: 14,
  },
});
