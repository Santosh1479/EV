import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { WebView } from "react-native-webview";
import { useLocalSearchParams, useRouter } from "expo-router";

const Page = () => {
  const router = useRouter();

  const {
    latitude,
    longitude,
    destinationLat,
    destinationLng,
  } = useLocalSearchParams();

  const userLat = parseFloat(latitude);
  const userLng = parseFloat(longitude);
  const destLat = parseFloat(destinationLat);
  const destLng = parseFloat(destinationLng);

  const validCoordinates =
    Number.isFinite(userLat) &&
    Number.isFinite(userLng) &&
    Number.isFinite(destLat) &&
    Number.isFinite(destLng);

  const html = useMemo(() => {
    if (!validCoordinates) {
      return `
        <!DOCTYPE html>
        <html>
          <body>
            <h2>Invalid coordinates</h2>
          </body>
        </html>
      `;
    }

    /*
     * IMPORTANT:
     *
     * Leaflet uses:
     * [latitude, longitude]
     *
     * OSRM URL uses:
     * longitude,latitude
     */

    return `
<!DOCTYPE html>
<html>
<head>

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, maximum-scale=1.0"
/>

<link
  rel="stylesheet"
  href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
/>

<style>

html,
body,
#map {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}

body {
  overflow: hidden;
}

.loading {
  position: absolute;
  z-index: 1000;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);

  background: white;

  padding: 10px 16px;

  border-radius: 20px;

  font-family: Arial;

  box-shadow:
    0 2px 8px rgba(0,0,0,0.25);
}

</style>

</head>

<body>

<div id="map"></div>

<div
  id="loading"
  class="loading"
>
  Calculating route...
</div>

<script
  src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
></script>

<script>

const userLat = ${userLat};
const userLng = ${userLng};

const destLat = ${destLat};
const destLng = ${destLng};

/*
|--------------------------------------------------------------------------
| CREATE MAP
|--------------------------------------------------------------------------
*/

const map = L.map("map");

map.setView(
  [userLat, userLng],
  15
);

/*
|--------------------------------------------------------------------------
| OPENSTREETMAP
|--------------------------------------------------------------------------
*/

L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    maxZoom: 19,

    attribution:
      '&copy; OpenStreetMap contributors'
  }
).addTo(map);

/*
|--------------------------------------------------------------------------
| USER MARKER
|--------------------------------------------------------------------------
*/

const userMarker =
  L.marker([
    userLat,
    userLng
  ])
  .addTo(map)
  .bindPopup(
    "<b>Your Location</b>"
  );

/*
|--------------------------------------------------------------------------
| DESTINATION MARKER
|--------------------------------------------------------------------------
*/

const destinationMarker =
  L.marker([
    destLat,
    destLng
  ])
  .addTo(map)
  .bindPopup(
    "<b>Charging Station</b>"
  );

/*
|--------------------------------------------------------------------------
| OSRM ROUTING
|--------------------------------------------------------------------------
|
| OSRM requires:
|
| longitude,latitude
|
|--------------------------------------------------------------------------
*/

const osrmUrl =
  "https://router.project-osrm.org/route/v1/driving/" +
  userLng +
  "," +
  userLat +
  ";" +
  destLng +
  "," +
  destLat +
  "?overview=full&geometries=geojson";

console.log(
  "OSRM:",
  osrmUrl
);

/*
|--------------------------------------------------------------------------
| GET ROUTE
|--------------------------------------------------------------------------
*/

fetch(osrmUrl)

  .then(response => {

    if (!response.ok) {
      throw new Error(
        "OSRM HTTP " +
        response.status
      );
    }

    return response.json();

  })

  .then(data => {

    console.log(
      "OSRM response:",
      data.code
    );

    if (
      data.code !== "Ok" ||
      !data.routes ||
      data.routes.length === 0
    ) {

      throw new Error(
        "No route found"
      );

    }

    const route =
      data.routes[0];

    /*
     * GeoJSON coordinates are:
     *
     * [longitude, latitude]
     *
     * Leaflet wants:
     *
     * [latitude, longitude]
     */

    const coordinates =
      route.geometry.coordinates.map(
        point => [
          point[1],
          point[0]
        ]
      );

    /*
     |--------------------------------------------------------------------------
     | DRAW ROUTE
     |--------------------------------------------------------------------------
     */

    const routeLine =
      L.polyline(
        coordinates,
        {
          color: "#2563eb",
          weight: 6,
          opacity: 0.9
        }
      ).addTo(map);

    /*
     |--------------------------------------------------------------------------
     | FIT MAP TO ROUTE
     |--------------------------------------------------------------------------
     */

    map.fitBounds(
      routeLine.getBounds(),
      {
        padding: [
          40,
          40
        ]
      }
    );

    /*
     |--------------------------------------------------------------------------
     | DISTANCE
     |--------------------------------------------------------------------------
     */

    const distanceKm =
      (
        route.distance / 1000
      ).toFixed(1);

    /*
     |--------------------------------------------------------------------------
     | DURATION
     |--------------------------------------------------------------------------
     */

    const durationMinutes =
      Math.round(
        route.duration / 60
      );

    routeLine.bindPopup(
      "<b>Route</b><br/>" +
      distanceKm +
      " km<br/>" +
      durationMinutes +
      " minutes"
    );

    /*
     |--------------------------------------------------------------------------
     | REMOVE LOADING
     |--------------------------------------------------------------------------
     */

    const loading =
      document.getElementById(
        "loading"
      );

    if (loading) {
      loading.style.display =
        "none";
    }

  })

  .catch(error => {

    console.error(
      "OSRM error:",
      error
    );

    const loading =
      document.getElementById(
        "loading"
      );

    if (loading) {

      loading.innerHTML =
        "Unable to calculate route";

    }

  });

</script>

</body>
</html>
`;
  }, [
    userLat,
    userLng,
    destLat,
    destLng,
    validCoordinates,
  ]);

  if (!validCoordinates) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>
          Invalid route
        </Text>

        <Text style={styles.errorText}>
          The location coordinates are missing or invalid.
        </Text>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      <WebView
        style={styles.webview}
        originWhitelist={["*"]}
        source={{ html }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        mixedContentMode="always"
        allowsInlineMediaPlayback={true}
      />

      <TouchableOpacity
        style={styles.backButtonTop}
        onPress={() => router.back()}
      >
        <Text style={styles.backText}>
          ← Back
        </Text>
      </TouchableOpacity>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },

  webview: {
    flex: 1,
  },

  backButtonTop: {
    position: "absolute",

    top: 50,
    left: 20,

    backgroundColor: "#ffffff",

    paddingHorizontal: 18,
    paddingVertical: 11,

    borderRadius: 25,

    elevation: 8,

    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  backText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },

  errorContainer: {
    flex: 1,

    justifyContent: "center",
    alignItems: "center",

    padding: 30,
  },

  errorTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#dc2626",
  },

  errorText: {
    marginTop: 10,

    textAlign: "center",

    color: "#64748b",
  },

  backButton: {
    marginTop: 25,

    backgroundColor: "#111827",

    paddingHorizontal: 25,
    paddingVertical: 12,

    borderRadius: 10,
  },
});

export default Page;