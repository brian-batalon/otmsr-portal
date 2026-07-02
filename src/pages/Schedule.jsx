import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/Layout/Sidebar'
import DocViewer from '../components/DocViewer'
import { Plus, Download, Trash2, Paperclip, ChevronLeft, ChevronRight } from 'lucide-react'

function Schedule() {
  const { user } = useAuth()
  const [schedules, setSchedules] = useState([])
  const [hospitals, setHospitals] = useState([])
  const [equipment, setEquipment] = useState([])
  const [engineers, setEngineers] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadScheduleId, setUploadScheduleId] = useState(null)
  const [documents, setDocuments] = useState([])
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const fileInputRef = useRef(null)
  const [formData, setFormData] = useState({
    hospital_id: '', equipment_id: '', engineer_id: '',
    scheduled_date: '', scheduled_time: '', task_type: 'maintenance', notes: '',
  })

  useEffect(() => { fetchEngineers(); fetchHospitals(); fetchEquipment(); fetchDocuments() }, [])
  useEffect(() => { if (engineers.length > 0) fetchSchedules() }, [user, engineers])

  const fetchSchedules = async () => {
    let query = supabase.from('schedules').select('*, hospitals(name), equipment(equipment_type, model)')
    if (user?.role === 'engineer') query = query.eq('engineer_id', user.id)
    const { data } = await query.order('scheduled_date', { ascending: true })
    if (data) setSchedules(data.map(s => ({ ...s, profiles: engineers.find(e => e.id === s.engineer_id) || null })))
  }
  const fetchHospitals = async () => { const { data } = await supabase.from('hospitals').select('*'); if (data) setHospitals(data) }
  const fetchEquipment = async () => { const { data } = await supabase.from('equipment').select('*'); if (data) setEquipment(data) }
  const fetchEngineers = async () => { const { data } = await supabase.from('profiles').select('*').eq('role', 'engineer'); if (data) setEngineers(data) }
  const fetchDocuments = async () => { const { data } = await supabase.from('documents').select('*'); if (data) setDocuments(data) }

  const handleFileUpload = async (scheduleId) => {
    if (!selectedFile) return; setUploading(true)
    const fp = `${scheduleId}/${Date.now()}_${selectedFile.name}`
    const { error: ue } = await supabase.storage.from('documents').upload(fp, selectedFile)
    if (ue) { alert('Upload failed'); setUploading(false); return }
    const { data: pu } = supabase.storage.from('documents').getPublicUrl(fp)
    await supabase.from('documents').insert({ schedule_id: scheduleId, uploaded_by: user.id, file_name: selectedFile.name, file_url: pu.publicUrl, file_type: selectedFile.type })
    setSelectedFile(null); setUploadScheduleId(null); setUploading(false); fetchDocuments()
  }

  const getDocsForSchedule = (scheduleId) => documents.filter(d => d.schedule_id === scheduleId)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { data, error } = await supabase.from('schedules').insert({ ...formData }).select()
    if (!error) {
      if (selectedFile && data?.[0]) {
        const fp = `${data[0].id}/${Date.now()}_${selectedFile.name}`
        const { error: ue } = await supabase.storage.from('documents').upload(fp, selectedFile)
        if (!ue) { const { data: pu } = supabase.storage.from('documents').getPublicUrl(fp); await supabase.from('documents').insert({ schedule_id: data[0].id, uploaded_by: user.id, file_name: selectedFile.name, file_url: pu.publicUrl, file_type: selectedFile.type }) }
      }
      setShowForm(false); setSelectedFile(null)
      setFormData({ hospital_id: '', equipment_id: '', engineer_id: '', scheduled_date: '', scheduled_time: '', task_type: 'maintenance', notes: '' })
      fetchSchedules(); fetchDocuments()
    }
  }

  const handleDelete = async (id) => { await supabase.from('schedules').delete().eq('id', id); fetchSchedules() }
  const handleExportCSV = () => {
    const h = 'Date,Time,Hospital,Equipment,Task,Engineer,Status,Notes\n'
    const r = schedules.map(s => `${s.scheduled_date},"${s.scheduled_time||'N/A'}","${s.hospitals?.name}","${s.equipment?.equipment_type} - ${s.equipment?.model}","${s.task_type}","${s.profiles?.full_name||'Unassigned'}","${s.status}","${s.notes||''}"`).join('\n')
    const b = new Blob([h+r],{type:'text/csv'}); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href=u; a.download='schedules.csv'; a.click()
  }

  const statusColors = { scheduled:'#CC0000', in_progress:'#ffc107', delayed:'#FF8C00', completed:'#28a745', cancelled:'#999999' }
  const getUpcoming = () => {
    let list = schedules.filter(s => s.status === 'scheduled' || s.status === 'in_progress' || s.status === 'delayed')
    if (selectedDate) list = list.filter(s => s.scheduled_date === selectedDate)
    return list
  }
  const getCompleted = () => {
    let list = schedules.filter(s => s.status === 'completed')
    if (selectedDate) list = list.filter(s => s.scheduled_date === selectedDate)
    return list
  }

  const getDayStatus = (ds) => {
    const daySchedules = schedules.filter(s => s.scheduled_date === ds)
    if (daySchedules.length === 0) return null
    const allCompleted = daySchedules.every(s => s.status === 'completed')
    if (allCompleted) return 'completed'
    const hasDelayed = daySchedules.some(s => s.status === 'delayed')
    if (hasDelayed) return 'delayed'
    return 'active'
  }

  const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate()
  const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay()
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']

  return (
    <div style={styles.wrapper}>
      <Sidebar />
      <div className="main-content fade-in" style={styles.main}>
        <div className="page-header" style={styles.header}>
          <div><h1 style={styles.pageTitle}>Schedule</h1><p style={styles.subtitle}>{user?.role==='admin'?'All engineers schedule overview':'My assigned schedules'}</p></div>
          <div style={styles.actions}>
            <button onClick={handleExportCSV} style={styles.exportBtn}><Download size={18}/><span className="btn-text">Export CSV</span></button>
            {user?.role==='admin'&&<button onClick={()=>setShowForm(!showForm)} style={styles.addBtn}><Plus size={18}/><span className="btn-text">Assign Schedule</span></button>}
          </div>
        </div>
        {showForm&&user?.role==='admin'&&(
          <form onSubmit={handleSubmit} style={styles.formCard}>
            <h3 style={styles.formTitle}>Assign New Schedule</h3>
            <div className="form-grid" style={styles.formGrid}>
              <div style={styles.inputGroup}><label style={styles.label}>Hospital</label><select style={styles.input} value={formData.hospital_id} onChange={e=>setFormData({...formData,hospital_id:e.target.value})} required><option value="">Select</option>{hospitals.map(h=><option key={h.id} value={h.id}>{h.name}</option>)}</select></div>
              <div style={styles.inputGroup}><label style={styles.label}>Equipment</label><select style={styles.input} value={formData.equipment_id} onChange={e=>setFormData({...formData,equipment_id:e.target.value})} required><option value="">Select</option>{equipment.map(eq=><option key={eq.id} value={eq.id}>{eq.equipment_type} - {eq.model}</option>)}</select></div>
              <div style={styles.inputGroup}><label style={styles.label}>Assign Engineer</label><select style={styles.input} value={formData.engineer_id} onChange={e=>setFormData({...formData,engineer_id:e.target.value})} required><option value="">Select</option>{engineers.map(eng=><option key={eng.id} value={eng.id}>{eng.full_name}</option>)}</select></div>
              <div style={styles.inputGroup}><label style={styles.label}>Date</label><input type="date" style={styles.input} value={formData.scheduled_date} onChange={e=>setFormData({...formData,scheduled_date:e.target.value})} required/></div>
              <div style={styles.inputGroup}><label style={styles.label}>Time</label><input type="time" style={styles.input} value={formData.scheduled_time} onChange={e=>setFormData({...formData,scheduled_time:e.target.value})} required/></div>
              <div style={styles.inputGroup}><label style={styles.label}>Task Type</label><select style={styles.input} value={formData.task_type} onChange={e=>setFormData({...formData,task_type:e.target.value})}><option value="maintenance">Maintenance</option><option value="repair">Repair</option><option value="installation">Installation</option></select></div>
              <div style={styles.inputGroup}><label style={styles.label}>Attach Document</label><input type="file" ref={fileInputRef} style={styles.input} onChange={e=>setSelectedFile(e.target.files[0])}/></div>
              <div style={{...styles.inputGroup,gridColumn:'span 2'}}><label style={styles.label}>Notes</label><textarea style={styles.textarea} rows="2" value={formData.notes} onChange={e=>setFormData({...formData,notes:e.target.value})} placeholder="Additional notes..."></textarea></div>
            </div>
            <button type="submit" style={styles.submitBtn}>Assign Schedule</button>
          </form>
        )}
        {uploadScheduleId&&user?.role==='admin'&&(
          <div style={styles.uploadCard}><h4 style={{marginBottom:12}}>Upload Document</h4><input type="file" onChange={e=>setSelectedFile(e.target.files[0])} style={{marginBottom:10}}/><div style={{display:'flex',gap:10}}><button onClick={()=>handleFileUpload(uploadScheduleId)} disabled={!selectedFile||uploading} style={styles.uploadBtn}>{uploading?'Uploading...':'Upload'}</button><button onClick={()=>{setUploadScheduleId(null);setSelectedFile(null)}} style={styles.cancelBtn}>Cancel</button></div></div>
        )}

        <div style={styles.calendarSection}>
          <div style={styles.calendarHeader}>
            <button onClick={()=>setCalendarMonth(new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()-1))} style={styles.monthBtn}><ChevronLeft size={18}/></button>
            <h3 style={{fontSize:16,fontWeight:600}}>{monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}</h3>
            <button onClick={()=>setCalendarMonth(new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+1))} style={styles.monthBtn}><ChevronRight size={18}/></button>
            {selectedDate && <button onClick={()=>setSelectedDate(null)} style={{...styles.monthBtn,color:'#CC0000'}}>Clear</button>}
          </div>
          <div style={styles.calendarGrid}>
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><div key={d} style={styles.dayHeader}>{d}</div>)}
            {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`} style={styles.emptyDay}/>)}
            {Array.from({length:daysInMonth}).map((_,i)=>{
              const d = i+1
              const ds = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
              const dayStatus = getDayStatus(ds)
              const isSelected = selectedDate === ds
              let bg = '#FFFFFF', cl = '#333333', fw = 400
              if (isSelected) { bg = '#CC0000'; cl = '#FFFFFF'; fw = 700 }
              else if (dayStatus === 'completed') { bg = '#D4EDDA'; cl = '#155724'; fw = 600 }
              else if (dayStatus === 'delayed') { bg = '#FFF3CD'; cl = '#856404'; fw = 600 }
              else if (dayStatus === 'active') { bg = '#F8D7DA'; cl = '#721C24'; fw = 600 }
              return (
                <button key={d} onClick={()=>setSelectedDate(isSelected?null:ds)} style={{...styles.day,background:bg,color:cl,fontWeight:fw}}>
                  {d}
                </button>
              )
            })}
          </div>
          <div style={{display:'flex',gap:16,marginTop:12,justifyContent:'center',fontSize:12}}>
            <span><span style={{background:'#F8D7DA',padding:'2px 8px',borderRadius:4}}>Active</span></span>
            <span><span style={{background:'#FFF3CD',padding:'2px 8px',borderRadius:4}}>Delayed</span></span>
            <span><span style={{background:'#D4EDDA',padding:'2px 8px',borderRadius:4}}>Completed</span></span>
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Active ({getUpcoming().length}){selectedDate&&` - ${selectedDate}`}</h3>
          <div className="tableWrap" style={styles.tableWrap}><table style={styles.table}><thead><tr><th style={styles.th}>Date</th><th style={styles.th}>Time</th><th style={styles.th}>Hospital</th><th style={styles.th}>Equipment</th><th style={styles.th}>Task</th><th style={styles.th}>Engineer</th><th style={styles.th}>Docs</th><th style={styles.th}>Notes</th><th style={styles.th}>Status</th>{user?.role==='admin'&&<th style={styles.th}>Action</th>}</tr></thead><tbody>
            {getUpcoming().map(s=>{const docs=getDocsForSchedule(s.id);return(<tr key={s.id} style={styles.tr}><td style={styles.td}>{s.scheduled_date}</td><td style={styles.td}>{s.scheduled_time||'N/A'}</td><td style={styles.td}>{s.hospitals?.name}</td><td style={styles.td}>{s.equipment?.equipment_type} - {s.equipment?.model}</td><td style={styles.td}>{s.task_type}</td><td style={styles.td}>{s.profiles?.full_name||'Unassigned'}</td><td style={styles.td}>{docs.length>0?<DocViewer docs={docs}/>:user?.role==='admin'?<button onClick={()=>setUploadScheduleId(s.id)} style={styles.attachBtn}><Paperclip size={14}/></button>:<span>-</span>}</td><td style={styles.td}>{s.notes||'-'}</td><td style={styles.td}>{user?.role==='engineer'&&s.status==='scheduled'?<button onClick={async()=>{await supabase.from('schedules').update({status:'in_progress'}).eq('id',s.id);fetchSchedules()}} style={styles.startBtn}>Start Work</button>:<span style={{...styles.statusBadge,background:statusColors[s.status]||'#CC0000'}}>{s.status==='in_progress'?'in progress':s.status}</span>}</td>{user?.role==='admin'&&<td style={styles.td}><button onClick={()=>handleDelete(s.id)} style={styles.deleteBtn}><Trash2 size={16}/></button></td>}</tr>)})}
            {getUpcoming().length===0&&<tr><td colSpan={user?.role==='admin'?10:9} style={{...styles.td,textAlign:'center',color:'#999'}}>No active schedules</td></tr>}
          </tbody></table></div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Completed ({getCompleted().length}){selectedDate&&` - ${selectedDate}`}</h3>
          <div className="tableWrap" style={styles.tableWrap}><table style={styles.table}><thead><tr><th style={styles.th}>Date</th><th style={styles.th}>Time</th><th style={styles.th}>Hospital</th><th style={styles.th}>Equipment</th><th style={styles.th}>Task</th><th style={styles.th}>Engineer</th><th style={styles.th}>Docs</th><th style={styles.th}>Notes</th></tr></thead><tbody>
            {getCompleted().map(s=>{const docs=getDocsForSchedule(s.id);return(<tr key={s.id} style={styles.tr}><td style={styles.td}>{s.scheduled_date}</td><td style={styles.td}>{s.scheduled_time||'N/A'}</td><td style={styles.td}>{s.hospitals?.name}</td><td style={styles.td}>{s.equipment?.equipment_type} - {s.equipment?.model}</td><td style={styles.td}>{s.task_type}</td><td style={styles.td}>{s.profiles?.full_name||'Unassigned'}</td><td style={styles.td}>{docs.length>0?<DocViewer docs={docs}/>:'-'}</td><td style={styles.td}>{s.notes||'-'}</td></tr>)})}
            {getCompleted().length===0&&<tr><td colSpan={8} style={{...styles.td,textAlign:'center',color:'#999'}}>No completed schedules</td></tr>}
          </tbody></table></div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  wrapper:{display:'flex'},
  main:{marginLeft:250,padding:30,flex:1,background:'#F5F5F5',minHeight:'100vh',maxWidth:'100%',overflow:'hidden'},
  header:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24,flexWrap:'wrap',gap:16},
  pageTitle:{fontSize:28,fontWeight:700,color:'#333'},
  subtitle:{color:'#666',marginTop:4},
  actions:{display:'flex',gap:10,flexWrap:'wrap'},
  exportBtn:{display:'flex',alignItems:'center',gap:8,padding:'10px 18px',background:'#FFF',border:'2px solid #CC0000',borderRadius:8,color:'#CC0000',fontSize:14,fontWeight:600,cursor:'pointer'},
  addBtn:{display:'flex',alignItems:'center',gap:8,padding:'10px 18px',background:'#CC0000',border:'none',borderRadius:8,color:'#FFF',fontSize:14,fontWeight:600,cursor:'pointer'},
  formCard:{background:'#FFF',borderRadius:12,padding:24,marginBottom:20,boxShadow:'0 2px 8px rgba(0,0,0,0.06)'},
  formTitle:{fontSize:18,fontWeight:600,color:'#333',marginBottom:20},
  formGrid:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16},
  inputGroup:{display:'flex',flexDirection:'column',gap:6},
  label:{fontSize:14,fontWeight:500,color:'#333'},
  input:{padding:'10px 14px',border:'2px solid #E0E0E0',borderRadius:8,fontSize:14,outline:'none',width:'100%'},
  textarea:{padding:'10px 14px',border:'2px solid #E0E0E0',borderRadius:8,fontSize:14,outline:'none',resize:'vertical',fontFamily:'inherit'},
  submitBtn:{marginTop:20,padding:'12px 24px',background:'#CC0000',color:'#FFF',border:'none',borderRadius:8,fontSize:15,fontWeight:600,cursor:'pointer'},
  uploadCard:{background:'#FFF',borderRadius:12,padding:20,marginBottom:20,boxShadow:'0 2px 8px rgba(0,0,0,0.06)'},
  uploadBtn:{padding:'8px 16px',background:'#CC0000',color:'#FFF',border:'none',borderRadius:6,cursor:'pointer',fontSize:13},
  cancelBtn:{padding:'8px 16px',background:'#E0E0E0',color:'#333',border:'none',borderRadius:6,cursor:'pointer',fontSize:13},
  startBtn:{padding:'6px 14px',background:'#CC0000',color:'#FFF',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'},
  calendarSection:{background:'#FFF',borderRadius:12,padding:20,marginBottom:20,boxShadow:'0 2px 8px rgba(0,0,0,0.06)',overflow:'hidden'},
  calendarHeader:{display:'flex',alignItems:'center',justifyContent:'center',gap:16,marginBottom:16},
  monthBtn:{background:'transparent',border:'none',cursor:'pointer',color:'#333',padding:4,borderRadius:4},
  calendarGrid:{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4,textAlign:'center'},
  dayHeader:{padding:8,fontSize:12,fontWeight:600,color:'#999',textTransform:'uppercase'},
  emptyDay:{padding:8},
  day:{padding:10,border:'none',borderRadius:8,cursor:'pointer',fontSize:14,transition:'all 0.2s'},
  section:{background:'#FFF',borderRadius:12,padding:20,marginBottom:20,boxShadow:'0 2px 8px rgba(0,0,0,0.06)',overflow:'hidden'},
  sectionTitle:{fontSize:18,fontWeight:600,color:'#333',marginBottom:16},
  tableWrap:{overflowX:'auto',WebkitOverflowScrolling:'touch',maxWidth:'100%'},
  table:{width:'100%',borderCollapse:'collapse'},
  th:{textAlign:'left',padding:'10px 14px',fontSize:13,fontWeight:600,color:'#666',borderBottom:'1px solid #E0E0E0',whiteSpace:'nowrap'},
  tr:{borderBottom:'1px solid #F0F0F0'},
  td:{padding:'10px 14px',fontSize:14,color:'#333',whiteSpace:'nowrap'},
  statusBadge:{padding:'4px 12px',borderRadius:20,fontSize:12,fontWeight:600,color:'#FFF',textTransform:'capitalize'},
  deleteBtn:{background:'transparent',border:'none',color:'#CC0000',cursor:'pointer',padding:4},
  attachBtn:{background:'transparent',border:'1px dashed #CC0000',borderRadius:6,padding:'4px 8px',cursor:'pointer',color:'#CC0000'},
}

export default Schedule