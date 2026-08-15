import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Image, Pressable, Alert } from "react-native";

import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Speech from "expo-speech";

import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { API_URL } from "../config/api";
import { useRouter } from "expo-router";

/*
|--------------------------------------------------------------------------
| API
|--------------------------------------------------------------------------
*/

const API_NEAREST_URL = `http://${API_URL}/maps/get-nearest-locations`;

const API_STATION_VOICE_URL = `http://${API_URL}/predict_station`;
/*
|--------------------------------------------------------------------------
| Images
|--------------------------------------------------------------------------
|
| Put these files inside:
|
| app/images/
|
| or
|
| images/
|
| depending on your project structure.
|
*/

const PORT_IMAGE_MAP = {
  type1: require("../images/type1.jpg"),
  type2: require("../images/type2.jpg"),
  ccs: require("../images/ccs.jpg"),
  chademo: require("../images/chademo.jpg"),
};
const PLACEHOLDER_IMAGE = require("../images/placeholder.png");

const LocationSearchPanel = ({
  setPanelOpen,
  setSelect,
  userLocation,
  setMicOn,
}) => {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listeningForStation, setListeningForStation] = useState(false);

  const recognitionActiveRef = useRef(false);
  const mountedRef = useRef(true);
  const stationsRef = useRef([]);

  /*
  |--------------------------------------------------------------------------
  | Get station image
  |--------------------------------------------------------------------------
  */

  const getStationImage = (station) => {
    if (!station?.portTypes) {
      return PLACEHOLDER_IMAGE;
    }

    const preferred = ["type1", "type2", "ccs", "chademo"].find(
      (key) => station.portTypes?.[key]?.total > 0,
    );

    return preferred ? PORT_IMAGE_MAP[preferred] : PLACEHOLDER_IMAGE;
  };

  /*
  |--------------------------------------------------------------------------
  | Navigate to station
  |--------------------------------------------------------------------------
  |
  | React Native does not use react-router-dom.
  |
  | We send the selected station back to Home.
  |
  */

  const selectStation = (station) => {
    if (!station?._id) {
      Alert.alert("Error", "Station ID is missing.");
      return;
    }

    setSelect(station);
    setPanelOpen(false);

    stopStationRecognition();

    console.log("➡️ Opening StationDetails:", station._id);
    console.log("➡️ User Location:", userLocation);

    const userLat = userLocation?.latitude;
    const userLng = userLocation?.longitude;
    console.log("➡️ User Lat:", userLat);
    console.log("➡️ User Lng:", userLng);

    router.push({
      pathname: "/pages/StationDetails",
      params: {
        stationId: String(station._id),
        originLat: String(userLocation.latitude),
        originLng: String(userLocation.longitude),
      },
    });
  };

  /*
  |--------------------------------------------------------------------------
  | Get nearest stations
  |--------------------------------------------------------------------------
  */

  const fetchNearestLocations = async () => {
    if (!userLocation) {
      console.log("❌ No user location");
      return;
    }

    const url = `${API_URL}/maps/get-nearest-locations`;

    const origin = `${userLocation.latitude},${userLocation.longitude}`;

    console.log("=================================");
    console.log("📍 USER LOCATION");
    console.log("latitude:", userLocation.latitude);
    console.log("longitude:", userLocation.longitude);
    console.log("=================================");
    console.log("🌐 API URL:", url);
    console.log("📍 origin:", origin);

    try {
      setLoading(true);

      const token =
        (await AsyncStorage.getItem("token")) ||
        (await AsyncStorage.getItem("authToken"));

      console.log("🔑 Token exists:", !!token);

      const response = await axios.get(url, {
        params: {
          origin,
        },
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {},
        timeout: 10000,
      });

      console.log("✅ STATUS:", response.status);

      console.log("✅ RESPONSE:", JSON.stringify(response.data, null, 2));

      if (Array.isArray(response.data)) {
        setSuggestions(response.data);
        stationsRef.current = response.data;

        console.log(`✅ Found ${response.data.length} stations`);

        if (response.data.length > 0) {
          speakResults(response.data);
        } else {
          Speech.speak("No charging stations were found nearby.");
        }
      } else {
        console.error("❌ Response is not an array:", response.data);
      }
    } catch (error) {
      console.error("❌ NEAREST STATION REQUEST FAILED");

      console.error("Message:", error.message);

      console.error("Code:", error.code);

      console.error("Response:", error.response?.data);

      console.error("Status:", error.response?.status);

      Alert.alert(
        "Station Error",
        error.response?.data?.message ||
          error.message ||
          "Unable to load nearby stations.",
      );
    } finally {
      setLoading(false);
    }
  };
  /*
  |--------------------------------------------------------------------------
  | Speak station results
  |--------------------------------------------------------------------------
  */

  const speakResults = async (stations) => {
    try {
      await Speech.stop();

      const countText =
        stations.length === 1
          ? "Found 1 charging station."
          : `Found ${stations.length} charging stations.`;

      Speech.speak(countText, {
        language: "en-US",
      });

      /*
      | Only announce first 3 stations
      */

      const firstStations = stations.slice(0, 3);

      firstStations.forEach((station, index) => {
        const name = station.name || "Unknown station";

        const ports = station.portsAvailable ?? 0;

        const text =
          `Station ${index + 1}: ${name}. ` + `${ports} ports available.`;

        Speech.speak(text, {
          language: "en-US",
        });
      });

      /*
      | Start listening after speech finishes.
      |
      | Give the speech engine a little time before
      | starting recognition.
      */

      const totalSpeechTime = firstStations.length * 1800 + 1500;

      setTimeout(() => {
        if (mountedRef.current && stationsRef.current.length > 0) {
          startStationRecognition();
        }
      }, totalSpeechTime);
    } catch (error) {
      console.error("Speech error:", error);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Start station voice selection
  |--------------------------------------------------------------------------
  */

  const startStationRecognition = async () => {
    try {
      if (recognitionActiveRef.current) {
        return;
      }

      const permission =
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();

      if (!permission.granted) {
        console.log("Speech permission not granted.");

        return;
      }

      recognitionActiveRef.current = true;

      if (mountedRef.current) {
        setListeningForStation(true);
        setMicOn(true);
      }

      ExpoSpeechRecognitionModule.start({
        lang: "en-US",
        interimResults: false,
        continuous: false,
      });

      console.log("Listening for station selection...");
    } catch (error) {
      console.error("Could not start station recognition:", error);

      recognitionActiveRef.current = false;

      if (mountedRef.current) {
        setListeningForStation(false);
        setMicOn(false);
      }
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Stop station recognition
  |--------------------------------------------------------------------------
  */

  const stopStationRecognition = async () => {
    try {
      recognitionActiveRef.current = false;

      ExpoSpeechRecognitionModule.stop();

      if (mountedRef.current) {
        setListeningForStation(false);
        setMicOn(false);
      }
    } catch (error) {
      console.log("Stop speech error:", error);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Speech start
  |--------------------------------------------------------------------------
  */

  useSpeechRecognitionEvent("start", () => {
    if (!mountedRef.current) {
      return;
    }

    setListeningForStation(true);
    setMicOn(true);

    console.log("Station voice recognition started.");
  });

  /*
  |--------------------------------------------------------------------------
  | Speech end
  |--------------------------------------------------------------------------
  */

  useSpeechRecognitionEvent("end", () => {
    recognitionActiveRef.current = false;

    if (!mountedRef.current) {
      return;
    }

    setListeningForStation(false);
    setMicOn(false);

    console.log("Station voice recognition ended.");
  });

  /*
  |--------------------------------------------------------------------------
  | Speech error
  |--------------------------------------------------------------------------
  */

  useSpeechRecognitionEvent("error", (event) => {
    console.error("Station speech recognition error:", event);

    recognitionActiveRef.current = false;

    if (mountedRef.current) {
      setListeningForStation(false);
      setMicOn(false);
    }
  });

  /*
  |--------------------------------------------------------------------------
  | Speech result
  |--------------------------------------------------------------------------
  */

  useSpeechRecognitionEvent("result", async (event) => {
    try {
      const transcript = event?.results?.[0]?.transcript?.trim();

      if (!transcript) {
        return;
      }

      console.log("Station voice command:", transcript);

      await stopStationRecognition();

      const stations = stationsRef.current;

      if (!stations.length) {
        return;
      }

      const stationNames = stations.map((station) => station.name);

      /*
        | Send command to classifier
        */

      const response = await axios.post(API_STATION_VOICE_URL, {
        text: transcript,
        stations: stationNames,
      });

      const selectedStationName = response.data?.station;

      if (!selectedStationName) {
        Speech.speak(
          `I could not find a station matching ${transcript}. Please try again.`,
          {
            language: "en-US",
          },
        );

        return;
      }

      const selectedStation = stations.find(
        (station) =>
          station.name?.toLowerCase().trim() ===
          selectedStationName?.toLowerCase().trim(),
      );

      if (selectedStation) {
        selectStation(selectedStation);
      } else {
        Speech.speak(`Station ${transcript} was not found. Please try again.`, {
          language: "en-US",
        });
      }
    } catch (error) {
      console.error(
        "Error processing station voice:",
        error?.response?.data || error?.message || error,
      );

      Speech.speak("Sorry, I could not process that station selection.");
    }
  });

  /*
  |--------------------------------------------------------------------------
  | Fetch when location changes
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    mountedRef.current = true;

    if (userLocation) {
      fetchNearestLocations();
    }

    return () => {
      mountedRef.current = false;

      recognitionActiveRef.current = false;

      try {
        ExpoSpeechRecognitionModule.stop();
      } catch {}

      Speech.stop();
    };
  }, [userLocation]);

  /*
  |--------------------------------------------------------------------------
  | Manual card click
  |--------------------------------------------------------------------------
  */

  const handleCardClick = (suggestion) => {
    if (!userLocation) {
      Alert.alert("Location Error", "Your location is not available.");
      return;
    }

    setSelect(suggestion);
    setPanelOpen(false);

    router.push({
      pathname: "/pages/StationDetails",
      params: {
        stationId: String(suggestion._id),
        originLat: String(userLocation.latitude),
        originLng: String(userLocation.longitude),
      },
    });
  };

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <View style={styles.container}>
      {/* ---------------------------------------------------------
          CLOSE BUTTON
      --------------------------------------------------------- */}

      <Pressable
        style={styles.closeButton}
        onPress={() => {
          stopStationRecognition();
          setPanelOpen(false);
        }}
      >
        <Text style={styles.closeText}>↓</Text>
      </Pressable>

      {/* ---------------------------------------------------------
          TITLE
      --------------------------------------------------------- */}

      <Text style={styles.title}>Nearby Charging Stations</Text>

      {/* ---------------------------------------------------------
          LOADING
      --------------------------------------------------------- */}

      {loading && (
        <Text style={styles.statusText}>
          Finding nearby charging stations...
        </Text>
      )}

      {/* ---------------------------------------------------------
          VOICE STATUS
      --------------------------------------------------------- */}

      {listeningForStation && (
        <View style={styles.voiceContainer}>
          <Text style={styles.voiceIcon}>🎙️</Text>

          <Text style={styles.voiceText}>Say a station name</Text>
        </View>
      )}

      {/* ---------------------------------------------------------
          EMPTY
      --------------------------------------------------------- */}

      {!loading && suggestions.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No charging stations found.</Text>
        </View>
      )}

      {/* ---------------------------------------------------------
          STATION LIST
      --------------------------------------------------------- */}

      <View style={styles.list}>
        {suggestions.map((station, index) => (
          <Pressable
            key={station._id || station.id || index}
            onPress={() => handleCardClick(station)}
            style={({ pressed }) => [
              styles.card,
              pressed && styles.cardPressed,
            ]}
          >
            {/* IMAGE */}

            <View style={styles.imageContainer}>
              <Image
                source={getStationImage(station)}
                style={styles.stationImage}
                resizeMode="cover"
              />
            </View>

            {/* INFORMATION */}

            <View style={styles.info}>
              <Text style={styles.stationName} numberOfLines={2}>
                {station.name || "Charging Station"}
              </Text>

              <Text style={styles.tapText}>Tap to view route</Text>
            </View>

            {/* RIGHT SIDE */}

            <View style={styles.rightInfo}>
              <Text style={styles.portsText}>
                {station.portsAvailable ?? 0} Ports
              </Text>

              <Text style={styles.distanceText}>
                {station.distance ?? "--"} KM
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

export default LocationSearchPanel;

/*
|--------------------------------------------------------------------------
| STYLES
|--------------------------------------------------------------------------
*/

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  closeButton: {
    height: 42,
    justifyContent: "center",
    alignItems: "center",
  },

  closeText: {
    color: "#ffffff",
    fontSize: 36,
    fontWeight: "700",
  },

  title: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },

  statusText: {
    color: "#ffffff",
    textAlign: "center",
    fontSize: 14,
    marginBottom: 8,
  },

  voiceContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#22c55e",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
    alignSelf: "center",
    marginBottom: 8,
  },

  voiceIcon: {
    fontSize: 18,
    marginRight: 6,
  },

  voiceText: {
    color: "#000000",
    fontWeight: "700",
    fontSize: 13,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  emptyText: {
    color: "#ffffff",
    fontSize: 16,
  },

  list: {
    flex: 1,
  },

  card: {
    width: "100%",
    minHeight: 90,

    backgroundColor: "#ffffff",

    borderRadius: 14,

    marginBottom: 10,

    padding: 10,

    flexDirection: "row",

    alignItems: "center",

    borderWidth: 2,
    borderColor: "#64748b",

    elevation: 4,

    shadowColor: "#000000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  cardPressed: {
    opacity: 0.7,
    transform: [
      {
        scale: 0.98,
      },
    ],
  },

  imageContainer: {
    width: 62,
    height: 62,

    borderRadius: 18,

    overflow: "hidden",

    backgroundColor: "#f1f5f9",
  },

  stationImage: {
    width: "100%",
    height: "100%",
  },

  info: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },

  stationName: {
    color: "#1e40af",
    fontSize: 17,
    fontWeight: "700",
  },

  tapText: {
    color: "#64748b",
    fontSize: 11,
    marginTop: 5,
  },

  rightInfo: {
    alignItems: "flex-end",
    minWidth: 65,
  },

  portsText: {
    color: "#000000",
    fontSize: 13,
    fontWeight: "700",
  },

  distanceText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 5,
  },
});
