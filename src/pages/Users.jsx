import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/Layout/Sidebar'
import { Plus, Trash2 } from 'lucide-react'

function Users() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ full_name: '', email: '', password: '', role: 'engineer', employee_id: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    if (data) setUsers(data)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (signUpData.user) {
      await supabase.from('profiles').insert({
        id: signUpData.user.id,
        full_name: formData.full_name,
        role: formData.role,
        employee_id: formData.employee_id,
        email: formData.email,
      })
    }

    setShowForm(false)
    setFormData({ full_name: '', email: '', password: '', role: 'engineer', employee_id: '' })
    setLoading(false)
    fetchUsers()
  }

  const handleDelete = async (userId) => {
    if (!confirm('Delete this user?')) return
    await supabase.from('profiles').delete().eq('id', userId)
    fetchUsers()
  }

  if (user?.role !== 'admin') {
    return (
      <div style={styles.wrapper}>
        <Sidebar />
        <div className="main-content fade-in" style={styles.main}>
          <h1 style={styles.pageTitle}>Access Denied</h1>
          <p>Only supervisors can access this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.wrapper}>
      <Sidebar />
      <div className="main-content fade-in" style={styles.main}>
        <div className="page-header" style={styles.header}>
          <div>
            <h1 style={styles.pageTitle}>User Management</h1>
            <p style={styles.subtitle}>Create and manage accounts</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} style={styles.addBtn}>
            <Plus size={18} />
            <span className="btn-text">Add User</span>
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} style={styles.formCard}>
            <h3 style={styles.formTitle}>Create New User</h3>
            {error && <p style={styles.error}>{error}</p>}
            <div className="form-grid" style={styles.formGrid}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Full Name</label>
                <input type="text" style={styles.input} value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} required />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Email</label>
                <input type="email" style={styles.input} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Password</label>
                <input type="password" style={styles.input} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Role</label>
                <select style={styles.input} value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                  <option value="engineer">Service Engineer</option>
                  <option value="admin">Supervisor</option>
                </select>
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Employee ID</label>
                <input type="text" style={styles.input} value={formData.employee_id} onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })} required />
              </div>
            </div>
            <button type="submit" style={styles.submitBtn} disabled={loading}>
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </form>
        )}

        <div style={styles.tableCard}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Role</th>
                <th style={styles.th}>Employee ID</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={styles.tr}>
                  <td style={styles.td}>{u.full_name}</td>
                  <td style={styles.td}>{u.email || '-'}</td>
                  <td style={styles.td}>{u.role === 'admin' ? 'Supervisor' : 'Service Engineer'}</td>
                  <td style={styles.td}>{u.employee_id}</td>
                  <td style={styles.td}>
                    <button onClick={() => handleDelete(u.id)} style={styles.deleteBtn}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
  addBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: '#CC0000', border: 'none', borderRadius: '8px', color: '#FFFFFF', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  formCard: { background: '#FFFFFF', borderRadius: '12px', padding: '24px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  formTitle: { fontSize: '18px', fontWeight: '600', color: '#333333', marginBottom: '20px' },
  error: { background: '#FFF0F0', color: '#CC0000', padding: '10px', borderRadius: '8px', fontSize: '14px', marginBottom: '16px' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '14px', fontWeight: '500', color: '#333333' },
  input: { padding: '10px 14px', border: '2px solid #E0E0E0', borderRadius: '8px', fontSize: '14px', outline: 'none', width: '100%' },
  submitBtn: { marginTop: '20px', padding: '12px 24px', background: '#CC0000', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' },
  tableCard: { background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#666666', borderBottom: '1px solid #E0E0E0' },
  tr: { borderBottom: '1px solid #F0F0F0' },
  td: { padding: '14px 16px', fontSize: '14px', color: '#333333' },
  deleteBtn: { background: 'transparent', border: 'none', color: '#CC0000', cursor: 'pointer', padding: '4px' },
}

export default Users