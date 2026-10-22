import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { RoleGuard } from '../../src/components/RoleGuard';
const s=StyleSheet.create({page:{padding:20,gap:12,backgroundColor:'#f4f6f9',flexGrow:1},title:{fontSize:22,fontWeight:'bold',color:'#1f4e79'},card:{backgroundColor:'white',padding:16,borderRadius:9,gap:9},input:{backgroundColor:'white',padding:12,borderWidth:1,borderColor:'#cbd5e1',borderRadius:7},button:{backgroundColor:'#1f4e79',padding:13,borderRadius:7,alignItems:'center'},white:{color:'white',fontWeight:'bold'},error:{color:'#b42318'},muted:{color:'#555'}});

function Content(){const [items,setItems]=useState<any[]>([]);const [busy,setBusy]=useState(true);const [error,setError]=useState('');
 useEffect(()=>{let active=true;void (async()=>{const {data,error:e}=await supabase.rpc('patient_medical_history');if(active){if(e)setError(e.message);else setItems(data||[]);setBusy(false)}})();return()=>{active=false}},[]);
 return <ScrollView contentContainerStyle={s.page}><Text style={s.title}>My Medical History</Text><Text style={s.muted}>Only records saved in your authorized patient history are displayed. No sample consultations or prescriptions are shown.</Text>{busy?<ActivityIndicator/>:null}{error?<Text style={s.error}>{error}</Text>:null}{!busy&&!error&&items.length===0?<View style={s.card}><Text>No consultation records available.</Text></View>:null}
 {items.map(r=><View key={r.id} style={s.card}><Text style={{fontWeight:'bold'}}>{new Date(r.created_at).toLocaleDateString()}</Text><Text>Blood pressure: {r.vitals_bp||'Not recorded'}</Text><Text>Heart rate: {r.vitals_heart_rate??'Not recorded'}</Text><Text>Temperature: {r.vitals_temp??'Not recorded'}</Text><Text>Clinical notes: {r.clinical_notes||'None recorded'}</Text></View>)}<Text style={s.muted}>Medication repeat requests and data export are unavailable until real, audited backend workflows are connected.</Text></ScrollView>}
export default function MedicalHistory(){return <RoleGuard allowedRoles={['PATIENT']}><Content/></RoleGuard>}
