import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [focused, setFocused] = useState(null)
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
    <div className="login-wrapper" style={styles.wrapper}>
      <div className="animate-image login-image-panel" style={styles.imagePanel}>
        <div style={styles.imageOverlay} />
        <div style={styles.imageContent}>
          <div className="logo-pulse">
            <img src="/logo2.png" alt="OTMSR" className="login-image-logo" style={styles.imageLogo} />
          </div>
          <h2 className="login-image-title" style={styles.imageTitle}>One Top Medical</h2>
          <p className="login-image-sub" style={styles.imageSub}>Systems Resources</p>
          <div style={styles.divider} />
          <p style={styles.imageTagline}>Biomedical Equipment Service Management</p>
        </div>
      </div>

      <div className="login-form-panel" style={styles.formPanel}>
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
          zIndex: 0,
        }}>
          {[...Array(20)].map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              width: Math.random() * 6 + 4 + 'px',
              height: Math.random() * 6 + 4 + 'px',
              background: 'rgba(204,0,0,' + (Math.random() * 0.4 + 0.25) + ')',
              borderRadius: '50%',
              left: Math.random() * 100 + '%',
              bottom: '-20px',
              boxShadow: '0 0 8px rgba(204,0,0,0.3)',
              animation: `floatUp ${Math.random() * 7 + 5}s linear infinite`,
              animationDelay: Math.random() * 5 + 's',
            }} />
          ))}
        </div>

        <div className="animate-card login-form-area" style={styles.formArea}>
          <h1 className="animate-title" style={styles.title}>Sign In</h1>
          <p className="animate-title" style={styles.subtitle}>Access your account</p>

          {error && <p className="animate-form" style={styles.error}>{error}</p>}

          <form onSubmit={handleLogin}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
              style={{
                ...styles.input,
                borderColor: focused === 'email' ? '#CC0000' : '#EEE',
                boxShadow: focused === 'email' ? '0 0 0 3px rgba(204,0,0,0.1)' : 'none',
                transform: focused === 'email' ? 'scale(1.02)' : 'scale(1)',
                transition: 'all 0.3s ease',
              }}
              placeholder="Email"
              required
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused(null)}
              style={{
                ...styles.input,
                borderColor: focused === 'password' ? '#CC0000' : '#EEE',
                boxShadow: focused === 'password' ? '0 0 0 3px rgba(204,0,0,0.1)' : 'none',
                transform: focused === 'password' ? 'scale(1.02)' : 'scale(1)',
                transition: 'all 0.3s ease',
              }}
              placeholder="Password"
              required
            />
            <button
              type="submit"
              style={styles.button}
              disabled={loading}
              onMouseEnter={e => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 8px 25px rgba(204,0,0,0.3)' }}
              onMouseLeave={e => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = 'none' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="animate-form" style={styles.demo}>admin@otmsr.com / demo1234 &nbsp;|&nbsp; engineer@otmsr.com / demo1234</p>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes floatUp {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-110vh) scale(0.3); opacity: 0; }
        }
        @keyframes logoGlow {
          0%, 100% { filter: drop-shadow(0 0 8px rgba(255,255,255,0.2)); transform: scale(1); }
          50% { filter: drop-shadow(0 0 20px rgba(255,255,255,0.5)); transform: scale(1.05); }
        }
        .animate-image { animation: slideInLeft 1s ease-out; }
        .animate-card { animation: slideUp 0.7s ease-out 0.3s both; }
        .animate-title { animation: fadeIn 0.8s ease-out 0.5s both; }
        .animate-form { animation: slideUp 0.6s ease-out 0.8s both; }
        .logo-pulse { animation: logoGlow 3s ease-in-out infinite; display: inline-block; }
        @media (max-width: 768px) {
          .login-wrapper { flex-direction: column !important; }
          .login-image-panel { flex: none !important; height: 40vh !important; min-height: 280px !important; }
          .login-form-panel { flex: 1 !important; padding: 40px 24px !important; }
          .login-image-logo { width: 60px !important; height: 60px !important; }
          .login-image-title { font-size: 24px !important; }
          .login-image-sub { font-size: 12px !important; }
          .login-form-area { max-width: 100% !important; }
        }
      `}</style>
    </div>
  )
}

const styles = {
  wrapper: {
    display: 'flex',
    minHeight: '100vh',
    background: '#F5F5F5',
    position: 'relative',
    overflow: 'hidden',
  },
  imagePanel: {
    flex: '7',
    backgroundImage: 'url("/bg.png")',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'linear-gradient(135deg, rgba(139,0,0,0.75) 0%, rgba(0,0,0,0.4) 100%)',
  },
  imageContent: {
    position: 'relative',
    zIndex: 1,
    textAlign: 'center',
    color: '#FFFFFF',
    padding: '40px',
  },
  imageLogo: {
    width: '90px',
    height: '90px',
    objectFit: 'contain',
    marginBottom: '20px',
  },
  imageTitle: {
    fontSize: '34px',
    fontWeight: '700',
    letterSpacing: '1px',
    marginBottom: '2px',
  },
  imageSub: {
    fontSize: '15px',
    opacity: 0.85,
    letterSpacing: '3px',
    textTransform: 'uppercase',
    marginTop: '4px',
    fontWeight: '500',
  },
  divider: {
    width: '50px',
    height: '2px',
    background: 'rgba(255,255,255,0.4)',
    margin: '24px auto',
  },
  imageTagline: {
    fontSize: '13px',
    opacity: 0.6,
    fontStyle: 'italic',
  },
  formPanel: {
    flex: '3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    zIndex: 1,
    background: '#FFFFFF',
    position: 'relative',
    overflow: 'hidden',
  },
  formArea: {
    width: '100%',
    maxWidth: '360px',
    position: 'relative',
    zIndex: 2,
  },
  title: {
    fontSize: '26px',
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: '2px',
  },
  subtitle: {
    fontSize: '13px',
    color: '#999',
    marginBottom: '28px',
  },
  error: {
    background: '#FFF5F5',
    color: '#CC0000',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '18px',
    border: '1px solid #FFE0E0',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    border: '2px solid #EEE',
    borderRadius: '10px',
    fontSize: '14px',
    outline: 'none',
    marginBottom: '12px',
    background: '#FAFAFA',
  },
  button: {
    width: '100%',
    padding: '14px',
    background: '#CC0000',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '6px',
    letterSpacing: '0.5px',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  demo: {
    fontSize: '11px',
    color: '#CCC',
    marginTop: '20px',
    textAlign: 'center',
  },
}

export default Login