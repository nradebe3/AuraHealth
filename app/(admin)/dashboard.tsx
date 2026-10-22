import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RoleGuard } from '../../src/components/RoleGuard';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/hooks/useAuth';

type Metrics = { appointments: number; cancelled: number; checkedIn: number; waiting: number; completed: number; avgWait: number | null };
const empty: Metrics = {appointments:0,cancelled:0,checkedIn:0,waiting:0,completed:0,avgWait:null};
function Dashboard(){
 const {user}=useAuth(); const [data,setData]=useState<Metrics>(empty);const [busy,setBusy]=useState(true);const [error,setError]=useState('');
 const refresh=useCallback(async()=>{
  setBusy(true);setError('');
  try{
   const {data:scope,error:scopeError}=await supabase.from('users').select('facility_id').eq('id',user?.id).single();
   if(scopeError)throw scopeError;
   if(!scope?.facility_id)throw new Error('Your account is not assigned to a facility. Ask a system administrator to assign one.');
   const date=new Date(); const day=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
   const a=await supabase.from('appointments').select('id,status').eq('facility_id',scope.facility_id).eq('appointment_date',day);
   if(a.error)throw a.error;
   const start=new Date(`${day}T00:00:00`).toISOString();const end=new Date(new Date(`${day}T00:00:00`).getTime()+86400000).toISOString();
   const q=await supabase.from('queue_entries').select('status,checked_in_at,called_at').eq('facility_id',scope.facility_id).gte('checked_in_at',start).lt('checked_in_at',end);
   if(q.error)throw q.error;
   const rows=q.data??[]; const durations=rows.filter(x=>x.called_at&&x.checked_in_at).map(x=>(new Date(x.called_at).getTime()-new Date(x.checked_in_at).getTime())/60000).filter(x=>x>=0);
   setData({appointments:a.data?.length??0,cancelled:a.data?.filter(x=>x.status==='CANCELLED').length??0,checkedIn:rows.length,waiting:rows.filter(x=>x.status==='WAITING').length,completed:rows.filter(x=>x.status==='COMPLETED').length,avgWait:durations.length?Math.round(durations.reduce((x,y)=>x+y,0)/durations.length):null});
  }catch(e:any){setError(e?.message??'Could not load live facility data.');setData(empty)}finally{setBusy(false)}
 },[user?.id]);
 useEffect(()=>{void refresh()},[refresh]);
 const metrics:[string,string][]=[['Appointments today',String(data.appointments)],['Cancelled appointments',String(data.cancelled)],['Queue entries today',String(data.checkedIn)],['Currently waiting',String(data.waiting)],['Completed queue entries',String(data.completed)],['Average check-in to call',data.avgWait===null?'Not available':`${data.avgWait} min`]];
 return <ScrollView contentContainerStyle={s.root} refreshControl={<RefreshControl refreshing={busy} onRefresh={()=>void refresh()}/>}><Text style={s.heading}>Facility dashboard</Text><Text style={s.sub}>Live figures for your assigned facility. Pull down to refresh.</Text>{busy&&<ActivityIndicator/>}{!!error&&<Text style={s.error}>{error}</Text>}{!error&&metrics.map(([label,value])=><View key={label} style={s.card}><Text style={s.label}>{label}</Text><Text style={s.value}>{value}</Text></View>)}<Text style={s.sub}>Wait time uses recorded check-in and first-call timestamps. It is not a prediction of total clinic waiting time.</Text></ScrollView>
}
const s=StyleSheet.create({root:{padding:20,backgroundColor:'#F4F6F9',flexGrow:1},heading:{fontSize:23,fontWeight:'bold',color:'#17466D'},sub:{fontSize:13,color:'#555',marginVertical:12},card:{backgroundColor:'white',padding:16,borderRadius:10,marginBottom:10},label:{fontSize:13,color:'#555'},value:{fontSize:24,fontWeight:'bold',color:'#17466D',marginTop:4},error:{color:'#B00020',padding:12}});
export default function AdminDashboard(){return <RoleGuard allowedRoles={['ADMIN','SYSTEM_ADMIN']}><Dashboard/></RoleGuard>}
