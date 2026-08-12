import React, { useState } from 'react'
import { View, Text, TextInput, Image, TouchableOpacity, StyleSheet } from 'react-native'
import { Link, useRouter } from 'expo-router'

export default function UserSignup() {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [firstname, setFirstname] = useState('')
  const [lastname, setLastname] = useState('')
  const router = useRouter()

  const submitHandler = async () => {
    // Placeholder: in a real app make POST to your API and store token
    console.log('Signing up', { email, firstname, lastname })
    router.push('/home')
  }

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: 'https://imgs.search.brave.com/76mmh10uQydO5wRM5Uaxyu2Efx1lReMlQiA6l_B_mDw/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly90NC5m/dGNkbi5uZXQvanBn/LzA1LzQxLzA5Lzkz/LzM2MF9GXzU0MTA5/OTMwN19tQWFWaFlY/WjdJS2pEcmF5dFJq/cVdMYlNwME9ub3gy/aS5qcGc' }}
        style={styles.logo}
      />

      <View>
        <Text style={styles.label}>Enter your Name</Text>
        <View style={styles.row}>
          <TextInput value={firstname} onChangeText={setFirstname} placeholder="First-name" style={[styles.input, styles.half]} />
          <TextInput value={lastname} onChangeText={setLastname} placeholder="Last-name" style={[styles.input, styles.half]} />
        </View>

        <Text style={styles.label}>Enter your Email</Text>
        <TextInput value={email} onChangeText={setEmail} placeholder="email@example.com" keyboardType="email-address" style={styles.input} autoCapitalize="none" />

        <Text style={styles.label}>Enter Password</Text>
        <TextInput value={pass} onChangeText={setPass} placeholder="Password" secureTextEntry style={styles.input} />

        <TouchableOpacity style={styles.button} onPress={submitHandler}>
          <Text style={styles.buttonText}>Create Account</Text>
        </TouchableOpacity>

        <Text style={styles.signupText}>
          Already have an Account?.. <Link href="/login"><Text style={styles.linkText}>Login Here</Text></Link>
        </Text>
      </View>

      <View>
        <Text style={styles.terms}>
          By proceeding you accept our <Text style={styles.linkText}> Terms & Conditions </Text>, you consent to get calls, WhatsApp or SMS, including automated means.
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 18, justifyContent: 'space-between' },
  logo: { width: 80, height: 80, marginBottom: 16 },
  label: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  input: { backgroundColor: '#eeeeee', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 16 },
  half: { flex: 1 },
  button: { backgroundColor: '#111', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 6 },
  buttonText: { color: '#fff', fontSize: 16 },
  signupText: { textAlign: 'center', marginTop: 12 },
  linkText: { color: '#2563eb' },
  terms: { fontSize: 10, lineHeight: 14 },
})