import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/hooks/useAuth';
import { RoleGuard } from '../../src/components/RoleGuard';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal, FlatList, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { syncAppointmentToDeviceCalendar } from '../../src/lib/calendarService';
import AvailabilityCalendar from '../../src/components/AvailabilityCalendar';
import AvailabilitySlots from '../../src/components/AvailabilitySlots';
import { localToday, validBookingDate } from '../../src/lib/validation';

type FacilityOption = { id: string; name: string; type: string; area: string };
const formatSlot = (value: string) => {
  const [h, m] = value.split(':').map(Number);
  return `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

function BookAppointmentScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [facilities, setFacilities] = useState<FacilityOption[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<FacilityOption | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [selectedService, setSelectedService] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [enableSms, setEnableSms] = useState(false);
  const [enableEmail, setEnableEmail] = useState(true);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [bookingBusy, setBookingBusy] = useState(false);
  const [calendarStatus, setCalendarStatus] = useState('');
  const [enableCalendar, setEnableCalendar] = useState(Platform.OS !== 'web');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingRef, setBookingRef] = useState('');

  useEffect(() => {
    let mounted = true;
    if (user?.id) void supabase.from('users').select('phone_number').eq('id',user.id).single().then(({data}) => { if(mounted) setPhoneNumber(data?.phone_number || ''); });
    void (async () => {
      const [f, o] = await Promise.all([
        supabase.from('facilities').select('id,facility_name,facility_type,area,district').eq('is_active', true).order('facility_name'),
        supabase.from('lookup_options').select('category,value').in('category', ['service','time_slot']).eq('is_active', true).order('sort_order')
      ]);
      if (!mounted) return;
      if (f.error || o.error) { setLookupError(f.error?.message || o.error?.message || 'Could not load database options'); return; }
      const list = (f.data || []).map(x => ({id:x.id,name:x.facility_name,type:x.facility_type || 'Healthcare facility',area:x.area || x.district}));
      const sv = (o.data || []).filter(x=>x.category==='service').map(x=>x.value);
      const sl = (o.data || []).filter(x=>x.category==='time_slot').map(x=>formatSlot(x.value));
      setFacilities(list); setSelectedFacility(list[0] || null);
      setServices(sv); setSelectedService(sv[0] || '');
      setSlots(sl); setSelectedSlot('');
    })();
    return () => { mounted = false; };
  }, []);

  const handleConfirmBooking = async () => {
    setBookingError('');
    if (!selectedFacility || !selectedService || !selectedSlot) { setBookingError('Select a facility, service and time.'); return; }
    if (!user) { setBookingError('Please sign in first.'); return; }
    if (!validBookingDate(appointmentDate)) { setBookingError('Select a valid appointment date today or later.'); return; }
    if (enableSms && !phoneNumber) { setBookingError('Your profile needs a phone number before SMS can be enabled.'); return; }
    setBookingBusy(true);
    try {
      const time = `${selectedSlot}:00`;
      if (appointmentDate===localToday() && new Date(`${appointmentDate}T${time}`).getTime() <= Date.now()) { setBookingError('Choose a future time slot.'); return; }
      const { data, error } = await supabase.rpc('book_appointment_with_notifications', {
        p_facility_id: selectedFacility.id, p_service: selectedService,
        p_date: appointmentDate, p_time: time, p_email: enableEmail, p_sms: enableSms,
      });
      if (error) throw new Error(error.code === '23505' ? 'This time slot is already booked. Choose another.' : error.message);
      setBookingRef(String(data)); setBookingConfirmed(true);
      if (enableCalendar && Platform.OS !== 'web') {
        const ok = await syncAppointmentToDeviceCalendar(selectedFacility.name, appointmentDate, time.slice(0,5), String(data));
        setCalendarStatus(ok ? 'Calendar event saved.' : 'Calendar event could not be saved.');
      }
    } catch (e) {
      setBookingError(e instanceof Error ? e.message : 'Booking failed.');
    } finally { setBookingBusy(false); }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {!bookingConfirmed ? (
        <View>
          <Text style={styles.headerTitle}>Schedule Clinic Appointment</Text>
          <Text style={styles.subTitle}>Select a health facility from the dropdown list below</Text>

          {lookupError ? <Text style={{color:'#b00020'}}>{lookupError}</Text> : null}
          {/* Facility Dropdown Selector */}
          <Text style={styles.label}>1. Select Health Facility (* Required)</Text>
          <TouchableOpacity style={styles.dropdownTrigger} onPress={() => { if (facilities.length) setDropdownVisible(true); }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.dropdownSelectedName}>{selectedFacility?.name || 'No facilities available'}</Text>
              <Text style={styles.dropdownSelectedMeta}>{selectedFacility?.type || ''} - {selectedFacility?.area || ''}</Text>
            </View>
            <Text style={styles.dropdownArrow}>v</Text>
          </TouchableOpacity>

          {/* Facility Selection Modal */}
          <Modal visible={dropdownVisible} animationType="slide" transparent={true}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Choose Public Health Facility</Text>
                  <TouchableOpacity onPress={() => setDropdownVisible(false)}>
                    <Text style={styles.closeBtn}>X Close</Text>
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={facilities}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.facilityOption,
                        selectedFacility?.id === item.id && styles.facilityOptionSelected
                      ]}
                      onPress={() => {
                        setSelectedFacility(item);
                        setSelectedSlot('');
                        setDropdownVisible(false);
                      }}
                    >
                      <Text style={styles.optionName}>{item.name}</Text>
                      <View style={styles.optionMetaRow}>
                        <Text style={styles.optionBadge}>{item.type}</Text>
                        <Text style={styles.optionArea}>Location:  {item.area}</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>
          </Modal>

          {/* Service Selection */}
          <Text style={styles.label}>2. Select Clinical Service</Text>
          {services.map((service, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.radioOption, selectedService === service && styles.radioSelected]}
              onPress={() => {setSelectedService(service);setSelectedSlot('');}}
            >
              <Text style={selectedService === service ? styles.radioTextSelected : styles.radioText}>{service}</Text>
            </TouchableOpacity>
          ))}

          <Text style={styles.label}>3. Choose Appointment Date</Text>
          <AvailabilityCalendar facilityId={selectedFacility?.id||''} service={selectedService} value={appointmentDate} onChange={d=>{setAppointmentDate(d);setSelectedSlot('');}} />
          <Text style={styles.label}>4. Available Arrival Time Slots</Text>
          <AvailabilitySlots facilityId={selectedFacility?.id||''} service={selectedService} date={appointmentDate} value={selectedSlot} onChange={setSelectedSlot}/>
          {/* Reminder Controls */}
          <Text style={styles.label}>5. Notifications & Calendar</Text>
          <Text style={styles.subTitle}>Reminders are queued for delivery by the server. Sending is not guaranteed.</Text>
          <View style={styles.switchRow}><Text style={styles.switchLabel}>Email confirmation and reminders</Text><TouchableOpacity style={styles.toggleBtn} onPress={() => setEnableEmail(!enableEmail)}><Text style={styles.toggleText}>{enableEmail ? "ON" : "OFF"}</Text></TouchableOpacity></View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Enable Automated SMS Alert</Text>
            <TouchableOpacity style={styles.toggleBtn} onPress={() => setEnableSms(!enableSms)}>
              <Text style={styles.toggleText}>{enableSms ? 'ON' : 'OFF'}</Text>
            </TouchableOpacity>
          </View>

          {enableSms && <Text style={styles.infoNote}>SMS recipient from your account: {phoneNumber || 'No phone on profile'}. Update your profile to change it.</Text>}

          {Platform.OS !== 'web' && <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Sync to Device Calendar</Text>
            <TouchableOpacity style={styles.toggleBtn} onPress={() => setEnableCalendar(!enableCalendar)}>
              <Text style={styles.toggleText}>{enableCalendar ? 'ON' : 'OFF'}</Text>
            </TouchableOpacity>
          </View>}

          {bookingError ? <Text style={{color: "#B00020", marginVertical: 10}}>{bookingError}</Text> : null}
          <TouchableOpacity style={styles.submitButton} onPress={handleConfirmBooking} disabled={bookingBusy}>
            <Text style={styles.submitText}>{bookingBusy ? "Saving..." : "Confirm Slot Reservation"}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.confirmationBox}>
          <Text style={styles.successBadge}>[OK] Appointment Confirmed!</Text>
          <Text style={styles.refCode}>Ticket Ref: {bookingRef}</Text>

          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}>Facility Details</Text>
            <Text style={styles.detailValue}>{selectedFacility?.name || 'No facilities available'}</Text>
            <Text style={styles.detailSub}>{selectedFacility?.type || ''} - {selectedFacility?.area || ''}</Text>

            <Text style={[styles.detailTitle, { marginTop: 12 }]}>Service & Scheduled Time</Text>
            <Text style={styles.detailValue}>{selectedService}</Text>
            <Text style={styles.detailSub}>Slot: {appointmentDate} at {selectedSlot}</Text>
          </View>

          {(enableSms || enableEmail) && <Text style={styles.infoNote}>Notifications scheduled. Delivery status is tracked on the server.</Text>}
          {calendarStatus ? <Text style={styles.infoNote}>{calendarStatus}</Text> : null}

          <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/(patient)/queue-status')}>
            <Text style={styles.buttonText}>Go to Live 3-Queue Tracker</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#F4F6F9', flexGrow: 1 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1F4E79' },
  subTitle: { fontSize: 13, color: '#666', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#1F4E79', marginTop: 15, marginBottom: 8 },
  dropdownTrigger: { backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#1F4E79', borderRadius: 8, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownSelectedName: { fontSize: 15, fontWeight: 'bold', color: '#1F4E79' },
  dropdownSelectedMeta: { fontSize: 12, color: '#666', marginTop: 2 },
  dropdownArrow: { fontSize: 14, color: '#1F4E79', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#EEE', paddingBottom: 10 },
  modalTitle: { fontSize: 17, fontWeight: 'bold', color: '#1F4E79' },
  closeBtn: { fontSize: 14, fontWeight: 'bold', color: '#C00000' },
  facilityOption: { padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#DDD', marginBottom: 10, backgroundColor: '#FAFAFA' },
  facilityOptionSelected: { borderColor: '#1F4E79', backgroundColor: '#EBF3FA', borderWidth: 2 },
  optionName: { fontSize: 15, fontWeight: 'bold', color: '#1F4E79' },
  optionMetaRow: { flexDirection: 'row', gap: 10, marginTop: 4, alignItems: 'center' },
  optionBadge: { backgroundColor: '#D9E1F2', color: '#1F4E79', fontSize: 11, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontWeight: '600' },
  optionArea: { fontSize: 12, color: '#555' },
  radioOption: { backgroundColor: '#FFF', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#DDD', marginBottom: 8 },
  radioSelected: { borderColor: '#1F4E79', backgroundColor: '#EBF3FA' },
  radioText: { fontSize: 14, color: '#333' },
  radioTextSelected: { fontSize: 14, color: '#1F4E79', fontWeight: 'bold' },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotBadge: { backgroundColor: '#FFF', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 6, borderWidth: 1, borderColor: '#CCC', width: '30%', alignItems: 'center' },
  slotSelected: { backgroundColor: '#1F4E79', borderColor: '#1F4E79' },
  slotText: { fontSize: 13, color: '#333' },
  slotTextSelected: { fontSize: 13, color: '#FFF', fontWeight: 'bold' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#DDD' },
  switchLabel: { fontSize: 14, color: '#333' },
  toggleBtn: { backgroundColor: '#1F4E79', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 },
  toggleText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#CCC', borderRadius: 8, padding: 12, marginBottom: 10, fontSize: 14 },
  submitButton: { backgroundColor: '#1F4E79', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 15, marginBottom: 30 },
  submitText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  confirmationBox: { alignItems: 'center', marginTop: 20 },
  successBadge: { fontSize: 20, fontWeight: 'bold', color: '#278036' },
  refCode: { fontSize: 18, fontWeight: 'bold', color: '#1F4E79', marginVertical: 8 },
  detailCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 10, width: '100%', borderWidth: 1, borderColor: '#DDD', marginVertical: 15 },
  detailTitle: { fontSize: 12, color: '#888', fontWeight: 'bold', textTransform: 'uppercase' },
  detailValue: { fontSize: 15, fontWeight: 'bold', color: '#1F4E79', marginTop: 2 },
  detailSub: { fontSize: 13, color: '#555', marginTop: 2 },
  infoNote: { fontSize: 13, color: '#2F5496', marginBottom: 6 },
  primaryButton: { backgroundColor: '#1F4E79', padding: 16, borderRadius: 8, width: '100%', alignItems: 'center', marginTop: 20 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});


export default function ProtectedBookAppointmentScreen(props: any) {
  return (
    <RoleGuard allowedRoles={["PATIENT"]}>
      <BookAppointmentScreen {...props} />
    </RoleGuard>
  );
}
