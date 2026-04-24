import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function Header({ theme, subtitle, onLogout, onNotification }) {
  return (
    <View style={styles.container}>
      <View style={styles.profileRow}>
        <View style={[styles.avatar, { borderColor: theme.accentSoft, backgroundColor: theme.surface }]}>
          <MaterialCommunityIcons name="account" size={28} color={theme.accentStrong} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>NTJ Admin</Text>
          <Text style={[styles.subtitle, { color: theme.accentStrong }]}>{subtitle}</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable style={[styles.actionBtn, { backgroundColor: theme.surface }]} onPress={onNotification}>
          <MaterialCommunityIcons name="bell-outline" size={20} color={theme.accentStrong} />
        </Pressable>

        <Pressable style={[styles.actionBtn, { backgroundColor: theme.surface }]} onPress={onLogout}>
          <MaterialCommunityIcons name="logout" size={20} color={theme.accentStrong} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center"
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "800"
  },
  copy: {
    flex: 1
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#18140f"
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    letterSpacing: 1.6
  },
  actionRow: {
    flexDirection: "row",
    gap: 10
  },
  actionBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center"
  }
});
