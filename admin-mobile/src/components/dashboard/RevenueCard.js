import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function RevenueCard({ theme, value, detail }) {
  return (
    <LinearGradient colors={theme.revenueGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>REVENUE</Text>
        <View style={styles.iconWrap}>
          <Text style={styles.iconText}>RS</Text>
        </View>
      </View>

      <View>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.detail}>{detail}</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    padding: 24,
    minHeight: 160,
    justifyContent: "space-between",
    shadowColor: "#7c6500",
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 30,
    elevation: 7
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  title: {
    color: "#fff7da",
    fontSize: 15,
    letterSpacing: 3
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.16)",
    justifyContent: "center",
    alignItems: "center"
  },
  iconText: {
    color: "#fff9e8",
    fontWeight: "800",
    fontSize: 11
  },
  value: {
    fontSize: 44,
    fontWeight: "800",
    color: "#ffffff"
  },
  detail: {
    marginTop: 10,
    fontSize: 14,
    color: "#fff3cf"
  }
});
