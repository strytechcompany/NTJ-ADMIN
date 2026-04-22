import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function MarketCard({ theme, rate, currency, metalType, onEdit }) {
  const formatCurrency = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 2
    }).format(Number(value || 0));

  return (
    <View style={[styles.card, { backgroundColor: theme.marketCard }]}>
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <Text style={styles.title}>DAILY {metalType?.toUpperCase()} RATE</Text>
          <View style={[styles.badge, { backgroundColor: theme.accentStrong + "26" }]}>
            <Text style={[styles.badgeText, { color: theme.accentStrong }]}>LIVE</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onEdit} style={[styles.editBtn, { backgroundColor: theme.card }]}>
          <MaterialCommunityIcons name="pencil" size={20} color={theme.accentStrong} />
        </TouchableOpacity>
      </View>

      <View style={styles.rateContainer}>
        <Text style={styles.rateValue}>{formatCurrency(rate)}</Text>
        <Text style={styles.rateUnit}>per gram</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.statusIndicator}>
          <View style={[styles.dot, { backgroundColor: theme.accentStrong }]} />
          <Text style={styles.statusText}>Authorized Rate</Text>
        </View>
        <Text style={styles.updatedText}>TAP PENCIL TO UPDATE</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    padding: 24,
    shadowColor: "#8d7445",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 24,
    elevation: 6
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16
  },
  titleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: "#5d5348"
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800"
  },
  editBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2
  },
  rateContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginTop: 4
  },
  rateValue: {
    fontSize: 42,
    fontWeight: "800",
    color: "#16120e"
  },
  rateUnit: {
    fontSize: 16,
    color: "#8c8172",
    fontWeight: "600"
  },
  footer: {
    marginTop: 22,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.04)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#5d5348"
  },
  updatedText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#a0968b",
    letterSpacing: 0.5
  }
});
