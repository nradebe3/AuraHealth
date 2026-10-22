import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Platform, Alert } from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { RoleGuard } from '../../src/components/RoleGuard';

const ROLE_OPTIONS=['PATIENT','EMS_DISPATCH','CLINICIAN','ADMIN','SYSTEM_ADMIN'] as const;
type Facility = { id: string; facility_name: string; facility_code: string; province: string; district: string; facility_type: string | null; area: string | null; daily_capacity: number | null; is_active: boolean };
type Person = { id: string; email: string; phone_number: string; role: string; full_name: string | null; facility_id: string | null; is_active: boolean };
type Audit = { id: string; occurred_at: string; action: string; entity_type: string; details: Record<string, unknown> };
type Option = { id: string; category: string; value: string };
function Select({ label, value, options, onChange }: { label: string; value: string; options: {value:string;label:string}[]; onChange: (value:string)=>void }) {
 const [open,setOpen] = useState(false);
 return <View style={s.field}><Text style={s.label}>{label}</Text><TouchableOpacity style={[s.input,{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}]} onPress={()=>setOpen(!open)}><Text>{options.find(o=>o.value===value)?.label || 'Select from database'}</Text><View style={{width:9,height:9,borderRightWidth:2,borderBottomWidth:2,borderColor:'#1f4e79',transform:[{rotate:open?'225deg':'45deg'}],marginRight:6}} /></TouchableOpacity>{open && <View style={s.options}>{options.map(o=><TouchableOpacity key={o.value} style={s.option} onPress={()=>{onChange(o.value);setOpen(false)}}><Text>{o.label}</Text></TouchableOpacity>)}</View>}</View>;
}
function AdminContent() {
 const [tab,setTab] = useState<'facilities'|'users'|'audit'>('facilities');
 const [facilities,setFacilities] = useState<Facility[]>([]);
 const [people,setPeople] = useState<Person[]>([]);
 const [userRoles,setUserRoles]=useState<Record<string,string[]>>({});
 const [roleFilter,setRoleFilter]=useState('ALL');
 const [userSearch,setUserSearch]=useState('');
 const [idLookupIds,setIdLookupIds]=useState<string[]|null>(null);
 const [idLookupLoading,setIdLookupLoading]=useState(false);
 const [idLookupError,setIdLookupError]=useState('');
 const [selectedRoles,setSelectedRoles]=useState<string[]>([]);
 const toggleSelectedRole = (role: string) => {
  setSelectedRoles(current => {
   if (current.includes(role)) return current.filter(r => r !== role);
   return [...current, role];
  });
 };
 const [audit,setAudit] = useState<Audit[]>([]);
 const [options,setOptions] = useState<Option[]>([]);
 const [loading,setLoading] = useState(true);
 const [busy,setBusy] = useState(false);
 const [message,setMessage] = useState('');
 const [editingFacility,setEditingFacility] = useState<string|null>(null);
 const [editingUser,setEditingUser] = useState<string|null>(null);
 const [creating,setCreating] = useState(false);
 const [sendActivation,setSendActivation] = useState(true);
 const [temporaryPassword,setTemporaryPassword] = useState('');
 const [newEmail,setNewEmail] = useState(''); const [newName,setNewName] = useState(''); const [newPhone,setNewPhone] = useState(''); const [newRole,setNewRole] = useState('CLINICIAN'); const [newFacility,setNewFacility] = useState('');
 const [userName,setUserName] = useState(''); const [userPhone,setUserPhone] = useState(''); const [userEmail,setUserEmail] = useState('');
 const [name,setName] = useState(''); const [code,setCode] = useState(''); const [district,setDistrict] = useState(''); const [area,setArea] = useState(''); const [latitude,setLatitude] = useState(''); const [longitude,setLongitude] = useState(''); const [capacity,setCapacity] = useState(''); const [province,setProvince] = useState(''); const [type,setType] = useState('');
 const notify=(msg:string)=>{setMessage(msg);if(Platform.OS!=='web')Alert.alert('AuraHealth',msg)};
 const refresh=useCallback(async()=>{
  setLoading(true);
  const [f,u,a,o]=await Promise.all([
   supabase.from('facilities').select('id,facility_name,facility_code,province,district,facility_type,area,daily_capacity,is_active').order('facility_name'),
   supabase.from('users').select('id,email,phone_number,role,full_name,facility_id,is_active').order('email'),
   supabase.from('admin_audit_logs').select('id,occurred_at,action,entity_type,details').order('occurred_at',{ascending:false}).limit(100),
   supabase.from('lookup_options').select('id,category,value').order('sort_order')
  ]);
  const errors=[f.error,u.error,a.error,o.error].filter(Boolean);
  if(errors.length)notify(errors.map(e=>e!.message).join('; '));
  setFacilities(f.data||[]);setPeople(u.data||[]);setAudit(a.data||[]);setOptions(o.data||[]);
  const {data:roleRows,error:roleError}=await supabase.rpc('admin_list_user_roles');
  if(roleError)console.warn('Role list unavailable:',roleError.message);
  const byUser:Record<string,string[]>={};for(const r of (roleRows||[])){(byUser[r.user_id]??=[]).push(r.role)}setUserRoles(byUser);setLoading(false);
 },[]);
 useEffect(()=>{void refresh()},[refresh]);
 const choices=(category:string)=>options.filter(o=>o.category===category).map(o=>({value:o.value,label:o.value}));
 const beginEditFacility=(f:Facility)=>{setEditingFacility(f.id);setName(f.facility_name);setCode(f.facility_code);setDistrict(f.district);setArea(f.area||'');setCapacity(f.daily_capacity==null?'':String(f.daily_capacity));setProvince(f.province);setType(f.facility_type||'');setLatitude('');setLongitude('');setMessage('Editing facility. Coordinates are optional when updating.');};
 const resetFacility=()=>{setEditingFacility(null);setName('');setCode('');setDistrict('');setArea('');setLatitude('');setLongitude('');setCapacity('');setProvince('');setType('')};
 const beginEditUser=(p:Person)=>{setEditingUser(p.id);setUserName(p.full_name||'');setUserPhone(p.phone_number||'');setUserEmail(p.email);setMessage('Editing '+(p.full_name||p.email)+'. Changes appear in this row.');};

const readFunctionError = async (error: any): Promise<string> => {
  let detail = error?.message || 'Request failed';
  try {
    const context = error?.context;
    if (context && typeof context.clone === 'function') {
      const response = context.clone();
      const body = await response.json();
      detail = body?.error || body?.message || detail;
    }
  } catch { /* Retain the original message */ }
  return detail;
};

const saveRoles = async (person: Person, requestedRoles: string[]) => {
  if (busy) return;

  const roles = Array.from(
    new Set([person.role, ...requestedRoles])
  );

  setBusy(true);
  setMessage('');

  try {
    const { error } = await supabase.rpc('admin_set_user_roles', {
      p_user_id: person.id,
      p_roles: roles,
    });

    if (error) {
      notify('Unable to update roles: ' + error.message);
      return;
    }

    const { data, error: refreshError } = await supabase.rpc(
      'admin_list_user_roles'
    );

    if (refreshError) {
      notify(
        'Roles saved, but refreshing the role list failed: ' +
          refreshError.message
      );
      return;
    }

    const byUser: Record<string, string[]> = {};

    for (const row of data || []) {
      (byUser[row.user_id] ??= []).push(row.role);
    }

    setUserRoles(byUser);

    notify(`Roles updated successfully for ${person.full_name || person.email}.`);
  } catch (error) {
    notify(
      error instanceof Error
        ? error.message
        : 'Unexpected error while saving roles.'
    );
  } finally {
    setBusy(false);
  }
};

 const createUser = async () => {
  if (!newEmail.trim() || !newName.trim() || !newPhone.trim() || !selectedRoles.length) {
   notify('Enter a name, email, phone number and at least one role.'); return;
  }
  setBusy(true);setMessage('');
  try {
   const {data,error}=await supabase.functions.invoke('provision-user', {body:{
    email:newEmail.trim().toLowerCase(),full_name:newName.trim(),phone_number:newPhone.trim(),
    role:selectedRoles[0],roles:selectedRoles,facility_id:newFacility||null,
    send_activation:sendActivation,temporary_password:sendActivation?undefined:temporaryPassword
   }});
   if(error){let detail=error.message;try{if(error.context instanceof Response){const body=await error.context.clone().json();detail=body.error||body.message||detail}}catch{}notify('Creation failed: '+detail);return;}
   if(data?.error){notify('Creation failed: '+data.error);return;}
   if (!sendActivation && data?.success === true) {
  notify('Account created without email. Give the temporary password to the user securely and require a password change.');
} else if (data?.email_queued === true) {
  notify('Account created successfully. Activation email queued for delivery.');
} else if (data?.email_sent === true) {
  notify('Account created successfully. Activation email sent.');
} else {
  notify('Account created, but activation email could not be queued. Please resend the invitation.');
}
   setCreating(false);setNewEmail('');setNewName('');setNewPhone('');setNewFacility('');setSelectedRoles([]);setTemporaryPassword('');setSendActivation(true);
   await refresh();
  }catch(e){notify(e instanceof Error?e.message:'Unexpected creation error');}
  finally{setBusy(false);}
 };
 const resendActivation=async(p:Person)=>{
  setBusy(true);
  try{
   const {data,error}=await supabase.functions.invoke('provision-user',{body:{action:'resend',user_id:p.id}});
   if(error||data?.error){notify('Resend failed: '+(data?.error||error?.message));return;}
   notify('Activation email accepted by SMTP for '+p.email);
  }finally{setBusy(false);}
 };
const sendPasswordReset=async(p:Person)=>{
  setBusy(true); setMessage('');
  try {
   const {data,error}=await supabase.functions.invoke('admin-password-reset',{body:{user_id:p.id}});
   if(error || data?.error){notify(data?.error||error?.message||'Unable to request reset email');return;}
   notify('Password reset email requested for '+p.email+'. Ask the user to check their inbox.');
  } catch(e){notify(e instanceof Error?e.message:'Reset request failed');}
  finally{setBusy(false);}
 };
 const confirmPasswordReset=(p:Person)=>{
  const prompt=`Send a password reset email to ${p.email}?`;
  if(Platform.OS==='web'){
   if(typeof window!=='undefined' && window.confirm(prompt))void sendPasswordReset(p);
  }else Alert.alert('Reset password',prompt,[{text:'Cancel',style:'cancel'},{text:'Send reset link',onPress:()=>void sendPasswordReset(p)}]);
 };
 const saveUser=async()=>{
  if(!editingUser||busy)return;
  const person=people.find(p=>p.id===editingUser);
  if(!person)return notify('User no longer exists. Refresh the list.');
  const updatedEmail=userEmail.trim().toLowerCase();
  if(!userName.trim()||!userPhone.trim())return notify('Name and phone number are required.');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updatedEmail))return notify('Enter a valid email address.');
  const emailChanged=updatedEmail!==person.email.toLowerCase();
  if(emailChanged){
   const prompt=`Change ${person.full_name||person.email}'s login email to ${updatedEmail}? You must control the replacement address. Existing account records will be preserved.`;
   const confirmed=Platform.OS==='web' ? (typeof window!=='undefined'&&window.confirm(prompt)) : await new Promise<boolean>(resolve=>Alert.alert('Confirm email change',prompt,[{text:'Cancel',style:'cancel',onPress:()=>resolve(false)},{text:'Continue',onPress:()=>resolve(true)}],{cancelable:true,onDismiss:()=>resolve(false)}));
   if(!confirmed)return;
  }
  setBusy(true);setMessage('');
  try{
   // Do not update the public profile email unless the Auth change succeeds.
   if(emailChanged){
    const {data:{session},error:sessionError}=await supabase.auth.getSession();
    if(sessionError||!session?.access_token)throw new Error('Session expired. Sign in again.');
    const {data,error}=await supabase.functions.invoke('provision-user',{
     headers:{Authorization:`Bearer ${session.access_token}`},
     body:{action:'change_email',user_id:person.id,new_email:updatedEmail}
    });
    if(error){
     const detail=await readFunctionError(error);
     if(/Authentication account not found/i.test(detail))throw new Error('No matching Supabase Auth account exists for this profile ID. Check the Auth/profile IDs before changing its email.');
     throw new Error(detail);
    }
    if(!data?.success)throw new Error(data?.error||'Email change not confirmed.');
   }
   const {data,error}=await supabase.from('users').update({full_name:userName.trim(),phone_number:userPhone.trim()}).eq('id',person.id).select('id').maybeSingle();
   if(error)throw new Error((emailChanged?'Email changed, but profile details failed: ':'')+error.message);
   if(!data)throw new Error('Profile update was not confirmed. Check permissions.');
   setEditingUser(null);
   notify(emailChanged?'User details saved and email changed. Verify both Auth and profile before reusing the old email.':'User details saved.');
   await refresh();
  }catch(e){notify('Save failed: '+(e instanceof Error?e.message:'Unexpected error'));}
  finally{setBusy(false)}
 };
 const saveFacility=async()=>{
  if(!name.trim()||!code.trim()||!district.trim()||!province||(!editingFacility&&(!latitude||!longitude))){notify('Enter name, code, district, province and coordinates for new facilities.');return;}
  const hasCoords=latitude.trim()!==''||longitude.trim()!=='';
  if(hasCoords&&(!latitude.trim()||!longitude.trim())){notify('Provide both latitude and longitude, or leave both empty when editing.');return;}
  const lat=Number(latitude),lon=Number(longitude);
  if(hasCoords&&(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)){notify('Invalid latitude or longitude.');return;}
  if(capacity.trim()&&(!Number.isInteger(Number(capacity))||Number(capacity)<0)){notify('Capacity must be a nonnegative whole number.');return;}
  setBusy(true);
  // Existing facilities.location is NOT NULL geography(POINT).
  const payload:Record<string,unknown>={facility_name:name.trim(),facility_code:code.trim(),district:district.trim(),province,facility_type:type||null,area:area.trim()||null,daily_capacity:capacity?Number(capacity):null};
  if(hasCoords)payload.location=`SRID=4326;POINT(${lon} ${lat})`;
  const result=editingFacility?await supabase.from('facilities').update(payload).eq('id',editingFacility).select('id').maybeSingle():await supabase.from('facilities').insert(payload).select('id').maybeSingle();
  setBusy(false);if(result.error){notify(result.error.message);return;}if(!result.data){notify('No facility was saved. Check permissions.');return;}
  resetFacility();notify('Facility saved in Supabase.');void refresh();
 };
 const toggleFacility=async(f:Facility)=>{setBusy(true);const {error}=await supabase.from('facilities').update({is_active:!f.is_active}).eq('id',f.id);setBusy(false);if(error)notify(error.message);else void refresh()};
 const togglePerson=async(p:Person)=>{setBusy(true);const {error}=await supabase.from('users').update({is_active:!p.is_active}).eq('id',p.id);setBusy(false);if(error)notify(error.message);else {notify('Profile status updated. Enforce is_active in authentication/authorization before relying on it to block access.');void refresh()}};
 const deletePerson=async(p:Person)=>{
  setBusy(true);setMessage('');
  try {
   const {data,error}=await supabase.functions.invoke('delete-user',{body:{user_id:p.id}});
   if(error||data?.error){const detail = data?.error || (error ? await readFunctionError(error) : 'Unable to delete user');notify('Deletion blocked: ' + (/(23503|foreign.key|associated|linked|constraint|referenc)/i.test(detail) ? 'This account cannot be deleted because associated records were found. Deactivate the user instead. ' : '') + detail);return;}
   if(editingUser===p.id)setEditingUser(null);
   notify('User permanently deleted from Supabase Authentication and the user registry.');
   await refresh();
  }catch(e){notify(e instanceof Error?e.message:'Unexpected deletion error');}
  finally{setBusy(false)}
 };
 const confirmDeletePerson=(p:Person)=>{
  const warning=`Permanently delete ${p.full_name||p.email} (${p.email})? This cannot be undone. Accounts with linked clinical records cannot be deleted.`;
  if(Platform.OS==='web'){
   if(typeof window!=='undefined' && window.confirm(warning))void deletePerson(p);
  }else{
   Alert.alert('Delete user permanently',warning,[{text:'Cancel',style:'cancel'},{text:'Delete user',style:'destructive',onPress:()=>void deletePerson(p)}]);
  }
 };
 const assignFacility=async(p:Person,id:string)=>{setBusy(true);const {error}=await supabase.from('users').update({facility_id:id||null}).eq('id',p.id);setBusy(false);if(error)notify(error.message);else void refresh()};
 const searchPatientId = async () => {
  const term=userSearch.trim();
  if (!term) { setIdLookupIds(null); setIdLookupError(''); return; }
  setIdLookupLoading(true);
  setIdLookupError('');
  try {
   const {data,error}=await supabase.rpc('sysadmin_find_patient_by_identifier',{p_identifier:term});
   if (error) throw error;
   setIdLookupIds((data||[]).map((r:{user_id:string})=>r.user_id));
  } catch(e) {
   setIdLookupIds(null);
   setIdLookupError(e instanceof Error?e.message:'Patient lookup failed');
  } finally {setIdLookupLoading(false)}
 };
 const visiblePeople=people.filter(p=>{
  const matchesRole=roleFilter==='ALL'||p.role===roleFilter||(userRoles[p.id]||[]).includes(roleFilter);
  const term=userSearch.trim().toLowerCase();
  const matchesSearch=idLookupIds!==null ? idLookupIds.includes(p.id) : (!term||[p.email,p.full_name,p.phone_number].some(value=>(value||'').toLowerCase().includes(term)));
  return matchesRole&&matchesSearch;
 });
 return <ScrollView contentContainerStyle={s.page}>
  <Text style={s.heading}>System Administration</Text><Text style={s.note}>Live Supabase registry - no fictional accounts or audit events.</Text>
  <View style={s.tabs}>{(['facilities','users','audit'] as const).map(t=><TouchableOpacity key={t} style={[s.tab,tab===t&&s.active]} onPress={()=>setTab(t)}><Text style={tab===t?s.white:s.dark}>{t.toUpperCase()}</Text></TouchableOpacity>)}</View>
  {message ? <Text style={s.message}>{message}</Text> : null}
  <TouchableOpacity style={s.refresh} onPress={()=>void refresh()}><Text style={s.white}>Refresh database</Text></TouchableOpacity>
  {loading?<ActivityIndicator size="large"/>:tab==='facilities'?<>
   <Text style={s.subheading}>{editingFacility?'Edit facility':'Register facility'}</Text>
   <TextInput style={s.input} placeholder="Facility name" value={name} onChangeText={setName}/>
   <TextInput style={s.input} placeholder="Unique facility code" value={code} onChangeText={setCode}/>
   <Select label="Facility type" value={type} options={choices('facility_type')} onChange={setType}/>
   <Select label="Province" value={province} options={choices('province')} onChange={setProvince}/>
   <TextInput style={s.input} placeholder="District" value={district} onChangeText={setDistrict}/>
   <TextInput style={s.input} placeholder="Area / suburb" value={area} onChangeText={setArea}/>
   <TextInput style={s.input} placeholder={editingFacility?"New latitude (optional)":"Latitude (e.g. -26.20)"} value={latitude} onChangeText={setLatitude} keyboardType="numeric"/>
   <TextInput style={s.input} placeholder={editingFacility?"New longitude (optional)":"Longitude (e.g. 28.04)"} value={longitude} onChangeText={setLongitude} keyboardType="numeric"/>
   <TextInput style={s.input} placeholder="Daily capacity (optional)" value={capacity} onChangeText={setCapacity} keyboardType="numeric"/>
   <TouchableOpacity style={s.action} disabled={busy} onPress={saveFacility}><Text style={s.white}>{editingFacility?"Update facility":"Add facility"}</Text></TouchableOpacity>
   {editingFacility?<TouchableOpacity style={s.refresh} onPress={resetFacility}><Text style={s.white}>Cancel editing</Text></TouchableOpacity>:null}
   <Text style={s.subheading}>Facilities ({facilities.length})</Text>
   {facilities.map(f=><View style={s.card} key={f.id}><Text style={s.bold}>{f.facility_name}</Text><Text>{f.facility_code} | {f.province} | {f.district}</Text><Text>{f.facility_type||'Unspecified'} | {f.is_active?'ACTIVE':'INACTIVE'}</Text><TouchableOpacity disabled={busy} onPress={()=>beginEditFacility(f)}><Text style={s.link}>Edit facility details</Text></TouchableOpacity><TouchableOpacity disabled={busy} onPress={()=>void toggleFacility(f)}><Text style={s.link}>{f.is_active?'Deactivate facility':'Activate facility'}</Text></TouchableOpacity></View>)}
  </>:tab==='users'?<>
   <TouchableOpacity style={s.action} onPress={()=>setCreating(!creating)} disabled={busy}><Text style={s.white}>{creating?'Close new user form':'Add New User'}</Text></TouchableOpacity>
   {creating?<View style={s.card}>
    <Text style={s.bold}>Create Supabase Auth account and profile</Text>
    <TextInput style={s.input} placeholder="Full name" value={newName} onChangeText={setNewName}/>
    <TextInput style={s.input} placeholder="Email" value={newEmail} onChangeText={setNewEmail} autoCapitalize="none" keyboardType="email-address"/>
    <TextInput style={s.input} placeholder="Phone number" value={newPhone} onChangeText={setNewPhone} keyboardType="phone-pad"/>
    <Text style={s.bold}>Roles (select at least one; first selected is the primary provisioning role)</Text><View style={s.tabs}>{ROLE_OPTIONS.map(r=><TouchableOpacity key={r} style={s.option} onPress={()=>toggleSelectedRole(r)}><Text>{selectedRoles.includes(r)?"[x]":"[ ]"} {r}</Text></TouchableOpacity>)}</View>
    <Select label="Facility" value={newFacility} options={[{value:'',label:'No facility'},...facilities.filter(f=>f.is_active).map(f=>({value:f.id,label:f.facility_name}))]} onChange={setNewFacility}/>
    <TouchableOpacity style={s.option} onPress={()=>setSendActivation(v=>!v)}><Text>{sendActivation?'[x]':'[ ]'} Send activation email</Text></TouchableOpacity>
    {!sendActivation?<><Text style={s.label}>Temporary password (minimum 12 characters)</Text><TextInput style={s.input} secureTextEntry placeholder="Temporary password" value={temporaryPassword} onChangeText={setTemporaryPassword}/><Text style={s.note}>No activation email will be sent. Share the temporary password privately; the user must change it at first login.</Text></>:null}
    <TouchableOpacity style={s.action} onPress={()=>void createUser()} disabled={busy}><Text style={s.white}>{busy?'Creating...':sendActivation?'Create user and send activation':'Create user without email'}</Text></TouchableOpacity>
   </View>:null}
   <Text style={s.subheading}>Existing Supabase users ({people.length})</Text>
   <Select label="Show users by role" value={roleFilter} options={[{value:'ALL',label:'All roles'},...ROLE_OPTIONS.map(r=>({value:r,label:r}))]} onChange={setRoleFilter}/>
   <TextInput style={s.input} placeholder="Search name/email/phone; use ID lookup below" value={userSearch} onChangeText={value=>{setUserSearch(value);setIdLookupIds(null);setIdLookupError('')}} autoCapitalize="none" autoCorrect={false} accessibilityLabel="Search users"/>
   <TouchableOpacity style={s.refresh} disabled={idLookupLoading} onPress={()=>void searchPatientId()}><Text style={s.white}>{idLookupLoading?'Searching...':'Find patient by exact SA ID / passport'}</Text></TouchableOpacity>
   {idLookupError?<Text style={s.message}>ID lookup failed: {idLookupError}</Text>:null}
   {idLookupIds!==null?<Text style={s.note}>ID lookup: {idLookupIds.length} matching patient account(s). Clear or edit the search field to return to name/email search.</Text>:null}
   <Text style={s.note}>Showing {visiblePeople.length} of {people.length} loaded users. Name/email/phone search filters loaded accounts; ID lookup is server-side and exact-match only.</Text>
   <ScrollView horizontal style={{backgroundColor:'white',borderRadius:8}}><View style={{minWidth:940,padding:8}}>
    <View style={[s.tabs,{backgroundColor:'#dce5ee',padding:10}]}><Text style={{width:180,fontWeight:'bold'}}>User</Text><Text style={{width:260,fontWeight:'bold'}}>Email</Text><Text style={{width:330,fontWeight:'bold'}}>Assigned roles</Text><Text style={{width:120,fontWeight:'bold'}}>Status</Text></View>
    {visiblePeople.map(p=>{
     const editing=editingUser===p.id;
     return <View key={p.id} style={{borderBottomWidth:1,borderColor:'#e2e8f0',paddingVertical:10}}>
      <View style={[s.tabs,{padding:10,alignItems:'flex-start'}]}>
       <View style={{width:180}}>
        {editing?<TextInput style={s.input} placeholder="Full name" value={userName} onChangeText={setUserName}/>:<Text style={s.bold}>{p.full_name||'-'}</Text>}
        <Text style={s.note}>{editing?'Editing account':'Account details'}</Text>
        {editing?<TextInput style={s.input} placeholder="Phone number" value={userPhone} onChangeText={setUserPhone} keyboardType="phone-pad"/>:<Text style={s.note}>{p.phone_number||'No phone'}</Text>}
        <TouchableOpacity disabled={busy} onPress={()=>confirmPasswordReset(p)}><Text style={s.link}>Reset password</Text></TouchableOpacity>
        {!p.is_active?<TouchableOpacity disabled={busy} onPress={()=>void resendActivation(p)}><Text style={s.link}>Resend activation</Text></TouchableOpacity>:null}
        {editing?<>
         <TouchableOpacity style={s.action} disabled={busy} onPress={()=>void saveUser()}><Text style={s.white}>{busy?'Saving...':'Save changes'}</Text></TouchableOpacity>
         <TouchableOpacity disabled={busy} onPress={()=>setEditingUser(null)}><Text style={s.link}>Cancel</Text></TouchableOpacity>
         <TouchableOpacity disabled={busy} onPress={()=>confirmDeletePerson(p)}><Text style={{color:'#b42318',paddingVertical:8}}>Delete account</Text></TouchableOpacity>
        </>:<TouchableOpacity disabled={busy} onPress={()=>beginEditUser(p)}><Text style={s.link}>Edit user</Text></TouchableOpacity>}
       </View>
       <View style={{width:260}}>
        {editing?<TextInput style={s.input} placeholder="Email address" value={userEmail} onChangeText={setUserEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address"/>:<Text>{p.email}</Text>}
        {editing?<Text style={s.note}>Changing email requires a matching Supabase Auth account.</Text>:null}
       </View>
       <View style={{width:330}}>
        {ROLE_OPTIONS.map(r=>{const checked=r===p.role||(userRoles[p.id]||[]).includes(r);return <TouchableOpacity key={r} disabled={busy||!editing||r===p.role} onPress={()=>{const current=[p.role,...(userRoles[p.id]||[])];const next=checked?current.filter(x=>x!==r):[...current,r];void saveRoles(p,next);}}><View style={{flexDirection:'row',alignItems:'center',paddingVertical:5,gap:8}}><View style={{width:19,height:19,borderWidth:1.5,borderColor:checked?'#1f4e79':'#64748b',borderRadius:4,backgroundColor:checked?'#1f4e79':'#ffffff',alignItems:'center',justifyContent:'center'}}>{checked?<Text style={{color:'#ffffff',fontSize:13,fontWeight:'bold',lineHeight:17}}>X</Text>:null}</View><Text style={{color:editing?'#1f4e79':'#475569'}}>{r}{r===p.role?' (primary)':''}</Text></View></TouchableOpacity>})}
        {editing?<Select label="Assigned facility" value={p.facility_id||''} options={[{value:'',label:'No facility'},...facilities.map(f=>({value:f.id,label:f.facility_name}))]} onChange={id=>void assignFacility(p,id)}/>:<Text style={s.note}>Facility: {facilities.find(f=>f.id===p.facility_id)?.facility_name||'None'}</Text>}
       </View>
       <View style={{width:120}}>
        <Text>{p.is_active?'Active':'Inactive'}</Text>
        {editing?<TouchableOpacity disabled={busy} onPress={()=>void togglePerson(p)}><Text style={s.link}>{p.is_active?'Deactivate':'Activate'}</Text></TouchableOpacity>:null}
       </View>
      </View>
     </View>;
    })}
   </View></ScrollView>
  </>:<><Text style={s.subheading}>Database audit events ({audit.length})</Text>{audit.map(a=><View key={a.id} style={s.card}><Text style={s.bold}>{a.action}</Text><Text>{new Date(a.occurred_at).toLocaleString()}</Text><Text>{a.entity_type} | {JSON.stringify(a.details)}</Text></View>)}</>}
 </ScrollView>;
}
export default function SystemAdminScreen(){return <RoleGuard allowedRoles={['SYSTEM_ADMIN']}><AdminContent/></RoleGuard>}
const s=StyleSheet.create({page:{padding:20,backgroundColor:'#f4f6f9',gap:10},heading:{fontSize:24,fontWeight:'bold',color:'#1f4e79'},subheading:{fontSize:18,fontWeight:'bold',marginTop:18},note:{fontSize:12,color:'#555'},tabs:{flexDirection:'row',gap:6,flexWrap:'wrap'},tab:{backgroundColor:'#dce5ee',padding:10,borderRadius:6},active:{backgroundColor:'#1f4e79'},white:{color:'white',fontWeight:'bold'},dark:{color:'#1f4e79'},refresh:{backgroundColor:'#3d6489',padding:10,borderRadius:6,alignSelf:'flex-start'},message:{backgroundColor:'#fff5d8',padding:10,color:'#573b00'},input:{borderColor:'#cbd5e1',borderWidth:1,borderRadius:6,padding:12,backgroundColor:'white',marginTop:5},field:{marginTop:5},label:{fontWeight:'bold',marginBottom:5},options:{borderWidth:1,borderColor:'#cbd5e1',backgroundColor:'white'},option:{padding:10,borderBottomWidth:1,borderColor:'#eee'},action:{backgroundColor:'#1f4e79',padding:14,borderRadius:6,alignItems:'center'},card:{backgroundColor:'white',padding:12,borderRadius:8,marginTop:6,gap:5},bold:{fontWeight:'bold'},link:{color:'#1f4e79',fontWeight:'bold',paddingVertical:8}});