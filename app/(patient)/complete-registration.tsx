import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { RoleGuard } from '../../src/components/RoleGuard';
import { supabase } from '../../src/lib/supabase';
import AppDatePicker from '../../src/components/AppDatePicker';
import { localToday, validDOB, validateIdentity } from '../../src/lib/validation';
function RegistrationContent() {
 const router=useRouter();
 const [first,setFirst]=useState(''),[last,setLast]=useState(''),[dob,setDob]=useState(''),[gender,setGender]=useState('');
 const [idType,setIdType]=useState('SA_ID'),[idNumber,setIdNumber]=useState(''),[country,setCountry]=useState('South Africa'),[address,setAddress]=useState('');
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const save=async()=>{
  if(!first.trim()||!last.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(dob)||!gender.trim()) {setMessage('Enter first name, last name, date of birth (YYYY-MM-DD) and gender.');return;}
  setBusy(true);setMessage('');
  const {error}=await supabase.rpc('complete_patient_registration',{
   p_first_name:first.trim(),p_last_name:last.trim(),p_dob:dob,p_gender:gender.trim(),
   p_id_type:idType,p_id_number:idNumber.trim()||null,p_country:country.trim(),p_address:address.trim()||null,
  });
  setBusy(false);
  if(error){setMessage(error.message);return;}
  router.replace('/');
 };
 return <ScrollView contentContainerStyle={s.page}>
  <Text style={s.title}>Complete Patient Registration</Text>
  <Text>These details are required to create your clinical patient profile before booking.</Text>
  <TextInput style={s.input} placeholder="First name" value={first} onChangeText={setFirst}/>
  <TextInput style={s.input} placeholder="Last name" value={last} onChangeText={setLast}/>
  <AppDatePicker label="Date of birth" value={dob} onChange={setDob} maxDate={localToday()}/>
  <Text style={s.label}>Gender</Text><View style={s.row}>{["Male","Female"].map(g=><TouchableOpacity key={g} accessibilityRole="radio" accessibilityState={{checked:gender===g}} style={[s.chip,gender===g&&s.active]} onPress={()=>setGender(g)}><Text style={gender===g?s.white:s.dark}>{gender===g?"☑ ":"☐ "}{g}</Text></TouchableOpacity>)}</View>
  <Text style={s.label}>Identity type</Text>
  <View style={s.row}>{['SA_ID','PASSPORT','ASYLUM_PERMIT','REFUGEE_ID','FOREIGN_ID'].map(t=><TouchableOpacity key={t} onPress={()=>setIdType(t)} style={[s.chip,idType===t&&s.active]}><Text style={idType===t?s.white:s.dark}>{t}</Text></TouchableOpacity>)}</View>
  <TextInput style={s.input} placeholder={idType==='SA_ID'?"SA ID (13 digits, optional)":"Document number (optional)"} maxLength={idType==='SA_ID'?13:30} value={idNumber} onChangeText={setIdNumber}/>
  <TextInput style={s.input} placeholder="Country of origin" value={country} onChangeText={setCountry}/>
  <TextInput style={s.input} placeholder="Address (optional)" value={address} onChangeText={setAddress}/>
  {message ? <Text style={s.error}>{message}</Text>:null}
  <TouchableOpacity style={s.button} disabled={busy} onPress={()=>void save()}><Text style={s.white}>{busy?'Saving...':'Complete registration'}</Text></TouchableOpacity>
 </ScrollView>;
}
export default function CompleteRegistration(){return <RoleGuard allowedRoles={['PATIENT']}><RegistrationContent/></RoleGuard>}
const s=StyleSheet.create({page:{padding:20,gap:12,backgroundColor:'#f4f6f9'},title:{fontSize:23,fontWeight:'bold',color:'#1f4e79'},input:{borderWidth:1,borderColor:'#cbd5e1',backgroundColor:'white',borderRadius:7,padding:13},label:{fontWeight:'bold'},row:{flexDirection:'row',flexWrap:'wrap',gap:6},chip:{padding:8,backgroundColor:'#e1e9f1',borderRadius:6},active:{backgroundColor:'#1f4e79'},white:{color:'white',fontWeight:'bold'},dark:{color:'#1f4e79'},button:{backgroundColor:'#1f4e79',padding:15,borderRadius:8,alignItems:'center'},error:{color:'#b42318'}});
