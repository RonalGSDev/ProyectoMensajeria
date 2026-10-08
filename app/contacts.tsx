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
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  collection,
  query,
  where,
  getDocs,
  setDoc,
  doc,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";
import { auth, db } from "../src/services/firebase";
import { useApp } from "../src/context/AppContext";

export default function ContactsScreen() {
  const { colors } = useApp();
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
      // Buscar coincidencia en correo o en displayName
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

  // 4. Abrir chat con el usuario
  const startChat = (contact: any) => {
    if (!currentUser) return;

    // Crear un chatId único ordenando los UIDs
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

  // Determinar qué lista renderizar
  const listToDisplay = isSearching ? searchResults : savedContacts;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Buscador Superior */}
      <View style={[styles.searchBarContainer, { backgroundColor: colors.header, borderColor: colors.border }]}>
        <Ionicons name="search" size={20} color={colors.subText} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Buscar contacto por correo o alias..."
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
            {isSearching
              ? "No se encontró ningún usuario con ese correo o alias."
              : "Aún no tienes contactos guardados. Busca arriba para agregar uno."}
          </Text>
        }
        renderItem={({ item }) => {
          // Verificar si el usuario de los resultados de búsqueda ya está guardado
          const isAlreadySaved = savedContacts.some(
            (c) => c.id === item.id || c.friendId === item.id
          );

          const name = item.displayName || item.name || item.email;
          const photo = item.photoURL || item.photo;

          return (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => startChat(item)}
              activeOpacity={0.7}
            >
              <View style={styles.userInfo}>
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
              </View>

              {/* Si estamos en modo búsqueda y aún no está agregado, mostrar botón de agregar */}
              {isSearching && !isAlreadySaved ? (
                <TouchableOpacity
                  style={[styles.addBtn, { backgroundColor: colors.primary }]}
                  onPress={() => addContact(item)}
                >
                  <Ionicons name="person-add" size={18} color="#000" />
                  <Text style={styles.addBtnText}>Agregar</Text>
                </TouchableOpacity>
              ) : (
                <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.primary} />
              )}
            </TouchableOpacity>
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
});