
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth, type UserRole } from '../../src/hooks/useAuth';

type LoginRole = {
  role: UserRole;
  label: string;
  icon: string;
};

const LOGIN_ROLES: LoginRole[] = [
  { role: 'PATIENT', label: 'Patient', icon: '👤' },
  { role: 'ADMIN', label: 'Admin Staff', icon: '🏢' },
  { role: 'SYSTEM_ADMIN', label: 'System Administrator', icon: '⚙️' },
  { role: 'CLINICIAN', label: 'Clinician', icon: '🩺' },
  { role: 'EMS_DISPATCH', label: 'EMS Dispatch', icon: '🚑' },
];

export default function LoginScreen() {
  const router = useRouter();
  const { user, login, logout, isLoading } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const showError = (title: string, message: string) => {
    setErrorMessage(message);

    if (Platform.OS !== 'web') {
      Alert.alert(title, message);
    }
  };

  const handleLogin = async () => {
    setErrorMessage('');

    if (!identifier.trim() || !password) {
      showError(
        'Missing Information',
        'Please enter your email address and password.'
      );
      return;
    }

    try {
      const success = await login(
        identifier.trim(),
        password,
      );

      if (!success) {
        showError(
          'Login Failed',
          'Unable to sign in. Check your credentials and account status.'
        );
        return;
      }

      setPassword('');
      router.replace('/');
    } catch (error) {
      console.error('AuraHealth login error:', error);

      showError(
        'Login Error',
        'An unexpected error occurred. Please try again.'
      );
    }
  };

  const handleLogout = async () => {
    setErrorMessage('');
    setPassword('');
    await logout();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.badge}>
          🔐 SECURE AUTHENTICATION
        </Text>

        <Text style={styles.title}>Aura Health Login</Text>

        <Text style={styles.subtitle}>
          National Primary Healthcare Digital Portal
        </Text>

        <Text style={styles.description}>
          Sign in with your verified Supabase account to access
          your authorized healthcare modules.
        </Text>

        {user && (
          <View style={styles.activeSessionBox}>
            <Text style={styles.sessionTitle}>
              Active Verified Session
            </Text>

            <Text style={styles.sessionUser}>
              👤 {user.name}
            </Text>

            <Text style={styles.sessionRole}>
              Role: {user.role}
            </Text>

            {user.facilityName ? (
              <Text style={styles.sessionRole}>
                Facility: {user.facilityName}
              </Text>
            ) : null}

            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={handleLogout}
              disabled={isLoading}
            >
              <Text style={styles.logoutText}>
                Sign Out Current Session
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.label}>Email Address</Text>

        <TextInput
          style={styles.input}
          value={identifier}
          onChangeText={setIdentifier}
          placeholder="Enter your registered email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          editable={!isLoading}
        />

        <Text style={styles.label}>Password</Text>

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholder="Enter your password"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            editable={!isLoading}
            onSubmitEditing={handleLogin}
          />

          <TouchableOpacity
            style={styles.showPasswordBtn}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Text style={styles.showPasswordText}>
              {showPassword ? 'Hide' : 'Show'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.roleHint}>Your role is detected automatically from your verified account. If you have multiple authorized roles, AuraHealth starts with the least-privileged role.</Text>

        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              {errorMessage}
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[
            styles.loginBtn,
            isLoading && styles.loginBtnDisabled,
          ]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.loginBtnText}>
              Log In with Verified Credentials
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.divider} />

        <Text style={styles.securityTitle}>
          🔒 Protected Healthcare Access
        </Text>

        <Text style={styles.securityText}>
          Authentication is handled by Supabase Auth.
          Access to healthcare information depends on
          your verified account and assigned permissions.
        </Text>

        <Text style={styles.footer}>
          AuraHealth | National Primary Healthcare Digital Portal
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 18,
    backgroundColor: '#F4F6F9',
    justifyContent: 'center',
    alignItems: 'center',
  },

  card: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxWidth: 480,
    padding: 22,
    borderRadius: 12,
    elevation: 4,
  },

  badge: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1F4E79',
    backgroundColor: '#EBF3FA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F4E79',
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },

  description: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 19,
    marginBottom: 18,
  },

  activeSessionBox: {
    backgroundColor: '#EBF8F2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#A3E0C0',
  },

  sessionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#276A3C',
    marginBottom: 5,
  },

  sessionUser: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F4E79',
  },

  sessionRole: {
    fontSize: 12,
    color: '#444444',
    marginTop: 4,
  },

  logoutBtn: {
    marginTop: 10,
    backgroundColor: '#C00000',
    paddingVertical: 9,
    borderRadius: 6,
    alignItems: 'center',
  },

  logoutText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },

  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 7,
    marginTop: 10,
  },

  input: {
    backgroundColor: '#F9FAFC',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 8,
  },

  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFC',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    marginBottom: 8,
  },

  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    minWidth: 0,
  },

  showPasswordBtn: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },

  showPasswordText: {
    color: '#1F4E79',
    fontSize: 12,
    fontWeight: 'bold',
  },

  roleHint: {
    fontSize: 11,
    color: '#666666',
    lineHeight: 17,
    marginBottom: 12,
  },

  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },

  roleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#E0E6ED',
    flexGrow: 1,
    flexBasis: '45%',
    alignItems: 'center',
  },

  roleBtnActive: {
    backgroundColor: '#1F4E79',
  },

  roleText: {
    fontSize: 12,
    color: '#333333',
    fontWeight: '600',
    textAlign: 'center',
  },

  roleTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  errorBox: {
    backgroundColor: '#FDECEC',
    borderWidth: 1,
    borderColor: '#E5A3A3',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },

  errorText: {
    color: '#A32121',
    fontSize: 12,
    lineHeight: 18,
  },

  loginBtn: {
    backgroundColor: '#1F4E79',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },

  loginBtnDisabled: {
    opacity: 0.6,
  },

  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },

  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 20,
  },

  securityTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1F4E79',
    marginBottom: 8,
  },

  securityText: {
    fontSize: 11,
    color: '#666666',
    lineHeight: 18,
  },

  footer: {
    fontSize: 10,
    color: '#888888',
    textAlign: 'center',
    marginTop: 22,
  },
});
