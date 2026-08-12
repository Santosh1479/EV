import React from 'react'
import { useRouter, Link } from 'expo-router'
import { ImageBackground, Image, View, Text, TouchableOpacity, StyleSheet } from 'react-native'

export default function Index() {
  const router = useRouter()

  const callStationEndpoint = async () => {
    try {
      const response = await fetch('http://localhost:3000/maps/get-station/68bfe3cb4939f7e3e2820c77');
      const data = await response.json();
      console.log('Station endpoint response:', data);
    } catch (error) {
      console.error('Station endpoint error:', error);
    }
  };

  const bgUri = 'https://imgs.search.brave.com/0aNrhVMVuigTyJF2XgLASiqcvo0ZpPdB4xf4ILCA7Eg/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9pLnBp/bmltZy5jb20vb3Jp/Z2luYWxzLzA4Lzlh/L2RiLzA4OWFkYjEy/ZmIxOTM1ZDRlYzYz/YzM3ODJhOTU4MDYw/LmpwZw'
  const logoUri = 'https://via.placeholder.com/80'

  const handleContinue = () => {
    router.push('/login/UserLogin')
  }

  return (
    <ImageBackground source={{ uri: bgUri }} style={styles.bg} resizeMode="cover">
      <Image source={{ uri: logoUri }} style={styles.logo} />
      <View style={styles.card}>
        <Text style={styles.title}>Get Started</Text>
        <TouchableOpacity onPress={handleContinue} style={styles.link}>
          <Text style={styles.linkText}>Continue</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={callStationEndpoint} style={styles.button}>
          <Text style={styles.buttonText}>Test station endpoint</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  )
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    paddingTop: 36,
    justifyContent: 'space-between',
  },
  logo: {
    width: 80,
    height: 80,
    marginLeft: 16,
    borderRadius: 40,
  },
  card: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 12,
    paddingBottom: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  link: {
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 16,
  },
  linkText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  button: {
    marginTop: 12,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
  },
})