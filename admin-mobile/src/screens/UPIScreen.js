import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { fetchUPIs, createUPI, toggleUPIActive, removeUPI } from "../services/api";
import { getPersistedSession } from "../utils/storage";

const THEMES = {
  gold: {
    page: "#f8f3e9",
    card: "#ffffff",
    accent: "#b18a0b",
    muted: "#6c6257",
    success: "#2d8a39",
    danger: "#c11d1d",
    surface: "#f4ede2",
    input: "#fbf8f3"
  },
  silver: {
    page: "#f2f4f6",
    card: "#ffffff",
    accent: "#73808b",
    muted: "#5f6870",
    success: "#2d8a39",
    danger: "#c11d1d",
    surface: "#e9edf2",
    input: "#f6f8f9"
  }
};

export default function UPIScreen({ navigation, route }) {
  const department = route.params?.department || "gold";
  const theme = THEMES[department];

  const [upis, setUpis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newUpiId, setNewUpiId] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadUPIs = async () => {
    try {
      setLoading(true);
      const session = await getPersistedSession();
      const data = await fetchUPIs(session.token);
      setUpis(data);
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUPIs();
  }, []);

  const handleAddUPI = async () => {
    if (!newUpiId || !newLabel) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    try {
      setSubmitting(true);
      const session = await getPersistedSession();
      await createUPI(session.token, { upiId: newUpiId, label: newLabel });
      setModalVisible(false);
      setNewUpiId("");
      setNewLabel("");
      loadUPIs();
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (id, isActive) => {
    if (isActive) return; // Already active

    try {
      const session = await getPersistedSession();
      await toggleUPIActive(session.token, id);
      loadUPIs();
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const handleDelete = (id) => {
    Alert.alert("Delete UPI", "Are you sure you want to remove this UPI configuration?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const session = await getPersistedSession();
            await removeUPI(session.token, id);
            loadUPIs();
          } catch (error) {
            Alert.alert("Error", error.message);
          }
        }
      }
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={[styles.card, { backgroundColor: theme.card }]}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.label}>{item.label}</Text>
          <Text style={[styles.upiId, { color: theme.muted }]}>{item.upiId}</Text>
        </View>
        <TouchableOpacity onPress={() => handleDelete(item._id)}>
          <Ionicons name="trash-outline" size={20} color={theme.danger} />
        </TouchableOpacity>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: item.isActive ? theme.success : "#ccc" }]} />
          <Text style={[styles.statusText, { color: item.isActive ? theme.success : theme.muted }]}>
            {item.isActive ? "ACTIVE DESTINATION" : "INACTIVE"}
          </Text>
        </View>

        {!item.isActive && (
          <TouchableOpacity
            style={[styles.activateBtn, { backgroundColor: theme.surface }]}
            onPress={() => handleToggleActive(item._id, item.isActive)}
          >
            <Text style={[styles.activateBtnText, { color: theme.accent }]}>SET ACTIVE</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.page }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={theme.accent} />
        </TouchableOpacity>
        <Text style={styles.title}>UPI Management</Text>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.accent }]} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.infoBox}>
        <Text style={[styles.infoText, { color: theme.muted }]}>
          Manage valid UPI IDs where you want to receive payments. Only the "Active" UPI will be shown to users during checkout.
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={upis}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="card-outline" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No UPI IDs configured yet.</Text>
            </View>
          }
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={styles.modalTitle}>Add New UPI ID</Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.muted }]}>Display Name (e.g. Primary HDFC)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.input }]}
                value={newLabel}
                onChangeText={setNewLabel}
                placeholder="Business Name"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.muted }]}>UPI VPA ID</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.input }]}
                value={newUpiId}
                onChangeText={setNewUpiId}
                placeholder="example@upi"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setModalVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: theme.accent }]}
                onPress={handleAddUPI}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Save UPI</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  title: { fontSize: 20, fontWeight: "800", color: "#1a1a1a" },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  addBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  infoBox: { paddingHorizontal: 20, paddingVertical: 10 },
  infoText: { fontSize: 13, lineHeight: 18 },
  list: { padding: 16, gap: 16 },
  card: { borderRadius: 20, padding: 18, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 15 },
  label: { fontSize: 16, fontWeight: "700", color: "#1a1a1a" },
  upiId: { fontSize: 14, marginTop: 2 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#f0f0f0", paddingTop: 15 },
  statusRow: { flexDirection: "row", alignItems: "center" },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },
  activateBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  activateBtnText: { fontSize: 12, fontWeight: "700" },
  empty: { marginTop: 100, alignItems: "center" },
  emptyText: { marginTop: 15, fontSize: 15, color: "#999" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalContent: { borderRadius: 24, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: "800", marginBottom: 20, textAlign: "center" },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 12, fontWeight: "700", marginBottom: 6, marginLeft: 4 },
  input: { height: 50, borderRadius: 12, paddingHorizontal: 15, fontSize: 15 },
  modalBtns: { flexDirection: "row", gap: 12, marginTop: 10 },
  modalBtn: { flex: 1, height: 50, borderRadius: 15, justifyContent: "center", alignItems: "center" },
  cancelBtn: { backgroundColor: "#f0f0f0" },
  cancelBtnText: { fontWeight: "700", color: "#666" },
  saveBtnText: { fontWeight: "700", color: "#fff" }
});
