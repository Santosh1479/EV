import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';

const PORT_IMAGE_MAP = {
  type1: '/icons/type1.png',
  type2: '/icons/type2.png',
  ccs: '/icons/ccs.png',
  chademo: '/icons/chademo.png',
};

const LocationSearchPanel = ({ setPanelOpen, setSelect, userLocation, setMicOn }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);
  const stationsRef = useRef([]);
  const isListeningRef = useRef(false);
  const mountedRef = useRef(true);
  const router = useRouter();

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const navigate = (to) => {
    router.push(to);
  };

  const getStationImage = (station) => {
    if (!station?.ports?.length) return PORT_IMAGE_MAP.type1;
    const type = station.ports.includes('ccs')
      ? 'ccs'
      : station.ports.includes('chademo')
      ? 'chademo'
      : station.ports.includes('type2')
      ? 'type2'
      : 'type1';
    return PORT_IMAGE_MAP[type];
  };

  const handleCardClick = (station) => {
    setSelect(station);
    setPanelOpen(false);
    navigate(`/StationDetails?stationId=${station.id}`);
  };

  useEffect(() => {
    if (!userLocation?.latitude || !userLocation?.longitude) return;

    const fetchStations = async () => {
      setLoading(true);
      setError('');
      try {
        // replace with your actual backend endpoint
        const response = await fetch(
          `https://your-backend.example.com/stations?lat=${userLocation.latitude}&lng=${userLocation.longitude}`
        );
        const data = await response.json();
        if (mountedRef.current) {
          setSuggestions(data.stations || []);
          stationsRef.current = data.stations || [];
        }
      } catch (err) {
        if (mountedRef.current) setError('Unable to load stations.');
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };

    fetchStations();
  }, [userLocation?.latitude, userLocation?.longitude]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Nearby Charging Stations</Text>
        <TouchableOpacity onPress={() => setPanelOpen(false)} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by station name"
          placeholderTextColor="#999"
          editable={false}
        />
      </View>

      {loading && <ActivityIndicator size="large" color="#fff" />}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <ScrollView contentContainerStyle={styles.list}>
        {suggestions.map((station) => (
          <TouchableOpacity
            key={station.id}
            style={styles.card}
            onPress={() => handleCardClick(station)}
          >
            <Image source={{ uri: getStationImage(station) }} style={styles.portImage} />
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{station.name}</Text>
              <Text style={styles.cardSubtitle}>{station.address}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#111',
    borderRadius: 20,
    padding: 16,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 10,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  searchBar: {
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: '#222',
    color: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
  },
  errorText: {
    color: '#f88',
    marginBottom: 12,
  },
  list: {
    paddingBottom: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  portImage: {
    width: 48,
    height: 48,
    borderRadius: 12,
    marginRight: 12,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardSubtitle: {
    color: '#cbd5e1',
    fontSize: 13,
  },
});

export default LocationSearchPanel;
