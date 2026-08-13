import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const UserLogout = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Signing out...");

  useEffect(() => {
    const doLogout = async () => {
      try {
        const token =
          (await AsyncStorage.getItem("token")) ||
          (await AsyncStorage.getItem("authToken"));

        const baseUrl =
          typeof process !== "undefined" && process.env?.VITE_BASE_URL
            ? process.env.VITE_BASE_URL
            : "http://localhost:3000";

        const response = await fetch(`${baseUrl}/user/logout`, {
          method: "GET",
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => null);
          throw new Error(errorText || `Logout failed (${response.status})`);
        }

        await AsyncStorage.removeItem("token");
        await AsyncStorage.removeItem("authToken");
        setMessage("Signed out successfully.");
        router.replace("/login/UserLogin");
      } catch (err) {
        console.error("Logout failed:", err);
        setMessage("Logout failed. Please try again.");
        Alert.alert("Logout failed", err.message || "Unable to sign out.");
      } finally {
        setLoading(false);
      }
    };

    doLogout();
  }, [router]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Logout</Text>
      <Text style={styles.message}>{message}</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#dc2626" />
      ) : (
        <TouchableOpacity
          onPress={() => router.replace("/login/UserLogin")}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Go to Login</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#ffffff",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: "#334155",
    textAlign: "center",
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#dc2626",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});

export default UserLogout;