import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (loginError) {
      setError(loginError.message)
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()

    localStorage.setItem('otmsr_user', JSON.stringify({ 
      name: profile?.full_name || email,
      role: profile?.role || 'engineer', 
      email,
      id: data.user.id 
    }))

    navigate('/dashboard')
  }

  return (
    <div className="fade-in" style={styles.container}>
      <div style={styles.overlay} />
      <div style={styles.card}>
        <div style={styles.logoSection}>
          <img src="/logo.png" alt="OTMSR Logo" style={styles.logoImage} />
          <h1 style={styles.companyName}>One Top Medical</h1>
          <p style={styles.companySub}>Systems Resources</p>
        </div>

        <form onSubmit={handleLogin} style={styles.form}>
          <h2 style={styles.title}>Sign In</h2>

          {error && <p style={styles.error}>{error}</p>}

          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              placeholder="engineer@otmsr.com"
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <p style={styles.demoText}>
            Demo: engineer@otmsr.com / demo1234<br />
            Admin: admin@otmsr.com / demo1234
          </p>
        </form>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundImage: 'url("/bg.png")',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    position: 'relative',
    padding: '20px',
  },
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(139, 0, 0, 0.75)',
    backdropFilter: 'blur(6px)',
  },
  card: {
    background: '#FFFFFF',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    width: '100%',
    maxWidth: '420px',
    overflow: 'hidden',
    position: 'relative',
    zIndex: 1,
  },
  logoSection: {
    background: '#FFFFFF',
    padding: '40px 20px 30px',
    textAlign: 'center',
    color: '#CC0000',
    borderBottom: '3px solid #CC0000',
  },
  logoImage: {
    width: '80px',
    height: '80px',
    objectFit: 'contain',
    marginBottom: '12px',
  },
  companyName: {
    fontSize: '24px',
    fontWeight: '700',
    letterSpacing: '0.5px',
    color: '#8B0000',
  },
  companySub: {
    fontSize: '14px',
    color: '#CC0000',
    marginTop: '4px',
    fontWeight: '500',
  },
  form: {
    padding: '30px',
  },
  title: {
    fontSize: '22px',
    fontWeight: '600',
    color: '#333333',
    marginBottom: '24px',
    textAlign: 'center',
  },
  error: {
    background: '#FFF0F0',
    color: '#CC0000',
    padding: '10px',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '16px',
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: '18px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#333333',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    border: '2px solid #E0E0E0',
    borderRadius: '8px',
    fontSize: '15px',
    outline: 'none',
  },
  button: {
    width: '100%',
    padding: '13px',
    background: '#CC0000',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '8px',
  },
  demoText: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#999',
    marginTop: '16px',
    lineHeight: '1.6',
  },
}

export default Login