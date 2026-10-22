import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth, UserRole } from '../hooks/useAuth';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
  const { user, isAuthenticated, role, isLoading, availableRoles, switchRole } = useAuth();

  const router = useRouter();
  if (isLoading) {
  return (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color="#1F4E79" />
    </View>
  );
}

  if (!isAuthenticated || !user) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.card}>
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={styles.title}>Authentication Required</Text>
          <Text style={styles.subtitle}>
            You must log in with verified POPIA credentials before accessing this portal.
          </Text>
          <TouchableOpacity style={styles.button} onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.buttonText}>Go to Verified Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!role || !allowedRoles.includes(role)) {
    return (
      <ScrollView contentContainerStyle={styles.centerContainer}>
        <View style={[styles.card, styles.deniedCard]}>
          <Text style={styles.lockIcon}>🚫</Text>
          <Text style={[styles.title, { color: '#C00000' }]}>Access Denied: Role Unauthorized</Text>
          <Text style={styles.subtitle}>
            Your active session role (<Text style={{ fontWeight: 'bold', color: '#1F4E79' }}>{role}</Text>) is not authorized to view this specific medical module.
          </Text>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Permitted Roles for this screen: {allowedRoles.join(', ')}
            </Text>
          </View>

          {allowedRoles.filter(r => availableRoles.includes(r)).map(r => (
            <TouchableOpacity key={r} style={styles.button} onPress={() => switchRole(r)}>
              <Text style={styles.buttonText}>Switch to {r}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.outlineBtn} onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.outlineText}>Switch credentials / login</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.outlineBtn} onPress={() => router.push('/')}>
            <Text style={styles.outlineText}>Return to Portal Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  centerContainer: { flexGrow: 1, padding: 20, backgroundColor: '#F4F6F9', justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#FFF', width: '100%', maxWidth: 450, padding: 24, borderRadius: 12, alignItems: 'center', elevation: 4 },
  deniedCard: { borderWidth: 2, borderColor: '#C00000' },
  lockIcon: { fontSize: 42, marginBottom: 10 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1F4E79', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 13, color: '#555', textAlign: 'center', lineHeight: 18, marginBottom: 16 },
  infoBox: { backgroundColor: '#FFF3CD', padding: 12, borderRadius: 8, marginBottom: 20, width: '100%' },
  infoText: { fontSize: 12, color: '#856404', textAlign: 'center', fontWeight: 'bold' },
  button: { backgroundColor: '#1F4E79', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 8, width: '100%', alignItems: 'center', marginBottom: 10 },
  buttonText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  outlineBtn: { borderWidth: 1, borderColor: '#1F4E79', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, width: '100%', alignItems: 'center' },
  outlineText: { color: '#1F4E79', fontSize: 14, fontWeight: 'bold' },
});
