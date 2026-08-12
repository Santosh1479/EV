// import React, { useEffect, useRef } from "react";
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";
// import "leaflet-routing-machine";
// import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
// import { useLocation } from "react-router-dom";

// const Page = () => {
//   const mapRef = useRef(null);
//   const markerRef = useRef(null);
//   const location = useLocation();

//   useEffect(() => {
//     const params = new URLSearchParams(location.search);
//     const destinationLat = parseFloat(params.get("latitude"));
//     const destinationLng = parseFloat(params.get("longitude"));

//     console.log(`Destination: ${destinationLat}, ${destinationLng}`);

//     if (!mapRef.current) {
//       mapRef.current = L.map("map").setView([0, 0], 15);

//       L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
//         attribution: "© OpenStreetMap contributors",
//       }).addTo(mapRef.current);
//     }

//     if (navigator.geolocation) {
//       navigator.geolocation.getCurrentPosition(
//         (position) => {
//           const { latitude, longitude } = position.coords;
//           console.log(`User Location: ${latitude}, ${longitude}`);
//           mapRef.current.setView([latitude, longitude], 15);

//           if (markerRef.current) {
//             markerRef.current.setLatLng([latitude, longitude]);
//           } else {
//             markerRef.current = L.marker([latitude, longitude], {
//               draggable: false,
//             }).addTo(mapRef.current);
//           }

//           L.Routing.control({
//             waypoints: [
//               L.latLng(latitude, longitude),
//               L.latLng(destinationLat, destinationLng),
//             ],
//             routeWhileDragging: false,
//           }).addTo(mapRef.current);
//         },
//         (err) => {
//           console.error("Error getting user location:", err);
//         },
//         {
//           enableHighAccuracy: true,
//           maximumAge: 0,
//           timeout: 10000,
//         }
//       );
//     } else {
//       console.error("Geolocation is not supported by this browser.");
//     }
//   }, [location]);

//   return (
//     <div style={{ height: "100vh", width: "100vw" }}>
//       <div id="map" style={{ height: "100%", width: "100%" }}></div>
//     </div>
//   );
// };

// export default Page;

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

const Page = () => {
  const router = useRouter();
  const mapRef = useRef(null);
  const [mapModule, setMapModule] = useState(null);
  const [mapLoadError, setMapLoadError] = useState(null);

  const {
    latitude,
    longitude,
    destinationLat,
    destinationLng,
  } = useLocalSearchParams();

  const userLatitude = Number(latitude);
  const userLongitude = Number(longitude);
  const destinationLatitude = Number(destinationLat);
  const destinationLongitude = Number(destinationLng);

  const validCoordinates =
    Number.isFinite(userLatitude) &&
    Number.isFinite(userLongitude) &&
    Number.isFinite(destinationLatitude) &&
    Number.isFinite(destinationLongitude);

  const initialRegion = useMemo(() => {
    if (!validCoordinates) {
      return {
        latitude: 20.5937,
        longitude: 78.9629,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }

    return {
      latitude: userLatitude,
      longitude: userLongitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  }, [userLatitude, userLongitude, validCoordinates]);

  const routeCoordinates = useMemo(() => {
    if (!validCoordinates) {
      return [];
    }

    return [
      {
        latitude: userLatitude,
        longitude: userLongitude,
      },
      {
        latitude: destinationLatitude,
        longitude: destinationLongitude,
      },
    ];
  }, [
    userLatitude,
    userLongitude,
    destinationLatitude,
    destinationLongitude,
    validCoordinates,
  ]);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    let active = true;

    import("react-native-maps")
      .then((mod) => {
        if (active) {
          setMapModule(mod);
        }
      })
      .catch((err) => {
        console.error("Failed to load react-native-maps:", err);
        if (active) {
          setMapLoadError(
            "Unable to load the native map module. Please ensure react-native-maps is installed and configured."
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!validCoordinates || !mapRef.current) {
      return;
    }

    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(
        [
          {
            latitude: userLatitude,
            longitude: userLongitude,
          },
          {
            latitude: destinationLatitude,
            longitude: destinationLongitude,
          },
        ],
        {
          edgePadding: {
            top: 120,
            right: 60,
            bottom: 120,
            left: 60,
          },
          animated: true,
        }
      );
    }, 500);

    return () => clearTimeout(timer);
  }, [
    userLatitude,
    userLongitude,
    destinationLatitude,
    destinationLongitude,
    validCoordinates,
  ]);

  if (!validCoordinates) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Unable to load route</Text>
        <Text style={styles.errorText}>
          The starting location or charging station location is missing or invalid.
        </Text>
        <TouchableOpacity
          style={styles.backButtonError}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (Platform.OS === "web") {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Map view not supported on web</Text>
        <Text style={styles.errorText}>
          Open this screen in a native Expo app to view the route map.
        </Text>
        <TouchableOpacity
          style={styles.backButtonError}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (mapLoadError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Map load failed</Text>
        <Text style={styles.errorText}>{mapLoadError}</Text>
        <TouchableOpacity
          style={styles.backButtonError}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!mapModule) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#dc2626" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  const MapView = mapModule.default ?? mapModule;
  const Marker = mapModule.Marker;
  const Polyline = mapModule.Polyline;
  const PROVIDER_GOOGLE = mapModule.PROVIDER_GOOGLE;

  if (!MapView || !Marker || !Polyline) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Unsupported map module</Text>
        <Text style={styles.errorText}>
          The map component could not be initialized.
        </Text>
        <TouchableOpacity
          style={styles.backButtonError}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton
        showsCompass
        loadingEnabled
      >
        <Marker
          coordinate={{
            latitude: userLatitude,
            longitude: userLongitude,
          }}
          title="Your Location"
          description="Starting point"
          pinColor="blue"
        />

        <Marker
          coordinate={{
            latitude: destinationLatitude,
            longitude: destinationLongitude,
          }}
          title="Charging Station"
          description="Destination"
          pinColor="red"
        />

        <Polyline
          coordinates={routeCoordinates}
          strokeWidth={5}
          strokeColor="#2563eb"
        />
      </MapView>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <Text style={styles.backButtonText}>‹ Back</Text>
      </TouchableOpacity>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Charging Station Route</Text>

        <View style={styles.locationRow}>
          <View style={styles.dotBlue} />
          <View style={styles.locationTextContainer}>
            <Text style={styles.locationLabel}>Your Location</Text>
            <Text style={styles.coordinates}>
              {userLatitude.toFixed(6)}, {userLongitude.toFixed(6)}
            </Text>
          </View>
        </View>

        <View style={styles.routeLine} />

        <View style={styles.locationRow}>
          <View style={styles.dotRed} />
          <View style={styles.locationTextContainer}>
            <Text style={styles.locationLabel}>Charging Station</Text>
            <Text style={styles.coordinates}>
              {destinationLatitude.toFixed(6)}, {destinationLongitude.toFixed(6)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },

  map: {
    flex: 1,
  },

  backButton: {
    position: "absolute",
    top: 55,
    left: 16,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 25,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  backButtonError: {
    marginTop: 25,
    backgroundColor: "#dc2626",
    paddingHorizontal: 25,
    paddingVertical: 13,
    borderRadius: 12,
  },

  backButtonText: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "700",
  },

  infoCard: {
    position: "absolute",
    left: 15,
    right: 15,
    bottom: 20,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 18,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  infoTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 15,
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  locationTextContainer: {
    marginLeft: 12,
    flex: 1,
  },

  locationLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },

  coordinates: {
    marginTop: 3,
    fontSize: 12,
    color: "#64748b",
  },

  dotBlue: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#2563eb",
  },

  dotRed: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#dc2626",
  },

  routeLine: {
    height: 20,
    width: 2,
    backgroundColor: "#94a3b8",
    marginLeft: 6,
    marginVertical: 2,
  },

  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
    backgroundColor: "#f8fafc",
  },

  errorTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#dc2626",
    textAlign: "center",
  },

  errorText: {
    marginTop: 12,
    fontSize: 15,
    color: "#475569",
    textAlign: "center",
    lineHeight: 22,
  },
});

export default Page;

