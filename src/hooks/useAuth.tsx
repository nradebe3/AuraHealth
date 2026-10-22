import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

export type UserRole = 'PATIENT' | 'ADMIN' | 'CLINICIAN' | 'EMS_DISPATCH' | 'SYSTEM_ADMIN';
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  facilityName?: string;
  isVerified: boolean;
}
interface AuthContextType {
  user: UserProfile | null;
  role: UserRole | null;
  availableRoles: UserRole[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, requestedRole?: UserRole) => Promise<boolean>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => void;
  switchDemoRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const priority: UserRole[] = ['PATIENT', 'EMS_DISPATCH', 'CLINICIAN', 'ADMIN', 'SYSTEM_ADMIN'];
const normalize = (value: unknown): UserRole | null => {
  const v = value === 'DISPATCHER' ? 'EMS_DISPATCH' : value;
  return typeof v === 'string' && priority.includes(v as UserRole) ? v as UserRole : null;
};
const storageKey = (uid: string) => `aurahealth:selected-role:${uid}`;

async function getSavedRole(uid: string): Promise<UserRole | null> {
  try {
    const key = storageKey(uid);
    const raw = Platform.OS === 'web' && typeof window !== 'undefined'
      ? window.localStorage.getItem(key)
      : await AsyncStorage.getItem(key);
    return normalize(raw);
  } catch (error) {
    console.warn('Unable to restore selected role:', error);
    return null;
  }
}

async function saveRole(uid: string, role: UserRole): Promise<void> {
  try {
    const key = storageKey(uid);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.localStorage.setItem(key, role);
    } else {
      await AsyncStorage.setItem(key, role);
    }
  } catch (error) {
    console.warn('Unable to persist selected role:', error);
  }
}

async function loadProfile(uid: string): Promise<{ profile: UserProfile; roles: UserRole[] } | null> {
  const { data, error } = await supabase.from('users')
    .select('id,email,full_name,role,is_active')
    .eq('id', uid).maybeSingle();
  if (error || !data || data.is_active === false) {
    console.error('Account profile unavailable:', error?.message);
    return null;
  }
  const primary = normalize(data.role);
  if (!primary) return null;
  const { data: roleRows, error: rolesError } = await supabase.from('user_roles')
    .select('role').eq('user_id', uid);
  if (rolesError) console.warn('Multi-role lookup unavailable; using primary role:', rolesError.message);
  const roles = priority.filter(r => r === primary || (roleRows || []).some(x => normalize(x.role) === r));
  return {
    profile: {
      id: data.id,
      email: data.email,
      name: data.full_name || data.email.split('@')[0],
      role: primary,
      isVerified: true,
    },
    roles,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [availableRoles, setAvailableRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const revision = useRef(0);
  const selectedRole = useRef<{ uid: string; role: UserRole } | null>(null);

  const restore = async (uid?: string, requestedRole?: UserRole): Promise<boolean> => {
    const request = ++revision.current;
    setIsLoading(true);
    if (!uid) {
      selectedRole.current = null;
      setUser(null);
      setAvailableRoles([]);
      setIsLoading(false);
      return false;
    }
    try {
      const result = await loadProfile(uid);
      if (!result) {
        if (request === revision.current) {
          selectedRole.current = null;
          setUser(null);
          setAvailableRoles([]);
          setIsLoading(false);
        }
        return false;
      }
      const saved = await getSavedRole(uid);
      if (request !== revision.current) return true;
      // Keep a role selected during this session; otherwise restore the persisted choice.
      // The requested login role is used only if there is no valid saved selection.
      const current = selectedRole.current?.uid === uid ? selectedRole.current.role : null;
      const chosen = [current, saved, requestedRole, result.profile.role]
        .find(r => r != null && result.roles.includes(r)) as UserRole;
      selectedRole.current = { uid, role: chosen };
      setUser({ ...result.profile, role: chosen });
      setAvailableRoles(result.roles);
      setIsLoading(false);
      if (saved !== chosen) void saveRole(uid, chosen);
      return true;
    } catch (error) {
      console.error('Failed to restore session:', error);
      if (request === revision.current) {
        selectedRole.current = null;
        setUser(null);
        setAvailableRoles([]);
        setIsLoading(false);
      }
      return false;
    }
  };

  useEffect(() => {
    let active = true;
    // Auth callbacks must not synchronously await further Supabase queries.
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') return;
      setTimeout(() => {
        if (!active) return;
        if (event === 'SIGNED_OUT') {
          void restore();
        } else if (session?.user?.id) {
          void restore(session.user.id);
        } else if (event === 'INITIAL_SESSION') {
          void restore();
        }
      }, 0);
    });
    void supabase.auth.getSession()
      .then(({ data }) => { if (active) void restore(data.session?.user.id); })
      .catch(() => { if (active) void restore(); });
    return () => {
      active = false;
      ++revision.current;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string, requestedRole?: UserRole): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(), password,
      });
      if (error || !data.user) {
        console.error('Login failed:', error?.message);
        setIsLoading(false);
        return false;
      }
      const success = await restore(data.user.id, requestedRole);
      if (!success) {
        await supabase.auth.signOut();
        return false;
      }
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      setIsLoading(false);
      return false;
    }
  };

  const logout = async () => {
    ++revision.current;
    selectedRole.current = null; // Retain per-account saved preference for next login.
    setUser(null);
    setAvailableRoles([]);
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) console.error('Logout:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const switchRole = (next: UserRole) => {
    if (!user || !availableRoles.includes(next)) return;
    selectedRole.current = { uid: user.id, role: next };
    setUser(current => current && current.id === user.id ? { ...current, role: next } : current);
    void saveRole(user.id, next);
  };

  return (
    <AuthContext.Provider value={{
      user, role: user?.role ?? null, availableRoles,
      isAuthenticated: !!user, isLoading, login, logout, switchRole,
      switchDemoRole: () => {},
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
