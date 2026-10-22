import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { localToday } from '../lib/validation';

type Props = { facilityId: string; service: string; value: string; onChange: (day: string) => void; excludeAppointmentId?: string };
const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const monthStart = (date: string) => { const [y, m] = date.slice(0, 7).split('-').map(Number); return new Date(y, m - 1, 1); };
export default function AvailabilityCalendar({ facilityId, service, value, onChange, excludeAppointmentId }: Props) {
  const [month, setMonth] = useState(() => monthStart(value || localToday()));
  const [disabled, setDisabled] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const y = month.getFullYear(), m = month.getMonth() + 1;
  useEffect(() => { if (value && value.slice(0, 7) !== iso(y, m, 1).slice(0, 7)) setMonth(monthStart(value)); }, [value]);
  useEffect(() => {
    let active = true;
    setDisabled([]);
    setError('');
    setLoading(false);
    if (!facilityId || !service) return;
    setLoading(true);
    void (async () => {
      try {
        const { data, error: rpcError } = await supabase.rpc('appointment_month_availability', {
          p_facility_id: facilityId, p_service: service, p_month: iso(y, m, 1), p_exclude_appointment_id: excludeAppointmentId || null,
        });
        if (!active) return;
        if (rpcError) throw rpcError;
        if (!Array.isArray(data)) throw new Error('Calendar availability returned an unexpected response.');
        setDisabled(data.filter((r: any) => r.fully_booked === true).map((r: any) => r.appointment_date));
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [facilityId, service, y, m, excludeAppointmentId, retry]);
  const days = useMemo(() => {
    const first = new Date(y, m - 1, 1).getDay();
    const length = new Date(y, m, 0).getDate();
    return [...Array(first).fill(null), ...Array.from({ length }, (_, i) => i + 1)];
  }, [y, m]);
  const today = localToday();
  const max = (() => { const d = new Date(`${today}T12:00:00`); d.setDate(d.getDate() + 90); return iso(d.getFullYear(), d.getMonth() + 1, d.getDate()); })();
  const currentMonth = today.slice(0, 7);
  const lastMonth = max.slice(0, 7);
  return <View style={s.wrap}>
    <View style={s.nav}>
      <TouchableOpacity onPress={() => setMonth(new Date(y, m - 2, 1))} disabled={iso(y, m, 1).slice(0, 7) <= currentMonth} accessibilityLabel="Previous month"><Text style={s.arrow}>‹</Text></TouchableOpacity>
      <Text style={s.heading}>{month.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}</Text>
      <TouchableOpacity onPress={() => setMonth(new Date(y, m, 1))} disabled={iso(y, m, 1).slice(0, 7) >= lastMonth} accessibilityLabel="Next month"><Text style={s.arrow}>›</Text></TouchableOpacity>
    </View>
    {loading ? <ActivityIndicator /> : null}
    {error ? <View><Text style={s.error}>Availability unavailable: {error}</Text><TouchableOpacity onPress={() => setRetry(n => n + 1)}><Text style={s.link}>Retry</Text></TouchableOpacity></View> : null}
    <View style={s.grid}>
      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((n, i) => <Text key={i} style={s.week}>{n}</Text>)}
      {days.map((d, i) => {
        if (d === null) return <View key={'pad' + i} style={s.day} />;
        const day = iso(y, m, d);
        const off = loading || !!error || day < today || day > max || disabled.includes(day);
        return <TouchableOpacity key={day} disabled={off} onPress={() => onChange(day)} style={[s.day, value === day && s.chosen, off && s.off]}>
          <Text style={[s.dayText, value === day && s.chosenText, off && s.offText]}>{d}</Text>
        </TouchableOpacity>;
      })}
    </View>
    <Text style={s.note}>Grey = unavailable, fully booked, or outside the next 90 days. Clinic timezone: Africa/Johannesburg.</Text>
  </View>;
}
const s = StyleSheet.create({
  wrap: { padding: 12, backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#d2dbe4', gap: 8 },
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heading: { fontWeight: '700', color: '#1f4e79' }, arrow: { fontSize: 26, color: '#1f4e79', paddingHorizontal: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' }, week: { width: '14.2857%', textAlign: 'center', fontWeight: 'bold' },
  day: { width: '14.2857%', minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 5 },
  dayText: { color: '#183f65' }, chosen: { backgroundColor: '#1f4e79' }, chosenText: { color: 'white' },
  off: { backgroundColor: '#e7e7e7' }, offText: { color: '#999' }, error: { color: '#b42318' },
  link: { color: '#1f4e79', fontWeight: 'bold', paddingVertical: 6 }, note: { color: '#64748b', fontSize: 11 },
});
