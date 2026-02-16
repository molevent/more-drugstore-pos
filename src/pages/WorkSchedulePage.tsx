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
import type { WorkShift, WorkScheduleSummary, Employee } from '../types/database'

interface ShiftFormData {
  employee_name: string
  position: 'ผู้จัดการ' | 'เภสัชกร' | 'พนักงานประจำ' | 'พนักงานพาร์ทไทม์' | ''
  work_date: string
  start_time: string
  end_time: string
  hourly_wage: number
  notes: string
}

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

// Default values for Pharmacist (เภสัชกร): Mon-Fri 17:00-20:30, Sat-Sun 11:00-20:30, 150/hr
const PHARMACIST_DEFAULTS = {
  weekday: {
    start_time: '17:00',
    end_time: '20:30'
  },
  weekend: {
    start_time: '11:00',
    end_time: '20:30'
  },
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
  const [listViewMonth, setListViewMonth] = useState(new Date()) // For filtering list view
  const [shifts, setShifts] = useState<WorkShift[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [showModal, setShowModal] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [editingShift, setEditingShift] = useState<WorkShift | null>(null)
  const [formData, setFormData] = useState<ShiftFormData>(DEFAULT_SHIFT)
  const [leaveFormData, setLeaveFormData] = useState({
    employee_name: '',
    work_date: new Date().toISOString().split('T')[0],
    notes: 'ลา'
  })
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'leave'>('calendar')

  // Fetch shifts for current month
  useEffect(() => {
    fetchShifts()
    fetchEmployees()
  }, [currentDate])

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('is_active', true)
      
      if (error) throw error
      setEmployees(data || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const fetchShifts = async () => {
    try {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      
      // Use local date format (YYYY-MM-DD) instead of ISO string to avoid timezone issues
      const startOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-01`
      const endOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, '0')}`

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
    const employeeMap = new Map<string, { days: Set<string>; leaveDays: Set<string>; hours: number; wage: number; hasMonthlySalary: boolean; monthlySalary: number }>()
    
    shifts.forEach(shift => {
      const employee = employees.find(e => e.name === shift.employee_name)
      const hasMonthlySalary = employee?.employment_type === 'รายเดือน'
      const monthlySalary = employee?.monthly_salary || 0
      
      const existing = employeeMap.get(shift.employee_name) || { days: new Set(), leaveDays: new Set(), hours: 0, wage: 0, hasMonthlySalary: false, monthlySalary: 0 }
      
      // Track leave days separately
      if (shift.notes === 'ลา') {
        existing.leaveDays.add(shift.work_date)
      } else {
        existing.days.add(shift.work_date)
        existing.hours += shift.total_hours
        existing.wage += shift.total_wage
      }
      
      existing.hasMonthlySalary = hasMonthlySalary || existing.hasMonthlySalary
      existing.monthlySalary = monthlySalary || existing.monthlySalary
      employeeMap.set(shift.employee_name, existing)
    })
    
    return Array.from(employeeMap.entries()).map(([name, data]) => ({
      employee_name: name,
      total_days: data.days.size,
      total_leave_days: data.leaveDays.size,
      total_hours: data.hours,
      // For employees with monthly salary: monthly salary + shift wages
      // For hourly workers: just sum of wages from shifts
      total_wage: data.hasMonthlySalary ? data.monthlySalary + data.wage : data.wage
    }))
  }, [shifts, employees])

  // Leave summary by employee
  const leaveSummary = useMemo(() => {
    const leaveMap = new Map<string, { dates: string[]; months: Set<string>; currentYearDates: string[] }>()
    const currentYear = listViewMonth.getFullYear() // Use the year from the view selector
    
    shifts
      .filter(shift => shift.notes === 'ลา')
      .forEach(shift => {
        const existing = leaveMap.get(shift.employee_name) || { dates: [], months: new Set(), currentYearDates: [] }
        existing.dates.push(shift.work_date)
        const month = shift.work_date.substring(0, 7) // YYYY-MM
        existing.months.add(month)
        
        // Track current year leaves (based on selected view year)
        const shiftYear = parseInt(shift.work_date.split('-')[0])
        if (shiftYear === currentYear) {
          existing.currentYearDates.push(shift.work_date)
        }
        
        leaveMap.set(shift.employee_name, existing)
      })
    
    return Array.from(leaveMap.entries()).map(([name, data]) => ({
      employee_name: name,
      total_leave_days: data.dates.length,
      current_year_leave_days: data.currentYearDates.length,
      months_count: data.months.size,
      dates: data.dates
    }))
  }, [shifts, listViewMonth])

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
    let totalWage = 0
    
    const date = new Date(formData.work_date)
    const dayOfWeek = date.getDay() // 0 = Sunday
    const isSunday = dayOfWeek === 0
    
    if (formData.position === 'ผู้จัดการ') {
      // Sunday special rate: 9:00-20:30 = 800 Baht
      if (isSunday && formData.start_time === '09:00' && formData.end_time === '20:30') {
        totalWage = SUNDAY_MANAGER_RATE
      } 
      // Regular shift 09:00-20:30 = 250 Baht (Mon-Sat)
      else if (formData.start_time === '09:00' && formData.end_time === '20:30') {
        totalWage = OT_RATE
      }
      // OT shift: 18:00-20:30 = 250 Baht
      else if (formData.start_time === '18:00' && formData.end_time === '20:30') {
        totalWage = OT_RATE
      }
      // Other shifts: 0 Baht
      else {
        totalWage = 0
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
      await fetchShifts()
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

  const closeLeaveModal = () => {
    setShowLeaveModal(false)
    setLeaveFormData({
      employee_name: '',
      work_date: new Date().toISOString().split('T')[0],
      notes: 'ลา'
    })
  }

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const { error } = await supabase.from('work_shifts').insert({
        employee_name: leaveFormData.employee_name,
        position: 'ผู้จัดการ',
        work_date: leaveFormData.work_date,
        start_time: '00:00',
        end_time: '00:00',
        hourly_wage: 0,
        total_hours: 0,
        total_wage: 0,
        notes: 'ลา'
      })
      
      if (error) throw error
      
      alert(`บันทึกการลาสำหรับ ${leaveFormData.employee_name} วันที่ ${new Date(leaveFormData.work_date).toLocaleDateString('th-TH')} เรียบร้อย`)
      closeLeaveModal()
      await fetchShifts()
    } catch (error) {
      console.error('Error saving leave:', error)
      alert('ไม่สามารถบันทึกการลาได้')
    }
  }

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
          key={`calendar-day-${dateStr}`}
          data-date={dateStr}
          data-day={day}
          onClick={() => handleDateClick(dateStr)}
          className={`relative h-24 border border-gray-200 p-2 cursor-pointer transition-all hover:bg-[#F5F0E6] z-10 ${
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
                className={`text-xs truncate px-1 py-0.5 rounded cursor-pointer ${
                  shift.notes === 'ลา' 
                    ? 'text-[#E65100] bg-[#FFF3E0] border border-[#FFCC80]' 
                    : 'text-[#5C4A32] bg-[#F5F0E8] hover:bg-[#E8E0D5]'
                }`}
                onClick={(e) => {
                  e.stopPropagation()
                  handleEdit(shift)
                }}
              >
                {shift.notes === 'ลา' ? '🏖️ ' : ''}{shift.employee_name}
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
    <div className="mb-20">
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
            <button
              onClick={() => setViewMode('leave')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1 ${
                viewMode === 'leave' ? 'bg-[#FF9800] text-white shadow-sm' : 'text-gray-600'
              }`}
            >
              <span>🏖️</span>
              การลา
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
          <button
            onClick={() => {
              setShowLeaveModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-[#FF9800] bg-white text-[#FF9800] text-sm whitespace-nowrap hover:bg-[#FF9800]/10 transition-all shadow-sm"
          >
            <span className="text-lg">🏖️</span>
            ลา
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
        <Card className="border-[#E8E0D5] overflow-auto p-0 mb-20">
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
          <div className="p-4 pb-20">
            {/* Day Names */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map((day) => (
                <div key={day} className="text-center text-sm font-medium text-[#8B7355] py-2">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1 auto-rows-fr mb-6">
              {renderCalendar()}
            </div>
            {/* Spacer to ensure last row is clickable */}
            <div className="h-32" />
          </div>
        </Card>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <Card className="border-[#E8E0D5]">
          {/* Month/Year Selector */}
          <div className="p-4 border-b border-[#E8E0D5] bg-[#FAF8F5]">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#5C4A32]">รายการกะงาน</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setListViewMonth(new Date(listViewMonth.getFullYear(), listViewMonth.getMonth() - 1))}
                  className="p-2 hover:bg-[#E8E0D5] rounded-lg transition-colors"
                >
                  <ChevronLeft className="h-5 w-5 text-[#5C4A32]" />
                </button>
                <span className="text-base font-medium text-[#5C4A32] min-w-[140px] text-center">
                  {listViewMonth.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  onClick={() => setListViewMonth(new Date(listViewMonth.getFullYear(), listViewMonth.getMonth() + 1))}
                  className="p-2 hover:bg-[#E8E0D5] rounded-lg transition-colors"
                >
                  <ChevronRight className="h-5 w-5 text-[#5C4A32]" />
                </button>
              </div>
            </div>
          </div>
          <div className="divide-y divide-[#E8E0D5]">
            {(() => {
              // Filter shifts by selected month
              const filteredShifts = shifts.filter(shift => {
                const shiftDate = new Date(shift.work_date)
                return shiftDate.getMonth() === listViewMonth.getMonth() && 
                       shiftDate.getFullYear() === listViewMonth.getFullYear()
              })
              
              if (filteredShifts.length === 0) {
                return (
                  <div className="p-8 text-center">
                    <Calendar className="h-12 w-12 text-[#D4C9B8] mx-auto mb-3" />
                    <p className="text-[#8B7355]">ไม่มีรายการกะงานในเดือนนี้</p>
                    <p className="text-sm text-[#A67B52] mt-1">คลิก "เพิ่มกะงาน" เพื่อเริ่มต้น</p>
                  </div>
                )
              }
              
              return filteredShifts.map((shift) => (
                <div key={shift.id} className={`p-4 flex items-center justify-between hover:bg-[#FAF8F5] ${shift.notes === 'ลา' ? 'bg-[#FFF3E0]' : ''}`}>
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${shift.notes === 'ลา' ? 'bg-[#FFCC80]' : 'bg-[#F5F0E8]'}`}>
                      {shift.notes === 'ลา' ? (
                        <span className="text-xl">🏖️</span>
                      ) : (
                        <UserPlus className="h-5 w-5 text-[#A67B5B]" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-[#5C4A32]">{shift.employee_name}</p>
                      <p className="text-sm text-[#8B7355]">
                        {new Date(shift.work_date).toLocaleDateString('th-TH')} 
                        {shift.notes !== 'ลา' && `• ${shift.start_time} - ${shift.end_time}`}
                      </p>
                      {shift.notes && (
                        <p className={`text-xs mt-1 ${shift.notes === 'ลา' ? 'text-[#E65100] font-medium' : 'text-[#A67B52]'}`}>
                          {shift.notes === 'ลา' ? '🏖️ ลา' : shift.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      {shift.notes === 'ลา' ? (
                        <p className="text-sm font-medium text-[#E65100]">ลา 1 วัน</p>
                      ) : (
                        <>
                          <p className="font-medium text-[#5C4A32]">{shift.total_hours.toFixed(1)} ชม.</p>
                          <p className="text-sm font-bold text-[#2E7D32]">฿{shift.total_wage.toLocaleString()}</p>
                        </>
                      )}
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
            })()}
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

      {/* Leave Report View */}
      {viewMode === 'leave' && (
        <>
          {/* Leave Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            <Card className="bg-[#F5F0E8] border-[#E8E0D5]">
              <div className="p-4 text-center">
                <span className="text-3xl">🏖️</span>
                <p className="text-xs text-[#8B7355] mt-2">รายการลาทั้งหมด</p>
                <p className="text-2xl font-bold text-[#A67B5B]">
                  {shifts.filter(s => s.notes === 'ลา').length} รายการ
                </p>
              </div>
            </Card>
            <Card className="bg-[#FAF8F5] border-[#E8E0D5]">
              <div className="p-4 text-center">
                <span className="text-3xl">👥</span>
                <p className="text-xs text-[#8B7355] mt-2">พนักงานที่ลา</p>
                <p className="text-2xl font-bold text-[#A67B5B]">
                  {leaveSummary.length} คน
                </p>
              </div>
            </Card>
            <Card className="bg-[#F5F0E8] border-[#D4C9B8]">
              <div className="p-4 text-center">
                <span className="text-3xl">📅</span>
                <p className="text-xs text-[#8B7355] mt-2">เดือนที่มีการลา</p>
                <p className="text-2xl font-bold text-[#A67B5B]">
                  {new Set(shifts.filter(s => s.notes === 'ลา').map(s => s.work_date.substring(0, 7))).size} เดือน
                </p>
              </div>
            </Card>
          </div>

          {/* Leave Summary by Employee */}
          <Card className="border-[#E8E0D5] mb-6">
            <div className="p-4 border-b border-[#E8E0D5] bg-[#F5F0E8]">
              <h2 className="text-base font-bold text-[#A67B5B]">🏖️ สรุปการลาแยกตามพนักงาน</h2>
            </div>
            <div className="divide-y divide-[#E8E0D5]">
              {leaveSummary.length === 0 ? (
                <div className="p-8 text-center">
                  <span className="text-4xl">🏖️</span>
                  <p className="text-[#8B7355] mt-2">ไม่มีรายการลา</p>
                </div>
              ) : (
                leaveSummary.map((emp) => (
                  <div key={emp.employee_name} className="p-4 flex items-center justify-between hover:bg-[#FAF8F5]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#E8E0D5] rounded-lg">
                        <span className="text-xl">🏖️</span>
                      </div>
                      <div>
                        <span className="font-medium text-[#5C4A32]">{emp.employee_name}</span>
                        <p className="text-xs text-[#8B7355]">
                          ลาสะสมปีนี้ {emp.current_year_leave_days} วัน
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-[#A67B5B]">{emp.total_leave_days}</span>
                      <span className="text-sm text-[#8B7355] ml-1">วัน</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Monthly Leave Statistics */}
          <Card className="border-[#E8E0D5]">
            <div className="p-4 border-b border-[#E8E0D5] bg-[#F5F0E8]">
              <h2 className="text-base font-bold text-[#A67B5B]">📊 สถิติการลารายเดือน/รายปี</h2>
            </div>
            <div className="p-4">
              {(() => {
                // Group leaves by month
                const monthlyLeaves = new Map<string, number>()
                shifts
                  .filter(s => s.notes === 'ลา')
                  .forEach(s => {
                    const month = s.work_date.substring(0, 7) // YYYY-MM
                    monthlyLeaves.set(month, (monthlyLeaves.get(month) || 0) + 1)
                  })
                
                // Get current year or use the year from data
                const currentYear = new Date().getFullYear()
                const years = new Set<number>()
                monthlyLeaves.forEach((_, month) => {
                  years.add(parseInt(month.split('-')[0]))
                })
                
                // If no data, show current year only
                const yearsToShow = years.size > 0 ? Array.from(years).sort((a, b) => b - a) : [currentYear]
                
                return yearsToShow.map(year => {
                  // Generate all 12 months for this year
                  const months = []
                  for (let m = 1; m <= 12; m++) {
                    const monthKey = `${year}-${String(m).padStart(2, '0')}`
                    const count = monthlyLeaves.get(monthKey) || 0
                    const monthName = new Date(year, m - 1).toLocaleDateString('th-TH', { month: 'long' })
                    
                    months.push(
                      <div key={monthKey} className="flex items-center justify-between py-2 border-b border-[#E8E0D5] last:border-0">
                        <span className="text-[#5C4A32]">{monthName} {year + 543}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-[#E8E0D5] rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${count > 0 ? 'bg-[#A67B5B]' : 'bg-[#D4C9B8]'}`}
                              style={{ width: `${Math.min((count / 30) * 100, 100)}%` }}
                            />
                          </div>
                          <span className={`text-sm font-medium min-w-[60px] text-right ${count > 0 ? 'text-[#A67B5B]' : 'text-[#D4C9B8]'}`}>
                            {count} วัน
                          </span>
                        </div>
                      </div>
                    )
                  }
                  
                  return (
                    <div key={year} className="mb-4 last:mb-0">
                      {months}
                    </div>
                  )
                })
              })()}
            </div>
          </Card>
        </>
      )}
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
                <label className="block text-sm font-medium text-[#5C4A32] mb-1">ชื่อพนักงาน</label>
                <select
                  value={formData.employee_name}
                  onChange={(e) => {
                    const selectedEmployee = employees.find(emp => emp.name === e.target.value)
                    if (selectedEmployee) {
                      const position = selectedEmployee.position as ShiftFormData['position']
                      let newFormData = { 
                        ...formData, 
                        employee_name: e.target.value,
                        position: position
                      }
                      
                      // Set defaults based on position
                      if (position === 'เภสัชกร') {
                        // Check if selected date is weekend (Saturday=6, Sunday=0)
                        const selectedDate = newFormData.work_date
                        const dayOfWeek = new Date(selectedDate).getDay()
                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
                        
                        newFormData = {
                          ...newFormData,
                          start_time: isWeekend ? PHARMACIST_DEFAULTS.weekend.start_time : PHARMACIST_DEFAULTS.weekday.start_time,
                          end_time: isWeekend ? PHARMACIST_DEFAULTS.weekend.end_time : PHARMACIST_DEFAULTS.weekday.end_time,
                          hourly_wage: PHARMACIST_DEFAULTS.hourly_wage
                        }
                      } else if (position === 'ผู้จัดการ') {
                        newFormData = {
                          ...newFormData,
                          start_time: MANAGER_DEFAULTS.start_time,
                          end_time: MANAGER_DEFAULTS.end_time,
                          hourly_wage: MANAGER_DEFAULTS.monthly_salary / 30 / 9
                        }
                      } else if (position === 'พนักงานประจำ') {
                        newFormData = {
                          ...newFormData,
                          start_time: FULLTIME_DEFAULTS.start_time,
                          end_time: FULLTIME_DEFAULTS.end_time,
                          hourly_wage: FULLTIME_DEFAULTS.hourly_wage
                        }
                      } else if (position === 'พนักงานพาร์ทไทม์') {
                        newFormData = {
                          ...newFormData,
                          hourly_wage: PARTTIME_DEFAULTS.hourly_wage
                        }
                      }
                      
                      setFormData(newFormData)
                    } else {
                      setFormData({ ...formData, employee_name: e.target.value, position: '' })
                    }
                  }}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-[#5C4A32] focus:outline-none focus:ring-2 focus:ring-[#A67B5B] focus:border-transparent"
                  required
                >
                  <option value="">เลือกพนักงาน</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.name}>
                      {employee.name} ({employee.position})
                    </option>
                  ))}
                </select>
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
              
              {/* Hourly wage - only for non-manager positions */}
              {formData.position !== 'ผู้จัดการ' && (
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
              )}
              
              {/* Preview calculation */}
              <div className="bg-[#FAF8F5] rounded-lg p-3 border border-[#E8E0D5]">
                {(() => {
                  const hours = calculateShiftHours(formData.start_time, formData.end_time)
                  
                  // Manager shifts: special rates
                  if (formData.position === 'ผู้จัดการ') {
                    const date = new Date(formData.work_date)
                    const isSunday = date.getDay() === 0
                    
                    // Sunday special: 9:00-20:30 = 800 Baht
                    if (isSunday && formData.start_time === '09:00' && formData.end_time === '20:30') {
                      return (
                        <>
                          <p className="text-sm text-[#8B7355]">ชั่วโมง: {hours.toFixed(1)} ชม. (วันอาทิตย์)</p>
                          <p className="text-lg font-bold text-[#2E7D32]">
                            รวม: ฿800 (ค่ากะพิเศษ)
                          </p>
                        </>
                      )
                    }
                    
                    // Regular shift 09:00-20:30 = 250 Baht (Mon-Sat)
                    if (formData.start_time === '09:00' && formData.end_time === '20:30') {
                      return (
                        <>
                          <p className="text-sm text-[#8B7355]">ชั่วโมง: {hours.toFixed(1)} ชม. ({isSunday ? 'วันอาทิตย์' : 'จันทร์-เสาร์'})</p>
                          <p className="text-lg font-bold text-[#2E7D32]">
                            รวม: ฿250 (ค่ากะ)
                          </p>
                        </>
                      )
                    }
                    
                    // OT shift: 18:00-20:30 = 250 Baht
                    if (formData.start_time === '18:00' && formData.end_time === '20:30') {
                      return (
                        <>
                          <p className="text-sm text-[#8B7355]">ชั่วโมง: {hours.toFixed(1)} ชม. (OT)</p>
                          <p className="text-lg font-bold text-[#2E7D32]">
                            รวม: ฿250 (ค่ากะ OT)
                          </p>
                        </>
                      )
                    }
                    
                    // Other manager shifts: 0 Baht
                    return (
                      <>
                        <p className="text-sm text-[#8B7355]">ชั่วโมง: {hours.toFixed(1)} ชม.</p>
                        <p className="text-lg font-bold text-[#2E7D32]">
                          รวม: ฿0 (ไม่มีค่ากะ)
                        </p>
                      </>
                    )
                  }
                  
                  // Other positions: hourly calculation
                  return (
                    <>
                      <p className="text-sm text-[#8B7355]">ชั่วโมง: {hours.toFixed(1)} ชม.</p>
                      <p className="text-lg font-bold text-[#2E7D32]">
                        รวม: ฿{(hours * formData.hourly_wage).toLocaleString()}
                      </p>
                    </>
                  )
                })()}
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
                {editingShift && (
                  <Button 
                    type="button"
                    onClick={() => {
                      if (confirm('ต้องการลบกะงานนี้ใช่หรือไม่?')) {
                        handleDelete(editingShift.id)
                        closeModal()
                      }
                    }}
                    className="flex-1 bg-white border-2 border-red-500 !text-red-600 hover:bg-red-50"
                  >
                    ลบ
                  </Button>
                )}
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

      {/* Leave Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[#E8E0D5]">
              <h3 className="text-lg font-bold text-[#5C4A32]">
                🏖️ บันทึกการลา
              </h3>
              <button
                onClick={closeLeaveModal}
                className="p-2 hover:bg-[#F5F0E8] rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-[#8B7355]" />
              </button>
            </div>
            
            <form onSubmit={handleLeaveSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#5C4A32] mb-1">ชื่อพนักงาน</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A67B5B] bg-white"
                  value={leaveFormData.employee_name}
                  onChange={(e) => setLeaveFormData({ ...leaveFormData, employee_name: e.target.value })}
                  required
                >
                  <option value="">เลือกพนักงาน</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.name}>
                      {emp.name} ({emp.position})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#5C4A32] mb-1">วันที่ลา</label>
                <Input
                  type="date"
                  value={leaveFormData.work_date}
                  onChange={(e) => setLeaveFormData({ ...leaveFormData, work_date: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#5C4A32] mb-1">หมายเหตุ</label>
                <Input
                  value={leaveFormData.notes}
                  onChange={(e) => setLeaveFormData({ ...leaveFormData, notes: e.target.value })}
                  placeholder="เช่น ลาป่วย, ลากิจ, ลาพักร้อน"
                />
              </div>
              
              <div className="bg-[#FFF3E0] rounded-lg p-3 border border-[#FFCC80]">
                <p className="text-sm text-[#E65100]">
                  💡 การลาจะถูกบันทึกโดยไม่คิดค่าแรง (0 บาท) และไม่ถูกหักเงิน
                </p>
              </div>
              
              <div className="flex gap-3 pt-2">
                <Button 
                  type="button" 
                  onClick={closeLeaveModal} 
                  className="flex-1 bg-white border-2 border-gray-300 !text-black hover:bg-gray-50"
                >
                  ยกเลิก
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-[#FF9800] border-2 border-[#FF9800] !text-white hover:bg-[#F57C00]"
                >
                  บันทึกการลา
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
