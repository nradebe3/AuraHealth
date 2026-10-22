import { Platform } from 'react-native';
import { supabase } from './supabase';

// Expo uses detectSessionInUrl:false, so the browser callback must consume the tokens.
export async function consumeAuthRedirect(): Promise<void> {
 if (Platform.OS === 'web' && typeof window !== 'undefined') {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const error = hash.get('error_description') || hash.get('error');
  if (error) throw new Error(error);
  const access_token = hash.get('access_token');
  const refresh_token = hash.get('refresh_token');
  if (access_token && refresh_token) {
   const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
   if (sessionError) throw sessionError;
   window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
  const query = new URLSearchParams(window.location.search);
  const token_hash = query.get('token_hash');
  const type = query.get('type');
  if (token_hash && (type === 'invite' || type === 'recovery')) {
   const { error: otpError } = await supabase.auth.verifyOtp({ token_hash, type });
   if (otpError) throw otpError;
   query.delete('token_hash'); query.delete('type');
   window.history.replaceState(null, '', window.location.pathname + (query.toString() ? '?' + query : ''));
  }
 }
 const { data, error } = await supabase.auth.getSession();
 if (error) throw error;
 if (!data.session) throw new Error('No valid authentication session found. The link may have expired or already been used.');
}
