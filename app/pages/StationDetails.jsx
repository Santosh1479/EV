import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { API_URL } from "../config/api";

// Change these paths if your images are somewhere else.
// Based on your project structure, if images is:
// project/images/type1.png
// and this file is:
// project/app/pages/StationDetails.jsx
// then ../../images/type1.png is correct.
const PORT_TYPE_META = [
  {
    key: "type1",
    label: "Type 1",
    image: require("../images/type1.jpg"),
  },
  {
    key: "type2",
    label: "Type 2",
    image: require("../images/type2.jpg"),
  },
  {
    key: "ccs",
    label: "CCS",
    image: require("../images/ccs.jpg"),
  },
  {
    key: "chademo",
    label: "CHAdeMO",
    image: require("../images/chademo.jpg"),
  },
];

const API_BASE_URL = API_URL;

const AVERAGE_EV_SPEED_KMH = 40;

const StationDetails = () => {
  const router = useRouter();

  const params = useLocalSearchParams();

  const stationId = params.stationId;

  const originLat = Number(params.originLat);
  const originLng = Number(params.originLng);

  const [station, setStation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedCharger, setSelectedCharger] = useState(null);

  const [showReserveModal, setShowReserveModal] = useState(false);

  const [reservationLoading, setReservationLoading] = useState(false);
  const [reservationMessage, setReservationMessage] = useState("");

  const [reservationSuccess, setReservationSuccess] = useState(null);

  const [activeReservation, setActiveReservation] = useState(null);

  const [remainingSeconds, setRemainingSeconds] = useState(null);

  // ============================================================
  // TOKEN
  // ============================================================

  const getToken = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      console.log(
        "🔑 StationDetails token:",
        token ? "FOUND" : "NOT FOUND"
      );

      return token;
    } catch (err) {
      console.error("❌ Error reading token:", err);
      return null;
    }
  };

  // ============================================================
  // DISTANCE
  // ============================================================

  const calculateDistanceKm = (
    latitude1,
    longitude1,
    latitude2,
    longitude2
  ) => {
    // Validate inputs
    const lat1Num = Number(latitude1);
    const lon1Num = Number(longitude1);
    const lat2Num = Number(latitude2);
    const lon2Num = Number(longitude2);

    if (
      !Number.isFinite(lat1Num) ||
      !Number.isFinite(lon1Num) ||
      !Number.isFinite(lat2Num) ||
      !Number.isFinite(lon2Num)
    ) {
      console.warn(
        "❌ Invalid coordinates for distance calculation:",
        { lat1Num, lon1Num, lat2Num, lon2Num }
      );
      return null;
    }

    // Haversine formula
    const R = 6371; // Earth radius in km

    const dLat = ((lat2Num - lat1Num) * Math.PI) / 180;
    const dLon = ((lon2Num - lon1Num) * Math.PI) / 180;

    const radLat1 = (lat1Num * Math.PI) / 180;
    const radLat2 = (lat2Num * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(radLat1) *
        Math.cos(radLat2) *
        Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.asin(Math.sqrt(a));

    const distance = R * c;

    console.log(
      "📍 Distance calculated:",
      distance.toFixed(2),
      "km"
    );

    return distance;
  };

  const distanceKm =
    station && originLat && originLng
      ? calculateDistanceKm(
          originLat,
          originLng,
          station.latitude,
          station.longitude
        )
      : null;

  console.log(
    "🧮 Distance State:",
    { originLat, originLng, stationLat: station?.latitude, stationLng: station?.longitude, distanceKm }
  );

  // ============================================================
  // CALCULATE DRIVING TIME
  // ============================================================

  const calculateDrivingTime = (km) => {
    if (km === null || km === undefined) {
      return null;
    }
    const minutes = (km / AVERAGE_EV_SPEED_KMH) * 60;
    return Math.round(minutes);
  };

  const drivingTimeMinutes = calculateDrivingTime(distanceKm);

  const formatDrivingTime = () => {
    if (drivingTimeMinutes === null) {
      return "--";
    }
    if (drivingTimeMinutes < 1) {
      return "< 1 min";
    }
    if (drivingTimeMinutes === 1) {
      return "1 min";
    }
    const hours = Math.floor(drivingTimeMinutes / 60);
    const mins = drivingTimeMinutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins} min`;
  };

  // ============================================================
  // FETCH STATION
  // ============================================================

  useEffect(() => {
    const fetchStation = async () => {
      if (!stationId) {
        setError("Station ID is missing.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const token = await getToken();

        if (!token) {
          throw new Error(
            "Authentication token not found."
          );
        }

        console.log(
          "📍 Fetching station:",
          stationId
        );

        const response = await axios.get(
          `${API_BASE_URL}/maps/get-station/${stationId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log(
          "✅ Station received:",
          response.data
        );

        setStation(response.data);
      } catch (err) {
        console.error(
          "❌ STATION FETCH ERROR:",
          err
        );

        console.error(
          "Message:",
          err.message
        );

        setError(
          err.response?.data?.message ||
            err.message ||
            "Unable to load station."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStation();
  }, [stationId]);

  // ============================================================
  // FETCH ACTIVE RESERVATION
  // ============================================================

  useEffect(() => {
    const fetchReservation = async () => {
      try {
        const token = await getToken();

        if (!token) {
          console.log(
            "ℹ️ No token - skipping reservation lookup"
          );
          return;
        }

        const response = await axios.get(
          `${API_BASE_URL}/users/profile`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const reservation =
          response.data?.reservation;

        if (
          reservation &&
          reservation.status === "active"
        ) {
          const expiresAt = new Date(
            reservation.expiresAt
          );

          if (expiresAt > new Date()) {
            setActiveReservation(reservation);

            console.log(
              "✅ Active reservation:",
              reservation
            );
          }
        }
      } catch (err) {
        console.error(
          "❌ Reservation lookup error:",
          err
        );
      }
    };

    fetchReservation();
  }, []);

  // ============================================================
  // RESERVATION COUNTDOWN
  // ============================================================

  useEffect(() => {
    if (!activeReservation) {
      return;
    }

    const interval = setInterval(() => {
      const expiresAt = new Date(
        activeReservation.expiresAt
      ).getTime();

      const now = Date.now();

      const difference =
        expiresAt - now;

      if (difference <= 0) {
        clearInterval(interval);

        setRemainingSeconds(0);
        setActiveReservation(null);

        return;
      }

      setRemainingSeconds(
        Math.floor(difference / 1000)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [activeReservation]);

  // ============================================================
  // FORMAT TIME
  // ============================================================

  const formatRemainingTime = () => {
    if (
      remainingSeconds === null
    ) {
      return "--:--";
    }

    const minutes = Math.floor(
      remainingSeconds / 60
    );

    const seconds =
      remainingSeconds % 60;

    return `${minutes}:${String(
      seconds
    ).padStart(2, "0")}`;
  };

  // ============================================================
  // OPEN RESERVATION
  // ============================================================

  const openReservation = (charger) => {
    const available =
      Number(
        station?.portTypes?.[charger.key]
          ?.available
      ) || 0;

    if (available <= 0) {
      Alert.alert(
        "Unavailable",
        `There are no ${charger.label} ports available.`
      );

      return;
    }

    if (activeReservation) {
      Alert.alert(
        "Active Reservation",
        "You already have an active reservation. Cancel it before reserving another port."
      );

      return;
    }

    console.log(
      "🔌 Selecting charger:",
      charger.key
    );

    setSelectedCharger(charger);
    setReservationMessage("");
    setReservationSuccess(null);
    setShowReserveModal(true);
  };

  // ============================================================
  // RESERVE
  // ============================================================

  const handleConfirmReserve = async () => {
    if (!selectedCharger) {
      return;
    }

    try {
      setReservationLoading(true);
      setReservationMessage("");

      const token = await getToken();

      if (!token) {
        Alert.alert(
          "Login Required",
          "Please login before making a reservation."
        );

        return;
      }

      const payload = {
        stationId: String(stationId),
        chargerType: selectedCharger.key,
        reservedAt: new Date().toISOString(),
      };

      console.log(
        "📤 Reservation payload:",
        payload
      );

      const response = await axios.post(
        `${API_BASE_URL}/reservation/reserve`,
        payload,
        {
          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log(
        "✅ Reservation response:",
        response.data
      );

      const reservation =
        response.data?.reservation;

      setReservationSuccess({
        chargerType:
          selectedCharger.key,

        portNumber:
          reservation?.portNumber,
      });

      setActiveReservation({
        ...reservation,
        stationId,
        chargerType:
          selectedCharger.key,
      });

      setReservationMessage(
        response.data?.message ||
          "Port reserved successfully."
      );

      // Update UI immediately
      setStation((previous) => {
        if (!previous) {
          return previous;
        }

        const updated = {
          ...previous,
        };

        const currentPort =
          updated.portTypes?.[
            selectedCharger.key
          ];

        if (currentPort) {
          updated.portTypes = {
            ...updated.portTypes,

            [selectedCharger.key]: {
              ...currentPort,

              available: Math.max(
                0,
                Number(
                  currentPort.available
                ) - 1
              ),
            },
          };
        }

        updated.portsAvailable =
          Math.max(
            0,
            Number(
              updated.portsAvailable || 0
            ) - 1
          );

        return updated;
      });
    } catch (err) {
      console.error(
        "❌ RESERVATION ERROR:",
        err
      );

      const message =
        err.response?.data?.message ||
        err.message ||
        "Reservation failed.";

      setReservationMessage(message);

      Alert.alert(
        "Reservation Failed",
        message
      );
    } finally {
      setReservationLoading(false);
    }
  };

  // ============================================================
  // CANCEL RESERVATION
  // ============================================================

  const handleCancelReservation = async () => {
    try {
      setReservationLoading(true);

      const token = await getToken();

      if (!token) {
        Alert.alert(
          "Login Required",
          "Authentication token not found."
        );

        return;
      }

      const reservationId =
        activeReservation?.reservationId ||
        activeReservation?._id;

      if (!reservationId) {
        Alert.alert(
          "Error",
          "Reservation ID not found."
        );

        return;
      }

      console.log(
        "🗑️ Cancelling reservation:",
        reservationId
      );

      const response = await axios.post(
        `${API_BASE_URL}/reservation/cancel`,
        {
          reservationId,
        },
        {
          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log(
        "✅ Cancellation response:",
        response.data
      );

      setActiveReservation(null);
      setReservationSuccess(null);
      setRemainingSeconds(null);
      setReservationMessage(
        response.data?.message ||
          "Reservation cancelled."
      );

      // Restore port locally
      setStation((previous) => {
        if (!previous) {
          return previous;
        }

        const chargerType =
          selectedCharger?.key ||
          activeReservation?.chargerType;

        if (!chargerType) {
          return previous;
        }

        const updated = {
          ...previous,
        };

        const currentPort =
          updated.portTypes?.[
            chargerType
          ];

        if (currentPort) {
          updated.portTypes = {
            ...updated.portTypes,

            [chargerType]: {
              ...currentPort,

              available:
                Number(
                  currentPort.available || 0
                ) + 1,
            },
          };
        }

        updated.portsAvailable =
          Number(
            updated.portsAvailable || 0
          ) + 1;

        return updated;
      });

      Alert.alert(
        "Cancelled",
        "Your reservation has been cancelled."
      );
    } catch (err) {
      console.error(
        "❌ CANCEL ERROR:",
        err
      );

      const message =
        err.response?.data?.message ||
        err.message ||
        "Unable to cancel reservation.";

      Alert.alert(
        "Cancellation Failed",
        message
      );
    } finally {
      setReservationLoading(false);
    }
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
        />

        <Text style={styles.loadingText}>
          Loading station...
        </Text>
      </View>
    );
  }

  // ============================================================
  // ERROR
  // ============================================================

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          {error}
        </Text>

        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>
            Go Back
          </Text>
        </Pressable>
      </View>
    );
  }

  if (!station) {
    return (
      <View style={styles.center}>
        <Text>
          Station not found.
        </Text>
      </View>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
      >
        {/* BACK */}
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>
            ← Back
          </Text>
        </Pressable>

        {/* STATION */}
        <View style={styles.stationCard}>
          <Text style={styles.stationName}>
            {station.name}
          </Text>

          {station.address ? (
            <Text style={styles.address}>
              {station.address}
            </Text>
          ) : null}

          {/* DISTANCE */}
          <View style={styles.distanceBox}>
            <Text style={styles.distanceTitle}>
              📍 Distance
            </Text>

            {distanceKm !== null ? (
              <>
                <Text
                  style={styles.distanceValue}
                >
                  {distanceKm < 1
                    ? `${Math.round(
                        distanceKm * 1000
                      )} m`
                    : `${distanceKm.toFixed(
                        2
                      )} km`}
                </Text>

                <Text style={styles.drivingTimeText}>
                  ⏱️ {formatDrivingTime()}
                </Text>
              </>
            ) : (
              <Text>
                Location unavailable
              </Text>
            )}
          </View>

          <Text style={styles.totalPorts}>
            Total available ports:{" "}
            <Text style={styles.bold}>
              {station.portsAvailable ?? 0}
            </Text>
          </Text>

          <Text style={styles.coordinates}>
            {station.latitude},{" "}
            {station.longitude}
          </Text>
        </View>

        {/* ACTIVE RESERVATION */}
        {activeReservation ? (
          <View
            style={
              styles.activeReservation
            }
          >
            <Text
              style={
                styles.activeReservationTitle
              }
            >
              ⚡ Active Reservation
            </Text>

            <Text>
              Charger:{" "}
              {activeReservation.chargerType}
            </Text>

            <Text>
              Port: #
              {
                activeReservation.portNumber
              }
            </Text>

            <Text style={styles.timer}>
              Time remaining:{" "}
              {formatRemainingTime()}
            </Text>

            <Pressable
              style={styles.cancelButton}
              onPress={
                handleCancelReservation
              }
              disabled={
                reservationLoading
              }
            >
              <Text
                style={
                  styles.cancelButtonText
                }
              >
                {reservationLoading
                  ? "Cancelling..."
                  : "Cancel Reservation"}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* CHARGERS */}
        <Text style={styles.sectionTitle}>
          Charging Ports
        </Text>

        {PORT_TYPE_META.map(
          (charger) => {
            const stats =
              station.portTypes?.[
                charger.key
              ] || {
                total: 0,
                available: 0,
              };

            const available =
              Number(
                stats.available || 0
              );

            const total =
              Number(
                stats.total || 0
              );

            const isAvailable =
              available > 0;

            return (
              <Pressable
                key={charger.key}
                onPress={() =>
                  openReservation(
                    charger
                  )
                }
                disabled={
                  !isAvailable ||
                  !!activeReservation
                }
                style={({ pressed }) => [
                  styles.chargerCard,

                  !isAvailable &&
                    styles.disabledCard,

                  activeReservation &&
                    styles.disabledCard,

                  pressed &&
                    isAvailable &&
                    !activeReservation &&
                    styles.pressedCard,
                ]}
              >
                {/* IMAGE IS CLICKABLE BECAUSE IT IS INSIDE PRESSABLE */}
                <Image
                  source={charger.image}
                  style={styles.chargerImage}
                  resizeMode="cover"
                />

                <View
                  style={
                    styles.chargerInfo
                  }
                >
                  <Text
                    style={
                      styles.chargerName
                    }
                  >
                    {charger.label}
                  </Text>

                  <Text
                    style={
                      styles.availableText
                    }
                  >
                    Available:{" "}
                    {available}
                  </Text>

                  <Text
                    style={
                      styles.totalText
                    }
                  >
                    Total: {total}
                  </Text>

                  {isAvailable &&
                  !activeReservation ? (
                    <Text
                      style={
                        styles.reserveHint
                      }
                    >
                      Tap to reserve
                    </Text>
                  ) : activeReservation ? (
                    <Text
                      style={
                        styles.unavailableText
                      }
                    >
                      You have an active
                      reservation
                    </Text>
                  ) : (
                    <Text
                      style={
                        styles.unavailableText
                      }
                    >
                      No ports available
                    </Text>
                  )}
                </View>

                <Text
                  style={styles.arrow}
                >
                  ›
                </Text>
              </Pressable>
            );
          }
        )}

        {/* ROUTE BUTTON */}
        <Pressable
          style={styles.routeButton}
          onPress={() => {
            router.push({
              pathname: "/pages/page",
              params: {
                latitude: String(
                  originLat
                ),
                longitude: String(
                  originLng
                ),
                destinationLat: String(
                  station.latitude
                ),
                destinationLng: String(
                  station.longitude
                ),
              },
            });
          }}
        >
          <Text
            style={styles.routeButtonText}
          >
            🗺️ Show Route
          </Text>
        </Pressable>
      </ScrollView>

      {/* RESERVATION MODAL */}
      {showReserveModal &&
      selectedCharger ? (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              Reserve{" "}
              {selectedCharger.label}
            </Text>

            <Text style={styles.modalStation}>
              {station.name}
            </Text>

            <Image
              source={
                selectedCharger.image
              }
              style={styles.modalImage}
            />

            <View
              style={styles.modalInfo}
            >
              <Text>
                Charger:{" "}
                {selectedCharger.label}
              </Text>

              <Text>
                Available:{" "}
                {
                  station.portTypes?.[
                    selectedCharger.key
                  ]?.available
                }
              </Text>

              <Text>
                Total:{" "}
                {
                  station.portTypes?.[
                    selectedCharger.key
                  ]?.total
                }
              </Text>
            </View>

            {reservationMessage ? (
              <Text
                style={
                  styles.reservationMessage
                }
              >
                {reservationMessage}
              </Text>
            ) : null}

            {reservationSuccess ? (
              <View
                style={
                  styles.successBox
                }
              >
                <Text
                  style={
                    styles.successText
                  }
                >
                  ✓ Reservation successful
                </Text>

                <Text>
                  Port #
                  {
                    reservationSuccess.portNumber
                  }
                </Text>

                <Text>
                  Time remaining:{" "}
                  {formatRemainingTime()}
                </Text>
              </View>
            ) : null}

            <Pressable
              style={
                styles.confirmButton
              }
              onPress={
                handleConfirmReserve
              }
              disabled={
                reservationLoading ||
                !!reservationSuccess
              }
            >
              <Text
                style={
                  styles.confirmButtonText
                }
              >
                {reservationLoading
                  ? "Reserving..."
                  : reservationSuccess
                  ? "Reserved"
                  : "Confirm Reserve"}
              </Text>
            </Pressable>

            {reservationSuccess ? (
              <Pressable
                style={
                  styles.modalCancelButton
                }
                onPress={
                  handleCancelReservation
                }
                disabled={
                  reservationLoading
                }
              >
                <Text
                  style={
                    styles.modalCancelText
                  }
                >
                  {reservationLoading
                    ? "Cancelling..."
                    : "Cancel Reservation"}
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              style={styles.closeButton}
              onPress={() => {
                setShowReserveModal(
                  false
                );
                setSelectedCharger(
                  null
                );
                setReservationMessage(
                  ""
                );
              }}
            >
              <Text
                style={
                  styles.closeButtonText
                }
              >
                Close
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },

  errorText: {
    color: "#dc2626",
    textAlign: "center",
    fontSize: 16,
    marginBottom: 20,
  },

  backButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 16,
    elevation: 2,
  },

  backButtonText: {
    fontWeight: "600",
    color: "#334155",
  },

  stationCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
  },

  stationName: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
  },

  address: {
    marginTop: 6,
    color: "#64748b",
  },

  distanceBox: {
    marginTop: 18,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#eff6ff",
  },

  distanceTitle: {
    fontSize: 14,
    color: "#475569",
  },

  distanceValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#2563eb",
    marginTop: 4,
  },

  drivingTimeText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: 10,
  },

  speedNote: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 4,
  },

  totalPorts: {
    marginTop: 16,
    fontSize: 15,
    color: "#334155",
  },

  bold: {
    fontWeight: "800",
  },

  coordinates: {
    marginTop: 8,
    color: "#64748b",
    fontSize: 12,
  },

  activeReservation: {
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fcd34d",
    padding: 18,
    borderRadius: 20,
    marginBottom: 20,
  },

  activeReservationTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#92400e",
    marginBottom: 8,
  },

  timer: {
    fontSize: 20,
    fontWeight: "800",
    color: "#ea580c",
    marginTop: 8,
  },

  cancelButton: {
    backgroundColor: "#dc2626",
    padding: 13,
    borderRadius: 20,
    marginTop: 14,
    alignItems: "center",
  },

  cancelButtonText: {
    color: "#fff",
    fontWeight: "700",
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 12,
    color: "#0f172a",
  },

  chargerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    elevation: 2,
  },

  pressedCard: {
    backgroundColor: "#eff6ff",
    borderColor: "#2563eb",
  },

  disabledCard: {
    opacity: 0.55,
  },

  chargerImage: {
    width: 78,
    height: 78,
    borderRadius: 18,
  },

  chargerInfo: {
    flex: 1,
    marginLeft: 14,
  },

  chargerName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },

  availableText: {
    marginTop: 5,
    color: "#15803d",
    fontWeight: "600",
  },

  totalText: {
    color: "#64748b",
    marginTop: 2,
  },

  reserveHint: {
    color: "#2563eb",
    marginTop: 5,
    fontSize: 12,
    fontWeight: "700",
  },

  unavailableText: {
    color: "#dc2626",
    marginTop: 5,
    fontSize: 12,
  },

  arrow: {
    fontSize: 30,
    color: "#64748b",
    marginLeft: 8,
  },

  routeButton: {
    backgroundColor: "#dc2626",
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 14,
  },

  routeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },

  modalOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 20,
  },

  modal: {
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 22,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
  },

  modalStation: {
    color: "#64748b",
    marginTop: 4,
  },

  modalImage: {
    width: 100,
    height: 100,
    borderRadius: 20,
    alignSelf: "center",
    marginVertical: 18,
  },

  modalInfo: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 15,
    gap: 7,
  },

  reservationMessage: {
    marginTop: 12,
    color: "#475569",
    textAlign: "center",
  },

  successBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#ecfdf5",
  },

  successText: {
    color: "#047857",
    fontWeight: "800",
    marginBottom: 5,
  },

  confirmButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 18,
  },

  confirmButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },

  modalCancelButton: {
    backgroundColor: "#dc2626",
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 10,
  },

  modalCancelText: {
    color: "#fff",
    fontWeight: "800",
  },

  closeButton: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 10,
  },

  closeButtonText: {
    color: "#334155",
    fontWeight: "700",
  },
});

export default StationDetails;