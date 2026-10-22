import React, { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';

/** Stage 1: create an Auth account. Clinical identity is collected after login,
 * through complete_patient_registration, never stored in auth metadata. */
export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function register() {
    if (busy) return;
    setMessage('');
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setMessage('Enter your name and a valid email address.'); return;
    }
    if (password.length < 12 || password !== confirm) {
      setMessage('Use a password of at least 12 characters and confirm it correctly.'); return;
    }
    if (phone.trim() && !/^\+?[0-9 ()-]{9,20}$/.test(phone.trim())) {
      setMessage('Enter a valid phone number or leave it blank.'); return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(), password,
        options: { data: { full_name: name.trim(), phone_number: phone.trim() } },
      });
      if (error) throw error;
      if (!data.user) throw new Error('Account creation could not be confirmed.');
      if (!data.session) {
        setMessage('If this email is eligible for registration, check your inbox for a confirmation link. After confirmation, sign in and complete your patient profile.');
      } else {
        setMessage('Account created. Continue to complete your patient profile.');
        router.replace('/(patient)/complete-registration');
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally { setBusy(false); }
  }

  return <ScrollView contentContainerStyle={s.page}>
    <Text style={s.title}>Create your Aura Health account</Text>
    <Text>First create your secure account. You will enter your South African ID, passport or permit details after signing in.</Text>
    <TextInput style={s.input} placeholder="Full name" value={name} onChangeText={setName} autoComplete="name" />
    <TextInput style={s.input} placeholder="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
    <TextInput style={s.input} placeholder="Phone number (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
    <TextInput style={s.input} placeholder="Password (12+ characters)" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
    <TextInput style={s.input} placeholder="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password" />
    {message ? <Text accessibilityRole="alert" style={s.message}>{message}</Text> : null}
    <TouchableOpacity disabled={busy} onPress={() => void register()} style={[s.button, busy && s.disabled]} accessibilityRole="button">
      <Text style={s.buttonText}>{busy ? 'Creating account…' : 'Create account'}</Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={() => router.replace('/(auth)/login')}><Text style={s.link}>Already registered? Sign in</Text></TouchableOpacity>
  </ScrollView>;
}
const s = StyleSheet.create({
  page: { padding: 22, gap: 14, backgroundColor: '#f4f7fa', flexGrow: 1 },
  title: { fontSize: 24, fontWeight: '700', color: '#1f4e79' },
  input: { padding: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8 },
  button: { padding: 16, backgroundColor: '#1f4e79', borderRadius: 8, alignItems: 'center' },
  disabled: { opacity: 0.5 }, buttonText: { color: '#fff', fontWeight: '700' },
  message: { color: '#334155', lineHeight: 21 }, link: { color: '#1f4e79', textAlign: 'center' },
});
