import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/Layout/Sidebar'
import DocViewer from '../components/DocViewer'
import { Plus, Search, Download, Paperclip, FileText } from 'lucide-react'

function Reports() {
  const { user } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [reports, setReports] = useState([])
  const [hospitals, setHospitals] = useState([])
  const [equipment, setEquipment] = useState([])
  const [schedules, setSchedules] = useState([])
  const [reportDocs, setReportDocs] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    hospital_id: '',
    equipment_id: '',
    schedule_id: '',
    issue_description: '',
    action_taken: '',
    parts_replaced: '',
  })

  useEffect(() => {
    fetchReports()
    fetchHospitals()
    fetchEquipment()
    fetchReportDocs()
    if (user?.role === 'engineer') fetchMySchedules()

    const channel = supabase
      .channel('reports-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => {
        fetchReports()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const fetchReports = async () => {
    let query = supabase.from('reports').select('*, hospitals(name), equipment(equipment_type, model), schedules(scheduled_date)')
    if (user?.role === 'engineer') {
      query = query.eq('engineer_id', user.id)
    }
    const { data } = await query.order('created_at', { ascending: false })
    if (data) {
      const { data: allProfiles } = await supabase.from('profiles').select('*')
      const enriched = data.map(r => ({
        ...r,
        profiles: allProfiles?.find(p => p.id === r.engineer_id) || { full_name: 'Unknown' }
      }))
      setReports(enriched)
    }
  }

  const fetchHospitals = async () => {
    const { data } = await supabase.from('hospitals').select('*')
    if (data) setHospitals(data)
  }

  const fetchEquipment = async () => {
    const { data } = await supabase.from('equipment').select('*')
    if (data) setEquipment(data)
  }

  const fetchMySchedules = async () => {
    const { data } = await supabase.from('schedules').select('*, hospitals(name), equipment(equipment_type, model)').eq('engineer_id', user.id).in('status', ['scheduled', 'in_progress']).order('scheduled_date')
    if (data) setSchedules(data)
  }

  const fetchReportDocs = async () => {
    const { data } = await supabase.from('documents').select('*').not('report_id', 'is', null)
    if (data) setReportDocs(data)
  }

  const getDocsForReport = (reportId) => {
    return reportDocs.filter(d => d.report_id === reportId)
  }

  const handleFileUpload = async (reportId) => {
    if (!selectedFile) return
    setUploading(true)

    const filePath = `reports/${reportId}/${Date.now()}_${selectedFile.name}`
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, selectedFile)

    if (uploadError) {
      alert('Upload failed: ' + uploadError.message)
      setUploading(false)
      return
    }

    const { data: publicUrl } = supabase.storage.from('documents').getPublicUrl(filePath)

    await supabase.from('documents').insert({
      report_id: reportId,
      uploaded_by: user.id,
      file_name: selectedFile.name,
      file_url: publicUrl.publicUrl,
      file_type: selectedFile.type,
    })

    setSelectedFile(null)
    setUploading(false)
    fetchReportDocs()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { data, error } = await supabase.from('reports').insert({
      engineer_id: user.id,
      hospital_id: formData.hospital_id,
      equipment_id: formData.equipment_id,
      schedule_id: formData.schedule_id || null,
      issue_description: formData.issue_description,
      action_taken: formData.action_taken,
      parts_replaced: formData.parts_replaced,
      status: 'completed',
      report_date: new Date().toISOString().split('T')[0],
    }).select()

    if (!error) {
      if (formData.schedule_id) {
        await supabase.from('schedules').update({ status: 'completed' }).eq('id', formData.schedule_id)
      }

      if (selectedFile && data && data[0]) {
        const reportId = data[0].id
        const filePath = `reports/${reportId}/${Date.now()}_${selectedFile.name}`
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, selectedFile)

        if (!uploadError) {
          const { data: publicUrl } = supabase.storage.from('documents').getPublicUrl(filePath)
          await supabase.from('documents').insert({
            report_id: reportId,
            uploaded_by: user.id,
            file_name: selectedFile.name,
            file_url: publicUrl.publicUrl,
            file_type: selectedFile.type,
          })
        }
      }

      setShowForm(false)
      setSelectedFile(null)
      setFormData({ hospital_id: '', equipment_id: '', schedule_id: '', issue_description: '', action_taken: '', parts_replaced: '' })
      fetchReports()
      fetchReportDocs()
      if (user?.role === 'engineer') fetchMySchedules()
    }
  }

  const handleExportCSV = () => {
    const headers = 'Hospital,Equipment,Model,Issue,Engineer,Status,Date\n'
    const rows = reports.map(r => `"${r.hospitals?.name}","${r.equipment?.equipment_type}","${r.equipment?.model}","${r.issue_description}","${r.profiles?.full_name || 'Unknown'}","${r.status}","${r.report_date}"`).join('\n')
    const blob = new Blob([headers + rows], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'reports.csv'
    a.click()
  }

  const statusColors = {
    completed: '#28a745',
    pending: '#ffc107',
    in_progress: '#CC0000',
  }

  return (
    <div style={styles.wrapper}>
      <Sidebar />
      <div className="main-content fade-in" style={styles.main}>
        <div className="page-header" style={styles.header}>
          <div>
            <h1 style={styles.pageTitle}>Reports</h1>
            <p style={styles.subtitle}>
              {user?.role === 'admin' ? 'All service reports' : 'My submitted reports'}
            </p>
          </div>
          <div style={styles.actions}>
            <button onClick={handleExportCSV} style={styles.exportBtn}>
              <Download size={18} />
              <span className="btn-text">Export CSV</span>
            </button>
            {user?.role === 'engineer' && (
              <button onClick={() => setShowForm(!showForm)} style={styles.addBtn}>
                <Plus size={18} />
                <span className="btn-text">New Report</span>
              </button>
            )}
          </div>
        </div>

        {showForm && user?.role === 'engineer' && (
          <form onSubmit={handleSubmit} style={styles.formCard}>
            <h3 style={styles.formTitle}>Submit Service Report</h3>
            <div className="form-grid" style={styles.formGrid}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Linked Schedule (optional)</label>
                <select
                  style={styles.input}
                  value={formData.schedule_id}
                  onChange={(e) => {
                    const schedule = schedules.find(s => s.id === e.target.value)
                    setFormData({
                      ...formData,
                      schedule_id: e.target.value,
                      hospital_id: schedule?.hospital_id || formData.hospital_id,
                      equipment_id: schedule?.equipment_id || formData.equipment_id,
                    })
                  }}
                >
                  <option value="">No schedule linked</option>
                  {schedules.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.scheduled_date} - {s.hospitals?.name} - {s.equipment?.equipment_type} {s.equipment?.model}
                    </option>
                  ))}
                </select>
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Hospital</label>
                <select style={styles.input} value={formData.hospital_id} onChange={(e) => setFormData({ ...formData, hospital_id: e.target.value })} required>
                  <option value="">Select Hospital</option>
                  {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Equipment</label>
                <select style={styles.input} value={formData.equipment_id} onChange={(e) => setFormData({ ...formData, equipment_id: e.target.value })} required>
                  <option value="">Select Equipment</option>
                  {equipment.map(eq => <option key={eq.id} value={eq.id}>{eq.equipment_type} - {eq.model}</option>)}
                </select>
              </div>
              <div style={{ ...styles.inputGroup, gridColumn: 'span 2' }}>
                <label style={styles.label}>Issue Description</label>
                <textarea style={styles.textarea} rows="3" value={formData.issue_description} onChange={(e) => setFormData({ ...formData, issue_description: e.target.value })} placeholder="Describe the issue..." required></textarea>
              </div>
              <div style={{ ...styles.inputGroup, gridColumn: 'span 2' }}>
                <label style={styles.label}>Action Taken</label>
                <textarea style={styles.textarea} rows="3" value={formData.action_taken} onChange={(e) => setFormData({ ...formData, action_taken: e.target.value })} placeholder="Describe the action taken..."></textarea>
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Parts Replaced</label>
                <input type="text" style={styles.input} value={formData.parts_replaced} onChange={(e) => setFormData({ ...formData, parts_replaced: e.target.value })} placeholder="e.g. Battery, Filter" />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Attach Document</label>
                <input type="file" style={styles.input} onChange={(e) => setSelectedFile(e.target.files[0])} />
              </div>
            </div>
            <button type="submit" style={styles.submitBtn}>Submit Report</button>
          </form>
        )}

        <div style={styles.tableCard}>
          <div style={styles.tableHeader}>
            <div style={styles.searchBox}>
              <Search size={18} color="#999" />
              <input type="text" placeholder="Search reports..." style={styles.searchInput} />
            </div>
          </div>
          <div className="tableWrap" style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Hospital</th>
                  <th style={styles.th}>Equipment</th>
                  <th style={styles.th}>Model</th>
                  <th style={styles.th}>Issue</th>
                  <th style={styles.th}>Engineer</th>
                  <th style={styles.th}>Docs</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Date</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => {
                  const docs = getDocsForReport(report.id)
                  return (
                    <tr key={report.id} style={styles.tr}>
                      <td style={styles.td}>{report.hospitals?.name}</td>
                      <td style={styles.td}>{report.equipment?.equipment_type}</td>
                      <td style={styles.td}>{report.equipment?.model}</td>
                      <td style={styles.td}>{report.issue_description}</td>
                      <td style={styles.td}>{report.profiles?.full_name || 'Unknown'}</td>
                      <td style={styles.td}>
                        {docs.length > 0 ? <DocViewer docs={docs} /> : (
                          user?.role === 'engineer' && report.engineer_id === user.id ? (
                            <div>
                              <button onClick={() => document.getElementById(`file-upload-${report.id}`).click()} style={styles.attachBtn}>
                                <Paperclip size={14} />
                              </button>
                              <input id={`file-upload-${report.id}`} type="file" style={{ display: 'none' }} onChange={(e) => {
                                setSelectedFile(e.target.files[0])
                                handleFileUpload(report.id)
                              }} />
                            </div>
                          ) : (
                            <span>-</span>
                          )
                        )}
                      </td>
                      <td style={styles.td}>
                        <span style={{ ...styles.statusBadge, background: statusColors[report.status] }}>
                          {report.status}
                        </span>
                      </td>
                      <td style={styles.td}>{report.report_date}</td>
                    </tr>
                  )
                })}
                {reports.length === 0 && (
                  <tr><td colSpan="8" style={{ ...styles.td, textAlign: 'center', color: '#999' }}>No reports found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  wrapper: { display: 'flex' },
  main: { marginLeft: '250px', padding: '30px', flex: 1, background: '#F5F5F5', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' },
  pageTitle: { fontSize: '28px', fontWeight: '700', color: '#333333' },
  subtitle: { color: '#666666', marginTop: '4px' },
  actions: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  exportBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: '#FFFFFF', border: '2px solid #CC0000', borderRadius: '8px', color: '#CC0000', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  addBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: '#CC0000', border: 'none', borderRadius: '8px', color: '#FFFFFF', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  formCard: { background: '#FFFFFF', borderRadius: '12px', padding: '24px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  formTitle: { fontSize: '18px', fontWeight: '600', color: '#333333', marginBottom: '20px' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '14px', fontWeight: '500', color: '#333333' },
  input: { padding: '10px 14px', border: '2px solid #E0E0E0', borderRadius: '8px', fontSize: '14px', outline: 'none', width: '100%' },
  textarea: { padding: '10px 14px', border: '2px solid #E0E0E0', borderRadius: '8px', fontSize: '14px', outline: 'none', resize: 'vertical', fontFamily: 'inherit' },
  submitBtn: { marginTop: '20px', padding: '12px 24px', background: '#CC0000', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' },
  tableCard: { background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' },
  tableHeader: { padding: '16px 20px', borderBottom: '1px solid #E0E0E0' },
  searchBox: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', background: '#F5F5F5', borderRadius: '8px', maxWidth: '300px' },
  searchInput: { border: 'none', background: 'transparent', outline: 'none', fontSize: '14px', width: '100%' },
  tableWrap: { overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: '700px' },
  th: { textAlign: 'left', padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#666666', borderBottom: '1px solid #E0E0E0', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #F0F0F0' },
  td: { padding: '14px 16px', fontSize: '14px', color: '#333333', whiteSpace: 'nowrap' },
  statusBadge: { padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', color: '#FFFFFF', textTransform: 'capitalize' },
  attachBtn: { background: 'transparent', border: '1px dashed #CC0000', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: '#CC0000' },
}

export default Reports