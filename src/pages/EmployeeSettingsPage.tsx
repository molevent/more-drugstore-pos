import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import { 
  UserCog, 
  Plus, 
  Trash2, 
  Edit2, 
  X,
  Users,
  Wallet,
  Briefcase
} from 'lucide-react'

interface Employee {
  id: string
  name: string
  position: 'ผู้จัดการ' | 'เภสัชกร' | 'พนักงานพาร์ทไทม์'
  hourly_wage: number
  monthly_salary: number | null
  employment_type: 'รายชั่วโมง' | 'รายเดือน'
  phone?: string
  email?: string
  start_date?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface EmployeeFormData {
  name: string
  position: 'ผู้จัดการ' | 'เภสัชกร' | 'พนักงานพาร์ทไทม์'
  hourly_wage: number
  monthly_salary: number
  employment_type: 'รายชั่วโมง' | 'รายเดือน'
  phone: string
  email: string
  start_date: string
}

const DEFAULT_EMPLOYEE: EmployeeFormData = {
  name: '',
  position: 'พนักงานพาร์ทไทม์',
  hourly_wage: 40,
  monthly_salary: 0,
  employment_type: 'รายชั่วโมง',
  phone: '',
  email: '',
  start_date: new Date().toISOString().split('T')[0]
}

const POSITIONS = [
  { value: 'เภสัชกร', label: 'เภสัชกร' },
  { value: 'ผู้จัดการ', label: 'ผู้จัดการ' },
  { value: 'พนักงานพาร์ทไทม์', label: 'พนักงานพาร์ทไทม์' }
] as const

const EMPLOYMENT_TYPES = [
  { value: 'รายชั่วโมง', label: 'รายชั่วโมง' },
  { value: 'รายเดือน', label: 'รายเดือน' }
] as const

export default function EmployeeSettingsPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [formData, setFormData] = useState<EmployeeFormData>(DEFAULT_EMPLOYEE)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      setEmployees(data || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const employeeData = {
        ...formData,
        monthly_salary: formData.employment_type === 'รายเดือน' ? formData.monthly_salary : null
      }
      
      if (editingEmployee) {
        const { error } = await supabase
          .from('employees')
          .update(employeeData)
          .eq('id', editingEmployee.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('employees').insert(employeeData)
        if (error) throw error
      }
      
      setShowModal(false)
      setEditingEmployee(null)
      setFormData(DEFAULT_EMPLOYEE)
      fetchEmployees()
    } catch (error) {
      console.error('Error saving employee:', error)
      alert('ไม่สามารถบันทึกข้อมูลพนักงานได้')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee)
    setFormData({
      name: employee.name,
      position: employee.position,
      hourly_wage: employee.hourly_wage,
      monthly_salary: employee.monthly_salary || 0,
      employment_type: employee.employment_type,
      phone: employee.phone || '',
      email: employee.email || '',
      start_date: employee.start_date || new Date().toISOString().split('T')[0]
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('ต้องการลบพนักงานนี้?')) return
    
    try {
      const { error } = await supabase
        .from('employees')
        .update({ is_active: false })
        .eq('id', id)
      if (error) throw error
      fetchEmployees()
    } catch (error) {
      console.error('Error deleting employee:', error)
      alert('ไม่สามารถลบพนักงานได้')
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingEmployee(null)
    setFormData(DEFAULT_EMPLOYEE)
  }

  // Calculate default wage based on position
  const getDefaultWage = (position: string) => {
    switch (position) {
      case 'เภสัชกร':
        return 150
      case 'ผู้จัดการ':
        return 80
      case 'พนักงานพาร์ทไทม์':
      default:
        return 40
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <UserCog className="h-8 w-8 text-[#A67B5B] mt-1" />
          <div>
            <h1 className="text-2xl font-bold text-[#5C4A32]">จัดการพนักงาน</h1>
            <p className="text-[#8B7355]">ตั้งค่าเงินเดือนและค่าจ้างพนักงาน</p>
          </div>
        </div>
        <button
          onClick={() => {
            setFormData(DEFAULT_EMPLOYEE)
            setShowModal(true)
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-[#A67B5B] bg-white text-[#A67B5B] text-sm whitespace-nowrap hover:bg-[#A67B5B]/10 transition-all shadow-sm"
        >
          <Plus className="h-4 w-4" />
          เพิ่มพนักงาน
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <Card className="bg-[#F5F0E8] border-[#D4C9B8]">
          <div className="p-4 text-center">
            <Users className="h-6 w-6 text-[#A67B5B] mx-auto mb-2" />
            <p className="text-xs text-[#8B7355]">พนักงานทั้งหมด</p>
            <p className="text-2xl font-bold text-[#5C4A32]">{employees.length} คน</p>
          </div>
        </Card>
        <Card className="bg-[#FAF6F0] border-[#D4C9B8]">
          <div className="p-4 text-center">
            <Briefcase className="h-6 w-6 text-[#A67B5B] mx-auto mb-2" />
            <p className="text-xs text-[#8B7355]">รายชั่วโมง</p>
            <p className="text-2xl font-bold text-[#5C4A32]">
              {employees.filter(e => e.employment_type === 'รายชั่วโมง').length} คน
            </p>
          </div>
        </Card>
        <Card className="bg-[#E8F5E9] border-[#C8E6C9]">
          <div className="p-4 text-center">
            <Wallet className="h-6 w-6 text-[#4CAF50] mx-auto mb-2" />
            <p className="text-xs text-[#4CAF50]">รายเดือน</p>
            <p className="text-2xl font-bold text-[#2E7D32]">
              {employees.filter(e => e.employment_type === 'รายเดือน').length} คน
            </p>
          </div>
        </Card>
      </div>

      {/* Employee List */}
      <Card className="border-[#E8E0D5]">
        <div className="p-4 border-b border-[#E8E0D5] bg-[#FAF8F5]">
          <h2 className="text-base font-bold text-[#5C4A32]">รายชื่อพนักงาน</h2>
        </div>
        <div className="divide-y divide-[#E8E0D5]">
          {employees.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="h-12 w-12 text-[#D4C9B8] mx-auto mb-3" />
              <p className="text-[#8B7355]">ไม่มีพนักงาน</p>
              <p className="text-sm text-[#A67B52] mt-1">คลิก "เพิ่มพนักงาน" เพื่อเริ่มต้น</p>
            </div>
          ) : (
            employees.map((employee) => (
              <div key={employee.id} className="p-4 flex items-center justify-between hover:bg-[#FAF8F5]">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-[#F5F0E8] rounded-lg">
                    <UserCog className="h-5 w-5 text-[#A67B5B]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#5C4A32]">{employee.name}</p>
                    <div className="flex gap-2 text-sm text-[#8B7355]">
                      <span>{employee.position}</span>
                      <span>•</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                        employee.employment_type === 'รายชั่วโมง' 
                          ? 'bg-[#F5F0E8] text-[#A67B5B]' 
                          : 'bg-[#E8F5E9] text-[#2E7D32]'
                      }`}>
                        {employee.employment_type}
                      </span>
                    </div>
                    <p className="text-sm text-[#A67B5B] mt-0.5">
                      {employee.employment_type === 'รายชั่วโมง' 
                        ? `฿${employee.hourly_wage}/ชม.` 
                        : `฿${employee.monthly_salary?.toLocaleString()}/เดือน`
                      }
                    </p>
                    {employee.phone && (
                      <p className="text-xs text-[#8B7355]">โทร: {employee.phone}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(employee)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(employee.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[#E8E0D5]">
              <h3 className="text-lg font-bold text-[#5C4A32]">
                {editingEmployee ? 'แก้ไขพนักงาน' : 'เพิ่มพนักงาน'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#5C4A32] mb-1">ชื่อพนักงาน</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ชื่อ-นามสกุล"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5C4A32] mb-1">ตำแหน่ง</label>
                <select
                  value={formData.position}
                  onChange={(e) => {
                    const newPosition = e.target.value as EmployeeFormData['position']
                    const defaultWage = getDefaultWage(newPosition)
                    setFormData({ 
                      ...formData, 
                      position: newPosition,
                      hourly_wage: defaultWage
                    })
                  }}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#A67B5B] focus:ring-[#A67B5B]"
                  required
                >
                  {POSITIONS.map((pos) => (
                    <option key={pos.value} value={pos.value}>{pos.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5C4A32] mb-1">ประเภทการจ้าง</label>
                <select
                  value={formData.employment_type}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    employment_type: e.target.value as EmployeeFormData['employment_type'] 
                  })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#A67B5B] focus:ring-[#A67B5B]"
                  required
                >
                  {EMPLOYMENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              {formData.employment_type === 'รายชั่วโมง' ? (
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
              ) : (
                <div>
                  <label className="block text-sm font-medium text-[#5C4A32] mb-1">เงินเดือน/เดือน (บาท)</label>
                  <Input
                    type="number"
                    value={formData.monthly_salary}
                    onChange={(e) => setFormData({ ...formData, monthly_salary: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="100"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[#5C4A32] mb-1">เบอร์โทร</label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0xx-xxx-xxxx"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5C4A32] mb-1">อีเมล</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5C4A32] mb-1">วันเริ่มงาน</label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
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
                  disabled={loading}
                  className="flex-1 bg-white border-2 border-[#A67B5B] !text-black hover:bg-[#F5F0E6]"
                >
                  {loading ? 'กำลังบันทึก...' : (editingEmployee ? 'บันทึก' : 'เพิ่ม')}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
