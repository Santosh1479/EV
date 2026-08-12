
import React, { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert, ScrollView, Platform } from "react-native";

const Home = () => {
  const [userLocation, setUserLocation] = useState(null);
  const [micOn, setMicOn] = useState(false);
  const [profile, setProfile] = useState(null);

  const recognitionRef = useRef(null);
  const micOnRef = useRef(false);
  const isWeb = Platform.OS === 'web';

  const getStoredToken = async () => {
    if (isWeb && typeof localStorage !== 'undefined') {
      return localStorage.getItem("token") || localStorage.getItem("authToken");
    }

    try {
      const token = await AsyncStorage.getItem("token");
      if (token) {
        return token;
      }
      return await AsyncStorage.getItem("authToken");
    } catch (error) {
      console.debug("AsyncStorage read failed:", error);
      return null;
    }
  };


  /*
   * Keep the ref synchronized with micOn.
   * This prevents SpeechRecognition callbacks from
   * using an old value of micOn.
   */
  useEffect(() => {
    micOnRef.current = micOn;
  }, [micOn]);

  /*
   * Animate the location search panel.
   */
  /*
   * Request microphone permission.
   */
  const requestMicrophonePermission = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      console.warn("Microphone access is not supported by this browser.");
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      // Stop the temporary stream.
      stream.getTracks().forEach((track) => track.stop());

      console.log("Microphone permission granted.");
      return true;
    } catch (error) {
      console.error("Microphone permission denied:", error);
      return false;
    }
  };

  /*
   * Send the voice command to your backend.
   */
  const sendVoiceCommand = async (command) => {
    try {
      const response = await fetch("http://localhost:5000/classify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: command,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Classification server returned ${response.status}`
        );
      }

      const data = await response.json();

      return data.category || null;
    } catch (error) {
      console.error("Error sending voice command:", error);
      return null;
    }
  };

  /*
   * Initialize browser speech recognition.
   */
  const initializeRecognition = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn(
        "Speech recognition is not supported by this browser."
      );
      return;
    }

    const recognition = new SpeechRecognition();

    recognitionRef.current = recognition;

    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      console.log("Voice recognition started.");
    };

    recognition.onresult = async (event) => {
      try {
        const lastResult =
          event.results[event.results.length - 1];

        if (!lastResult || !lastResult[0]) {
          return;
        }

        const transcript = lastResult[0].transcript.trim();

        if (!transcript) {
          return;
        }

        console.log(`Voice command: ${transcript}`);

        const category = await sendVoiceCommand(transcript);

        console.log(`Predicted category: ${category}`);

        if (category === "find_charging_station") {
          setMicOn(false);
          getUserLocation();
        } else if (category === "unrecognized" || !category) {
          if ("speechSynthesis" in window) {
            const utterance = new SpeechSynthesisUtterance(
              "Sorry, I didn't understand that. Please try again."
            );

            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utterance);
          }
        }
      } catch (error) {
        console.error("Error processing voice command:", error);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);

      /*
       * Some errors should automatically stop listening.
       */
      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        setMicOn(false);
      }
    };

    recognition.onend = () => {
      console.log("Voice recognition ended.");

      /*
       * Restart recognition only if the user still wants
       * the microphone to remain active.
       */
      if (micOnRef.current) {
        try {
          recognition.start();
        } catch (error) {
          /*
           * Ignore "already started" errors.
           */
          console.debug(
            "Unable to restart speech recognition:",
            error
          );
        }
      }
    };
  };

  /*
   * Load the authenticated user's profile.
   */
  async function loadProfile() {
    const token = await getStoredToken();

    if (!token) {
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:3000/users/profile",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Profile request failed with status ${response.status}`
        );
      }

      const data = await response.json();

      setProfile(data);
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  /*
   * Initialize speech recognition when the component loads.
   */
  useEffect(() => {
    initializeRecognition();

    return () => {
      if (recognitionRef.current) {
        micOnRef.current = false;

        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.debug("Recognition already stopped.");
        }

        recognitionRef.current = null;
      }

      /*
       * Stop any speech currently being spoken.
       */
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  /*
   * Start/stop speech recognition based on micOn.
   */
  useEffect(() => {
    const recognition = recognitionRef.current;

    if (!recognition) {
      return;
    }

    if (micOn) {
      try {
        recognition.start();
      } catch (error) {
        console.debug(
          "Speech recognition could not be started:",
          error
        );
      }
    } else {
      try {
        recognition.stop();
      } catch (error) {
        console.debug(
          "Speech recognition was already stopped."
        );
      }
    }
  }, [micOn]);

  /*
   * Get the user's current GPS location.
   */
  const getUserLocation = () => {
    if (!navigator.geolocation) {
      console.error(
        "Geolocation is not supported by this browser."
      );

      alert("Geolocation is not supported by your browser.");

      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        console.log(
          `User Location: ${location.latitude}, ${location.longitude}`
        );

        setUserLocation(location);
      },
      (error) => {
        console.error(
          "Error getting user location:",
          error
        );

        let message =
          "Unable to retrieve your location. Please ensure location services are enabled.";

        if (error.code === error.PERMISSION_DENIED) {
          message =
            "Location permission was denied. Please allow location access in your browser settings.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message =
            "Your location is currently unavailable. Please try again.";
        } else if (error.code === error.TIMEOUT) {
          message =
            "Getting your location took too long. Please try again.";
        }

        alert(message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 20000,
      }
    );
  };

  /*
   * Toggle microphone.
   */
  const handleMicToggle = async () => {
    if (!micOn) {
      const permissionGranted =
        await requestMicrophonePermission();

      if (!permissionGranted) {
        return;
      }

      if (!recognitionRef.current) {
        initializeRecognition();
      }

      setMicOn(true);
    } else {
      setMicOn(false);
    }
  };

  /*
   * Check whether the user's reservation is currently active.
   */
  const hasActiveReservation =
    profile?.reservation?.status === "active" &&
    profile?.reservation?.expiresAt &&
    new Date(profile.reservation.expiresAt) > new Date();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Image
          style={styles.logo}
          source={{
            uri: "https://via.placeholder.com/80.png?text=EV",
          }}
        />

        <TouchableOpacity
          onPress={handleMicToggle}
          accessibilityLabel={
            micOn
              ? "Turn off voice search"
              : "Turn on voice search"
          }
          style={[
            styles.micButton,
            micOn ? styles.micButtonOn : styles.micButtonOff,
          ]}
        >
          <Text style={styles.micIcon}>
            {micOn ? "🎤" : "🔇"}
          </Text>
        </TouchableOpacity>
      </View>

      {hasActiveReservation && (
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Active reservation</Text>

          <Text style={styles.bannerText}>
            You have an active reservation for{' '}
            <Text style={styles.boldText}>
              {profile.reservation.chargerType}
            </Text>
            .
          </Text>

          <Text style={styles.bannerText}>
            {profile.reservation.stationId?.name ? (
              <Text>
                Station:{' '}
                <Text style={styles.boldText}>
                  {profile.reservation.stationId.name}
                </Text>
                .
              </Text>
            ) : (
              <Text>
                Station ID:{' '}
                <Text style={styles.boldText}>
                  {String(profile.reservation.stationId)}
                </Text>
                .
              </Text>
            )}
          </Text>

          <Text style={styles.bannerText}>
            Expires at:{' '}
            <Text style={styles.boldText}>
              {new Date(profile.reservation.expiresAt).toLocaleString()}
            </Text>
          </Text>

          <Text style={[styles.bannerText, styles.warningText]}>
            You cannot make another reservation until this reservation expires.
          </Text>
        </View>
      )}

      <View style={styles.main}>
        <View style={styles.card}>
          <Text style={styles.title}>Search a Charging Station</Text>
          <Text style={styles.subtitle}>nearby!!!...</Text>

          <Image
            style={styles.locationImage}
            source={{
              uri: "https://imgs.search.brave.com/Bp5Y2bF4UIXiSfrBqV6599BEQh_wIWk0oUe84nFJG3Y/rs:fit:1200:1200:1/g:ce/aHR0cHM6Ly9pLnBp/bmltZy5jb20vb3Jp/Z2luYWxzLzA4Lzlh/L2RiLzA4OWFkYjEy/ZmIxOTM1ZDRlYzYz/YzM3ODJhOTU4MDYw/LmpwZw",
            }}
            resizeMode="contain"
          />

          <TouchableOpacity
            onPress={getUserLocation}
            style={styles.searchButton}
          >
            <Text style={styles.searchButtonText}>SEARCH</Text>
          </TouchableOpacity>

          <View style={styles.voiceStatus}>
            <Text style={styles.voiceStatusText}>
              {micOn ? 'Listening...' : 'Tap the microphone for voice search'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Trademark registered</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    padding: 16,
    paddingTop: Platform.OS === 'android' ? 36 : 48,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#fff',
  },
  micButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonOn: {
    backgroundColor: '#fff',
  },
  micButtonOff: {
    backgroundColor: '#000',
  },
  micIcon: {
    fontSize: 20,
  },
  banner: {
    backgroundColor: '#FEF5C7',
    borderLeftWidth: 4,
    borderLeftColor: '#FBBF24',
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  bannerTitle: {
    fontWeight: '700',
    marginBottom: 8,
  },
  bannerText: {
    color: '#334155',
    marginBottom: 6,
    lineHeight: 20,
  },
  boldText: {
    fontWeight: '700',
  },
  warningText: {
    color: '#B91C1C',
  },
  main: {
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#DC2626',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  locationImage: {
    width: 140,
    height: 140,
    marginBottom: 20,
  },
  searchButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 18,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchButtonText: {
    color: '#000',
    fontSize: 20,
    fontWeight: '800',
  },
  voiceStatus: {
    marginTop: 8,
  },
  voiceStatusText: {
    color: '#fff',
    fontSize: 14,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    color: '#000',
    fontSize: 12,
  },
});

export default Home;

