import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Users,
  Clock,
  Wallet,
  BookOpen,
  UserPlus
} from 'lucide-react'
import type { WorkShift, WorkScheduleSummary } from '../types/database'

interface ShiftFormData {
  employee_name: string
  position: 'ผู้จัดการ' | 'เภสัชกร' | 'พนักงานประจำ' | 'พนักงานพาร์ทไทม์' | ''
  work_date: string
  start_time: string
  end_time: string
  hourly_wage: number
  notes: string
}

const POSITIONS = [
  { value: 'เภสัชกร', label: 'เภสัชกร' },
  { value: 'ผู้จัดการ', label: 'ผู้จัดการ' },
  { value: 'พนักงานประจำ', label: 'พนักงานประจำ' },
  { value: 'พนักงานพาร์ทไทม์', label: 'พนักงานพาร์ทไทม์' }
] as const

const DEFAULT_SHIFT: ShiftFormData = {
  employee_name: '',
  position: '',
  work_date: new Date().toISOString().split('T')[0],
  start_time: '09:00',
  end_time: '18:00',
  hourly_wage: 50,
  notes: ''
}

// Default values for Manager (ผู้จัดการ): 9:00-18:00, 16,000/month salary
const MANAGER_DEFAULTS = {
  start_time: '09:00',
  end_time: '18:00',
  monthly_salary: 16000
}

// Default values for Pharmacist (เภสัชกร): Sat-Sun, 11:00-20:30, 150/hr
const PHARMACIST_DEFAULTS = {
  start_time: '11:00',
  end_time: '20:30',
  hourly_wage: 150
}

// Default values for Full-time (พนักงานประจำ): 9:00-18:00, 80/hr
const FULLTIME_DEFAULTS = {
  start_time: '09:00',
  end_time: '18:00',
  hourly_wage: 80
}

// Default values for Part-time (พนักงานพาร์ทไทม์): 40/hr
const PARTTIME_DEFAULTS = {
  hourly_wage: 40
}

// Special rates
const SUNDAY_MANAGER_RATE = 800 // 9:00-20:30 on Sunday
const OT_RATE = 250 // For 18:00-20:30

export default function WorkSchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [shifts, setShifts] = useState<WorkShift[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingShift, setEditingShift] = useState<WorkShift | null>(null)
  const [formData, setFormData] = useState<ShiftFormData>(DEFAULT_SHIFT)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')

  // Fetch shifts for current month
  useEffect(() => {
    fetchShifts()
  }, [currentDate])

  const fetchShifts = async () => {
    try {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      
      const startOfMonth = new Date(year, month, 1).toISOString().split('T')[0]
      const endOfMonth = new Date(year, month + 1, 0).toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('work_shifts')
        .select('*')
        .gte('work_date', startOfMonth)
        .lte('work_date', endOfMonth)
        .order('work_date', { ascending: true })

      if (error) throw error
      setShifts(data || [])
    } catch (error) {
      console.error('Error fetching shifts:', error)
    }
  }

  // Calculate shift details
  const calculateShiftHours = (start: string, end: string): number => {
    const [startHour, startMin] = start.split(':').map(Number)
    const [endHour, endMin] = end.split(':').map(Number)
    
    let hours = endHour - startHour
    let minutes = endMin - startMin
    
    if (minutes < 0) {
      hours--
      minutes += 60
    }
    
    return hours + minutes / 60
  }

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    return new Date(year, month, 1).getDay()
  }

  const getShiftsForDate = (dateStr: string) => {
    return shifts.filter(shift => shift.work_date === dateStr)
  }

  // Summary statistics
  const summary = useMemo((): WorkScheduleSummary[] => {
    const employeeMap = new Map<string, { days: Set<string>; hours: number; wage: number }>()
    
    shifts.forEach(shift => {
      const existing = employeeMap.get(shift.employee_name) || { days: new Set(), hours: 0, wage: 0 }
      existing.days.add(shift.work_date)
      existing.hours += shift.total_hours
      existing.wage += shift.total_wage
      employeeMap.set(shift.employee_name, existing)
    })
    
    return Array.from(employeeMap.entries()).map(([name, data]) => ({
      employee_name: name,
      total_days: data.days.size,
      total_hours: data.hours,
      total_wage: data.wage
    }))
  }, [shifts])

  // Handlers
  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const handleDateClick = (dateStr: string) => {
    setSelectedDate(dateStr)
    setFormData({ 
      employee_name: '',
      position: '',
      work_date: dateStr,
      start_time: '09:00',
      end_time: '18:00',
      hourly_wage: 50,
      notes: ''
    })
    setShowModal(true)
  }

  const handleEdit = (shift: WorkShift) => {
    setEditingShift(shift)
    setFormData({
      employee_name: shift.employee_name,
      position: (shift as any).position || '',
      work_date: shift.work_date,
      start_time: shift.start_time,
      end_time: shift.end_time,
      hourly_wage: shift.hourly_wage,
      notes: shift.notes || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('ต้องการลบกะงานนี้?')) return
    
    try {
      const { error } = await supabase.from('work_shifts').delete().eq('id', id)
      if (error) throw error
      fetchShifts()
    } catch (error) {
      console.error('Error deleting shift:', error)
      alert('ไม่สามารถลบกะงานได้')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const totalHours = calculateShiftHours(formData.start_time, formData.end_time)
    
    // Special wage calculation for manager
    let totalWage = totalHours * formData.hourly_wage
    let otHours = 0
    let otAmount = 0
    
    const date = new Date(formData.work_date)
    const dayOfWeek = date.getDay() // 0 = Sunday
    const isSunday = dayOfWeek === 0
    
    if (formData.position === 'ผู้จัดการ') {
      // Check for Sunday special rate: 9:00-20:30 = 800 Baht
      if (isSunday && formData.start_time === '09:00' && formData.end_time === '20:30') {
        totalWage = SUNDAY_MANAGER_RATE
      } else {
        // Check for OT after 18:00
        const [endHour, endMin] = formData.end_time.split(':').map(Number)
        if (endHour > 18 || (endHour === 18 && endMin > 0)) {
          // Calculate OT hours (after 18:00)
          const otStartMinutes = 18 * 60
          const otEndMinutes = endHour * 60 + endMin
          otHours = (otEndMinutes - otStartMinutes) / 60
          
          // OT rate: 250 Baht for 18:00-20:30 (2.5 hours)
          // Proportional calculation: 250 / 2.5 = 100 Baht per hour
          const otHourlyRate = OT_RATE / 2.5
          otAmount = Math.round(otHours * otHourlyRate)
        }
        
        // Base wage: monthly salary / 30 days / 9 hours per day
        const baseHourlyRate = MANAGER_DEFAULTS.monthly_salary / 30 / 9
        const regularHours = Math.max(0, totalHours - otHours)
        totalWage = Math.round(regularHours * baseHourlyRate + otAmount)
      }
    } else {
      totalWage = totalHours * formData.hourly_wage
    }
    
    const shiftData = {
      ...formData,
      total_hours: totalHours,
      total_wage: totalWage
    }
    
    try {
      if (editingShift) {
        const { error } = await supabase
          .from('work_shifts')
          .update(shiftData)
          .eq('id', editingShift.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('work_shifts').insert(shiftData)
        if (error) throw error
      }
      
      setShowModal(false)
      setEditingShift(null)
      setFormData(DEFAULT_SHIFT)
      fetchShifts()
    } catch (error) {
      console.error('Error saving shift:', error)
      alert('ไม่สามารถบันทึกกะงานได้')
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingShift(null)
    setFormData(DEFAULT_SHIFT)
    setSelectedDate(null)
  }

  // Render calendar
  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate)
    const today = new Date().toISOString().split('T')[0]
    
    const days = []
    
    // Empty cells for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 bg-gray-50/50" />)
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const dayShifts = getShiftsForDate(dateStr)
      const isToday = dateStr === today
      const isSelected = dateStr === selectedDate
      
      days.push(
        <div
          key={day}
          onClick={() => handleDateClick(dateStr)}
          className={`h-24 border border-gray-200 p-2 cursor-pointer transition-all hover:bg-[#F5F0E6] ${
            isToday ? 'bg-[#E8F5E9]' : 'bg-white'
          } ${isSelected ? 'ring-2 ring-[#A67B5B]' : ''}`}
        >
          <div className="flex justify-between items-start">
            <span className={`text-sm font-medium ${isToday ? 'text-[#2E7D32]' : 'text-gray-700'}`}>
              {day}
            </span>
            {dayShifts.length > 0 && (
              <span className="text-xs bg-[#A67B5B] text-white px-1.5 py-0.5 rounded-full">
                {dayShifts.length}
              </span>
            )}
          </div>
          <div className="mt-1 space-y-0.5">
            {dayShifts.slice(0, 2).map((shift, idx) => (
              <div
                key={idx}
                className="text-xs truncate text-[#5C4A32] bg-[#F5F0E8] px-1 py-0.5 rounded"
                onClick={(e) => {
                  e.stopPropagation()
                  handleEdit(shift)
                }}
              >
                {shift.employee_name}
              </div>
            ))}
            {dayShifts.length > 2 && (
              <div className="text-xs text-[#8B7355]">+{dayShifts.length - 2} คน</div>
            )}
          </div>
        </div>
      )
    }
    
    return days
  }

  const monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ]

  const dayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <Calendar className="h-8 w-8 text-[#A67B5B] mt-1" />
          <div>
            <h1 className="text-2xl font-bold text-[#5C4A32]">ตารางเข้างาน</h1>
            <p className="text-[#8B7355]">จัดการกะงานและคำนวณค่าตอบแทนพนักงาน</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-help-modal'))}
            className="p-2 text-gray-400 hover:text-[#A67B5B] hover:bg-[#F5F0E6] rounded-full transition-all"
            title="คู่มือการใช้งาน"
          >
            <BookOpen className="h-5 w-5" />
          </button>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'calendar' ? 'bg-white text-[#5C4A32] shadow-sm' : 'text-gray-600'
              }`}
            >
              ปฏิทิน
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'list' ? 'bg-white text-[#5C4A32] shadow-sm' : 'text-gray-600'
              }`}
            >
              รายการ
            </button>
          </div>
          <button
            onClick={() => {
              setFormData(DEFAULT_SHIFT)
              setShowModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-[#A67B5B] bg-white text-[#A67B5B] text-sm whitespace-nowrap hover:bg-[#A67B5B]/10 transition-all shadow-sm"
          >
            <Plus className="h-4 w-4" />
            เพิ่มกะงาน
          </button>
        </div>
      </div>

      {/* Summary Cards - Only show in list view */}
      {viewMode === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <Card className="bg-[#F5F0E8] border-[#D4C9B8]">
            <div className="p-4 text-center">
              <Users className="h-6 w-6 text-[#A67B5B] mx-auto mb-2" />
              <p className="text-xs text-[#8B7355]">พนักงานทั้งหมด</p>
              <p className="text-2xl font-bold text-[#5C4A32]">{summary.length} คน</p>
            </div>
          </Card>
          <Card className="bg-[#FAF6F0] border-[#D4C9B8]">
            <div className="p-4 text-center">
              <Clock className="h-6 w-6 text-[#A67B5B] mx-auto mb-2" />
              <p className="text-xs text-[#8B7355]">ชั่วโมงรวม</p>
              <p className="text-2xl font-bold text-[#5C4A32]">
                {summary.reduce((sum, s) => sum + s.total_hours, 0).toFixed(1)} ชม.
              </p>
            </div>
          </Card>
          <Card className="bg-[#E8F5E9] border-[#C8E6C9]">
            <div className="p-4 text-center">
              <Wallet className="h-6 w-6 text-[#4CAF50] mx-auto mb-2" />
              <p className="text-xs text-[#4CAF50]">ค่าตอบแทนรวม</p>
              <p className="text-2xl font-bold text-[#2E7D32]">
                ฿{summary.reduce((sum, s) => sum + s.total_wage, 0).toLocaleString()}
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <Card className="border-[#E8E0D5]">
          {/* Calendar Header */}
          <div className="p-4 border-b border-[#E8E0D5] bg-[#FAF8F5]">
            <div className="flex items-center justify-between">
              <button
                onClick={handlePreviousMonth}
                className="p-2 hover:bg-[#F5F0E6] rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5 text-[#5C4A32]" />
              </button>
              <h2 className="text-lg font-bold text-[#5C4A32]">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear() + 543}
              </h2>
              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-[#F5F0E6] rounded-lg transition-colors"
              >
                <ChevronRight className="h-5 w-5 text-[#5C4A32]" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="p-4">
            {/* Day Names */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map((day) => (
                <div key={day} className="text-center text-sm font-medium text-[#8B7355] py-2">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {renderCalendar()}
            </div>
          </div>
        </Card>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <Card className="border-[#E8E0D5]">
          <div className="p-4 border-b border-[#E8E0D5] bg-[#FAF8F5]">
            <h2 className="text-base font-bold text-[#5C4A32]">รายการกะงาน</h2>
          </div>
          <div className="divide-y divide-[#E8E0D5]">
            {shifts.length === 0 ? (
              <div className="p-8 text-center">
                <Calendar className="h-12 w-12 text-[#D4C9B8] mx-auto mb-3" />
                <p className="text-[#8B7355]">ไม่มีรายการกะงาน</p>
                <p className="text-sm text-[#A67B52] mt-1">คลิก "เพิ่มกะงาน" เพื่อเริ่มต้น</p>
              </div>
            ) : (
              shifts.map((shift) => (
                <div key={shift.id} className="p-4 flex items-center justify-between hover:bg-[#FAF8F5]">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-[#F5F0E8] rounded-lg">
                      <UserPlus className="h-5 w-5 text-[#A67B5B]" />
                    </div>
                    <div>
                      <p className="font-medium text-[#5C4A32]">{shift.employee_name}</p>
                      <p className="text-sm text-[#8B7355]">
                        {new Date(shift.work_date).toLocaleDateString('th-TH')} • {shift.start_time} - {shift.end_time}
                      </p>
                      {shift.notes && (
                        <p className="text-xs text-[#A67B52] mt-1">{shift.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium text-[#5C4A32]">{shift.total_hours.toFixed(1)} ชม.</p>
                      <p className="text-sm font-bold text-[#2E7D32]">฿{shift.total_wage.toLocaleString()}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(shift)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(shift.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Employee Summary - Only show in list view */}
      {viewMode === 'list' && summary.length > 0 && (
        <Card className="mt-6 border-[#E8E0D5]">
          <div className="p-4 border-b border-[#E8E0D5] bg-[#FAF8F5]">
            <h2 className="text-base font-bold text-[#5C4A32]">สรุปตามพนักงาน</h2>
          </div>
          <div className="divide-y divide-[#E8E0D5]">
            {summary.map((emp) => (
              <div key={emp.employee_name} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-[#A67B5B]" />
                  <span className="font-medium text-[#5C4A32]">{emp.employee_name}</span>
                </div>
                <div className="flex gap-6 text-sm">
                  <span className="text-[#8B7355]">{emp.total_days} วัน</span>
                  <span className="text-[#8B7355]">{emp.total_hours.toFixed(1)} ชม.</span>
                  <span className="font-bold text-[#2E7D32]">฿{emp.total_wage.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[#E8E0D5]">
              <h3 className="text-lg font-bold text-[#5C4A32]">
                {editingShift ? 'แก้ไขกะงาน' : 'เพิ่มกะงาน'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#5C4A32] mb-1">ตำแหน่ง</label>
                <select
                  value={formData.position}
                  onChange={(e) => {
                    const newPosition = e.target.value as ShiftFormData['position']
                    // If selecting เภสัชกร, set default values
                    if (newPosition === 'เภสัชกร') {
                      setFormData({
                        ...formData,
                        position: newPosition,
                        start_time: PHARMACIST_DEFAULTS.start_time,
                        end_time: PHARMACIST_DEFAULTS.end_time,
                        hourly_wage: PHARMACIST_DEFAULTS.hourly_wage
                      })
                    } else if (newPosition === 'ผู้จัดการ') {
                      setFormData({
                        ...formData,
                        position: newPosition,
                        start_time: MANAGER_DEFAULTS.start_time,
                        end_time: MANAGER_DEFAULTS.end_time,
                        hourly_wage: MANAGER_DEFAULTS.monthly_salary / 30 / 9 // Approx hourly rate
                      })
                    } else if (newPosition === 'พนักงานประจำ') {
                      setFormData({
                        ...formData,
                        position: newPosition,
                        start_time: FULLTIME_DEFAULTS.start_time,
                        end_time: FULLTIME_DEFAULTS.end_time,
                        hourly_wage: FULLTIME_DEFAULTS.hourly_wage
                      })
                    } else if (newPosition === 'พนักงานพาร์ทไทม์') {
                      setFormData({
                        ...formData,
                        position: newPosition,
                        hourly_wage: PARTTIME_DEFAULTS.hourly_wage
                      })
                    } else {
                      setFormData({ ...formData, position: newPosition })
                    }
                  }}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#A67B5B] focus:ring-[#A67B5B]"
                  required
                >
                  <option value="">เลือกตำแหน่ง</option>
                  {POSITIONS.map((pos) => (
                    <option key={pos.value} value={pos.value}>{pos.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5C4A32] mb-1">ชื่อพนักงาน</label>
                <Input
                  value={formData.employee_name}
                  onChange={(e) => setFormData({ ...formData, employee_name: e.target.value })}
                  placeholder="ชื่อพนักงาน"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#5C4A32] mb-1">วันที่</label>
                <Input
                  type="date"
                  value={formData.work_date}
                  onChange={(e) => {
                    const newDate = e.target.value
                    setFormData({ ...formData, work_date: newDate })
                  }}
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#5C4A32] mb-1">เวลาเริ่ม</label>
                  <Input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5C4A32] mb-1">เวลาจบ</label>
                  <Input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#5C4A32] mb-1">ค่าจ้าง/ชม. (บาท)</label>
                <Input
                  type="number"
                  value={formData.hourly_wage}
                  onChange={(e) => setFormData({ ...formData, hourly_wage: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="0.5"
                  required
                />
              </div>
              
              {/* Preview calculation */}
              <div className="bg-[#FAF8F5] rounded-lg p-3 border border-[#E8E0D5]">
                <p className="text-sm text-[#8B7355]">ชั่วโมง: {calculateShiftHours(formData.start_time, formData.end_time).toFixed(1)} ชม.</p>
                <p className="text-lg font-bold text-[#2E7D32]">
                  รวม: ฿{(calculateShiftHours(formData.start_time, formData.end_time) * formData.hourly_wage).toLocaleString()}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#5C4A32] mb-1">หมายเหตุ</label>
                <Input
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="หมายเหตุ (ถ้ามี)"
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <Button 
                  type="button" 
                  onClick={closeModal} 
                  className="flex-1 bg-white border-2 border-gray-300 !text-black hover:bg-gray-50"
                >
                  ยกเลิก
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-white border-2 border-[#A67B5B] !text-black hover:bg-[#F5F0E6]"
                >
                  {editingShift ? 'บันทึก' : 'เพิ่ม'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
