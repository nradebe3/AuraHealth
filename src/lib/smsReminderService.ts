import * as SMS from 'expo-sms';

export async function sendAppointmentSmsReminder(
  phoneNumber: string,
  patientName: string,
  facilityName: string,
  appointmentDate: string,
  timeSlot: string,
  ticketRef: string
): Promise<boolean> {
  const isAvailable = await SMS.isAvailableAsync();
  if (!isAvailable) {
    console.log('SMS service unavailable on this device environment.');
    return false;
  }

  const message = `Aura Health Reminder: Hello ${patientName}, your appointment at ${facilityName} is confirmed for ${appointmentDate} at ${timeSlot}. Ref: #${ticketRef}. Please arrive 15 min early for check-in.`;

  try {
    const { result } = await SMS.sendSMSAsync([phoneNumber], message);
    return result === 'sent';
  } catch (error) {
    console.error('Failed to send SMS alert:', error);
    return false;
  }
}
