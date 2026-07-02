import { useState } from 'react'
import { X, FileText } from 'lucide-react'

function DocViewer({ docs }) {
  const [viewing, setViewing] = useState(null)

  if (!docs || docs.length === 0) return <span>-</span>

  return (
    <>
      {docs.map(d => (
        <button
          key={d.id}
          onClick={() => setViewing(d)}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#CC0000', display: 'block', fontSize: '12px', padding: '2px 0',
            textAlign: 'left', textDecoration: 'underline'
          }}
        >
          <FileText size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
          {d.file_name}
        </button>
      ))}

      {viewing && (
        <div style={styles.overlay} onClick={() => setViewing(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.header}>
              <span style={{ fontWeight: '600' }}>{viewing.file_name}</span>
              <button onClick={() => setViewing(null)} style={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>
            <div style={styles.content}>
              {viewing.file_type?.startsWith('image/') ? (
                <img src={viewing.file_url} alt={viewing.file_name} style={{ maxWidth: '100%', maxHeight: '70vh' }} />
              ) : viewing.file_type === 'application/pdf' ? (
                <iframe src={viewing.file_url} style={{ width: '100%', height: '70vh', border: 'none' }} title={viewing.file_name} />
              ) : (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <FileText size={48} color="#CC0000" />
                  <p style={{ marginTop: '16px' }}>
                    <a href={viewing.file_url} target="_blank" rel="noopener noreferrer" style={{ color: '#CC0000' }}>
                      Open file in new tab
                    </a>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.6)', zIndex: 2000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  modal: {
    background: '#FFFFFF', borderRadius: '12px', width: '90%', maxWidth: '800px',
    maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 20px', borderBottom: '1px solid #E0E0E0',
  },
  closeBtn: {
    background: 'transparent', border: 'none', cursor: 'pointer', color: '#666',
  },
  content: {
    padding: '20px',
  },
}

export default DocViewer