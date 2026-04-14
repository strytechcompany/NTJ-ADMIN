import { StyleSheet, Text, View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomTab from "../components/dashboard/BottomTab";

const THEME = {
  page: "#f8f3e9",
  card: "#ffffff",
  accentStrong: "#b18a0b",
  muted: "#6c6257"
};

export default function PaymentsScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Payment History</Text>
        <Text style={styles.subtitle}>Track collections and disbursement records.</Text>
        
        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderText}>Payments view is under development.</Text>
        </View>
      </ScrollView>
      <View style={styles.bottomTabWrapper}>
        <BottomTab theme={THEME} activeTab="Payments" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8f3e9" },
  content: { padding: 24, paddingBottom: 100, flexGrow: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "800", color: "#1c1610", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#6c6257", textAlign: "center", marginBottom: 30 },
  placeholderCard: {
    padding: 30,
    backgroundColor: "#fff",
    borderRadius: 20,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2
  },
  placeholderText: { color: "#b18a0b", fontWeight: "600" },
  bottomTabWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 1000
  }
});
