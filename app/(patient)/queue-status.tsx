import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { RoleGuard } from '../../src/components/RoleGuard';
import { supabase } from '../../src/lib/supabase';
import { useRouter } from 'expo-router';

type QueueItem = {
  appointment_id: string; ticket_number: string | null; facility_name: string;
  queue_type: string | null; status: string; position: number | null;
  estimated_wait_minutes: number | null; appointment_date: string; time_slot: string;
};
function QueueContent() {
  const router = useRouter();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    const { data, error: err } = await supabase.rpc('patient_queue_snapshot');
    if (err) setError(err.message);
    else { setItems((data || []) as QueueItem[]); setError(''); }
    setLoading(false);
  }, []);
  useEffect(() => {
    void load();
    // Realtime invalidation: any queue change causes a fresh, access-controlled RPC query.
    const channel = supabase.channel('patient-queue-refresh')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_entries' }, () => { void load(); })
      .subscribe();
    const poll = setInterval(() => { void load(); }, 15000);
    return () => { clearInterval(poll); void supabase.removeChannel(channel); };
  }, [load]);
  const checkIn = async (id: string) => {
    setBusy(true); setError('');
    const { error: err } = await supabase.rpc('patient_check_in', { p_appointment_id: id });
    if (err) setError(err.message);
    await load(); setBusy(false);
  };
  return <ScrollView contentContainerStyle={s.page}>
    <Text style={s.heading}>My Clinic Queue</Text>
    <Text style={s.info}>Queue position is based on actual clinic check-ins. Wait times are estimates (10 minutes per person), not guaranteed.</Text>
    {loading ? <ActivityIndicator /> : null}
    {error ? <Text style={s.error}>{error}</Text> : null}
    {!loading && items.length === 0 ? <View style={s.card}><Text>No appointments found. Book an appointment first.</Text><TouchableOpacity onPress={() => router.push('/(patient)/book-appointment')}><Text style={s.link}>Book an appointment</Text></TouchableOpacity></View> : null}
    {items.map(item => <View key={item.appointment_id} style={s.card}>
      <Text style={s.title}>{item.facility_name}</Text>
      <Text>{item.appointment_date} at {item.time_slot?.slice(0,5)}</Text>
      <Text style={s.label}>Status: {item.status.replace(/_/g, ' ')}</Text>
      {item.ticket_number ? <>
        <Text style={s.ticket}>Ticket: {item.ticket_number}</Text>
        <Text>Queue: {item.queue_type}</Text>
        {item.status === 'WAITING' ? <><Text>Position: {item.position ?? 'Updating'}</Text><Text>Estimated wait: {item.estimated_wait_minutes ?? 'Updating'} minutes</Text></> : null}
        {item.status === 'CALLED' ? <Text style={s.called}>Your ticket has been called. Please speak to facility staff.</Text> : null}
      </> : <>
        <Text>Not checked in yet.</Text>
        {item.appointment_date === new Date().toLocaleDateString('en-CA') ?
          <TouchableOpacity style={s.button} disabled={busy} onPress={() => void checkIn(item.appointment_id)}><Text style={s.white}>Check in for today's appointment</Text></TouchableOpacity> :
          <Text style={s.info}>Check-in becomes available on your appointment date.</Text>}
      </>}
    </View>)}
    <TouchableOpacity style={s.button} onPress={() => void load()}><Text style={s.white}>Refresh queue</Text></TouchableOpacity>
    <Text style={s.info}>This is not an emergency or triage service. For urgent symptoms, contact clinic staff or emergency services immediately.</Text>
  </ScrollView>;
}
export default function QueueStatusScreen() { return <RoleGuard allowedRoles={['PATIENT','ADMIN']}><QueueContent /></RoleGuard>; }
const s=StyleSheet.create({page:{padding:20,gap:12,backgroundColor:'#f4f6f9',flexGrow:1},heading:{fontSize:24,fontWeight:'bold',color:'#1f4e79'},info:{fontSize:13,color:'#555',lineHeight:20},card:{padding:16,backgroundColor:'white',borderRadius:8,gap:8},title:{fontWeight:'bold',fontSize:17},label:{fontWeight:'600'},ticket:{fontSize:22,fontWeight:'bold',color:'#1f4e79'},called:{color:'#9a4d00',fontWeight:'bold'},button:{backgroundColor:'#1f4e79',padding:13,borderRadius:7,alignItems:'center'},white:{color:'white',fontWeight:'bold'},link:{color:'#1f4e79',marginTop:8},error:{color:'#b42318'}});
