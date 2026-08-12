import React, { useState, useContext } from "react";
import { View, Text, TextInput, Image, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { UserDataContext } from "../context/UserContext";

const UserLogin = () => {
  const [email, setEmail] = useState("test@test.com");
  const [pass, setPass] = useState("testpass");
  const userContext = useContext(UserDataContext);
  const user = userContext?.user;
  const setUser = userContext?.setUser;
  const router = useRouter();

let data = {
  email: "test@test.com",
  password:"testpass"
}
const submitHandler = () => {
  router.replace('/home');
}
 
  // const submitHandler = async () => {
  //   // Bypass real login and use a dummy user/token when testing
  //   const USE_DUMMY_LOGIN = true;

  //   const dummyUser = { id: 'demo', name: 'Demo User', email };
  //   const dummyToken = 'demo-token';

  //   if (USE_DUMMY_LOGIN) {
  //     if (typeof setUser === 'function') {
  //       setUser(dummyUser);
  //     } else {
  //       console.warn('UserDataContext.setUser is not available — make sure UserDataContext.Provider wraps the app.');
  //     }

  //     // Try to persist a dummy token (best-effort)
  //     try {
  //       const mod = await import('@react-native-async-storage/async-storage');
  //       const AsyncStorage = mod?.default ?? mod;
  //       if (AsyncStorage && AsyncStorage.setItem) {
  //         await AsyncStorage.setItem('token', dummyToken);
  //       }
  //     } catch (storageErr) {
  //       try {
  //         const secureMod = await import('expo-secure-store');
  //         const SecureStore = secureMod?.default ?? secureMod;
  //         if (SecureStore && SecureStore.setItemAsync) {
  //           await SecureStore.setItemAsync('token', dummyToken);
  //         }
  //       } catch (secureErr) {
  //         // ignore — persistence is optional for demo
  //       }
  //     }

  //     router.push('/home');
  //     setEmail('');
  //     setPass('');
  //     return;
  //   }

  //   // Fallback: real login flow (kept for reference)
  //   try {
  //     const payload = { email, password: pass };

  //     // Replace VITE_BASE_URL env lookup with a fallback for React Native.
  //     const baseUrl = (typeof global?.__DEV__ !== 'undefined')
  //       ? (process.env.VITE_BASE_URL || 'http://localhost:3000')
  //       : (process.env.VITE_BASE_URL || 'https://your-api.example.com');

  //     const resp = await fetch(`${baseUrl}/users/login`, {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify(payload),
  //     });

  //     if (resp.ok) {
  //       const data = await resp.json();
  //       if (typeof setUser === 'function') {
  //         setUser(data.user);
  //       } else {
  //         console.warn('UserDataContext.setUser is not available — make sure UserDataContext.Provider wraps the app.');
  //       }

  //       // Attempt to persist token. Load storage module dynamically so bundler doesn't crash if it's not installed.
  //       try {
  //         const mod = await import('@react-native-async-storage/async-storage');
  //         const AsyncStorage = mod?.default ?? mod;
  //         if (AsyncStorage && AsyncStorage.setItem) {
  //           await AsyncStorage.setItem('token', data.token);
  //         } else {
  //           throw new Error('AsyncStorage API not found');
  //         }
  //       } catch (storageErr) {
  //         console.warn('Async storage unavailable, trying expo-secure-store as fallback:', storageErr);
  //         try {
  //           const secureMod = await import('expo-secure-store');
  //           const SecureStore = secureMod?.default ?? secureMod;
  //           if (SecureStore && SecureStore.setItemAsync) {
  //             await SecureStore.setItemAsync('token', data.token);
  //           } else {
  //             throw new Error('SecureStore API not found');
  //           }
  //         } catch (secureErr) {
  //           console.warn('No persistent storage available:', secureErr);
  //           Alert.alert('Warning', 'Login succeeded but token could not be persisted. Install @react-native-async-storage/async-storage or expo-secure-store.');
  //         }
  //       }

  //       router.push('/home');
  //     } else {
  //       const errText = await resp.text().catch(() => null);
  //       Alert.alert('Login failed', errText || 'Please check your credentials');
  //     }

  //     setEmail('');
  //     setPass('');
  //   } catch (err) {
  //     console.error('Login error:', err);
  //     Alert.alert('Login error', err?.response?.data?.message || err.message || 'Unknown error');
  //   }
  // };

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <Image
          style={styles.logo}
          source={{ uri: "https://imgs.search.brave.com/76mmh10uQydO5wRM5Uaxyu2Efx1lReMlQiA6l_B_mDw/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly90NC5m/dGNkbi5uZXQvanBn/LzA1LzQxLzA5Lzkz/LzM2MF9GXzU0MTA5/OTMwN19tQWFWaFlY/WjdJS2pEcmF5dFJq/cVdMYlNwME9ub3gy/aS5qcGc" }}
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
  container: { flex: 1, padding: 20, justifyContent: "center", backgroundColor: "#fff" },
  inner: { alignItems: "stretch" },
  logo: { width: 80, height: 80, alignSelf: "center", marginBottom: 20 },
  label: { fontSize: 16, fontWeight: "600", marginBottom: 6 },
  input: { backgroundColor: "#eeeeee", marginBottom: 14, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 6 },
  button: { backgroundColor: "#111111", paddingVertical: 12, borderRadius: 6, alignItems: "center", marginBottom: 12 },
  buttonText: { color: "#fff", fontSize: 16 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 8 },
  link: { color: "#1e90ff", marginLeft: 6 },
});

export default UserLogin;
