import { StyleSheet, Text, View, TouchableOpacity } from "react-native";

export default function StatCard({ theme, title, value, detail, badge, accent = "#101010", onPress }) {
  const CardContainer = onPress ? TouchableOpacity : View;
  
  return (
    <CardContainer 
      style={[styles.card, { backgroundColor: theme.card }]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <View style={[styles.badge, { backgroundColor: theme.surface }]}>
          <Text style={[styles.badgeText, { color: accent }]}>{badge}</Text>
        </View>
      </View>

      <Text style={styles.value}>{value}</Text>
      <Text style={[styles.detail, { color: accent }]}>{detail}</Text>
    </CardContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    padding: 22,
    minHeight: 156,
    justifyContent: "space-between",
    shadowColor: "#8d7445",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 4
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  title: {
    fontSize: 14,
    letterSpacing: 2.8,
    color: "#1d1813"
  },
  badge: {
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800"
  },
  value: {
    marginTop: 14,
    fontSize: 28,
    fontWeight: "800",
    color: "#17120d"
  },
  detail: {
    marginTop: 10,
    fontSize: 14
  }
});
