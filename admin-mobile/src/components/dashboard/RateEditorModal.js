import React, { useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function RateEditorModal({ visible, onClose, onSave, theme, currentRate, metalType }) {
  const [rate, setRate] = useState(currentRate?.toString() || "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!rate || isNaN(rate)) {
      return;
    }
    setLoading(true);
    await onSave({ rate: parseFloat(rate) });
    setLoading(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.modalContainer}
            >
              <View style={[styles.card, { backgroundColor: theme.card }]}>
                <View style={styles.header}>
                  <Text style={[styles.title, { color: theme.accentStrong }]}>
                    DAILY {metalType?.toUpperCase()} RATE
                  </Text>
                  <TouchableOpacity onPress={onClose}>
                    <MaterialCommunityIcons name="close" size={24} color={theme.muted} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>CURRENT MARKET FIXING (PER GRAM)</Text>
                <View style={[styles.inputContainer, { backgroundColor: theme.surface }]}>
                  <Text style={styles.currencyPrefix}>₹</Text>
                  <TextInput
                    style={styles.input}
                    value={rate}
                    onChangeText={setRate}
                    keyboardType="numeric"
                    placeholder="Enter rate"
                    placeholderTextColor={theme.muted}
                    autoFocus
                  />
                </View>

                <TouchableOpacity
                  style={[styles.saveButton, { backgroundColor: theme.accentStrong }]}
                  onPress={handleSave}
                  disabled={loading || !rate}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>UPDATE RATE</Text>
                  )}
                </TouchableOpacity>

                <Text style={styles.footerNote}>
                  This rate will be applied immediately to all {metalType} calculations across the system.
                </Text>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },
  modalContainer: {
    width: "100%",
    maxWidth: 400
  },
  card: {
    borderRadius: 28,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 10
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1.5
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#a0968b",
    letterSpacing: 1,
    marginBottom: 12
  },
  inputContainer: {
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 24,
    height: 64
  },
  currencyPrefix: {
    fontSize: 24,
    fontWeight: "700",
    color: "#16120e",
    marginRight: 8
  },
  input: {
    flex: 1,
    fontSize: 24,
    fontWeight: "700",
    color: "#16120e"
  },
  saveButton: {
    borderRadius: 22,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1.2
  },
  footerNote: {
    marginTop: 20,
    fontSize: 12,
    color: "#8c8172",
    textAlign: "center",
    lineHeight: 18
  }
});
