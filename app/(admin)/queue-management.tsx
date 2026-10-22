import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { RoleGuard } from '../../src/components/RoleGuard';
import { supabase } from '../../src/lib/supabase';
type Entry={id:string;ticket_number:string;queue_type:string;status:string;checked_in_at:string;facility_name:string};
function StaffQueue(){
 const [rows,setRows]=useState<Entry[]>([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const load=useCallback(async()=>{const {data,error}=await supabase.rpc('staff_queue_snapshot');if(error)setMessage(error.message);else {setRows(data||[]);setMessage('')}},[]);
 useEffect(()=>{void load();const timer=setInterval(()=>void load(),15000);return()=>clearInterval(timer)},[load]);
 const advance=async(id:string,status:string,next:string|null)=>{setBusy(true);const {error}=await supabase.rpc('staff_advance_queue',{p_entry_id:id,p_new_status:status,p_next_queue:next});if(error)setMessage(error.message);await load();setBusy(false)};
 return <ScrollView contentContainerStyle={s.page}><Text style={s.title}>Today's Clinic Queue</Text><Text>Staff-only queue controls. Call a ticket, complete the current stage and move to the next queue.</Text>
 {message?<Text style={s.error}>{message}</Text>:null}
 <TouchableOpacity style={s.button} onPress={()=>void load()}><Text style={s.white}>Refresh</Text></TouchableOpacity>
 {rows.map(r=><View key={r.id} style={s.card}><Text style={s.ticket}>{r.ticket_number}</Text><Text>{r.facility_name} • {r.queue_type} • {r.status}</Text>
 {r.status==='WAITING'?<TouchableOpacity disabled={busy} style={s.button} onPress={()=>void advance(r.id,'CALLED',null)}><Text style={s.white}>Call ticket</Text></TouchableOpacity>:null}
 {r.status==='CALLED'?<><TouchableOpacity disabled={busy} style={s.button} onPress={()=>void advance(r.id,'COMPLETED',r.queue_type==='REGISTRATION'?'TRIAGE':r.queue_type==='TRIAGE'?'PHARMACY':null)}><Text style={s.white}>Complete stage {r.queue_type==='REGISTRATION'?'→ Triage':r.queue_type==='TRIAGE'?'→ Pharmacy':''}</Text></TouchableOpacity><TouchableOpacity disabled={busy} onPress={()=>void advance(r.id,'CANCELLED',null)}><Text style={s.error}>Cancel ticket</Text></TouchableOpacity></>:null}
 </View>)}
 </ScrollView>
}
export default function QueueManagement(){return <RoleGuard allowedRoles={['CLINICIAN','ADMIN','SYSTEM_ADMIN']}><StaffQueue/></RoleGuard>}
const s=StyleSheet.create({page:{padding:20,gap:12,backgroundColor:'#f4f6f9',flexGrow:1},title:{fontSize:24,fontWeight:'bold',color:'#1f4e79'},card:{backgroundColor:'white',padding:15,borderRadius:8,gap:10},ticket:{fontSize:20,fontWeight:'bold'},button:{backgroundColor:'#1f4e79',padding:12,borderRadius:7,alignItems:'center'},white:{color:'white',fontWeight:'bold'},error:{color:'#b42318'}});
