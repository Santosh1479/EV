import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ImageBackground,
  Pressable,
  Animated,
  Alert,
  Platform,
} from "react-native";
import { router } from "expo-router";
import axios from "axios";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Speech from "expo-speech";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";

import LocationSearchPanel from "../components/LocationSearchPanel";

const Voice = ExpoSpeechRecognitionModule;

/*
|--------------------------------------------------------------------------
| API CONFIG
|--------------------------------------------------------------------------
|
| Android Emulator:
|   10.0.2.2 points to your computer's localhost.
|
| Physical Android phone:
|   Replace these with your computer's local IP.
|
*/

const API_CLASSIFY_URL = "http://10.0.2.2:5000/classify";
const API_PROFILE_URL = "http://10.0.2.2:3000/users/profile";

const Home = () => {
  const [panelOpen, setPanelOpen] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [micOn, setMicOn] = useState(false);
  const [profile, setProfile] = useState(null);

  /*
  |--------------------------------------------------------------------------
  | Bottom panel animation
  |--------------------------------------------------------------------------
  */

  const panelAnimation = useRef(new Animated.Value(1)).current;

  /*
  |--------------------------------------------------------------------------
  | Voice state
  |--------------------------------------------------------------------------
  */

  const recognitionActiveRef = useRef(false);
  const isMountedRef = useRef(true);

  /*
  |--------------------------------------------------------------------------
  | Panel animation
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    Animated.timing(panelAnimation, {
      toValue: panelOpen ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [panelOpen, panelAnimation]);

  /*
  |--------------------------------------------------------------------------
  | Load user profile
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const token =
        (await AsyncStorage.getItem("token")) ||
        (await AsyncStorage.getItem("authToken"));

      if (!token) {
        console.log("No authentication token found.");
        return;
      }

      const response = await axios.get(API_PROFILE_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (isMountedRef.current) {
        setProfile(response.data);
      }
    } catch (error) {
      console.error(
        "Error loading profile:",
        error?.response?.data || error.message,
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Get user location
  |--------------------------------------------------------------------------
  */

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== Location.PermissionStatus.GRANTED) {
        Alert.alert(
          "Location Permission",
          "Location permission is required to find nearby charging stations. Please enable it in your Android settings.",
        );

        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const coordinates = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      console.log(
        `User Location: ${coordinates.latitude}, ${coordinates.longitude}`,
      );

      if (isMountedRef.current) {
        setUserLocation(coordinates);
        setPanelOpen(true);
      }
    } catch (error) {
      console.error("Error getting user location:", error);

      Alert.alert(
        "Location Error",
        "Unable to retrieve your location. Please make sure location services are enabled.",
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Send voice command to backend
  |--------------------------------------------------------------------------
  */

  const sendVoiceCommand = async (command) => {
    try {
      const response = await axios.post(API_CLASSIFY_URL, {
        text: command,
      });

      return response.data?.category || null;
    } catch (error) {
      console.error(
        "Error sending voice command:",
        error?.response?.data || error.message,
      );

      return null;
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Handle speech result
  |--------------------------------------------------------------------------
  */

  const handleSpeechResults = async (event) => {
    try {
      const transcript = event?.value?.[0]?.trim();

      if (!transcript) {
        return;
      }

      console.log("Voice command:", transcript);

      const category = await sendVoiceCommand(transcript);

      console.log("Predicted category:", category);

      /*
      ------------------------------------------------------------
      FIND CHARGING STATION
      ------------------------------------------------------------
      */

      if (category === "find_charging_station") {
        await stopVoiceRecognition();

        /*
        Web version:
            searchButtonRef.current.click();

        React Native:
            directly call the function.
        */

        await getUserLocation();

        return;
      }

      /*
      ------------------------------------------------------------
      UNRECOGNIZED COMMAND
      ------------------------------------------------------------
      */

      if (category === "unrecognized") {
        Speech.speak("Sorry, I didn't understand that. Please try again.");
      }
    } catch (error) {
      console.error("Error processing speech:", error);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Speech error
  |--------------------------------------------------------------------------
  */

  const handleSpeechError = (event) => {
    console.error("Speech recognition error:", event);

    if (isMountedRef.current) {
      setMicOn(false);
    }

    recognitionActiveRef.current = false;
  };

  /*
  |--------------------------------------------------------------------------
  | Speech started
  |--------------------------------------------------------------------------
  */

  const handleSpeechStart = () => {
    console.log("Speech recognition started.");

    if (isMountedRef.current) {
      setMicOn(true);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Speech ended
  |--------------------------------------------------------------------------
  */

  const handleSpeechEnd = async () => {
    console.log("Speech recognition ended.");

    if (isMountedRef.current) {
      setMicOn(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Start voice recognition
  |--------------------------------------------------------------------------
  */

  const startVoiceRecognition = async () => {
    try {
      const permission =
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Microphone Permission",
          "Please allow microphone access to use voice search.",
        );
        return;
      }

      recognitionActiveRef.current = true;

      ExpoSpeechRecognitionModule.start({
        lang: "en-US",
        interimResults: false,
        continuous: false,
      });

      if (isMountedRef.current) {
        setMicOn(true);
      }

      console.log("Microphone listening...");
    } catch (error) {
      console.error("Could not start voice recognition:", error);

      recognitionActiveRef.current = false;

      if (isMountedRef.current) {
        setMicOn(false);
      }

      Alert.alert("Microphone Error", "Unable to start voice recognition.");
    }
  };

  const stopVoiceRecognition = async () => {
    try {
      recognitionActiveRef.current = false;

      ExpoSpeechRecognitionModule.stop();

      if (isMountedRef.current) {
        setMicOn(false);
      }

      console.log("Microphone stopped.");
    } catch (error) {
      console.error("Could not stop voice recognition:", error);
    }
  };

  const toggleMicrophone = async () => {
    if (micOn) {
      await stopVoiceRecognition();
    } else {
      await startVoiceRecognition();
    }
  };
  /*
  |--------------------------------------------------------------------------
  | Voice initialization
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      recognitionActiveRef.current = false;

      try {
        ExpoSpeechRecognitionModule.stop();
      } catch (error) {
        console.log("Speech cleanup:", error);
      }
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Active reservation
  |--------------------------------------------------------------------------
  */

  const hasActiveReservation =
    profile?.reservation?.status === "active" &&
    profile?.reservation?.expiresAt &&
    new Date(profile.reservation.expiresAt) > new Date();

  /*
  |--------------------------------------------------------------------------
  | Panel height / animation
  |--------------------------------------------------------------------------
  */

  const panelTranslateY = panelAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 500],
  });

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <View style={styles.container}>
      {/* =========================================================
          HEADER
      ========================================================= */}

      <View style={styles.header}>
        <Image
          source={require("../images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* =========================================================
          ACTIVE RESERVATION
      ========================================================= */}

      {hasActiveReservation && (
        <View style={styles.reservationContainer}>
          <Text style={styles.reservationTitle}>Active reservation</Text>

          <Text style={styles.reservationText}>
            You have an active reservation for{" "}
            <Text style={styles.bold}>{profile.reservation.chargerType}</Text>.
          </Text>

          <Text style={styles.reservationText}>
            {profile.reservation.stationId?.name ? (
              <>
                Station:{" "}
                <Text style={styles.bold}>
                  {profile.reservation.stationId.name}
                </Text>
                .
              </>
            ) : (
              <>
                Station ID:{" "}
                <Text style={styles.bold}>
                  {String(profile.reservation.stationId)}
                </Text>
                .
              </>
            )}
          </Text>

          <Text style={styles.reservationText}>
            Expires at:{" "}
            <Text style={styles.bold}>
              {new Date(profile.reservation.expiresAt).toLocaleString()}
            </Text>
          </Text>

          <Text style={styles.warningText}>
            You cannot make another reservation until this expires.
          </Text>
        </View>
      )}

      {/* =========================================================
          MAIN HERO
      ========================================================= */}

      <ImageBackground
        source={{
          uri: "https://pbs.twimg.com/media/Gg3YpqFaMAAn58B?format=jpg&name=large",
        }}
        style={styles.hero}
        imageStyle={styles.heroImage}
      >
        <View style={styles.card}>
          {/* TITLE */}

          <View style={styles.titleContainer}>
            <Text style={styles.title}>Search a Charging Station</Text>

            <Text style={styles.title}>nearby!!!...</Text>
          </View>

          {/* LOCATION IMAGE */}

          <Image
            source={require("../images/logo.png")}
            style={styles.locationIcon}
            resizeMode="contain"
          />

          {/* SEARCH BUTTON */}

          <Pressable
            onPress={getUserLocation}
            style={({ pressed }) => [
              styles.searchButton,
              pressed && styles.searchButtonPressed,
            ]}
          >
            <Text style={styles.searchButtonText}>SEARCH</Text>
          </Pressable>
        </View>
      </ImageBackground>

      {/* =========================================================
          FOOTER
      ========================================================= */}

      <View style={styles.footer}>
        <Text style={styles.footerText}>trademark registered</Text>
      </View>

      {/* =========================================================
          MICROPHONE BUTTON
      ========================================================= */}

      <Pressable
        onPress={toggleMicrophone}
        style={[styles.micButton, micOn && styles.micButtonActive]}
      >
        <Text style={styles.micIcon}>{micOn ? "🎙️" : "🎤"}</Text>

        <Text style={styles.micText}>{micOn ? "Listening..." : "Voice"}</Text>
      </Pressable>

      {/* =========================================================
          LOCATION SEARCH PANEL
      ========================================================= */}

      <Animated.View
        style={[
          styles.panel,
          {
            transform: [
              {
                translateY: panelTranslateY,
              },
            ],
          },
        ]}
      >
        <LocationSearchPanel
          setPanelOpen={setPanelOpen}
          setSelect={(station) => {
            console.log("Selected station:", station);

            router.push({
              pathname: "/pages/page",
              params: {
                latitude: String(userLocation?.latitude),
                longitude: String(userLocation?.longitude),
                destinationLat: String(station.latitude),
                destinationLng: String(station.longitude),
              },
            });
          }}
          userLocation={userLocation}
          setMicOn={setMicOn}
        />
      </Animated.View>
    </View>
  );
};

export default Home;

/*
|--------------------------------------------------------------------------
| STYLES
|--------------------------------------------------------------------------
*/

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },

  /*
  |--------------------------------------------------------------------------
  | HEADER
  |--------------------------------------------------------------------------
  */

  header: {
    height: 85,
    backgroundColor: "#dc2626",
    justifyContent: "center",
    paddingLeft: 16,
  },

  logo: {
    width: 70,
    height: 70,
    borderRadius: 20,
  },

  /*
  |--------------------------------------------------------------------------
  | RESERVATION
  |--------------------------------------------------------------------------
  */

  reservationContainer: {
    backgroundColor: "#fef9c3",
    borderLeftWidth: 5,
    borderLeftColor: "#eab308",
    paddingHorizontal: 15,
    paddingVertical: 12,
  },

  reservationTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#713f12",
    marginBottom: 5,
  },

  reservationText: {
    fontSize: 13,
    color: "#713f12",
    marginBottom: 3,
  },

  bold: {
    fontWeight: "700",
  },

  warningText: {
    color: "#b91c1c",
    marginTop: 8,
    fontSize: 13,
    fontWeight: "600",
  },

  /*
  |--------------------------------------------------------------------------
  | HERO
  |--------------------------------------------------------------------------
  */

  hero: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  heroImage: {
    opacity: 0.55,
  },

  /*
  |--------------------------------------------------------------------------
  | RED CARD
  |--------------------------------------------------------------------------
  */

  card: {
    width: "82%",
    height: 300,

    backgroundColor: "#dc2626",

    borderRadius: 28,

    justifyContent: "space-between",
    alignItems: "center",

    paddingVertical: 20,

    elevation: 8,

    shadowColor: "#000000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },

  /*
  |--------------------------------------------------------------------------
  | TITLE
  |--------------------------------------------------------------------------
  */

  titleContainer: {
    alignItems: "center",
    paddingHorizontal: 10,
  },

  title: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },

  /*
  |--------------------------------------------------------------------------
  | LOCATION ICON
  |--------------------------------------------------------------------------
  */

  locationIcon: {
    width: 105,
    height: 105,
  },

  /*
  |--------------------------------------------------------------------------
  | SEARCH BUTTON
  |--------------------------------------------------------------------------
  */

  searchButton: {
    width: "60%",
    height: 60,

    backgroundColor: "#ffffff",

    borderRadius: 12,

    justifyContent: "center",
    alignItems: "center",

    marginBottom: 5,
  },

  searchButtonPressed: {
    opacity: 0.7,
    transform: [
      {
        scale: 0.97,
      },
    ],
  },

  searchButtonText: {
    color: "#000000",
    fontSize: 25,
    fontWeight: "700",
  },

  /*
  |--------------------------------------------------------------------------
  | FOOTER
  |--------------------------------------------------------------------------
  */

  footer: {
    height: 70,

    backgroundColor: "#000000",

    justifyContent: "center",
    alignItems: "center",
  },

  footerText: {
    color: "#ffffff",
    fontSize: 13,
  },

  /*
  |--------------------------------------------------------------------------
  | MICROPHONE
  |--------------------------------------------------------------------------
  */

  micButton: {
    position: "absolute",

    right: 20,
    bottom: 90,

    width: 65,
    height: 65,

    borderRadius: 35,

    backgroundColor: "#ffffff",

    justifyContent: "center",
    alignItems: "center",

    elevation: 8,

    shadowColor: "#000000",
    shadowOpacity: 0.25,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  micButtonActive: {
    backgroundColor: "#22c55e",
  },

  micIcon: {
    fontSize: 24,
  },

  micText: {
    fontSize: 8,
    fontWeight: "700",
    color: "#000000",
  },

  /*
  |--------------------------------------------------------------------------
  | BOTTOM PANEL
  |--------------------------------------------------------------------------
  */

  panel: {
    position: "absolute",

    left: 0,
    right: 0,
    bottom: 0,

    height: "50%",

    backgroundColor: "#dc2626",

    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,

    borderTopWidth: 2,
    borderColor: "#000000",

    paddingHorizontal: 12,
    paddingVertical: 12,

    zIndex: 20,

    elevation: 20,
  },
});
