import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { sendNotification } from "../services/api";
import { getPersistedSession } from "../utils/storage";
import { THEMES } from "../utils/themes";

const THEME = THEMES.gold;

export default function NotificationSendScreen({ navigation }) {
  const [title, setTitle] = useState("Admin Announcement");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("general"); // general, payment, offer, alert
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) {
      Alert.alert("Required", "Please enter a message to send.");
      return;
    }

    try {
      setLoading(true);
      const session = await getPersistedSession();
      await sendNotification(session.token, {
        title: title.trim(),
        message: message.trim(),
        type,
        target: "all"
      });

      Alert.alert(
        "Success", 
        "Notification sent to all users!",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to send notification");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: THEME.page }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <MaterialCommunityIcons name="chevron-left" size={32} color={THEME.accentStrong} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Send Notification</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={[styles.input, { backgroundColor: THEME.card }]}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. System Maintenance"
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Message Content</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: THEME.card }]}
              value={message}
              onChangeText={setMessage}
              placeholder="Enter the message for all users..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <Text style={styles.label}>Notification Type</Text>
            <View style={styles.typeRow}>
              {['general', 'offer', 'alert'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeChip,
                    { backgroundColor: type === t ? THEME.accentStrong : THEME.card }
                  ]}
                  onPress={() => setType(t)}
                >
                  <Text style={[
                    styles.typeText,
                    { color: type === t ? "#fff" : THEME.muted }
                  ]}>
                    {t.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity 
              style={[styles.sendBtn, { backgroundColor: THEME.accentStrong }]}
              onPress={handleSend}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialCommunityIcons name="send" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.sendBtnText}>Broadcast to All Users</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 30
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#16120f"
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center"
  },
  form: { gap: 20 },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#888",
    letterSpacing: 0.5
  },
  input: {
    padding: 16,
    borderRadius: 14,
    fontSize: 15,
    fontWeight: "600",
    color: "#1c1610"
  },
  textArea: {
    padding: 16,
    borderRadius: 14,
    fontSize: 15,
    fontWeight: "600",
    color: "#1c1610",
    height: 150
  },
  typeRow: {
    flexDirection: "row",
    gap: 10
  },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10
  },
  typeText: {
    fontSize: 11,
    fontWeight: "800"
  },
  sendBtn: {
    marginTop: 20,
    flexDirection: "row",
    paddingVertical: 18,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8
  },
  sendBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800"
  }
});
