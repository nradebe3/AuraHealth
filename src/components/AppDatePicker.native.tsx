import React,{useState} from 'react';
import {View,Text,TouchableOpacity} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {validISODate,localToday} from '../lib/validation';
interface Props {label:string;value:string;onChange:(v:string)=>void;minDate?:string;maxDate?:string}
export default function AppDatePicker({label,value,onChange,minDate,maxDate}:Props){const [open,setOpen]=useState(false);const current=validISODate(value)?value:localToday();const parse=(s:string)=>new Date(`${s}T12:00:00`);const fmt=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;return <View style={{gap:6,marginVertical:5}}><Text style={{fontWeight:'600'}}>{label}</Text><TouchableOpacity onPress={()=>setOpen(true)} style={{padding:13,borderWidth:1,borderColor:'#cbd5e1',borderRadius:7,backgroundColor:'white'}}><Text>{value||'Choose date'}  📅</Text></TouchableOpacity>{open&&<DateTimePicker mode="date" value={parse(current)} minimumDate={minDate?parse(minDate):undefined} maximumDate={maxDate?parse(maxDate):undefined} onChange={(_,d)=>{setOpen(false);if(d)onChange(fmt(d));}}/>}</View>}
