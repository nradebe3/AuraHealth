import React, { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { useAuth, UserRole } from '../hooks/useAuth';
export function PortalHeader(){
 const router=useRouter();const navigation=useNavigation();
 const {user,availableRoles,role,switchRole,logout}=useAuth();const [open,setOpen]=useState(false);
 const signOut=async()=>{setOpen(false);await logout();router.replace('/(auth)/login')};
 return <View style={s.bar}>
  <Pressable style={s.btn} onPress={()=>navigation.canGoBack()?router.back():router.replace('/')}><Text style={s.txt}>Back</Text></Pressable>
  <Pressable style={s.btn} onPress={()=>router.replace('/')}><Text style={s.txt}>Home</Text></Pressable>
  <View style={{flex:1}}/>
  {user&&availableRoles.length>1&&<Pressable style={s.btn} onPress={()=>setOpen(true)}><Text style={s.txt}>Switch Role</Text></Pressable>}
  {user&&<Pressable style={s.btn} onPress={()=>void signOut()}><Text style={s.txt}>Log Off</Text></Pressable>}
  <Modal visible={open} transparent animationType="fade" onRequestClose={()=>setOpen(false)}>
   <View style={s.overlay}><View style={s.modal}><Text style={s.title}>Choose authorized role</Text>
    {availableRoles.map((r:UserRole)=><Pressable key={r} style={s.choice} onPress={()=>{switchRole(r);setOpen(false);router.replace('/')}}><Text>{r===role?'[x] ':''}{r.replace('_',' ')}</Text></Pressable>)}
    <Pressable onPress={()=>setOpen(false)} style={s.choice}><Text>Cancel</Text></Pressable>
   </View></View>
  </Modal>
 </View>;
}
const s=StyleSheet.create({bar:{flexDirection:'row',alignItems:'center',gap:5},btn:{paddingHorizontal:7,paddingVertical:7},txt:{color:'white',fontSize:12,fontWeight:'700'},overlay:{flex:1,backgroundColor:'#0008',justifyContent:'center',alignItems:'center'},modal:{backgroundColor:'white',borderRadius:12,padding:20,width:'85%',maxWidth:400},title:{fontWeight:'700',fontSize:18,marginBottom:12},choice:{padding:13,borderBottomWidth:1,borderColor:'#eee'}});
