import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/Layout/Sidebar'
import { Wrench, CheckCircle, Clock, Play, Maximize2, Download } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ total: 0, completed: 0, active: 0, inProgress: 0 })
  const [chartData, setChartData] = useState([])
  const [equipmentData, setEquipmentData] = useState([])
  const [engineerStats, setEngineerStats] = useState({ myReports: 0, completed: 0, active: 0, inProgress: 0 })
  const [engineerChart, setEngineerChart] = useState([])
  const [timeFilter, setTimeFilter] = useState('daily')
  const [selectedEngineer, setSelectedEngineer] = useState('all')
  const [chartFilter, setChartFilter] = useState('all')
  const [chartType, setChartType] = useState('line')
  const [engineers, setEngineers] = useState([])
  const [fullscreen, setFullscreen] = useState(false)
  const [pieFullscreen, setPieFullscreen] = useState(false)
  const [dateRange, setDateRange] = useState({ from: '', to: '' })
  const barRef = useRef(null)
  const engineerBarRef = useRef(null)
  const pieRef = useRef(null)

  const COLORS = ['#CC0000', '#8B0000', '#FF8C00', '#FF6666', '#FFCCCC']
  const DELAYED_COLOR = '#FF8C00'

  useEffect(() => { if (user?.role === 'admin') fetchEngineers() }, [user])
  useEffect(() => { fetchDashboardData() }, [user, timeFilter, selectedEngineer, dateRange])

  useEffect(() => {
    const checkDelayed = async () => {
      const today = new Date().toISOString().split('T')[0]
      await supabase.from('schedules').update({ status: 'delayed' }).lt('scheduled_date', today).in('status', ['scheduled', 'in_progress'])
    }
    checkDelayed()
    const interval = setInterval(checkDelayed, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const channel = supabase.channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, () => fetchDashboardData())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user, timeFilter, selectedEngineer, dateRange])

  const fetchEngineers = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'engineer')
    if (data) setEngineers(data)
  }

  const getTimeRange = () => {
    if (dateRange.from) return dateRange.from
    const now = new Date()
    if (timeFilter === 'weekly') return new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    if (timeFilter === 'monthly') return new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
    if (timeFilter === 'yearly') return '2020-01-01'
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  }

  const exportChart = async (ref, name) => {
    const container = ref.current
    if (!container) return
    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(container.querySelector('.recharts-wrapper'), { backgroundColor: '#FFFFFF', scale: 2 })
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `${name}.png`
    a.click()
  }

  const generateChartData = (reports, schedules) => {
    if (dateRange.from && dateRange.to) {
      const from = new Date(dateRange.from + 'T00:00:00'); const to = new Date(dateRange.to + 'T00:00:00'); const days = []
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) { const ds = d.toISOString().split('T')[0]; days.push({ name: `${d.getMonth()+1}/${d.getDate()}`, completed: reports?.filter(r => r?.status === 'completed' && r?.report_date === ds).length || 0, active: schedules?.filter(s => s?.status === 'scheduled' && s?.scheduled_date === ds).length || 0, in_progress: schedules?.filter(s => s?.status === 'in_progress' && s?.scheduled_date === ds).length || 0, delayed: schedules?.filter(s => s?.status === 'delayed' && s?.scheduled_date === ds).length || 0 }) }
      return days
    }
    const now = new Date()
    if (timeFilter === 'daily') { const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(); return Array.from({ length: dim }, (_, d) => { const ds = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(d + 1).padStart(2, '0')}`; return { name: String(d + 1), completed: reports?.filter(r => r?.status === 'completed' && r?.report_date === ds).length || 0, active: schedules?.filter(s => s?.status === 'scheduled' && s?.scheduled_date === ds).length || 0, in_progress: schedules?.filter(s => s?.status === 'in_progress' && s?.scheduled_date === ds).length || 0, delayed: schedules?.filter(s => s?.status === 'delayed' && s?.scheduled_date === ds).length || 0 } }) }
    if (timeFilter === 'weekly') { const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4']; return weeks.map((w, wi) => { const start = new Date(now.getFullYear(), now.getMonth(), wi * 7 + 1); const end = new Date(now.getFullYear(), now.getMonth(), (wi + 1) * 7); return { name: w, completed: reports?.filter(r => r?.status === 'completed' && new Date(r.report_date) >= start && new Date(r.report_date) <= end).length || 0, active: schedules?.filter(s => s?.status === 'scheduled' && new Date(s.scheduled_date) >= start && new Date(s.scheduled_date) <= end).length || 0, in_progress: schedules?.filter(s => s?.status === 'in_progress' && new Date(s.scheduled_date) >= start && new Date(s.scheduled_date) <= end).length || 0, delayed: schedules?.filter(s => s?.status === 'delayed' && new Date(s.scheduled_date) >= start && new Date(s.scheduled_date) <= end).length || 0 } }) }
    if (timeFilter === 'monthly') { const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']; return months.map((m, i) => ({ name: m, completed: reports?.filter(r => r?.status === 'completed' && new Date(r.report_date).getMonth() === i).length || 0, active: schedules?.filter(s => s?.status === 'scheduled' && new Date(s.scheduled_date).getMonth() === i).length || 0, in_progress: schedules?.filter(s => s?.status === 'in_progress' && new Date(s.scheduled_date).getMonth() === i).length || 0, delayed: schedules?.filter(s => s?.status === 'delayed' && new Date(s.scheduled_date).getMonth() === i).length || 0 })) }
    const years = ['2020', '2021', '2022', '2023', '2024', '2025', '2026', '2027', '2028']; return years.map(y => ({ name: y, completed: reports?.filter(r => r?.status === 'completed' && r?.report_date?.startsWith(y)).length || 0, active: schedules?.filter(s => s?.status === 'scheduled' && s?.scheduled_date?.startsWith(y)).length || 0, in_progress: schedules?.filter(s => s?.status === 'in_progress' && s?.scheduled_date?.startsWith(y)).length || 0, delayed: schedules?.filter(s => s?.status === 'delayed' && s?.scheduled_date?.startsWith(y)).length || 0 }))
  }

  const fetchDashboardData = async () => {
    const timeFrom = getTimeRange(); const timeTo = dateRange.to || undefined
    if (user?.role === 'admin') {
      let rq = supabase.from('reports').select('*, equipment(equipment_type)').gte('report_date', timeFrom); let sq = supabase.from('schedules').select('*').gte('scheduled_date', timeFrom)
      if (timeTo) { rq = rq.lte('report_date', timeTo); sq = sq.lte('scheduled_date', timeTo) }
      if (selectedEngineer !== 'all') { rq = rq.eq('engineer_id', selectedEngineer); sq = sq.eq('engineer_id', selectedEngineer) }
      const { data: reports } = await rq; const { data: schedules } = await sq
      setChartData(generateChartData(reports || [], schedules || []))
      if (reports) { setStats({ total: reports.length, completed: reports.filter(r => r.status === 'completed').length, active: schedules ? schedules.filter(s => s.status === 'scheduled').length : 0, inProgress: schedules ? schedules.filter(s => s.status === 'in_progress').length : 0 }); const tc = {}; reports.forEach(r => { const t = r.equipment?.equipment_type || 'Unknown'; tc[t] = (tc[t] || 0) + 1 }); setEquipmentData(Object.entries(tc).slice(0, 5).map(([n, v]) => ({ name: n, value: v }))) } else { setStats({ total: 0, completed: 0, active: 0, inProgress: 0 }); setEquipmentData([]) }
    } else {
      let rq = supabase.from('reports').select('*, equipment(equipment_type)').eq('engineer_id', user.id).gte('report_date', timeFrom); let sq = supabase.from('schedules').select('*').eq('engineer_id', user.id).gte('scheduled_date', timeFrom)
      if (timeTo) { rq = rq.lte('report_date', timeTo); sq = sq.lte('scheduled_date', timeTo) }
      const { data: mr } = await rq; const { data: ms } = await sq
      setEngineerChart(generateChartData(mr || [], ms || []))
      setEngineerStats({ myReports: mr?.length || 0, completed: mr?.filter(r => r.status === 'completed').length || 0, active: ms?.filter(s => s.status === 'scheduled').length || 0, inProgress: ms?.filter(s => s.status === 'in_progress').length || 0 })
      if (mr?.length) { const tc = {}; mr.forEach(r => { const t = r.equipment?.equipment_type || 'Unknown'; tc[t] = (tc[t] || 0) + 1 }); setEquipmentData(Object.entries(tc).slice(0, 5).map(([n, v]) => ({ name: n, value: v }))) } else setEquipmentData([])
    }
  }

  const filtered = chartFilter === 'all' ? chartData : chartData.map(d => ({ name: d.name, [chartFilter]: d[chartFilter] }))

  const renderChart = (data) => (
    <ResponsiveContainer width="100%" height={300}>
      {chartType === 'line' ? (
        <LineChart data={data} margin={{top:20,right:30,bottom:5,left:10}}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0"/><XAxis dataKey="name" stroke="#666"/><YAxis stroke="#666" allowDecimals={false}/><Tooltip/><Legend/>
          {(chartFilter==='all'||chartFilter==='completed')&&<Line type="monotone" dataKey="completed" stroke="#28a745" strokeWidth={2} dot={{r:3}} name="Completed"/>}
          {(chartFilter==='all'||chartFilter==='active')&&<Line type="monotone" dataKey="active" stroke="#CC0000" strokeWidth={2} dot={{r:3}} name="Active"/>}
          {(chartFilter==='all'||chartFilter==='in_progress')&&<Line type="monotone" dataKey="in_progress" stroke="#ffc107" strokeWidth={2} dot={{r:3}} name="In Progress"/>}
          {(chartFilter==='all'||chartFilter==='delayed')&&<Line type="monotone" dataKey="delayed" stroke={DELAYED_COLOR} strokeWidth={2} dot={{r:3}} name="Delayed"/>}
        </LineChart>
      ) : (
        <BarChart data={data} margin={{top:20,right:30,bottom:5,left:10}}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0"/><XAxis dataKey="name" stroke="#666"/><YAxis stroke="#666" allowDecimals={false}/><Tooltip/><Legend/>
          {(chartFilter==='all'||chartFilter==='completed')&&<Bar dataKey="completed" fill="#28a745" name="Completed"/>}
          {(chartFilter==='all'||chartFilter==='active')&&<Bar dataKey="active" fill="#CC0000" name="Active"/>}
          {(chartFilter==='all'||chartFilter==='in_progress')&&<Bar dataKey="in_progress" fill="#ffc107" name="In Progress"/>}
          {(chartFilter==='all'||chartFilter==='delayed')&&<Bar dataKey="delayed" fill={DELAYED_COLOR} name="Delayed"/>}
        </BarChart>
      )}
    </ResponsiveContainer>
  )

  return (
    <div style={styles.wrapper}>
      <Sidebar />
      <div className="main-content fade-in" style={styles.main}>
        <div className="page-header" style={styles.header}>
          <div><h1 style={styles.pageTitle}>Dashboard</h1><p style={styles.subtitle}>{user?.role === 'admin' ? 'All Engineers Overview' : 'My Work Summary'}</p></div>
          <div style={styles.userInfo}><p style={styles.userName}>{user?.name}</p><p style={styles.userRole}>{user?.role === 'admin' ? 'Supervisor' : 'Service Engineer'}</p></div>
        </div>
        <div className="filters" style={styles.filters}>
          <select className="filter-select" value={timeFilter} onChange={e => {setTimeFilter(e.target.value);setDateRange({from:'',to:''})}} style={styles.filterSelect}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select>
          <input className="filter-select" type="date" value={dateRange.from} onChange={e => {setDateRange({...dateRange,from:e.target.value});if(e.target.value)setTimeFilter('')}} style={styles.filterSelect} />
          <input className="filter-select" type="date" value={dateRange.to} onChange={e => setDateRange({...dateRange,to:e.target.value})} style={styles.filterSelect} />
          <select className="filter-select" value={chartFilter} onChange={e => setChartFilter(e.target.value)} style={styles.filterSelect}><option value="all">All</option><option value="completed">Completed</option><option value="active">Active</option><option value="in_progress">In Progress</option><option value="delayed">Delayed</option></select>
          <select className="filter-select" value={chartType} onChange={e => setChartType(e.target.value)} style={styles.filterSelect}><option value="line">Line</option><option value="bar">Bar</option></select>
          {user?.role === 'admin' && <select className="filter-select" value={selectedEngineer} onChange={e => setSelectedEngineer(e.target.value)} style={styles.filterSelect}><option value="all">All Engineers</option>{engineers.map(eng => <option key={eng.id} value={eng.id}>{eng.full_name}</option>)}</select>}
        </div>
        {user?.role === 'admin' ? (
          <>
            <div className="stats-grid" style={styles.statsGrid}>
              <div className="chart-card" style={styles.statCard}><div style={{...styles.statIcon,background:'#CC0000'}}><Wrench size={24} color="#FFF"/></div><div><p className="stat-card-value" style={styles.statValue}>{stats.total}</p><p className="stat-card-label" style={styles.statLabel}>Total Reports</p></div></div>
              <div className="chart-card" style={styles.statCard}><div style={{...styles.statIcon,background:'#28a745'}}><CheckCircle size={24} color="#FFF"/></div><div><p className="stat-card-value" style={styles.statValue}>{stats.completed}</p><p className="stat-card-label" style={styles.statLabel}>Completed</p></div></div>
              <div className="chart-card" style={styles.statCard}><div style={{...styles.statIcon,background:'#CC0000'}}><Clock size={24} color="#FFF"/></div><div><p className="stat-card-value" style={styles.statValue}>{stats.active}</p><p className="stat-card-label" style={styles.statLabel}>Active</p></div></div>
              <div className="chart-card" style={styles.statCard}><div style={{...styles.statIcon,background:'#ffc107'}}><Play size={24} color="#FFF"/></div><div><p className="stat-card-value" style={styles.statValue}>{stats.inProgress}</p><p className="stat-card-label" style={styles.statLabel}>In Progress</p></div></div>
            </div>
            <div className="charts-row" style={styles.chartsRow}>
              <div className="chart-card" style={styles.chartCard}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8,padding:'0 16px'}}><h3 style={styles.chartTitle}>Overview ({dateRange.from?`${dateRange.from} - ${dateRange.to}`:timeFilter})</h3><div style={{display:'flex',gap:8}}><button onClick={()=>exportChart(barRef,'overview')} style={styles.iconBtn}><Download size={16}/></button><button onClick={()=>setFullscreen(true)} style={styles.iconBtn}><Maximize2 size={16}/></button></div></div>
                {chartData.length>0?<div ref={barRef} style={{width:'100%'}}>{renderChart(filtered)}</div>:<p style={{textAlign:'center',color:'#999',padding:40}}>No data</p>}
              </div>
              <div className="chart-card" style={styles.chartCard}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8,padding:'0 16px'}}><h3 style={styles.chartTitle}>Equipment</h3><div style={{display:'flex',gap:8}}><button onClick={()=>exportChart(pieRef,'pie')} style={styles.iconBtn}><Download size={16}/></button><button onClick={()=>setPieFullscreen(true)} style={styles.iconBtn}><Maximize2 size={16}/></button></div></div>
                {equipmentData.length>0?<div ref={pieRef} style={{display:'flex',justifyContent:'center'}}><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={equipmentData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}>{equipmentData.map((e,i)=><Cell key={i} fill={COLORS[i%5]}/>)}</Pie><Tooltip/><Legend/></PieChart></ResponsiveContainer></div>:<p style={{textAlign:'center',color:'#999',padding:40}}>No data</p>}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="stats-grid" style={styles.statsGrid}>
              <div className="chart-card" style={styles.statCard}><div style={{...styles.statIcon,background:'#CC0000'}}><Wrench size={24} color="#FFF"/></div><div><p className="stat-card-value" style={styles.statValue}>{engineerStats.myReports}</p><p className="stat-card-label" style={styles.statLabel}>My Reports</p></div></div>
              <div className="chart-card" style={styles.statCard}><div style={{...styles.statIcon,background:'#28a745'}}><CheckCircle size={24} color="#FFF"/></div><div><p className="stat-card-value" style={styles.statValue}>{engineerStats.completed}</p><p className="stat-card-label" style={styles.statLabel}>Completed</p></div></div>
              <div className="chart-card" style={styles.statCard}><div style={{...styles.statIcon,background:'#CC0000'}}><Clock size={24} color="#FFF"/></div><div><p className="stat-card-value" style={styles.statValue}>{engineerStats.active}</p><p className="stat-card-label" style={styles.statLabel}>Active</p></div></div>
              <div className="chart-card" style={styles.statCard}><div style={{...styles.statIcon,background:'#ffc107'}}><Play size={24} color="#FFF"/></div><div><p className="stat-card-value" style={styles.statValue}>{engineerStats.inProgress}</p><p className="stat-card-label" style={styles.statLabel}>In Progress</p></div></div>
            </div>
            <div className="chart-card" style={styles.chartCard}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8,padding:'0 16px'}}><h3 style={styles.chartTitle}>My Work ({dateRange.from?`${dateRange.from} - ${dateRange.to}`:timeFilter})</h3><div style={{display:'flex',gap:8}}><button onClick={()=>exportChart(engineerBarRef,'mywork')} style={styles.iconBtn}><Download size={16}/></button></div></div>
              {engineerChart.length>0?<div ref={engineerBarRef} style={{width:'100%'}}>{renderChart(engineerChart)}</div>:<p style={{textAlign:'center',color:'#999',padding:40}}>No data</p>}
            </div>
          </>
        )}
      </div>
      {fullscreen&&<div style={styles.fs}><div style={{width:'95%',margin:'0 auto'}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}><h3>Overview ({timeFilter})</h3><div style={{display:'flex',gap:10}}><button onClick={()=>exportChart(barRef,'overview')} style={styles.iconBtn}><Download size={18}/></button><button onClick={()=>setFullscreen(false)} style={styles.iconBtn}>✕</button></div></div><div ref={barRef}><ResponsiveContainer width="100%" height={500}>{renderChart(filtered)}</ResponsiveContainer></div></div></div>}
      {pieFullscreen&&<div style={styles.fs}><div style={{width:600,margin:'0 auto',textAlign:'center'}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}><h3>Equipment</h3><div style={{display:'flex',gap:10}}><button onClick={()=>exportChart(pieRef,'pie')} style={styles.iconBtn}><Download size={18}/></button><button onClick={()=>setPieFullscreen(false)} style={styles.iconBtn}>✕</button></div></div><div ref={pieRef}><PieChart width={500} height={500}><Pie data={equipmentData} cx="50%" cy="50%" outerRadius={180} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}>{equipmentData.map((e,i)=><Cell key={i} fill={COLORS[i%5]}/>)}</Pie><Tooltip/><Legend/></PieChart></div></div></div>}
    </div>
  )
}

const styles = {
  wrapper:{display:'flex'},
  main:{marginLeft:250,padding:20,flex:1,background:'#F5F5F5',minHeight:'100vh',maxWidth:'100%',overflow:'hidden'},
  header:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20},
  pageTitle:{fontSize:28,fontWeight:700,color:'#333'},
  subtitle:{color:'#666',marginTop:4},
  userInfo:{textAlign:'right'},
  userName:{fontWeight:600,color:'#333'},
  userRole:{fontSize:13,color:'#CC0000',fontWeight:500},
  filters:{display:'flex',gap:12,marginBottom:20,flexWrap:'wrap',alignItems:'center'},
  filterSelect:{padding:'8px 14px',border:'2px solid #CC0000',borderRadius:8,fontSize:14,background:'#FFF',color:'#333',cursor:'pointer',outline:'none'},
  statsGrid:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:20},
  statCard:{background:'#FFF',borderRadius:12,padding:20,display:'flex',alignItems:'center',gap:16,boxShadow:'0 2px 8px rgba(0,0,0,0.06)'},
  statIcon:{width:50,height:50,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center'},
  statValue:{fontSize:28,fontWeight:700,color:'#333'},
  statLabel:{fontSize:14,color:'#666',marginTop:2},
  chartsRow:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16},
  chartCard:{background:'#FFF',borderRadius:12,boxShadow:'0 2px 8px rgba(0,0,0,0.06)',marginBottom:16,overflow:'hidden',padding:12},
  chartTitle:{fontSize:16,fontWeight:600,color:'#333'},
  iconBtn:{background:'#F5F5F5',border:'1px solid #E0E0E0',borderRadius:6,padding:6,cursor:'pointer',color:'#333',display:'flex',alignItems:'center'},
  fs:{position:'fixed',top:0,left:0,right:0,bottom:0,background:'#FFF',zIndex:2000,padding:40,overflow:'auto'},
}

export default Dashboard