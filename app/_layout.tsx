import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/hooks/useAuth';
import { PortalHeader } from '../src/components/PortalHeader';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#1F4E79' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' },
          headerRight: () => <PortalHeader />,
        }}
      >
        <Stack.Screen name="accept-invite" options={{ title: 'Activate AuraHealth Account' }} />
        <Stack.Screen name="reset-password" options={{ title: 'Reset Password' }} />
        <Stack.Screen name="(patient)/my-appointments" options={{ title: 'My Appointments' }} />
        <Stack.Screen name="(patient)/profile" options={{ title: 'My Profile' }} />
        <Stack.Screen name="(patient)/complete-registration" options={{ title: 'Complete Patient Registration' }} />
        <Stack.Screen name="(admin)/queue-management" options={{ title: 'Facility Queue Management' }} />
        <Stack.Screen name="(admin)/sysadmin" options={{ title: 'System Administration' }} />
        <Stack.Screen name="activate" options={{ title: 'Activate Account' }} />
        <Stack.Screen name="index" options={{ title: 'Aura Health National Portal' }} />
        <Stack.Screen name="(auth)/login" options={{ title: 'Sign In' }} />
        <Stack.Screen name="(auth)/register" options={{ title: 'Create Patient Account' }} />
        <Stack.Screen name="(patient)/book-appointment" options={{ title: 'Book Appointment' }} />
        <Stack.Screen name="(patient)/queue-status" options={{ title: 'My Clinic Queue' }} />
        <Stack.Screen name="(patient)/medical-history" options={{ title: 'My Medical History' }} />
        <Stack.Screen name="(clinician)/triage" options={{ title: 'Clinical Triage' }} />
        <Stack.Screen name="(admin)/dashboard" options={{ title: 'Facility Dashboard' }} />
        <Stack.Screen name="(admin)/ems-dispatch" options={{ title: 'Emergency Dispatch' }} />
      </Stack>
    </AuthProvider>
  );
}
