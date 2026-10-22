import React,{useEffect,useState} from 'react';
import {View,Text,TextInput,TouchableOpacity,ActivityIndicator,StyleSheet} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {supabase} from '../src/lib/supabase';
export default function Activate(){
 const {token_hash,type}=useLocalSearchParams<{token_hash:string;type:string}>();
 const router=useRouter();const [verified,setVerified]=useState(false);const [busy,setBusy]=useState(true);
 const [password,setPassword]=useState('');const [confirm,setConfirm]=useState('');const [message,setMessage]=useState('Verifying activation link…');
 useEffect(()=>{let cancelled=false;(async()=>{
  if(typeof token_hash!=='string'||!['invite','recovery'].includes(String(type))){setMessage('Invalid activation link');setBusy(false);return;}
  const {error}=await supabase.auth.verifyOtp({token_hash,type:type as 'invite'|'recovery'});
  if(cancelled)return;setBusy(false);if(error)setMessage(error.message);else{setVerified(true);setMessage('Choose a password to activate your account.');}
 })();return()=>{cancelled=true}},[token_hash,type]);
 const activate=async()=>{
  if(password.length<12||password!==confirm){setMessage('Use at least 12 characters and matching passwords.');return;}
  setBusy(true);try{
   const {data,error}=await supabase.functions.invoke('activate-account',{body:{password}});
   if(error||data?.error){setMessage(data?.error||error?.message||'Activation failed');return;}
   setMessage('Account activated. You can now sign in.');await supabase.auth.signOut();router.replace('/');
  }finally{setBusy(false)}
 };
 return <View style={s.page}><Text style={s.heading}>Aura Health Account Activation</Text><Text>{message}</Text>
 {verified&&<><TextInput style={s.input} secureTextEntry placeholder="New password (12+ characters)" value={password} onChangeText={setPassword}/><TextInput style={s.input} secureTextEntry placeholder="Confirm password" value={confirm} onChangeText={setConfirm}/><TouchableOpacity disabled={busy} style={s.button} onPress={()=>void activate()}><Text style={{color:'white'}}>Activate account</Text></TouchableOpacity></>}
 {busy&&<ActivityIndicator/>}</View>
}
const s=StyleSheet.create({page:{flex:1,justifyContent:'center',padding:24,gap:16,maxWidth:520,alignSelf:'center',width:'100%'},heading:{fontSize:24,fontWeight:'700',color:'#146c82'},input:{borderWidth:1,borderColor:'#ccc',borderRadius:8,padding:14},button:{backgroundColor:'#146c82',padding:15,borderRadius:8,alignItems:'center'}});
