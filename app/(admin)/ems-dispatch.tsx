import React, {useCallback,useEffect,useState} from 'react';
import {ActivityIndicator,Alert,Button,ScrollView,StyleSheet,Text,View} from 'react-native';
import {RoleGuard} from '../../src/components/RoleGuard';
import {supabase} from '../../src/lib/supabase';
import {useAuth} from '../../src/hooks/useAuth';
type Request={id:string;created_at:string;status:string;notes:string|null;facility_id:string|null};
function Dispatch(){const {user}=useAuth();const [rows,setRows]=useState<Request[]>([]);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const refresh=useCallback(async()=>{setBusy(true);setError('');const r=await supabase.from('emergency_requests').select('id,created_at,status,notes,facility_id').order('created_at',{ascending:false}).limit(50);if(r.error)setError(r.error.message);else setRows(r.data??[]);setBusy(false)},[]);
 useEffect(()=>{void refresh()},[refresh]);
 async function acknowledge(id:string){if(!user)return;setBusy(true);const {error:e}=await supabase.from('emergency_requests').update({status:'ACKNOWLEDGED',acknowledged_by:user.id,acknowledged_at:new Date().toISOString()}).eq('id',id).eq('status','OPEN');setBusy(false);if(e)Alert.alert('Could not acknowledge',e.message);else{Alert.alert('Acknowledged','Request recorded in Aura Health. This does not dispatch an ambulance or contact emergency services.');void refresh()}}
 return <ScrollView contentContainerStyle={s.root}><Text style={s.heading}>Emergency requests — prototype</Text><Text style={s.warning}>NOT an emergency dispatch service. For a real emergency, contact your local emergency services immediately. No ambulance is contacted by this screen.</Text><Button title="Refresh requests" onPress={()=>void refresh()}/>{busy&&<ActivityIndicator/>}{!!error&&<Text style={s.warning}>{error}</Text>}{rows.length===0&&!busy&&<Text>No requests available.</Text>}{rows.map(r=><View style={s.card} key={r.id}><Text>Request {r.id.slice(0,8)}</Text><Text>Status: {r.status}</Text><Text>Created: {new Date(r.created_at).toLocaleString()}</Text><Text>{r.notes||'No details supplied'}</Text>{r.status==='OPEN'&&<Button title="Acknowledge request (not dispatch)" disabled={busy} onPress={()=>void acknowledge(r.id)}/>}</View>)}</ScrollView>
}
const s=StyleSheet.create({root:{padding:20,gap:12},heading:{fontSize:22,fontWeight:'bold',color:'#9D2020'},warning:{color:'#A01616',fontWeight:'600'},card:{backgroundColor:'#F5F6FA',padding:14,borderRadius:8,gap:7}});
export default function EMS(){return <RoleGuard allowedRoles={['EMS_DISPATCH','ADMIN','SYSTEM_ADMIN']}><Dispatch/></RoleGuard>}
