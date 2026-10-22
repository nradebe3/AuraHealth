import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';

type Slot = { slot_time: string; remaining_capacity: number; fully_booked: boolean };
type Props = {
  facilityId: string;
  service: string;
  date: string;
  value: string;
  onChange: (v: string) => void;
  excludeAppointmentId?: string;
};

export default function AvailabilitySlots({ facilityId, service, date, value, onChange, excludeAppointmentId }: Props) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [retry, setRetry] = useState(0);
  const [diagnostic, setDiagnostic] = useState('');

  useEffect(() => {
    let active = true;
    setSlots([]);
    setError('');
    setLoaded(false);
    setDiagnostic('');
    setBusy(false);

    if (!facilityId || !service || !date) {
      console.log('[AuraHealth] Availability request skipped:', { facilityId, service, date });
      return () => { active = false; };
    }

    setBusy(true);
    void (async () => {
      const args = {
        p_facility_id: facilityId,
        p_service: service,
        p_date: date,
        p_exclude_appointment_id: excludeAppointmentId || null,
      };
      console.log('[AuraHealth] Availability request:', args);
      try {
        const { data, error: rpcError } = await supabase.rpc('appointment_slot_availability', args);
        console.log('[AuraHealth] Availability response:', { data, error: rpcError });
        if (!active) return;
        if (rpcError) throw rpcError;
        if (!Array.isArray(data)) throw new Error('Availability service returned an unexpected response.');
        const parsed: Slot[] = data.map((row: any) => {
          const remaining = Number(row.remaining_capacity);
          if (typeof row.slot_time !== 'string' || !Number.isFinite(remaining) || typeof row.fully_booked !== 'boolean') {
            throw new Error('Availability service returned invalid slot data.');
          }
          return { slot_time: row.slot_time, remaining_capacity: remaining, fully_booked: row.fully_booked };
        });
        setSlots(parsed);
        setDiagnostic(`Date: ${date} | Rows returned: ${parsed.length}`);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        console.error('[AuraHealth] Availability failure:', e);
        if (active) {
          setError(message);
          setDiagnostic(`Date: ${date} | Request failed`);
        }
      } finally {
        if (active) { setBusy(false); setLoaded(true); }
      }
    })();
    return () => { active = false; };
  }, [facilityId, service, date, excludeAppointmentId, retry]);

  const label = (v: string) => {
    const [h, m] = v.slice(0, 5).split(':').map(Number);
    return `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  };
  const availableCount = slots.filter(slot => !slot.fully_booked && slot.remaining_capacity > 0).length;

  return <View style={s.wrap}>
    {!date ? <Text>Select a date first.</Text> : null}
    {busy ? <ActivityIndicator accessibilityLabel="Loading appointment slots" /> : null}
    {diagnostic ? <Text style={s.diagnostic}>{diagnostic}</Text> : null}
    {error ? <View style={s.message}><Text style={s.error}>Could not check availability: {error}</Text><TouchableOpacity onPress={() => setRetry(n => n + 1)}><Text style={s.link}>Retry</Text></TouchableOpacity></View> : null}
    {loaded && !error && slots.length > 0 && availableCount === 0 ? <Text>All clinic slots are booked or have passed for this date.</Text> : null}
    <View style={s.grid}>{slots.map(slot => {
      const t = slot.slot_time.slice(0, 5);
      const off = busy || slot.fully_booked || slot.remaining_capacity <= 0;
      return <TouchableOpacity key={t} disabled={off} onPress={() => onChange(t)} style={[s.slot, value === t && !off && s.selected, off && s.disabled]}>
        <Text style={[s.text, value === t && !off && s.selectedText, off && s.disabledText]}>{label(t)}{off ? ' · Unavailable' : ` · ${slot.remaining_capacity} left`}</Text>
      </TouchableOpacity>;
    })}</View>
    {date && loaded && !error && slots.length === 0 ? <View style={s.message}><Text>No time slots were returned for this date. Check the availability RPC and active time-slot configuration.</Text><TouchableOpacity onPress={() => setRetry(n => n + 1)}><Text style={s.link}>Retry</Text></TouchableOpacity></View> : null}
  </View>;
}

const s = StyleSheet.create({
  wrap: { gap: 8 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  slot: { borderColor: '#a6b7c7', borderWidth: 1, padding: 12, borderRadius: 6, minWidth: 125, alignItems: 'center' },
  selected: { backgroundColor: '#1f4e79' }, disabled: { backgroundColor: '#e7e7e7' },
  text: { color: '#1f4e79' }, selectedText: { color: 'white' }, disabledText: { color: '#888' },
  error: { color: '#b42318' }, message: { gap: 6 }, link: { color: '#1f4e79', fontWeight: 'bold' },
  diagnostic: { color: '#64748b', fontSize: 12 },
});
