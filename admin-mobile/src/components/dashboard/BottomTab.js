import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { Alert, TouchableOpacity, StyleSheet, Text, View } from "react-native";
import { getPersistedSession } from "../../utils/storage";

const TABS = [
  { name: "Dashboard", icon: "view-dashboard-outline", activeIcon: "view-dashboard" },
  { name: "Users", icon: "account-group-outline", activeIcon: "account-group" },
  { name: "Chits", icon: "notebook-outline", activeIcon: "notebook" },
  { name: "Requests", icon: "clipboard-text-clock-outline", activeIcon: "clipboard-text-clock" },
  { name: "Payments", icon: "wallet-outline", activeIcon: "wallet" }
];

export default function BottomTab({ theme, activeTab = "Dashboard" }) {
  const navigation = useNavigation();

  const handlePress = async (tabName) => {
    let routeName = tabName;
    
    if (tabName === "Dashboard") {
      const session = await getPersistedSession();
      routeName = session.department === "silver" ? "SilverDashboard" : "GoldDashboard";
    }
    
    try {
      navigation.dispatch(
        CommonActions.navigate({
          name: routeName,
        })
      );
    } catch (err) {
      Alert.alert("Navigation Error", err.message);
    }
  };

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.card }]}>
      {TABS.map((tab) => {
        const isActive = tab.name === activeTab;
        return (
          <TouchableOpacity
            key={tab.name}
            onPress={() => handlePress(tab.name)}
            style={styles.tab}
            activeOpacity={0.7}
          >
            <View style={[
              styles.iconCircle, 
              isActive && { backgroundColor: theme.accentStrong, shadowColor: theme.accentStrong }
            ]}>
              <MaterialCommunityIcons 
                name={isActive ? tab.activeIcon : tab.icon} 
                size={24} 
                color={isActive ? "#ffffff" : "#6d6256"} 
              />
            </View>
            <Text style={[
              styles.tabText, 
              { color: isActive ? theme.accentStrong : "#6d6256", fontWeight: isActive ? "800" : "600" }
            ]}>
              {tab.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 35,
    paddingHorizontal: 8,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 15,
    elevation: 10,
    marginTop: 10,
    marginBottom: 5
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
    // Soft shadow for active state
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4
  },
  tabText: {
    fontSize: 10,
    textAlign: "center"
  }
});
