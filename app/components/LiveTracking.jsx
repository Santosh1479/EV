import React, { useState, useEffect } from 'react'
import { View, Text, Platform } from 'react-native'

const containerStyle = {
    width: '100%',
    height: '100%',
};

const center = {
    lat: -3.745,
    lng: -38.523
};

const LiveTracking = () => {
    const [ currentPosition, setCurrentPosition ] = useState(center);
    const [googleApi, setGoogleApi] = useState(null);

    useEffect(() => {
        navigator.geolocation.getCurrentPosition((position) => {
            const { latitude, longitude } = position.coords;
            setCurrentPosition({
                lat: latitude,
                lng: longitude
            });
        });

        const watchId = navigator.geolocation.watchPosition((position) => {
            const { latitude, longitude } = position.coords;
            setCurrentPosition({
                lat: latitude,
                lng: longitude
            });
        });

        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    useEffect(() => {
        const updatePosition = () => {
            navigator.geolocation.getCurrentPosition((position) => {
                const { latitude, longitude } = position.coords;

                console.log('Position updated:', latitude, longitude);
                setCurrentPosition({
                    lat: latitude,
                    lng: longitude
                });
            });
        };

        updatePosition(); // Initial position update

        const intervalId = setInterval(updatePosition, 1000); // Update every second

        return () => clearInterval(intervalId);
    }, []);

    useEffect(() => {
        // Only load @react-google-maps/api on web to avoid Metro bundler errors on native
        if (Platform.OS === 'web') {
            import('@react-google-maps/api')
                .then((mod) => setGoogleApi(mod))
                .catch((err) => {
                    console.warn('Failed to load Google Maps API module:', err);
                    setGoogleApi(null);
                });
        }
    }, []);

    if (Platform.OS !== 'web') {
        return (
            <View style={{flex:1,justifyContent:'center',alignItems:'center'}}>
                <Text>Live map is not available in the native build. Open the app in a web browser to see the live map.</Text>
            </View>
        )
    }

    if (!googleApi) {
        return (
            <View style={{flex:1,justifyContent:'center',alignItems:'center'}}>
                <Text>Loading map...</Text>
            </View>
        )
    }

    const { LoadScript, GoogleMap, Marker } = googleApi;

    return (
        <LoadScript googleMapsApiKey={typeof window !== 'undefined' ? (window?.ENV?.VITE_GOOGLE_MAPS_API_KEY || process?.env?.VITE_GOOGLE_MAPS_API_KEY) : undefined}>
            <GoogleMap
                mapContainerStyle={containerStyle}
                center={currentPosition}
                zoom={15}
            >
                <Marker position={currentPosition} />
            </GoogleMap>
        </LoadScript>
    )
}

export default LiveTracking