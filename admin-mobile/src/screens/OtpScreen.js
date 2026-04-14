import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { verifyAdminOtp } from "../services/api";
import { persistSession } from "../utils/storage";

export default function OtpScreen({ navigation, route }) {
  const { userId, department, otp: testingOtp } = route.params;
  const [otp, setOtp] = useState(testingOtp || "");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (otp.trim().length !== 6) {
      Alert.alert("Invalid OTP", "Enter the 6-digit code to continue.");
      return;
    }

    try {
      setLoading(true);
      const response = await verifyAdminOtp({
        userId,
        otp: otp.trim()
      });

      await persistSession(response);

      if (response.user.department === "gold") {
        navigation.reset({
          index: 0,
          routes: [{ name: "GoldDashboard" }]
        });
        return;
      }

      navigation.reset({
        index: 0,
        routes: [{ name: "SilverDashboard" }]
      });
    } catch (error) {
      Alert.alert("Verification failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>OTP Verification</Text>
      <Text style={styles.title}>Verify secure access</Text>
      <Text style={styles.subtitle}>
        Enter the 6-digit OTP for the {department} desk. Testing OTP is shown below until SMS is
        integrated.
      </Text>

      <View style={styles.otpCard}>
        <Text style={styles.testingLabel}>Testing OTP</Text>
        <Text style={styles.testingValue}>{testingOtp}</Text>
      </View>

      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        maxLength={6}
        value={otp}
        onChangeText={setOtp}
        placeholder="123456"
        placeholderTextColor="#ac9a7b"
      />

      <Pressable style={styles.button} onPress={handleVerify} disabled={loading}>
        {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Verify</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f3e7",
    paddingHorizontal: 24,
    paddingTop: 96
  },
  eyebrow: {
    color: "#8f6d11",
    fontSize: 14,
    letterSpacing: 2,
    textTransform: "uppercase"
  },
  title: {
    marginTop: 10,
    fontSize: 32,
    fontWeight: "800",
    color: "#231d14"
  },
  subtitle: {
    marginTop: 14,
    fontSize: 17,
    lineHeight: 26,
    color: "#6b5b4a"
  },
  otpCard: {
    marginTop: 28,
    backgroundColor: "#fff7e8",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#f0dfb7",
    padding: 22
  },
  testingLabel: {
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 2,
    color: "#7d620f"
  },
  testingValue: {
    marginTop: 12,
    fontSize: 36,
    fontWeight: "800",
    color: "#1d1812",
    letterSpacing: 8
  },
  input: {
    marginTop: 24,
    backgroundColor: "#f2ebde",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 18,
    fontSize: 28,
    letterSpacing: 12,
    color: "#221a12",
    textAlign: "center"
  },
  button: {
    marginTop: 26,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#ad880d",
    justifyContent: "center",
    alignItems: "center"
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700"
  }
});
