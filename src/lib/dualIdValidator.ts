export interface DualIdValidationResult {
  isValid: boolean;
  idType: 'SA_ID' | 'PASSPORT' | 'ASYLUM_PERMIT' | 'REFUGEE_ID' | 'FOREIGN_ID';
  dob?: string;
  gender?: 'Male' | 'Female';
  countryOfOrigin?: string;
  error?: string;
}

export function validatePatientIdentity(
  idType: 'SA_ID' | 'PASSPORT' | 'ASYLUM_PERMIT' | 'REFUGEE_ID' | 'FOREIGN_ID',
  idValue: string,
  countryOfOrigin: string = 'South Africa'
): DualIdValidationResult {
  const cleanValue = idValue.trim().toUpperCase();

  if (!cleanValue) {
    return { isValid: false, idType, error: 'Identity number or document reference cannot be empty.' };
  }

  if (idType === 'SA_ID') {
    if (!/^\d{13}$/.test(cleanValue)) {
      return { isValid: false, idType, error: 'South African National ID must contain exactly 13 numeric digits.' };
    }

    // Luhn Algorithm Checksum
    let sum = 0;
    for (let i = 0; i < 13; i++) {
      let digit = parseInt(cleanValue.charAt(i), 10);
      if (i % 2 !== 0) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }

    if (sum % 10 !== 0) {
      return { isValid: false, idType, error: 'Invalid South African ID check-digit (Luhn checksum failed).' };
    }

    const yy = cleanValue.substring(0, 2);
    const mm = cleanValue.substring(2, 4);
    const dd = cleanValue.substring(4, 6);
    const currentYearShort = new Date().getFullYear() % 100;
    const century = parseInt(yy, 10) > currentYearShort ? '19' : '20';
    const genderCode = parseInt(cleanValue.substring(6, 10), 10);

    return {
      isValid: true,
      idType: 'SA_ID',
      dob: `${century}${yy}-${mm}-${dd}`,
      gender: genderCode >= 5000 ? 'Male' : 'Female',
      countryOfOrigin: 'South Africa',
    };
  }

  // Foreign Passport / Asylum / Refugee Validation
  if (cleanValue.length < 6 || cleanValue.length > 20) {
    return { isValid: false, idType, error: 'Foreign passport or permit reference must be between 6 and 20 characters.' };
  }

  return {
    isValid: true,
    idType,
    countryOfOrigin: countryOfOrigin || 'Foreign National',
  };
}
