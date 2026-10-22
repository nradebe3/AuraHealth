import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { consumeAuthRedirect } from '../src/lib/authRedirect';

export default function PasswordSetupScreen() {
 const [ready,setReady]=useState(false);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [password,setPassword]=useState('');
 const [confirm,setConfirm]=useState('');
 const [error,setError]=useState('');
 const [done,setDone]=useState(false);
 useEffect(()=>{
  let mounted=true;
  consumeAuthRedirect().then(()=>{if(mounted)setReady(true);})
   .catch(e=>{if(mounted)setError(e instanceof Error?e.message:'Invalid link');})
   .finally(()=>{if(mounted)setLoading(false);});
  return ()=>{mounted=false};
 },[]);
 async function save(){
  if(password.length<12){setError('Password must contain at least 12 characters.');return;}
  if(password!==confirm){setError('Passwords do not match.');return;}
  setSaving(true);setError('');
  try {
   const {error:authError}=await supabase.auth.updateUser({password});
   if(authError)throw authError;
   setDone(true);
   await supabase.auth.signOut();
  }catch(e){setError(e instanceof Error?e.message:'Unable to update password');}
  finally{setSaving(false);}
 }
 return <View style={s.page}>
  <Text style={s.title}>AuraHealth — Accept Invitation</Text>
  <Text style={s.description}>Choose a password to activate your invited account.</Text>
  {loading?<ActivityIndicator/>:done?<>
    <Text style={s.success}>Password saved. You can now sign in with your email and new password.</Text>
    <TouchableOpacity style={s.button} onPress={()=>router.replace('/(auth)/login')}><Text style={s.buttonText}>Go to Sign In</Text></TouchableOpacity>
   </>:ready?<>
    <TextInput style={s.input} placeholder="New password (12+ characters)" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none"/>
    <TextInput style={s.input} placeholder="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none"/>
    <TouchableOpacity style={s.button} disabled={saving} onPress={()=>void save()}><Text style={s.buttonText}>{saving?'Saving...':'Save Password'}</Text></TouchableOpacity>
   </>:<Text>Ask your administrator for a fresh link if this one is invalid or expired.</Text>}
  {!!error&&<Text style={s.error}>{error}</Text>}
 </View>;
}
const s=StyleSheet.create({page:{flex:1,justifyContent:'center',alignSelf:'center',width:'100%',maxWidth:460,padding:24,backgroundColor:'#f4f6f9'},title:{fontSize:23,fontWeight:'bold',color:'#1f4e79',marginBottom:12},description:{marginBottom:18,color:'#444'},input:{backgroundColor:'white',borderWidth:1,borderColor:'#bbb',borderRadius:7,padding:13,marginBottom:12},button:{backgroundColor:'#1f4e79',padding:15,borderRadius:7,alignItems:'center'},buttonText:{color:'white',fontWeight:'bold'},error:{color:'#b42318',marginTop:14},success:{color:'#166534',marginBottom:14}});
