import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { translations, SupportedLanguage } from '../src/lib/i18n';
import { supabase } from '../src/lib/supabase';
import { useAuth, UserRole } from '../src/hooks/useAuth';

export default function HomeScreen() {
  const router = useRouter();
  const { user, isAuthenticated, role, isLoading } = useAuth();
  const [lang, setLang] = useState<SupportedLanguage>('EN');
  const t = translations[lang];
  const [registrationChecked,setRegistrationChecked]=useState(false);
  useEffect(() => {
    let active = true;
    setRegistrationChecked(false);
    if (isLoading) return () => { active = false; };
    if (!isAuthenticated || role !== 'PATIENT' || !user?.id) {
      setRegistrationChecked(true);
      return () => { active = false; };
    }
    void (async () => {
      const { data, error } = await supabase.from('patients')
        .select('id,first_name,last_name,date_of_birth,gender')
        .eq('user_id', user.id).maybeSingle();
      if (!active) return;
      if (error) {
        console.error('Patient registration lookup failed:', error.message);
        // Never bypass the registration gate after a failed database check.
        return;
      }
      if (!data?.id || !data.first_name?.trim() || !data.last_name?.trim() || !data.date_of_birth || !data.gender?.trim()) {
        router.replace('/(patient)/complete-registration');
        return;
      }
      setRegistrationChecked(true);
    })();
    return () => { active = false; };
  }, [isLoading, isAuthenticated, role, user?.id, router]);


  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Top Header & Language Selector */}
      <View style={styles.topBar}>
        <View style={styles.langBar}>
          <Text style={styles.langLabel}>Language:</Text>
          <TouchableOpacity style={[styles.langBtn, lang === 'EN' && styles.langBtnActive]} onPress={() => setLang('EN')}>
            <Text style={[styles.langText, lang === 'EN' && styles.langTextActive]}>EN</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.langBtn, lang === 'ZUL' && styles.langBtnActive]} onPress={() => setLang('ZUL')}>
            <Text style={[styles.langText, lang === 'ZUL' && styles.langTextActive]}>isiZulu</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.langBtn, lang === 'SOT' && styles.langBtnActive]} onPress={() => setLang('SOT')}>
            <Text style={[styles.langText, lang === 'SOT' && styles.langTextActive]}>Sesotho</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.headerBox}>
        <Text style={styles.title}>{t.welcome}</Text>
        <Text style={styles.subtitle}>{t.subtitle}</Text>
      </View>

      {/* ACTIVE POPIA AUTHENTICATED SESSION CARD */}
      <View style={styles.sessionCard}>
        <View style={styles.sessionHeader}>
          <Text style={styles.sessionBadge}>
            {isLoading ? 'Checking session...' : isAuthenticated ? ' VERIFIED SESSION' : ' UNAUTHENTICATED'}
          </Text>
          <TouchableOpacity style={styles.loginLinkBtn} onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.loginLinkText}>{isAuthenticated ? 'Change Account' : 'Sign In'}</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#1F4E79" />
        ) : isAuthenticated && user ? (
          <View style={styles.sessionDetails}>
            <Text style={styles.userName}> {user.name}</Text>
            <Text style={styles.userRole}>
              Active Role: <Text style={{ fontWeight: 'bold', color: '#1F4E79' }}>{user.role}</Text>{user.facilityName ? ` | ${user.facilityName}` : ''}
            </Text>

          </View>
        ) : (
          <View style={styles.noSessionBox}>
            <Text style={styles.noSessionText}>
              No verified session active. Please sign in to access role-guarded medical modules.
            </Text>
          </View>
        )}
      </View>

      {/* DYNAMIC ROLE-GUARDED INTERFACE VIEWS */}

      {/* 1. PATIENT INTERFACE VIEW */}
      {role === 'PATIENT' && registrationChecked && (
        <View style={styles.sectionCard}>
          <View style={styles.badgeBox}>
            <Text style={styles.badgeText}> PATIENT PORTAL</Text>
          </View>
          <Text style={styles.sectionTitle}>Patient Services & Appointments</Text>
          <Text style={styles.sectionDesc}>Book clinic consultations, track your queue status in real time, and view medical records.</Text>

          <View style={styles.cardGroup}>
            <TouchableOpacity style={styles.accentButton} onPress={() => router.push('/(patient)/book-appointment')}>
              <Text style={styles.buttonTitle}> Book & Schedule Appointment</Text>
              <Text style={styles.buttonSub}>Select facility, date & time slot with SMS & Calendar sync</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/(patient)/my-appointments')}>
              <Text style={styles.buttonTitle}> My Scheduled Appointments</Text>
              <Text style={styles.buttonSub}>View, cancel or reschedule your appointments</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/(patient)/queue-status')}>
              <Text style={styles.buttonTitle}> Track Live 3-Queue Spot</Text>
              <Text style={styles.buttonSub}>View position in line for Registration, Triage & Pharmacy</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.infoButton} onPress={() => router.push('/(patient)/medical-history')}>
              <Text style={styles.buttonTitle}> Health Records & Chronic Repeats</Text>
              <Text style={styles.buttonSub}>View diagnostic history, active prescriptions & Fast-Track pickup</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.outlineButton} onPress={() => router.push('/(patient)/profile')}>
              <Text style={styles.outlineText}> My Profile & Linked Dependents</Text>
              <Text style={styles.buttonSubDark}>Manage personal details, minor children & POPIA data export</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 2. ADMINISTRATIVE & RECEPTION STAFF INTERFACE VIEW */}
      {role === 'ADMIN' && (
        <View style={styles.sectionCard}>
          <View style={[styles.badgeBox, { backgroundColor: '#5A6B7C' }]}>
            <Text style={styles.badgeText}> RECEPTION & ADMINISTRATION</Text>
          </View>
          <Text style={styles.sectionTitle}>Facility Operations & Onboarding</Text>
          <Text style={styles.sectionDesc}>Register arriving patients, issue physical queue tickets, and monitor facility wait times.</Text>

          <View style={styles.cardGroup}>

            <TouchableOpacity style={styles.adminButton} onPress={() => router.push('/(admin)/dashboard')}>
              <Text style={styles.buttonTitle}> Facility Dashboard & Wait-Time Analytics</Text>
              <Text style={styles.buttonSub}>Monitor queue throughput, daily footfall, and operating hours</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/(admin)/queue-management')}>
              <Text style={styles.buttonTitle}>Facility Queue Management</Text>
              <Text style={styles.buttonSub}>Manage check-ins and advance facility queues</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 3. CLINICIAN INTERFACE VIEW (DOCTORS, NURSES & PHARMACISTS) */}
      {role === 'CLINICIAN' && (
        <View style={styles.sectionCard}>
          <View style={[styles.badgeBox, { backgroundColor: '#2F5496' }]}>
            <Text style={styles.badgeText}> CLINICAL CARE & EHR PORTAL</Text>
          </View>
          <Text style={styles.sectionTitle}>Clinician Consultations & E-Prescribing</Text>
          <Text style={styles.sectionDesc}>Record patient vitals, assess triage risk alerts, chart notes, and issue digital prescriptions.</Text>

          <View style={styles.cardGroup}>
            <TouchableOpacity style={styles.outlineButton} onPress={() => router.push('/(clinician)/triage')}>
              <Text style={styles.outlineText}> Clinical Triage, EHR & E-Prescribing</Text>
              <Text style={styles.buttonSubDark}>Enter vitals (BP/HR), review risk flags, chart EHR & route prescriptions</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/(admin)/queue-management')}>
              <Text style={styles.buttonTitle}>Clinical Facility Queue</Text>
              <Text style={styles.buttonSub}>Review and advance authorized clinic queue entries</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 4. EMS EMERGENCY DISPATCHER VIEW */}
      {role === 'EMS_DISPATCH' && (
        <View style={styles.sectionCard}>
          <View style={[styles.badgeBox, { backgroundColor: '#C00000' }]}>
            <Text style={styles.badgeText}> NATIONAL EMS DISPATCH CENTER</Text>
          </View>
          <Text style={styles.sectionTitle}>Emergency Dispatch & Fleet Management</Text>
          <Text style={styles.sectionDesc}>Locate nearest available ambulances via Haversine calculation and broadcast public health alerts.</Text>

          <View style={styles.cardGroup}>
            <TouchableOpacity style={styles.dangerButton} onPress={() => router.push('/(admin)/ems-dispatch')}>
              <Text style={styles.buttonTitle}> Dispatch Dashboard & Haversine Locator</Text>
              <Text style={styles.buttonSub}>Calculate nearest ambulance distance, assign vehicles & track GPS ETA</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {/* 5. SYSTEM ADMINISTRATOR VIEW */}
      {role === 'SYSTEM_ADMIN' && (
      <View style={styles.sectionCard}>
      <View style={[styles.badgeBox, { backgroundColor: '#4A154B' }]}>
      <Text style={styles.badgeText}> SYSTEM ADMINISTRATION</Text>
      </View>
      <Text style={styles.sectionTitle}>User & Facility Registry Governance</Text>
      <Text style={styles.sectionDesc}>Onboard/remove system users, add/remove health facilities, and review POPIA audit logs.</Text>

      <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/(admin)/sysadmin')}>
      <Text style={styles.buttonTitle}> Manage Users & Facilities Registry</Text>
      <Text style={styles.buttonSub}>Add facilities, toggle active user accounts & inspect audit trail</Text>
    </TouchableOpacity>
  </View>
)}


      {/* PROMPT IF NO ROLE OR UNASSIGNED */}
      {!role && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Portal Access Restricted</Text>
          <Text style={styles.sectionDesc}>Please sign in with verified credentials to unlock role-guarded modules.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.buttonTitle}> Sign In to Verified Portal</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 18, backgroundColor: '#F4F6F9', justifyContent: 'flex-start' },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10 },
  langBar: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, elevation: 1 },
  langLabel: { fontSize: 11, color: '#555', fontWeight: 'bold' },
  langBtn: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: '#E0E0E0' },
  langBtnActive: { backgroundColor: '#1F4E79' },
  langText: { fontSize: 11, color: '#333' },
  langTextActive: { color: '#FFF', fontWeight: 'bold' },
  headerBox: { marginBottom: 15, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1F4E79', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#555', marginTop: 4, textAlign: 'center' },
  sessionCard: { backgroundColor: '#FFF', borderRadius: 10, padding: 14, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#1F4E79', elevation: 2 },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sessionBadge: { fontSize: 10, fontWeight: 'bold', color: '#1F4E79', letterSpacing: 0.5 },
  loginLinkBtn: { backgroundColor: '#EBF3FA', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  loginLinkText: { fontSize: 11, color: '#1F4E79', fontWeight: 'bold' },
  sessionDetails: { marginTop: 8 },
  userName: { fontSize: 15, fontWeight: 'bold', color: '#1F4E79' },
  userRole: { fontSize: 12, color: '#555', marginTop: 2 },
  demoSwitchLabel: { fontSize: 11, fontWeight: 'bold', color: '#666', marginTop: 10, marginBottom: 6 },
  roleSwitchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  miniRoleBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: '#E0E6ED' },
  miniRoleActive: { backgroundColor: '#1F4E79' },
  miniRoleText: { fontSize: 11, color: '#333' },
  miniRoleTextActive: { color: '#FFF', fontWeight: 'bold' },
  noSessionBox: { marginTop: 6 },
  noSessionText: { fontSize: 12, color: '#666', fontStyle: 'italic' },
  sectionCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 18, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6 },
  badgeBox: { backgroundColor: '#1F4E79', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 12 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: 'bold', letterSpacing: 0.5 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F4E79', marginBottom: 4 },
  sectionDesc: { fontSize: 12, color: '#666', lineHeight: 17, marginBottom: 16 },
  cardGroup: { width: '100%', gap: 12 },
  primaryButton: { backgroundColor: '#1F4E79', padding: 14, borderRadius: 8 },
  accentButton: { backgroundColor: '#276A3C', padding: 14, borderRadius: 8 },
  secondaryButton: { backgroundColor: '#2F5496', padding: 14, borderRadius: 8 },
  infoButton: { backgroundColor: '#336699', padding: 14, borderRadius: 8 },
  outlineButton: { borderWidth: 2, borderColor: '#1F4E79', backgroundColor: '#FFF', padding: 14, borderRadius: 8 },
  adminButton: { backgroundColor: '#5A6B7C', padding: 14, borderRadius: 8 },
  dangerButton: { backgroundColor: '#C00000', padding: 14, borderRadius: 8 },
  buttonTitle: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
  buttonSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 3 },
  buttonSubDark: { color: '#666', fontSize: 11, marginTop: 3 },
  outlineText: { color: '#1F4E79', fontSize: 15, fontWeight: 'bold' },
});
