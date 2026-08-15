import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { UserDataContext } from "../context/UserContext";
import axios from "axios";
import { API_URL } from "../config/api";

const UserLogin = () => {
  const [email, setEmail] = useState("test@test.com");
  const [pass, setPass] = useState("testpass");
  const userContext = useContext(UserDataContext);
  const user = userContext?.user;
  const setUser = userContext?.setUser;
  const router = useRouter();

  const submitHandler = async () => {
    try {
      const response = await axios.post(`${API_URL}/users/login`, {
        email,
        password: pass,
      });

      console.log("LOGIN RESPONSE:", response.data);

      const token = response.data.token;

      if (!token) {
        Alert.alert("Login Error", "No token received from server.");
        return;
      }

      // Save token locally
      await AsyncStorage.setItem("token", token);

      console.log("Token saved successfully");

      // Optional: save user information
      if (response.data.user && typeof setUser === "function") {
        setUser(response.data.user);
      }

      // Go to Home
      router.replace("/pages/home");
    } catch (error) {
      console.error("Login error:", error?.response?.data || error.message);

      Alert.alert(
        "Login Failed",
        error?.response?.data?.message || "Invalid email or password.",
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <Image
          style={styles.logo}
          source={{
            uri: "https://imgs.search.brave.com/76mmh10uQydO5wRM5Uaxyu2Efx1lReMlQiA6l_B_mDw/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly90NC5m/dGNkbi5uZXQvanBn/LzA1LzQxLzA5Lzkz/LzM2MF9GXzU0MTA5/OTMwN19tQWFWaFlY/WjdJS2pEcmF5dFJq/cVdMYlNwME9ub3gy/aS5qcGc",
          }}
          resizeMode="contain"
        />

        <Text style={styles.label}>Whats your Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="email@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />

        <Text style={styles.label}>Enter Password</Text>
        <TextInput
          value={pass}
          onChangeText={setPass}
          placeholder="Password"
          secureTextEntry
          style={styles.input}
        />

        <TouchableOpacity style={styles.button} onPress={submitHandler}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text>New here?.. </Text>
          <TouchableOpacity onPress={() => router.push("/signup")}>
            <Text style={styles.link}>Create new Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  inner: { alignItems: "stretch" },
  logo: { width: 80, height: 80, alignSelf: "center", marginBottom: 20 },
  label: { fontSize: 16, fontWeight: "600", marginBottom: 6 },
  input: {
    backgroundColor: "#eeeeee",
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
  },
  button: {
    backgroundColor: "#111111",
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonText: { color: "#fff", fontSize: 16 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 8 },
  link: { color: "#1e90ff", marginLeft: 6 },
});

export default UserLogin;
