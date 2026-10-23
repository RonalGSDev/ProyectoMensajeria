import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Image,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  collection,
  query,
  where,
  getDocs,
  setDoc,
  doc,
  onSnapshot,
  deleteDoc, // NUEVO: Importación para eliminar
} from "firebase/firestore";
import { auth, db } from "../src/services/firebase";
import { useApp } from "../src/context/AppContext";

export default function ContactsScreen() {
  const { colors, t } = useApp();
  const router = useRouter();

  const [savedContacts, setSavedContacts] = useState<any[]>([]);
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const currentUser = auth.currentUser;

  // 1. Cargar la lista de contactos guardados en tiempo real
  useEffect(() => {
    if (!currentUser) return;

    const friendsRef = collection(db, "users", currentUser.uid, "friends");
    const unsubscribe = onSnapshot(friendsRef, (snapshot) => {
      const contacts = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setSavedContacts(contacts);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // 2. Buscar usuarios por correo o alias exacto
  const handleSearch = async (text: string) => {
    setSearchText(text);

    if (!text.trim()) {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const cleanSearch = text.trim().toLowerCase();

    try {
      const qEmail = query(
        collection(db, "users"),
        where("email", "==", cleanSearch)
      );
      const qAlias = query(
        collection(db, "users"),
        where("displayName", "==", text.trim())
      );

      const [snapEmail, snapAlias] = await Promise.all([
        getDocs(qEmail),
        getDocs(qAlias),
      ]);

      const found: any[] = [];
      const seenIds = new Set();

      [...snapEmail.docs, ...snapAlias.docs].forEach((docSnap) => {
        if (docSnap.id !== currentUser?.uid && !seenIds.has(docSnap.id)) {
          seenIds.add(docSnap.id);
          found.push({ id: docSnap.id, ...docSnap.data() });
        }
      });

      setSearchResults(found);
    } catch (error) {
      console.error("Error en búsqueda:", error);
    }
  };

  // 3. Agregar directamente a contactos
  const addContact = async (user: any) => {
    if (!currentUser) return;

    try {
      await setDoc(doc(db, "users", currentUser.uid, "friends", user.id), {
        friendId: user.id,
        displayName: user.displayName || user.email,
        email: user.email,
        photoURL: user.photoURL || "",
      });

      Alert.alert("Éxito", `${user.displayName || user.email} agregado a tus contactos.`);
      setSearchText("");
      setIsSearching(false);
    } catch (error) {
      Alert.alert("Error", "No se pudo agregar el contacto.");
    }
  };

  // 4. NUEVO: Eliminar contacto
  const deleteContact = async (user: any) => {
    if (!currentUser) return;
    try {
      const contactId = user.id || user.friendId;
      await deleteDoc(doc(db, "users", currentUser.uid, "friends", contactId));
    } catch (error) {
      console.error("Error al eliminar contacto:", error);
      Alert.alert("Error", "No se pudo eliminar el contacto.");
    }
  };

  const confirmDelete = (user: any) => {
    const name = user.displayName || user.email;
    if (Platform.OS === "web") {
      const result = window.confirm(`¿Estás seguro de que deseas eliminar a ${name} de tus contactos?`);
      if (result) deleteContact(user);
    } else {
      Alert.alert(
        "Eliminar contacto",
        `¿Eliminar a ${name}?`,
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Eliminar", style: "destructive", onPress: () => deleteContact(user) },
        ]
      );
    }
  };

  // 5. Abrir chat con el usuario
  const startChat = (contact: any) => {
    if (!currentUser) return;

    const chatId = [currentUser.uid, contact.id || contact.friendId]
      .sort()
      .join("_");

    router.push({
      pathname: "/chat",
      params: {
        chatId,
        userName: contact.displayName || contact.name || contact.email,
        userPhoto: contact.photoURL || contact.photo || "",
      },
    });
  };

  const listToDisplay = isSearching ? searchResults : savedContacts;

  return (
    <SafeAreaView edges={["top"]} style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Buscador Superior */}
      <View style={[styles.searchBarContainer, { backgroundColor: colors.header, borderColor: colors.border }]}>
        <Ionicons name="search" size={20} color={colors.subText} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={t("search_nickname")}
          placeholderTextColor={colors.subText}
          value={searchText}
          onChangeText={handleSearch}
          autoCapitalize="none"
        />
        {searchText.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setSearchText("");
              setIsSearching(false);
            }}
          >
            <Ionicons name="close-circle" size={20} color={colors.subText} />
          </TouchableOpacity>
        )}
      </View>

      {/* Lista de Contactos / Resultados */}
      <FlatList
        data={listToDisplay}
        keyExtractor={(item) => item.id || item.friendId}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.subText }]}>
            {isSearching ? t("no_users") : t("no_users")}
          </Text>
        }
        renderItem={({ item }) => {
          const isAlreadySaved = savedContacts.some(
            (c) => c.id === item.id || c.friendId === item.id
          );

          const name = item.displayName || item.name || item.email;
          const photo = item.photoURL || item.photo;

          return (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              
              {/* Lado Izquierdo: Abre el chat */}
              <TouchableOpacity 
                style={styles.userInfo} 
                onPress={() => startChat(item)}
                activeOpacity={0.7}
              >
                {photo ? (
                  <Image source={{ uri: photo }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.defaultAvatar, { backgroundColor: colors.bg }]}>
                    <Ionicons name="person" size={20} color={colors.subText} />
                  </View>
                )}
                <View>
                  <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
                  <Text style={{ color: colors.subText, fontSize: 12 }}>{item.email}</Text>
                </View>
              </TouchableOpacity>

              {/* Lado Derecho: Botones de Acción */}
              {isSearching && !isAlreadySaved ? (
                <TouchableOpacity
                  style={[styles.addBtn, { backgroundColor: colors.primary }]}
                  onPress={() => addContact(item)}
                >
                  <Ionicons name="person-add" size={18} color="#000" />
                  <Text style={styles.addBtnText}>+</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.actionButtonsContainer}>
                  {/* Botón Chat */}
                  <TouchableOpacity onPress={() => startChat(item)} style={styles.iconBtn}>
                    <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.primary} />
                  </TouchableOpacity>
                  
                  {/* Botón Eliminar */}
                  <TouchableOpacity onPress={() => confirmDelete(item)} style={styles.iconBtn}>
                    <Ionicons name="trash-outline" size={22} color="#FF5252" />
                  </TouchableOpacity>
                </View>
              )}

            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    margin: 12,
    borderRadius: 12,
    borderWidth: 1,
    height: 46,
  },
  searchInput: { flex: 1, fontSize: 15 },
  emptyText: { textAlign: "center", marginTop: 40, paddingHorizontal: 20, fontSize: 14 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  userInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  defaultAvatar: { justifyContent: "center", alignItems: "center" },
  name: { fontWeight: "bold", fontSize: 15 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  addBtnText: { color: "#000", fontSize: 12, fontWeight: "bold" },
  actionButtonsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8, // Separación entre los botones de chat y basura
  },
  iconBtn: {
    padding: 6,
  }
});