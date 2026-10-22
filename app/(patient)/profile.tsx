import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { RoleGuard } from '../../src/components/RoleGuard';
import AppDatePicker from '../../src/components/AppDatePicker';
import { localToday, validDOB } from '../../src/lib/validation';
const s=StyleSheet.create({page:{padding:20,gap:12,backgroundColor:'#f4f6f9',flexGrow:1},title:{fontSize:22,fontWeight:'bold',color:'#1f4e79'},card:{backgroundColor:'white',padding:16,borderRadius:9,gap:9},input:{backgroundColor:'white',padding:12,borderWidth:1,borderColor:'#cbd5e1',borderRadius:7},button:{backgroundColor:'#1f4e79',padding:13,borderRadius:7,alignItems:'center'},white:{color:'white',fontWeight:'bold'},error:{color:'#b42318'},muted:{color:'#555'}});

function Content(){
 const router=useRouter();const [profile,setProfile]=useState<any>(null);const [busy,setBusy]=useState(true);const [error,setError]=useState('');
 const [first,setFirst]=useState('');const [last,setLast]=useState('');const [dob,setDob]=useState('');const [gender,setGender]=useState('');const [address,setAddress]=useState('');
 const load=useCallback(async()=>{setBusy(true);const {data:{user}}=await supabase.auth.getUser();if(!user){setError('Sign in required');setBusy(false);return;}
 const {data,error:e}=await supabase.from('patients').select('id,first_name,last_name,date_of_birth,gender,address').eq('user_id',user.id).maybeSingle();
 if(e)setError(e.message);else{setProfile(data);if(data){setFirst(data.first_name||'');setLast(data.last_name||'');setDob(data.date_of_birth||'');setGender(data.gender||'');setAddress(data.address||'');}}setBusy(false);},[]);
 useEffect(()=>{void load()},[load]);
 const save=async()=>{if(!profile)return;if(!first.trim()||!last.trim()||!validDOB(dob)||!['Male','Female'].includes(gender)){setError('Enter names, valid date of birth and gender.');return;}setBusy(true);setError('');const {error:e}=await supabase.rpc('patient_update_profile',{p_first_name:first.trim(),p_last_name:last.trim(),p_dob:dob,p_gender:gender.trim(),p_address:address.trim()||null});setBusy(false);if(e)setError(e.message);else await load();};
 return <ScrollView contentContainerStyle={s.page}><Text style={s.title}>My Patient Profile</Text>{busy?<ActivityIndicator/>:null}{error?<Text style={s.error}>{error}</Text>:null}
 {!busy&&!profile?<View style={s.card}><Text>Complete your patient registration before using patient services.</Text><TouchableOpacity style={s.button} onPress={()=>router.replace('/(patient)/complete-registration')}><Text style={s.white}>Complete registration</Text></TouchableOpacity></View>:null}
 {profile?<View style={s.card}><Text>First name</Text><TextInput style={s.input} value={first} onChangeText={setFirst}/><Text>Last name</Text><TextInput style={s.input} value={last} onChangeText={setLast}/><AppDatePicker label="Date of birth" value={dob} onChange={setDob} maxDate={localToday()}/><Text>Gender</Text><View style={{flexDirection:"row",gap:12}}>{["Male","Female"].map(g=><TouchableOpacity key={g} onPress={()=>setGender(g)}><Text>{gender===g?"☑":"☐"} {g}</Text></TouchableOpacity>)}</View><Text>Address</Text><TextInput style={s.input} value={address} onChangeText={setAddress} multiline/><TouchableOpacity disabled={busy} style={s.button} onPress={()=>void save()}><Text style={s.white}>Save profile</Text></TouchableOpacity></View>:null}
 <View style={s.card}><Text style={{fontWeight:'bold'}}>Linked dependents</Text><Text style={s.muted}>Dependent linking is not configured. No dependents are displayed or created until guardian authorization and database relationships are implemented.</Text></View></ScrollView>;
}
export default function Profile(){return <RoleGuard allowedRoles={['PATIENT']}><Content/></RoleGuard>}
