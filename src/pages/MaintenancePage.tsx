import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../services/supabase'
import Button from '../components/common/Button'
import {
  Plus,
  Calendar as CalendarIcon,
  List,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  Trash2,
  Edit3,
  Filter,
  Wrench,
  Sparkles,
  Wind,
  Bug,
  Key,
  Printer,
  Package,
  Briefcase,
  Home,
  RotateCcw,
} from 'lucide-react'

// Types
interface MaintenanceTask {
  id: string
  title: string
  description: string | null
  category: string
  frequency: string
  scheduled_date: string
  scheduled_time: string | null
  last_completed_date: string | null
  next_due_date: string | null
  status: string
  priority: string
  assigned_to: string | null
  vendor_name: string | null
  vendor_phone: string | null
  estimated_cost: number
  actual_cost: number
  completed_date: string | null
  completed_by: string | null
  completion_notes: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

interface TaskFormData {
  title: string
  description: string
  category: string
  frequency: string
  scheduled_date: string
  scheduled_time: string
  priority: string
  assigned_to: string
  vendor_name: string
  vendor_phone: string
  estimated_cost: number
  notes: string
}

const CATEGORIES = [
  { value: 'cleaning', label: 'ทำความสะอาด', icon: Sparkles, color: 'bg-blue-50 text-blue-700' },
  { value: 'aircon', label: 'แอร์', icon: Wind, color: 'bg-cyan-50 text-cyan-700' },
  { value: 'pest_control', label: 'กำจัดปลวก/แมลง', icon: Bug, color: 'bg-amber-50 text-amber-700' },
  { value: 'security', label: 'ระบบรักษาความปลอดภัย', icon: Key, color: 'bg-purple-50 text-purple-700' },
  { value: 'equipment', label: 'อุปกรณ์/เครื่องใช้', icon: Printer, color: 'bg-rose-50 text-rose-700' },
  { value: 'supplies', label: 'วัสดุสิ้นเปลือง', icon: Package, color: 'bg-emerald-50 text-emerald-700' },
  { value: 'office', label: 'วัสดุสำนักงาน', icon: Briefcase, color: 'bg-indigo-50 text-indigo-700' },
  { value: 'building', label: 'อาคาร/สถานที่', icon: Home, color: 'bg-orange-50 text-orange-700' },
  { value: 'general', label: 'ทั่วไป', icon: Wrench, color: 'bg-gray-50 text-gray-700' },
]

const FREQUENCIES = [
  { value: 'once', label: 'ครั้งเดียว' },
  { value: 'daily', label: 'ทุกวัน' },
  { value: 'weekly', label: 'ทุกสัปดาห์' },
  { value: 'biweekly', label: 'ทุก 2 สัปดาห์' },
  { value: 'monthly', label: 'ทุกเดือน' },
  { value: 'quarterly', label: 'ทุก 3 เดือน' },
  { value: 'yearly', label: 'ทุกปี' },
]

const PRIORITIES = [
  { value: 'low', label: 'ต่ำ', color: 'bg-gray-100 text-gray-600' },
  { value: 'medium', label: 'ปานกลาง', color: 'bg-blue-100 text-blue-700' },
  { value: 'high', label: 'สูง', color: 'bg-orange-100 text-orange-700' },
  { value: 'urgent', label: 'เร่งด่วน', color: 'bg-red-100 text-red-700' },
]

const PRESET_TASKS = [
  { title: 'จ้างแม่บ้านทำความสะอาด', category: 'cleaning', frequency: 'weekly' },
  { title: 'ล้างแอร์', category: 'aircon', frequency: 'quarterly' },
  { title: 'ฉีดปลวก', category: 'pest_control', frequency: 'yearly' },
  { title: 'ชาร์จแบตกุญแจร้าน', category: 'security', frequency: 'monthly' },
  { title: 'ทำความสะอาดหัวพิมพ์เครื่องปริ้นท์', category: 'equipment', frequency: 'monthly' },
  { title: 'เช็กวัสดุแพ็กของ', category: 'supplies', frequency: 'weekly' },
  { title: 'เช็กวัสดุสำนักงาน', category: 'office', frequency: 'monthly' },
  { title: 'เช็กของใช้ในร้าน', category: 'supplies', frequency: 'weekly' },
]

const initialFormData: TaskFormData = {
  title: '',
  description: '',
  category: 'general',
  frequency: 'once',
  scheduled_date: new Date().toISOString().split('T')[0],
  scheduled_time: '',
  priority: 'medium',
  assigned_to: '',
  vendor_name: '',
  vendor_phone: '',
  estimated_cost: 0,
  notes: '',
}

export default function MaintenancePage() {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar')
  const [showModal, setShowModal] = useState(false)
  const [editingTask, setEditingTask] = useState<MaintenanceTask | null>(null)
  const [formData, setFormData] = useState<TaskFormData>(initialFormData)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showPresets, setShowPresets] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('maintenance_tasks')
      .select('*')
      .order('scheduled_date', { ascending: true })
    if (error) {
      console.error('Error fetching tasks:', error)
    } else {
      setTasks(data || [])
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.scheduled_date) return
    setIsSaving(true)

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      category: formData.category,
      frequency: formData.frequency,
      scheduled_date: formData.scheduled_date,
      scheduled_time: formData.scheduled_time || null,
      priority: formData.priority,
      assigned_to: formData.assigned_to.trim() || null,
      vendor_name: formData.vendor_name.trim() || null,
      vendor_phone: formData.vendor_phone.trim() || null,
      estimated_cost: formData.estimated_cost || 0,
      notes: formData.notes.trim() || null,
      status: 'pending',
      next_due_date: formData.scheduled_date,
    }

    if (editingTask) {
      const { error } = await supabase
        .from('maintenance_tasks')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editingTask.id)
      if (error) console.error('Error updating task:', error)
    } else {
      const { error } = await supabase.from('maintenance_tasks').insert(payload)
      if (error) console.error('Error creating task:', error)
    }

    setIsSaving(false)
    setShowModal(false)
    setEditingTask(null)
    setFormData(initialFormData)
    fetchTasks()
  }

  const handleEdit = (task: MaintenanceTask) => {
    setEditingTask(task)
    setFormData({
      title: task.title,
      description: task.description || '',
      category: task.category,
      frequency: task.frequency,
      scheduled_date: task.scheduled_date,
      scheduled_time: task.scheduled_time || '',
      priority: task.priority,
      assigned_to: task.assigned_to || '',
      vendor_name: task.vendor_name || '',
      vendor_phone: task.vendor_phone || '',
      estimated_cost: task.estimated_cost || 0,
      notes: task.notes || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('ต้องการลบงานนี้?')) return
    await supabase.from('maintenance_tasks').delete().eq('id', id)
    fetchTasks()
  }

  const handleComplete = async (task: MaintenanceTask) => {
    const now = new Date()
    const updates: Record<string, unknown> = {
      status: 'completed',
      completed_date: now.toISOString(),
      last_completed_date: now.toISOString().split('T')[0],
      updated_at: now.toISOString(),
    }

    // Calculate next due date for recurring tasks
    if (task.frequency !== 'once') {
      const baseDate = new Date(task.scheduled_date)
      let nextDate = new Date(baseDate)
      switch (task.frequency) {
        case 'daily': nextDate.setDate(nextDate.getDate() + 1); break
        case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break
        case 'biweekly': nextDate.setDate(nextDate.getDate() + 14); break
        case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break
        case 'quarterly': nextDate.setMonth(nextDate.getMonth() + 3); break
        case 'yearly': nextDate.setFullYear(nextDate.getFullYear() + 1); break
      }
      // Ensure next date is in the future
      while (nextDate <= now) {
        switch (task.frequency) {
          case 'daily': nextDate.setDate(nextDate.getDate() + 1); break
          case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break
          case 'biweekly': nextDate.setDate(nextDate.getDate() + 14); break
          case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break
          case 'quarterly': nextDate.setMonth(nextDate.getMonth() + 3); break
          case 'yearly': nextDate.setFullYear(nextDate.getFullYear() + 1); break
        }
      }

      // Create the next occurrence
      const { error: insertErr } = await supabase.from('maintenance_tasks').insert({
        title: task.title,
        description: task.description,
        category: task.category,
        frequency: task.frequency,
        scheduled_date: nextDate.toISOString().split('T')[0],
        scheduled_time: task.scheduled_time,
        priority: task.priority,
        assigned_to: task.assigned_to,
        vendor_name: task.vendor_name,
        vendor_phone: task.vendor_phone,
        estimated_cost: task.estimated_cost,
        notes: task.notes,
        status: 'pending',
        next_due_date: nextDate.toISOString().split('T')[0],
      })
      if (insertErr) console.error('Error creating next occurrence:', insertErr)
    }

    await supabase.from('maintenance_tasks').update(updates).eq('id', task.id)
    fetchTasks()
  }

  const handleReopen = async (task: MaintenanceTask) => {
    await supabase
      .from('maintenance_tasks')
      .update({ status: 'pending', completed_date: null, completed_by: null, updated_at: new Date().toISOString() })
      .eq('id', task.id)
    fetchTasks()
  }

  const handlePresetClick = (preset: typeof PRESET_TASKS[0]) => {
    setFormData({
      ...initialFormData,
      title: preset.title,
      category: preset.category,
      frequency: preset.frequency,
    })
    setShowPresets(false)
  }

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (filterCategory && t.category !== filterCategory) return false
      if (filterStatus && t.status !== filterStatus) return false
      return true
    })
  }, [tasks, filterCategory, filterStatus])

  // Calendar helpers
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDayOfWeek = firstDay.getDay() // 0=Sun

    const days: { date: Date; isCurrentMonth: boolean; tasks: MaintenanceTask[] }[] = []

    // Previous month padding
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month, -i)
      days.push({ date: d, isCurrentMonth: false, tasks: [] })
    }

    // Current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d)
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const dayTasks = filteredTasks.filter(t => t.scheduled_date === dateStr)
      days.push({ date, isCurrentMonth: true, tasks: dayTasks })
    }

    // Next month padding to fill 6 rows
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i)
      days.push({ date: d, isCurrentMonth: false, tasks: [] })
    }

    return days
  }, [currentMonth, filteredTasks])

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const getCategoryInfo = (cat: string) => CATEGORIES.find(c => c.value === cat) || CATEGORIES[CATEGORIES.length - 1]
  const getPriorityInfo = (p: string) => PRIORITIES.find(pr => pr.value === p) || PRIORITIES[1]
  const getFrequencyLabel = (f: string) => FREQUENCIES.find(fr => fr.value === f)?.label || f

  const formatDate = (d: string) => new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })

  // Stats
  const pendingCount = tasks.filter(t => t.status === 'pending').length
  const overdueCount = tasks.filter(t => t.status === 'pending' && t.scheduled_date < todayStr).length
  const completedThisMonth = tasks.filter(t => {
    if (t.status !== 'completed') return false
    const m = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    return t.completed_date?.startsWith(m)
  }).length

  const handleAddNew = () => {
    setEditingTask(null)
    setFormData(initialFormData)
    setShowPresets(false)
    setShowModal(true)
  }

  const handleCalendarDayClick = (dateStr: string) => {
    setEditingTask(null)
    setFormData({ ...initialFormData, scheduled_date: dateStr })
    setShowPresets(false)
    setShowModal(true)
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">บำรุงรักษาร้าน</h1>
          <p className="text-sm text-gray-500 mt-0.5">จัดการงานบำรุงรักษาและตารางปฏิบัติงาน</p>
        </div>
        <Button onClick={handleAddNew} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          เพิ่มงาน
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">รอดำเนินการ</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{pendingCount}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-[11px] text-red-400 font-medium uppercase tracking-wider">เกินกำหนด</div>
          <div className="text-2xl font-bold text-red-600 mt-1">{overdueCount}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-[11px] text-green-500 font-medium uppercase tracking-wider">เสร็จเดือนนี้</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{completedThisMonth}</div>
        </div>
      </div>

      {/* View toggle + Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'calendar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <CalendarIcon className="h-4 w-4" />
            ปฏิทิน
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <List className="h-4 w-4" />
            รายการ
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 bg-white"
          >
            <option value="">หมวดหมู่ทั้งหมด</option>
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 bg-white"
          >
            <option value="">สถานะทั้งหมด</option>
            <option value="pending">รอดำเนินการ</option>
            <option value="completed">เสร็จแล้ว</option>
            <option value="cancelled">ยกเลิก</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      ) : viewMode === 'calendar' ? (
        /* ===== CALENDAR VIEW ===== */
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {/* Calendar header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900">
              {currentMonth.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
            </h2>
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(d => (
              <div key={d} className="px-1 py-2 text-center text-xs font-medium text-gray-400 uppercase">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              const dateStr = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, '0')}-${String(day.date.getDate()).padStart(2, '0')}`
              const isToday = dateStr === todayStr
              const hasOverdue = day.tasks.some(t => t.status === 'pending' && t.scheduled_date < todayStr)

              return (
                <div
                  key={idx}
                  onClick={() => day.isCurrentMonth && handleCalendarDayClick(dateStr)}
                  className={`min-h-[90px] border-b border-r border-gray-50 p-1.5 cursor-pointer hover:bg-gray-50 transition-colors ${!day.isCurrentMonth ? 'bg-gray-50/50' : ''}`}
                >
                  <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-gray-900 text-white' : day.isCurrentMonth ? 'text-gray-700' : 'text-gray-300'}`}>
                    {day.date.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {day.tasks.slice(0, 3).map(task => {
                      const catInfo = getCategoryInfo(task.category)
                      return (
                        <div
                          key={task.id}
                          onClick={(e) => { e.stopPropagation(); handleEdit(task) }}
                          className={`text-[10px] leading-tight px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80 ${task.status === 'completed' ? 'bg-green-50 text-green-600 line-through' : hasOverdue && task.status === 'pending' && task.scheduled_date < todayStr ? 'bg-red-50 text-red-600' : catInfo.color}`}
                        >
                          {task.title}
                        </div>
                      )
                    })}
                    {day.tasks.length > 3 && (
                      <div className="text-[10px] text-gray-400 pl-1">+{day.tasks.length - 3} อื่นๆ</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* ===== LIST VIEW ===== */
        <div className="space-y-2">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Wrench className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">ยังไม่มีงานบำรุงรักษา</p>
            </div>
          ) : (
            filteredTasks.map(task => {
              const catInfo = getCategoryInfo(task.category)
              const priorityInfo = getPriorityInfo(task.priority)
              const CatIcon = catInfo.icon
              const isOverdue = task.status === 'pending' && task.scheduled_date < todayStr

              return (
                <div key={task.id} className={`bg-white rounded-xl border p-4 flex items-start gap-4 transition-colors ${isOverdue ? 'border-red-200 bg-red-50/30' : task.status === 'completed' ? 'border-gray-100 opacity-60' : 'border-gray-100 hover:border-gray-200'}`}>
                  {/* Category icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${catInfo.color}`}>
                    <CatIcon className="h-5 w-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className={`font-semibold text-sm ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{task.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {task.status === 'pending' && (
                          <button onClick={() => handleComplete(task)} className="p-1.5 hover:bg-green-50 rounded-lg text-green-600 transition-colors" title="ทำเสร็จ">
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        )}
                        {task.status === 'completed' && (
                          <button onClick={() => handleReopen(task)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors" title="เปิดใหม่">
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        )}
                        <button onClick={() => handleEdit(task)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(task.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="flex items-center gap-1 text-[11px] text-gray-500">
                        <CalendarIcon className="h-3 w-3" />
                        {formatDate(task.scheduled_date)}
                      </span>
                      {task.scheduled_time && (
                        <span className="flex items-center gap-1 text-[11px] text-gray-500">
                          <Clock className="h-3 w-3" />
                          {task.scheduled_time.slice(0, 5)}
                        </span>
                      )}
                      <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${priorityInfo.color}`}>{priorityInfo.label}</span>
                      {task.frequency !== 'once' && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600">{getFrequencyLabel(task.frequency)}</span>
                      )}
                      {isOverdue && (
                        <span className="flex items-center gap-0.5 text-[11px] text-red-600 font-medium">
                          <AlertTriangle className="h-3 w-3" />
                          เกินกำหนด
                        </span>
                      )}
                      {task.vendor_name && (
                        <span className="text-[11px] text-gray-400">ผู้รับผิดชอบ: {task.vendor_name}</span>
                      )}
                      {task.estimated_cost > 0 && (
                        <span className="text-[11px] text-gray-400">฿{task.estimated_cost.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ===== ADD/EDIT MODAL ===== */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editingTask ? 'แก้ไขงาน' : 'เพิ่มงานบำรุงรักษา'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Presets - only for new tasks */}
              {!editingTask && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowPresets(!showPresets)}
                    className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
                  >
                    <Sparkles className="h-3 w-3" />
                    {showPresets ? 'ซ่อนเทมเพลต' : 'เลือกจากเทมเพลต'}
                  </button>
                  {showPresets && (
                    <div className="grid grid-cols-2 gap-1.5 mb-3">
                      {PRESET_TASKS.map((preset, idx) => {
                        const catInfo = getCategoryInfo(preset.category)
                        const CatIcon = catInfo.icon
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handlePresetClick(preset)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left transition-colors hover:opacity-80 ${catInfo.color}`}
                          >
                            <CatIcon className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate">{preset.title}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">ชื่องาน *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-200 focus:border-gray-400 outline-none"
                  placeholder="เช่น ล้างแอร์, ทำความสะอาด..."
                  required
                />
              </div>

              {/* Category + Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">หมวดหมู่</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-200 focus:border-gray-400 outline-none"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">ความสำคัญ</label>
                  <select
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-200 focus:border-gray-400 outline-none"
                  >
                    {PRIORITIES.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date + Time + Frequency */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">วันที่ *</label>
                  <input
                    type="date"
                    value={formData.scheduled_date}
                    onChange={e => setFormData({ ...formData, scheduled_date: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-200 focus:border-gray-400 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">เวลา</label>
                  <input
                    type="time"
                    value={formData.scheduled_time}
                    onChange={e => setFormData({ ...formData, scheduled_time: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-200 focus:border-gray-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">ความถี่</label>
                  <select
                    value={formData.frequency}
                    onChange={e => setFormData({ ...formData, frequency: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-200 focus:border-gray-400 outline-none"
                  >
                    {FREQUENCIES.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Vendor + Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">ผู้รับผิดชอบ / ร้านค้า</label>
                  <input
                    type="text"
                    value={formData.vendor_name}
                    onChange={e => setFormData({ ...formData, vendor_name: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-200 focus:border-gray-400 outline-none"
                    placeholder="ชื่อช่าง / บริษัท"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">เบอร์โทร</label>
                  <input
                    type="tel"
                    value={formData.vendor_phone}
                    onChange={e => setFormData({ ...formData, vendor_phone: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-200 focus:border-gray-400 outline-none"
                    placeholder="0xx-xxx-xxxx"
                  />
                </div>
              </div>

              {/* Cost */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">ค่าใช้จ่ายโดยประมาณ (บาท)</label>
                <input
                  type="number"
                  value={formData.estimated_cost || ''}
                  onChange={e => setFormData({ ...formData, estimated_cost: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-200 focus:border-gray-400 outline-none"
                  placeholder="0"
                  min="0"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">รายละเอียด</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-200 focus:border-gray-400 outline-none"
                  rows={2}
                  placeholder="รายละเอียดเพิ่มเติม..."
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">หมายเหตุ</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-200 focus:border-gray-400 outline-none"
                  placeholder="หมายเหตุ..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1" disabled={isSaving}>
                  {isSaving ? 'กำลังบันทึก...' : editingTask ? 'อัปเดต' : 'เพิ่มงาน'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="flex-1">
                  ยกเลิก
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
