import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, Calendar, LogOut, Menu, X, MessageCircle, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'

function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    const stored = localStorage.getItem('otmsr_user')
    if (stored) setCurrentUser(JSON.parse(stored))
  }, [])

  useEffect(() => {
    const fetchUnread = async () => {
      const stored = localStorage.getItem('otmsr_user')
      if (!stored) return
      const user = JSON.parse(stored)
      const { count } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('receiver_id', user.id).eq('read', false)
      setUnreadCount(count || 0)
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 5000)
    return () => clearInterval(interval)
  }, [])

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Reports', path: '/reports', icon: ClipboardList },
    { name: 'Schedule', path: '/schedule', icon: Calendar },
    { name: 'Chat', path: '/chat', icon: MessageCircle, badge: unreadCount },
    ...(currentUser?.role === 'admin' ? [{ name: 'Users', path: '/users', icon: Users }] : []),
  ]

  const handleNav = (path) => {
    navigate(path)
    setOpen(false)
  }

  return (
    <>
      <button className="sidebar-hamburger" style={styles.hamburger} onClick={() => setOpen(!open)}>
        {open ? <X size={24} color="#CC0000" /> : <Menu size={24} color="#CC0000" />}
      </button>

      {open && <div className="sidebar-overlay" style={styles.overlay} onClick={() => setOpen(false)} />}

      <div className={`sidebar-menu ${open ? 'open' : ''}`} style={styles.sidebar}>
        <div style={styles.logoSection}>
          <img src="/logo.png" alt="OTMSR" style={styles.logo} />
          <span style={styles.brandName}>OTMSR</span>
        </div>

        <nav style={styles.nav}>
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                style={{
                  ...styles.navItem,
                  ...(isActive ? styles.navItemActive : {}),
                }}
              >
                <Icon size={20} />
                <span>{item.name}</span>
                {item.badge > 0 && (
                  <span style={styles.badge}>{item.badge}</span>
                )}
              </button>
            )
          })}
        </nav>

        <button onClick={() => { 
          document.querySelector('.main-content')?.classList.add('fade-out')
          setTimeout(() => { navigate('/'); setOpen(false) }, 300)
        }} style={styles.logoutBtn}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </>
  )
}

const styles = {
  hamburger: {
    display: 'none',
    position: 'fixed',
    top: '15px',
    left: '15px',
    zIndex: 1000,
    background: '#FFFFFF',
    border: '1px solid #E0E0E0',
    borderRadius: '8px',
    padding: '8px',
    cursor: 'pointer',
  },
  overlay: {
    display: 'none',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 998,
  },
  sidebar: {
    width: '250px',
    height: '100vh',
    background: '#FFFFFF',
    borderRight: '1px solid #E0E0E0',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    left: 0,
    top: 0,
    zIndex: 999,
    transition: 'left 0.3s ease',
  },
  logoSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '20px',
    borderBottom: '2px solid #CC0000',
  },
  logo: {
    width: '36px',
    height: '36px',
    objectFit: 'contain',
  },
  brandName: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#8B0000',
    letterSpacing: '0.5px',
  },
  nav: {
    flex: 1,
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    border: 'none',
    background: 'transparent',
    color: '#666666',
    fontSize: '15px',
    borderRadius: '8px',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    transition: 'all 0.2s',
    position: 'relative',
  },
  navItemActive: {
    background: '#CC0000',
    color: '#FFFFFF',
  },
  badge: {
    background: '#FF4444',
    color: '#FFFFFF',
    fontSize: '11px',
    fontWeight: '700',
    minWidth: '20px',
    height: '20px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
    padding: '0 6px',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 20px',
    border: 'none',
    background: 'transparent',
    color: '#CC0000',
    fontSize: '15px',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    borderTop: '1px solid #E0E0E0',
    transition: 'background 0.2s',
  },
}

export default Sidebar