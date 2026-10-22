import * as Calendar from 'expo-calendar';

export async function syncAppointmentToDeviceCalendar(
  facilityName: string,
  appointmentDateStr: string,
  timeSlotStr: string,
  ticketRef: string
): Promise<boolean> {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== 'granted') {
      alert('Calendar permission is required to save appointment reminders.');
      return false;
    }

    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    let targetCalendar = calendars.find((c) => c.title === 'Aura Health Appointments');

    if (!targetCalendar) {
      const defaultCalendar = calendars.find((c) => c.isPrimary) || calendars[0];
      const newCalendarId = await Calendar.createCalendarAsync({
        title: 'Aura Health Appointments',
        color: '#1F4E79',
        entityType: Calendar.EntityTypes.EVENT,
        sourceId: defaultCalendar?.source?.id,
        source: defaultCalendar?.source || { isLocalAccount: true, name: 'Aura Health', type: 'LOCAL' },
        name: 'AuraHealthCalendar',
        ownerAccount: 'personal',
        accessLevel: Calendar.CalendarAccessLevel.OWNER,
      });
      targetCalendar = { id: newCalendarId } as any;
    }

    const startDate = new Date(`${appointmentDateStr}T${timeSlotStr}:00`);
    const endDate = new Date(startDate.getTime() + 45 * 60 * 1000);

    await Calendar.createEventAsync(targetCalendar!.id, {
      title: `Healthcare Appointment — ${facilityName}`,
      startDate,
      endDate,
      location: facilityName,
      notes: `Booking Reference: #${ticketRef}. Please bring your SA National ID or Foreign Passport for check-in.`,
      alarms: [{ relativeOffset: -24 * 60 }, { relativeOffset: -2 * 60 }],
    });

    return true;
  } catch (err) {
    console.error('Failed to sync event to calendar:', err);
    return false;
  }
}
