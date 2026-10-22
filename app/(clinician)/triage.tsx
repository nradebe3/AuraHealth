import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/hooks/useAuth';
import { RoleGuard } from '../../src/components/RoleGuard';
import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';

function TriageScreen() {
  const { user } = useAuth();
  const [patientRef, setPatientRef] = useState('');
  const [matches, setMatches] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [lookupMessage, setLookupMessage] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [spo2, setSpo2] = useState('');
  const [respRate, setRespRate] = useState('');
  const [glucose, setGlucose] = useState('');
  const bmi = useMemo(() => {
    const kg = Number(weight), cm = Number(height);
    return kg > 0 && cm > 0 ? kg / Math.pow(cm / 100, 2) : null;
  }, [weight, height]);
  const lookupPatients = async () => {
    const term = patientRef.trim();
    if (term.length < 2) {
      setLookupMessage('Enter at least 2 characters to search.');
      return;
    }
    setSearching(true);
    setLookupMessage('Searching...');
    setSelectedPatient(null);
    setConfirmation(false);
    setRiskLevel(null);
    setMatches([]);
    try {
      const safe = term.replace(/[%,()]/g, '');
      const { data, error } = await supabase.from('patients')
        .select('id,first_name,last_name,sa_id_number,passport_number,date_of_birth')
        .or(`first_name.ilike.%${safe}%,last_name.ilike.%${safe}%,sa_id_number.eq.${safe},passport_number.eq.${safe}`)
        .limit(20);
      if (error) {
        setLookupMessage(`Patient lookup failed: ${error.message}`);
        return;
      }
      setMatches(data || []);
      setLookupMessage(data?.length ? `${data.length} patient(s) found. Select one.` : 'No matching patients found.');
    } catch (error: any) {
      setLookupMessage(`Patient lookup failed: ${error?.message || String(error)}`);
    } finally {
      setSearching(false);
    }
  };
  const numberOrNull = (v: string) => v.trim() === '' ? null : Number(v);
  const [bp, setBp] = useState('120/80');
  const [heartRate, setHeartRate] = useState('72');
  const [temp, setTemp] = useState('36.6');
  const [riskLevel, setRiskLevel] = useState<'GREEN' | 'YELLOW' | 'ORANGE' | 'RED' | null>(null);
  const [consciousness, setConsciousness] = useState('');
  const [mobility, setMobility] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [clinicalDiscriminators, setClinicalDiscriminators] = useState('');
  const [confirmation, setConfirmation] = useState(false);
  const [notes, setNotes] = useState('');
  const abnormalFlags = useMemo(() => {
    const flags: string[] = [];
    const h = numberOrNull(heartRate), t = numberOrNull(temp), o = numberOrNull(spo2), r = numberOrNull(respRate);
    const b = bp.match(/^(\d{2,3})\/(\d{2,3})$/);
    if (b && (Number(b[1]) >= 140 || Number(b[2]) >= 90 || Number(b[1]) < 90)) flags.push('Blood pressure warrants review');
    if (h !== null && (h < 60 || h > 100)) flags.push('Heart rate outside typical resting adult range');
    if (t !== null && (t < 36 || t >= 38)) flags.push('Temperature outside typical adult range');
    if (o !== null && o < 95) flags.push('Oxygen saturation below typical range');
    if (r !== null && (r < 12 || r > 20)) flags.push('Respiratory rate outside typical adult range');
    if (bmi !== null && (bmi < 18.5 || bmi >= 25)) flags.push('BMI outside typical adult range');
    if (glucose.trim()) flags.push('Review glucose against units, meal timing, symptoms and clinical context');
    return flags;
  }, [heartRate, temp, bp, spo2, respRate, bmi, glucose]);

  const ageYears = useMemo(() => {
    if (!selectedPatient?.date_of_birth) return null;
    const dob = new Date(`${selectedPatient.date_of_birth}T00:00:00`);
    if (Number.isNaN(dob.getTime()) || dob.getTime() > Date.now()) return null;
    const today = new Date();
    let years = today.getFullYear() - dob.getFullYear();
    if (today.getMonth() < dob.getMonth() ||
        (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())) years--;
    return years;
  }, [selectedPatient]);
  const agePathway = ageYears === null ? 'Unknown - verify age' :
    ageYears < 3 ? 'Infant / young child - pediatric SATS' :
    ageYears < 12 ? 'Child - pediatric SATS' :
    'Older patient - verify facility SATS pathway';

  // Validate clinician input before creating a medical record in Supabase.
  // The triage category is clinician-selected; automatic SATS scoring is disabled.
  const handleSaveTriage = async () => {
    if (saving) return;
    setSaveMessage('Validating triage record...');
    if (!user) { setSaveMessage('Cannot save: clinician session is missing. Sign in again.'); return; }
    if (!selectedPatient) { setSaveMessage('Cannot save: select a patient from the search results.'); return; }
    if (!riskLevel) { setSaveMessage('Cannot save: select a triage category.'); return; }
    if (!confirmation) { setSaveMessage('Cannot save: tick the clinician confirmation checkbox.'); return; }
    if (!chiefComplaint.trim()) { setSaveMessage('Cannot save: enter the presenting complaint.'); return; }
    if (!clinicalDiscriminators.trim()) { setSaveMessage('Cannot save: enter the clinical discriminator assessment.'); return; }

    const hr = Number(heartRate);
    const temperature = Number(temp);
    const b = bp.trim().match(/^(\d{2,3})\/(\d{2,3})$/);
    if (!b || Number(b[1]) <= Number(b[2]) ||
        !heartRate.trim() || !Number.isInteger(hr) || hr < 20 || hr > 250 ||
        !temp.trim() || !Number.isFinite(temperature) || temperature < 30 || temperature > 45) {
      setSaveMessage('Cannot save: check blood pressure, heart rate and temperature.');
      return;
    }
    const optional = [
      [weight, 0.2, 500, 'Weight'], [height, 20, 250, 'Height'],
      [spo2, 0, 100, 'Oxygen saturation'], [respRate, 0, 100, 'Respiratory rate'],
      [glucose, 0.1, 100, 'Blood glucose']
    ] as const;
    for (const [value, min, max, label] of optional) {
      if (value.trim() && (!Number.isFinite(Number(value)) || Number(value) < min || Number(value) > max)) {
        setSaveMessage(`Cannot save: ${label} is outside the supported input range.`);
        return;
      }
    }
    if (Boolean(weight.trim()) !== Boolean(height.trim())) {
      setSaveMessage('Cannot save: enter both weight and height, or leave both blank.');
      return;
    }
    if (respRate.trim() && !Number.isInteger(Number(respRate))) {
      setSaveMessage('Cannot save: respiratory rate must be a whole number.');
      return;
    }
    if (spo2.trim() && !Number.isInteger(Number(spo2))) {
      setSaveMessage('Cannot save: oxygen saturation must be a whole number.');
      return;
    }
    setSaving(true);
    setSaveMessage('Saving to Supabase...');
    try {
      const { data, error } = await supabase.from('medical_records').insert({
        patient_id: selectedPatient.id, clinician_id: user.id, vitals_bp: bp.trim(),
        vitals_heart_rate: hr, vitals_temp: temperature, triage_risk_level: riskLevel,
        clinical_notes: notes, weight_kg: numberOrNull(weight), height_cm: numberOrNull(height),
        oxygen_saturation: numberOrNull(spo2), respiratory_rate: numberOrNull(respRate),
        blood_glucose_mmol_l: numberOrNull(glucose),
        presenting_complaint: chiefComplaint.trim(),
        consciousness_assessment: consciousness.trim() || null,
        mobility_assessment: mobility.trim() || null,
        discriminator_assessment: clinicalDiscriminators.trim(),
        triage_protocol: 'SATS - clinician assessed; automatic scoring disabled',
        triage_pathway: agePathway,
        triage_confirmed_at: new Date().toISOString(),
        triage_recommendation: null,
        triage_score: null,
        triage_ruleset_version: null
      }).select('id').single();
      if (error) {
        setSaveMessage(`Save failed: ${error.message} (${error.code || 'no error code'})`);
        console.error('Triage save failed', error);
        return;
      }
      setSaveMessage(`Triage record saved successfully. Record ID: ${data.id}`);
      setConfirmation(false);
    } catch (error: any) {
      setSaveMessage(`Unexpected save error: ${error?.message || String(error)}`);
      console.error('Unexpected triage save error', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Clinician EHR Charting & Triage</Text>
      <Text style={styles.subTitle}>Electronic folder charting and triage risk categorization</Text>

      <Text style={styles.label}>Find Patient (name, SA ID or passport)</Text>
      <View style={styles.row}>
        <TextInput style={[styles.input, { flex: 1 }]} value={patientRef} onChangeText={text => { setPatientRef(text); setSelectedPatient(null); setConfirmation(false); setRiskLevel(null); setMatches([]); }} placeholder="Search patient records" autoCapitalize="none" />
        <TouchableOpacity style={styles.lookupBtn} onPress={lookupPatients} disabled={searching}><Text style={styles.saveText}>{searching ? 'Searching...' : 'Search'}</Text></TouchableOpacity>
      </View>
      {!!lookupMessage && <Text style={styles.feedback}>{lookupMessage}</Text>}     {matches.map(p => <TouchableOpacity key={p.id} style={[styles.match, selectedPatient?.id === p.id && styles.matchSelected]} onPress={() => { setSelectedPatient(p); setConfirmation(false); setRiskLevel(null); setMatches([]); setPatientRef(`${p.first_name} ${p.last_name}`); }}>
        <Text>{p.first_name} {p.last_name} - DOB: {p.date_of_birth} - {p.sa_id_number ? 'SA ID ending ' + p.sa_id_number.slice(-4) : 'Passport ending ' + (p.passport_number || '').slice(-4)}</Text>
      </TouchableOpacity>)}
      {selectedPatient && <Text style={styles.selected}>Selected patient: {selectedPatient.first_name} {selectedPatient.last_name}</Text>}

      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={styles.label}>Blood Pressure</Text>
          <TextInput style={styles.input} value={bp} onChangeText={setBp} placeholder="120/80" />
        </View>
        <View style={styles.half}>
          <Text style={styles.label}>Heart Rate (BPM)</Text>
          <TextInput style={styles.input} value={heartRate} onChangeText={setHeartRate} keyboardType="numeric" />
        </View>
      </View>

      <Text style={styles.label}>Body Temperature ( degrees C)</Text>
      <TextInput style={styles.input} value={temp} onChangeText={setTemp} keyboardType="numeric" />

      <View style={styles.row}>
        <View style={styles.half}><Text style={styles.label}>Weight (kg)</Text><TextInput style={styles.input} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="e.g. 70" /></View>
        <View style={styles.half}><Text style={styles.label}>Height (cm)</Text><TextInput style={styles.input} value={height} onChangeText={setHeight} keyboardType="decimal-pad" placeholder="e.g. 170" /></View>
      </View>
      <Text style={styles.label}>BMI (calculated)</Text>
      <Text style={styles.result}>{bmi === null ? 'Enter weight and height' : bmi.toFixed(2) + ' kg/m2 (adult screening only)'}</Text>
      <View style={styles.row}>
        <View style={styles.half}><Text style={styles.label}>Oxygen Saturation (%)</Text><TextInput style={styles.input} value={spo2} onChangeText={setSpo2} keyboardType="numeric" placeholder="e.g. 98" /></View>
        <View style={styles.half}><Text style={styles.label}>Respiratory Rate (/min)</Text><TextInput style={styles.input} value={respRate} onChangeText={setRespRate} keyboardType="numeric" placeholder="e.g. 16" /></View>
      </View>
      <Text style={styles.label}>Blood Glucose (mmol/L)</Text>
      <TextInput style={styles.input} value={glucose} onChangeText={setGlucose} keyboardType="decimal-pad" placeholder="e.g. 5.4" />
      <Text style={styles.label}>Measurement Review Flags (not a triage score)</Text>
      <View style={styles.reviewBox}>{abnormalFlags.length ? abnormalFlags.map((flag, i) => <Text key={i} style={styles.flag}>- {flag}</Text>) : <Text>No screening flags from entered measurements. This does not rule out serious illness.</Text>}</View>
       <Text style={styles.label}>SATS assessment status</Text>
       <Text style={styles.warning}>SATS scoring is NOT active. A validated, facility-approved SATS ruleset (including age-specific TEWS and discriminators) is required before the app can calculate a recommended category. No automatic category is generated.</Text>
       <Text style={styles.label}>Presenting Complaint (required)</Text>
       <TextInput style={[styles.input, { minHeight: 65 }]} value={chiefComplaint} onChangeText={setChiefComplaint} multiline placeholder="Describe why the patient is seeking care" />
       <Text style={styles.label}>Consciousness Assessment</Text>
       <TextInput style={styles.input} value={consciousness} onChangeText={setConsciousness} placeholder="Document observed level of consciousness" />
       <Text style={styles.label}>Mobility Assessment</Text>
       <TextInput style={styles.input} value={mobility} onChangeText={setMobility} placeholder="Document observed mobility" />
       <Text style={styles.label}>Clinical Discriminator Assessment (required)</Text>
       <TextInput style={[styles.input, { minHeight: 75 }]} value={clinicalDiscriminators} onChangeText={setClinicalDiscriminators} multiline placeholder="Document clinical discriminators assessed, findings and protocol used" />
       <Text style={styles.label}>Clinician-selected Triage Category</Text>
       <View style={styles.riskRow}>
         {([
           ['GREEN', 'Green', '#276A3C'],
           ['YELLOW', 'Yellow', '#C99A00'],
           ['ORANGE', 'Orange', '#D97706'],
           ['RED', 'Red', '#C00000'],
         ] as const).map(([value, label, color]) =>
           <TouchableOpacity key={value} style={[styles.riskBtn, { backgroundColor: color }, riskLevel === value && styles.riskActive]} onPress={() => { setRiskLevel(value); setConfirmation(false); }}>
             <Text style={styles.riskText}>{label}</Text>
           </TouchableOpacity>
         )}
       </View>
       <TouchableOpacity style={styles.confirmBox} onPress={() => setConfirmation(v => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: confirmation }}>
         <View style={[styles.checkbox, confirmation && styles.checkboxChecked]} />
         <Text style={{ flex: 1 }}>I reviewed the patient, assessed clinical discriminators using our approved protocol, and confirm the selected category.</Text>
       </TouchableOpacity>

      <Text style={styles.label}>Clinical Diagnostic Notes</Text>
      <TextInput style={[styles.input, { height: 80 }]} value={notes} onChangeText={setNotes} multiline placeholder="Enter clinical observations..." />

      <TouchableOpacity style={[styles.saveBtn, (saving || !selectedPatient || !riskLevel || !confirmation) && { opacity: 0.5 }]} onPress={handleSaveTriage} disabled={saving || !selectedPatient || !riskLevel || !confirmation}>
        <Text style={styles.saveText}>Save Triage Record</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#FFF', flexGrow: 1 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1F4E79' },
  subTitle: { fontSize: 12, color: '#666', marginBottom: 15 },
  label: { fontSize: 13, fontWeight: 'bold', color: '#333', marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#CCC', borderRadius: 6, padding: 10, marginTop: 4, fontSize: 14 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  riskRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  riskBtn: { flex: 1, paddingVertical: 10, borderRadius: 6, alignItems: 'center' },
  riskActive: { borderWidth: 3, borderColor: '#000' },
  riskText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#1F4E79', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  saveText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
  lookupBtn: { backgroundColor: '#1F4E79', paddingHorizontal: 20, justifyContent: 'center', borderRadius: 6, marginTop: 4 },
  match: { padding: 12, borderWidth: 1, borderColor: '#DDD', marginTop: 4, borderRadius: 6 },
  matchSelected: { backgroundColor: '#E8F4EA' },
  selected: { marginTop: 8, color: '#276A3C', fontWeight: 'bold' },
  result: { marginTop: 4, padding: 12, backgroundColor: '#F2F6FA', borderRadius: 6 },
  reviewBox: { marginTop: 5, padding: 12, backgroundColor: '#FFF7E8', borderRadius: 6 },
  flag: { color: '#7A4700', marginBottom: 4 },
  warning: { fontSize: 12, color: '#765200', marginTop: 6 },
  feedback: { marginTop: 10, padding: 10, backgroundColor: '#EDF3F8', color: '#203A50', borderRadius: 6, fontSize: 13 },
  optionBtn: { flex: 1, borderWidth: 1, borderColor: '#B0BAC4', padding: 8, borderRadius: 6, alignItems: 'center' },
  optionSelected: { backgroundColor: '#DCECF9', borderColor: '#1F4E79' },
  optionText: { fontSize: 11, textAlign: 'center' },
  confirmBox: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, padding: 12, borderWidth: 1, borderColor: '#BBC5CE', borderRadius: 6 },
  checkbox: { width: 20, height: 20, borderWidth: 2, borderColor: '#536B7D', borderRadius: 3 },
  checkboxChecked: { backgroundColor: '#1F4E79' },
});


export default function ProtectedTriageScreen(props: any) {
  return (
    <RoleGuard allowedRoles={["CLINICIAN"]}>
      <TriageScreen {...props} />
    </RoleGuard>
  );
}