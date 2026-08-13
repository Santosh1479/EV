import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const StationDetails = () => {
  const router = useRouter();
  const { stationId, originLat, originLng } = useLocalSearchParams();
  const [station, setStation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const originLatitude = Number(originLat);
  const originLongitude = Number(originLng);
  const hasOrigin =
    Number.isFinite(originLatitude) && Number.isFinite(originLongitude);

  async function getStoredToken() {
    try {
      const token = await AsyncStorage.getItem("token");
      if (token) return token;
      return await AsyncStorage.getItem("authToken");
    } catch (err) {
      console.warn("Unable to read auth token:", err);
      return null;
    }
  }

  useEffect(() => {
    const fetchStation = async () => {
      if (!stationId) {
        setError("Missing station ID.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const token = await getStoredToken();
        const response = await fetch(
          `http://localhost:3000/maps/get-station/${stationId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Station request failed (${response.status})`);
        }

        const data = await response.json();
        setStation(data);
      } catch (err) {
        console.error("Failed to load station details:", err);
        setError("Unable to load station details.");
      } finally {
        setLoading(false);
      }
    };

    fetchStation();
  }, [stationId]);

  const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getTravelMinutes = (distanceKm, speedKmh = 40) => {
    return (distanceKm / speedKmh) * 60;
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#dc2626" />
        <Text style={styles.statusText}>Loading station details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
          <Text style={styles.primaryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!station) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Station not found.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
          <Text style={styles.primaryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const distanceKm = hasOrigin
    ? calculateDistanceKm(originLatitude, originLongitude, station.latitude, station.longitude)
    : null;
  const travelMinutes = distanceKm ? getTravelMinutes(distanceKm) : null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{station.name || "Charging Station"}</Text>
        {station.address ? <Text style={styles.subtitle}>{station.address}</Text> : null}

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Available ports</Text>
          <Text style={styles.detailValue}>{station.portsAvailable ?? 0}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Latitude</Text>
          <Text style={styles.detailValue}>{station.latitude}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Longitude</Text>
          <Text style={styles.detailValue}>{station.longitude}</Text>
        </View>

        {hasOrigin ? (
          <View style={styles.originCard}>
            <Text style={styles.sectionTitle}>Your origin</Text>
            <Text style={styles.originText}>
              {originLatitude.toFixed(6)}, {originLongitude.toFixed(6)}
            </Text>
            <Text style={styles.originText}>Distance: {distanceKm.toFixed(2)} km</Text>
            <Text style={styles.originText}>Travel time: {travelMinutes.toFixed(0)} min</Text>
          </View>
        ) : (
          <Text style={styles.hintText}>
            Origin coordinates were not supplied. Use the home flow to open route preview.
          </Text>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryButton, !hasOrigin && styles.disabledButton]}
            disabled={!hasOrigin}
            onPress={() =>
              router.push(
                `/page?latitude=${originLatitude}&longitude=${originLongitude}&destinationLat=${station.latitude}&destinationLng=${station.longitude}`
              )
            }
          >
            <Text style={styles.primaryButtonText}>Show Route</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#f8fafc",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
    color: "#111827",
  },
  subtitle: {
    color: "#64748b",
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  detailLabel: {
    color: "#475569",
  },
  detailValue: {
    fontWeight: "700",
    color: "#111827",
  },
  originCard: {
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#eef2ff",
  },
  sectionTitle: {
    fontWeight: "700",
    marginBottom: 8,
  },
  originText: {
    color: "#334155",
    marginBottom: 4,
  },
  hintText: {
    marginTop: 20,
    color: "#64748b",
  },
  buttonRow: {
    marginTop: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#dc2626",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  secondaryButtonText: {
    color: "#334155",
    fontWeight: "700",
  },
  disabledButton: {
    backgroundColor: "#cbd5e1",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#f8fafc",
  },
  statusText: {
    marginTop: 12,
    color: "#334155",
  },
  errorText: {
    color: "#dc2626",
    marginBottom: 16,
    textAlign: "center",
  },
});

export default StationDetails;
