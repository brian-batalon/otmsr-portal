import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/Layout/Sidebar'
import { Send, Image, X, ArrowLeft } from 'lucide-react'

function Chat() {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [contacts, setContacts] = useState([])
  const [selectedContact, setSelectedContact] = useState(null)
  const [newMessage, setNewMessage] = useState('')
  const [uploading, setUploading] = useState(false)
  const [previewImg, setPreviewImg] = useState(null)
  const [showContacts, setShowContacts] = useState(true)
  const [unreadCounts, setUnreadCounts] = useState({})
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (user) { fetchContacts(); fetchUnreadCounts() }
  }, [user])

  useEffect(() => {
    if (!selectedContact || !user) return
    fetchMessages()
    const channel = supabase
      .channel(`chat-${user.id}-${selectedContact.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new
        if ((msg.sender_id === user.id && msg.receiver_id === selectedContact.id) || (msg.sender_id === selectedContact.id && msg.receiver_id === user.id)) {
          setMessages(prev => { const exists = prev.find(m => m.id === msg.id); if (exists) return prev; return [...prev, msg] })
          if (msg.receiver_id === user.id) {
            supabase.from('messages').update({ read: true }).eq('id', msg.id)
          }
        } else if (msg.receiver_id === user.id) {
          fetchUnreadCounts()
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selectedContact, user])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchUnreadCounts = async () => {
    if (!user) return
    const { data } = await supabase.from('messages').select('sender_id, id').eq('receiver_id', user.id).eq('read', false)
    if (data) {
      const counts = {}
      data.forEach(m => { counts[m.sender_id] = (counts[m.sender_id] || 0) + 1 })
      setUnreadCounts(counts)
    }
  }

  const fetchContacts = async () => {
    if (!user) return
    const { data } = await supabase.from('profiles').select('*')
    if (data) setContacts(data.filter(p => p.id !== user.id))
  }

  const fetchMessages = async () => {
    if (!selectedContact || !user) return
    const { data } = await supabase.from('messages').select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedContact.id}),and(sender_id.eq.${selectedContact.id},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true })
    if (data) {
      setMessages(data)
      await supabase.from('messages').update({ read: true }).eq('receiver_id', user.id).eq('sender_id', selectedContact.id).eq('read', false)
      fetchUnreadCounts()
    }
  }

  const handleImageUpload = async (file) => {
    if (!file || !selectedContact || !user) return
    setUploading(true)
    const filePath = `chat/${user.id}/${Date.now()}_${file.name}`
    const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file)
    if (uploadError) { alert('Upload failed'); setUploading(false); return }
    const { data: publicUrl } = supabase.storage.from('documents').getPublicUrl(filePath)
    await supabase.from('messages').insert({ sender_id: user.id, receiver_id: selectedContact.id, message: '', image_url: publicUrl.publicUrl })
    setUploading(false)
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedContact || !user) return
    await supabase.from('messages').insert({ sender_id: user.id, receiver_id: selectedContact.id, message: newMessage.trim() })
    setNewMessage('')
  }

  const handleSelectContact = (contact) => {
    setSelectedContact(contact)
    setShowContacts(false)
  }

  if (!user) {
    return (
      <div style={styles.wrapper}>
        <Sidebar />
        <div className="main-content" style={styles.main}>Loading...</div>
      </div>
    )
  }

  return (
    <div style={styles.wrapper}>
      <Sidebar />
      <div className="main-content fade-in" style={styles.main}>
        <h1 style={styles.pageTitle}>Messages</h1>
        <div className="chat-container" style={styles.chatContainer}>
          <div className={`chat-contacts ${!showContacts ? 'chat-contacts-hidden' : ''}`} style={styles.contactsList}>
            <h3 style={styles.sectionTitle}>Contacts</h3>
            {contacts.map(contact => {
              const unread = unreadCounts[contact.id] || 0
              return (
                <button key={contact.id} onClick={() => handleSelectContact(contact)}
                  style={{ ...styles.contactItem, background: selectedContact?.id === contact.id ? '#CC0000' : '#FFFFFF', color: selectedContact?.id === contact.id ? '#FFFFFF' : '#333333' }}>
                  <span style={{ flex: 1 }}>{contact.full_name} <span style={{ fontSize: '11px', opacity: 0.7 }}>({contact.role})</span></span>
                  {unread > 0 && <span style={styles.contactBadge}>{unread}</span>}
                </button>
              )
            })}
          </div>
          <div className={`chat-area ${showContacts ? 'chat-area-hidden' : ''}`} style={styles.chatArea}>
            {selectedContact ? (
              <>
                <div style={styles.chatHeader}>
                  <button onClick={() => setShowContacts(true)} className="chat-back-btn" style={styles.backBtn}>
                    <ArrowLeft size={20} />
                  </button>
                  {selectedContact.full_name}
                </div>
                <div style={styles.messagesArea}>
                  {messages.map(m => (
                    <div key={m.id} style={{ ...styles.messageBubble, alignSelf: m.sender_id === user.id ? 'flex-end' : 'flex-start', background: m.sender_id === user.id ? '#CC0000' : '#F0F0F0', color: m.sender_id === user.id ? '#FFFFFF' : '#333333' }}>
                      {m.image_url ? (
                        <img src={m.image_url} alt="shared" style={{ maxWidth: '200px', borderRadius: '8px', cursor: 'pointer' }} onClick={() => setPreviewImg(m.image_url)} />
                      ) : (
                        <p style={styles.messageText}>{m.message}</p>
                      )}
                      <span style={styles.messageTime}>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <form onSubmit={handleSend} style={styles.inputArea}>
                  <button type="button" onClick={() => fileInputRef.current?.click()} style={styles.imageBtn}><Image size={20} /></button>
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { if (e.target.files[0]) handleImageUpload(e.target.files[0]) }} />
                  <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." style={styles.input} />
                  <button type="submit" style={styles.sendBtn}><Send size={18} /></button>
                </form>
              </>
            ) : (
              <div style={styles.noChat}>Select a contact to start messaging</div>
            )}
          </div>
        </div>
        {previewImg && (
          <div style={styles.previewOverlay} onClick={() => setPreviewImg(null)}>
            <img src={previewImg} alt="preview" style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: '12px' }} />
            <button onClick={() => setPreviewImg(null)} style={styles.closePreview}><X size={24} color="#FFF" /></button>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  wrapper: { display: 'flex' },
  main: { marginLeft: '250px', padding: '30px', flex: 1, background: '#F5F5F5', minHeight: '100vh' },
  pageTitle: { fontSize: '28px', fontWeight: '700', color: '#333333', marginBottom: '20px' },
  chatContainer: { display: 'flex', height: 'calc(100vh - 150px)', background: '#FFFFFF', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  contactsList: { width: '250px', borderRight: '1px solid #E0E0E0', padding: '16px', overflowY: 'auto' },
  sectionTitle: { fontSize: '14px', fontWeight: '600', color: '#666', marginBottom: '12px', textTransform: 'uppercase' },
  contactItem: { display: 'flex', alignItems: 'center', width: '100%', padding: '12px', border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontSize: '14px', marginBottom: '4px', gap: '6px' },
  contactBadge: { background: '#FF4444', color: '#FFFFFF', fontSize: '10px', fontWeight: '700', minWidth: '18px', height: '18px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', flexShrink: 0 },
  chatArea: { flex: 1, display: 'flex', flexDirection: 'column' },
  chatHeader: { padding: '16px 20px', borderBottom: '1px solid #E0E0E0', fontWeight: '600', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '10px' },
  backBtn: { display: 'none', background: 'transparent', border: 'none', cursor: 'pointer', color: '#CC0000' },
  messagesArea: { flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' },
  messageBubble: { maxWidth: '70%', padding: '10px 14px', borderRadius: '16px', fontSize: '14px' },
  messageText: { margin: 0 },
  messageTime: { fontSize: '10px', opacity: 0.7, marginTop: '4px', display: 'block' },
  inputArea: { display: 'flex', padding: '16px', borderTop: '1px solid #E0E0E0', gap: '8px', alignItems: 'center' },
  imageBtn: { background: 'transparent', border: 'none', cursor: 'pointer', color: '#CC0000', padding: '8px' },
  input: { flex: 1, padding: '12px 16px', border: '2px solid #E0E0E0', borderRadius: '24px', fontSize: '14px', outline: 'none' },
  sendBtn: { background: '#CC0000', color: '#FFFFFF', border: 'none', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  noChat: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '16px' },
  previewOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  closePreview: { position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', cursor: 'pointer' },
}

export default Chat