import { Pressable, StyleSheet, Text, View } from "react-native";

const TYPE_BADGES = {
  user: "USR",
  chit: "CHT",
  payment: "PAY"
};

export default function ActivityCard({ theme, activity }) {
  const isPrimaryStrong =
    activity.primaryAction === "Approve" ||
    activity.primaryAction === "Review" ||
    activity.primaryAction === "Release Funds";

  return (
    <View style={[styles.card, { backgroundColor: theme.card }]}>
      <View style={styles.topRow}>
        <View style={[styles.badge, { backgroundColor: theme.surface }]}>
          <Text style={[styles.badgeText, { color: theme.accentStrong }]}>
            {TYPE_BADGES[activity.type] || "ADM"}
          </Text>
        </View>

        <View style={styles.copy}>
          <Text style={styles.title}>{activity.title}</Text>
          <Text style={styles.subtitle}>
            {activity.name} - {activity.details}
          </Text>
          <Text style={styles.time}>{activity.time}</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        {activity.secondaryAction ? (
          <Pressable style={[styles.secondaryButton, { backgroundColor: theme.surface }]}>
            <Text style={styles.secondaryText}>{activity.secondaryAction}</Text>
          </Pressable>
        ) : (
          <View />
        )}

        <Pressable
          style={[
            styles.primaryButton,
            {
              backgroundColor: isPrimaryStrong ? theme.accentStrong : theme.surface
            }
          ]}
        >
          <Text
            style={[
              styles.primaryText,
              { color: isPrimaryStrong ? "#ffffff" : theme.accentStrong }
            ]}
          >
            {activity.primaryAction}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    padding: 18,
    shadowColor: "#8d7445",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 22,
    elevation: 3
  },
  topRow: {
    flexDirection: "row",
    gap: 14
  },
  badge: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center"
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800"
  },
  copy: {
    flex: 1
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#181410"
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: "#5b5044"
  },
  time: {
    marginTop: 4,
    fontSize: 13,
    color: "#7d7368"
  },
  actionRow: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12
  },
  secondaryButton: {
    minWidth: 96,
    borderRadius: 18,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16
  },
  secondaryText: {
    fontSize: 15,
    color: "#2f2720"
  },
  primaryButton: {
    minWidth: 122,
    borderRadius: 18,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18
  },
  primaryText: {
    fontSize: 16,
    fontWeight: "700"
  }
});
