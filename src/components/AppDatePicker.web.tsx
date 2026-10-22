import React from 'react';
import { View, Text } from 'react-native';
interface Props {label:string;value:string;onChange:(v:string)=>void;minDate?:string;maxDate?:string}
export default function AppDatePicker({label,value,onChange,minDate,maxDate}:Props){return <View style={{gap:6,marginVertical:5}}><Text style={{fontWeight:'600'}}>{label}</Text>{React.createElement('input',{type:'date',value:value||'',min:minDate,max:maxDate,onChange:(e:any)=>onChange(e.target.value),style:{fontSize:16,padding:12,borderRadius:7,border:'1px solid #cbd5e1',background:'#fff',width:'100%',boxSizing:'border-box'}})}</View>}
