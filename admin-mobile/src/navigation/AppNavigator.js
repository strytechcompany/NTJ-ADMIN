import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../screens/LoginScreen";
import OtpScreen from "../screens/OtpScreen";
import GoldDashboardScreen from "../screens/GoldDashboardScreen";
import SilverDashboardScreen from "../screens/SilverDashboardScreen";
import MemberDirectoryScreen from "../screens/MemberDirectoryScreen";
import ChitsScreen from "../screens/ChitsScreen";
import RequestsScreen from "../screens/RequestsScreen";
import PaymentsScreen from "../screens/PaymentsScreen";
import ActiveChitsScreen from "../screens/ActiveChitsScreen";
import { getPersistedSession } from "../utils/storage";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    const loadSession = async () => {
      const session = await getPersistedSession();

      if (session.token && session.department === "gold") {
        setInitialRoute("GoldDashboard");
        return;
      }

      if (session.token && session.department === "silver") {
        setInitialRoute("SilverDashboard");
        return;
      }

      setInitialRoute("Login");
    };

    loadSession();
  }, []);

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fbf5e8" }}>
        <ActivityIndicator size="large" color="#ad880d" />
      </View>
    );
  }

  return (
    <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Otp" component={OtpScreen} />
      <Stack.Screen name="GoldDashboard" component={GoldDashboardScreen} />
      <Stack.Screen name="SilverDashboard" component={SilverDashboardScreen} />
      <Stack.Screen name="Users" component={MemberDirectoryScreen} />
      <Stack.Screen name="Chits" component={ChitsScreen} />
      <Stack.Screen name="Requests" component={RequestsScreen} />
      <Stack.Screen name="ActiveChits" component={ActiveChitsScreen} />
      <Stack.Screen name="Payments" component={PaymentsScreen} />
    </Stack.Navigator>
  );
}
