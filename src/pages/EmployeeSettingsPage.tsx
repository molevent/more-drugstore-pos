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
  Users
} from 'lucide-react'

interface Employee {
  id: string
  // Basic Info
  employee_code?: string
  first_name: string
  last_name?: string
  nickname?: string
  first_name_en?: string
  last_name_en?: string
  nickname_en?: string
  id_card_number?: string
  passport_number?: string
  birth_date?: string
  
  // Employment Info
  department?: 'การตลาด' | 'การขาย' | 'การเงิน' | 'บัญชี' | 'คลังสินค้า' | 'จัดซื้อ' | 'บุคคล' | 'ทั่วไป'
  position: 'ผู้จัดการ' | 'เภสัชกร' | 'พนักงานขาย' | 'พนักงานคลัง' | 'พนักงานบัญชี' | 'พนักงานทั่วไป'
  employment_type: 'รายวัน' | 'รายเดือน'
  start_date?: string
  
  // Contact Info
  phone?: string
  email?: string
  line_id?: string
  address?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  
  // Salary Info
  daily_wage?: number
  monthly_salary?: number
  social_security?: boolean
  tax_condition?: 'หัก ณ ที่จ่าย (1%)' | 'หัก ณ ที่จ่าย (3%)' | 'หัก ณ ที่จ่าย (5%)' | 'ไม่หัก'
  
  // Bank Info
  payment_method?: 'เงินสด' | 'โอนเงิน' | 'เช็ค'
  bank?: string
  bank_account_number?: string
  bank_account_type?: 'ออมทรัพย์' | 'กระแสรายวัน'
  bank_branch?: string
  
  // Status
  is_active: boolean
  notes?: string
  created_at: string
  updated_at: string
}

interface EmployeeFormData {
  employee_code: string
  first_name: string
  last_name: string
  nickname: string
  first_name_en: string
  last_name_en: string
  nickname_en: string
  id_card_number: string
  passport_number: string
  birth_date: string
  department: 'การตลาด' | 'การขาย' | 'การเงิน' | 'บัญชี' | 'คลังสินค้า' | 'จัดซื้อ' | 'บุคคล' | 'ทั่วไป' | ''
  position: 'ผู้จัดการ' | 'เภสัชกร' | 'พนักงานขาย' | 'พนักงานคลัง' | 'พนักงานบัญชี' | 'พนักงานทั่วไป'
  employment_type: 'รายวัน' | 'รายเดือน'
  start_date: string
  phone: string
  email: string
  line_id: string
  address: string
  emergency_contact_name: string
  emergency_contact_phone: string
  daily_wage: number
  monthly_salary: number
  social_security: boolean
  tax_condition: 'หัก ณ ที่จ่าย (1%)' | 'หัก ณ ที่จ่าย (3%)' | 'หัก ณ ที่จ่าย (5%)' | 'ไม่หัก'
  payment_method: 'เงินสด' | 'โอนเงิน' | 'เช็ค' | ''
  bank: string
  bank_account_number: string
  bank_account_type: 'ออมทรัพย์' | 'กระแสรายวัน' | ''
  bank_branch: string
  notes: string
}

const DEFAULT_EMPLOYEE: EmployeeFormData = {
  employee_code: '',
  first_name: '',
  last_name: '',
  nickname: '',
  first_name_en: '',
  last_name_en: '',
  nickname_en: '',
  id_card_number: '',
  passport_number: '',
  birth_date: '',
  department: '',
  position: 'พนักงานทั่วไป',
  employment_type: 'รายวัน',
  start_date: new Date().toISOString().split('T')[0],
  phone: '',
  email: '',
  line_id: '',
  address: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  daily_wage: 0,
  monthly_salary: 0,
  social_security: false,
  tax_condition: 'ไม่หัก',
  payment_method: '',
  bank: '',
  bank_account_number: '',
  bank_account_type: '',
  bank_branch: '',
  notes: ''
}

const POSITIONS = [
  { value: 'ผู้จัดการ', label: 'ผู้จัดการ' },
  { value: 'เภสัชกร', label: 'เภสัชกร' },
  { value: 'พนักงานขาย', label: 'พนักงานขาย' },
  { value: 'พนักงานคลัง', label: 'พนักงานคลัง' },
  { value: 'พนักงานบัญชี', label: 'พนักงานบัญชี' },
  { value: 'พนักงานทั่วไป', label: 'พนักงานทั่วไป' }
] as const

const EMPLOYMENT_TYPES = [
  { value: 'รายวัน', label: 'รายวัน' },
  { value: 'รายเดือน', label: 'รายเดือน' }
] as const

const DEPARTMENTS = [
  { value: 'การตลาด', label: 'การตลาด' },
  { value: 'การขาย', label: 'การขาย' },
  { value: 'การเงิน', label: 'การเงิน' },
  { value: 'บัญชี', label: 'บัญชี' },
  { value: 'คลังสินค้า', label: 'คลังสินค้า' },
  { value: 'จัดซื้อ', label: 'จัดซื้อ' },
  { value: 'บุคคล', label: 'บุคคล' },
  { value: 'ทั่วไป', label: 'ทั่วไป' }
] as const

const TAX_CONDITIONS = [
  { value: 'ไม่หัก', label: 'ไม่หัก' },
  { value: 'หัก ณ ที่จ่าย (1%)', label: 'หัก ณ ที่จ่าย (1%)' },
  { value: 'หัก ณ ที่จ่าย (3%)', label: 'หัก ณ ที่จ่าย (3%)' },
  { value: 'หัก ณ ที่จ่าย (5%)', label: 'หัก ณ ที่จ่าย (5%)' }
] as const

const PAYMENT_METHODS = [
  { value: 'เงินสด', label: 'เงินสด' },
  { value: 'โอนเงิน', label: 'โอนเงิน' },
  { value: 'เช็ค', label: 'เช็ค' }
] as const

const BANKS = [
  { value: 'กรุงเทพ', label: 'ธนาคารกรุงเทพ' },
  { value: 'กสิกรไทย', label: 'ธนาคารกสิกรไทย' },
  { value: 'กรุงไทย', label: 'ธนาคารกรุงไทย' },
  { value: 'ทหารไทย', label: 'ธนาคารทหารไทย' },
  { value: 'ไทยพาณิชย์', label: 'ธนาคารไทยพาณิชย์' },
  { value: 'กรุงศรี', label: 'ธนาคารกรุงศรีอยุธยา' },
  { value: 'เกียรตินาคิน', label: 'ธนาคารเกียรตินาคิน' },
  { value: 'ซีไอเอ็มบี', label: 'ธนาคารซีไอเอ็มบี' },
  { value: 'ทิสโก้', label: 'ธนาคารทิสโก้' },
  { value: 'ยูโอบี', label: 'ธนาคารยูโอบี' },
  { value: 'ออมสิน', label: 'ธนาคารออมสิน' },
  { value: 'อาคารสงเคราะห์', label: 'ธนาคารอาคารสงเคราะห์' },
  { value: 'อิสลาม', label: 'ธนาคารอิสลามแห่งประเทศไทย' },
  { value: 'ไทยเครดิต', label: 'ธนาคารไทยเครดิตเพื่อรายย่อย' }
] as const

const ACCOUNT_TYPES = [
  { value: 'ออมทรัพย์', label: 'ออมทรัพย์' },
  { value: 'กระแสรายวัน', label: 'กระแสรายวัน' }
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
      employee_code: employee.employee_code || '',
      first_name: employee.first_name,
      last_name: employee.last_name || '',
      nickname: employee.nickname || '',
      first_name_en: employee.first_name_en || '',
      last_name_en: employee.last_name_en || '',
      nickname_en: employee.nickname_en || '',
      id_card_number: employee.id_card_number || '',
      passport_number: employee.passport_number || '',
      birth_date: employee.birth_date || '',
      department: employee.department || '',
      position: employee.position,
      employment_type: employee.employment_type,
      start_date: employee.start_date || new Date().toISOString().split('T')[0],
      phone: employee.phone || '',
      email: employee.email || '',
      line_id: employee.line_id || '',
      address: employee.address || '',
      emergency_contact_name: employee.emergency_contact_name || '',
      emergency_contact_phone: employee.emergency_contact_phone || '',
      daily_wage: employee.daily_wage || 0,
      monthly_salary: employee.monthly_salary || 0,
      social_security: employee.social_security || false,
      tax_condition: employee.tax_condition || 'ไม่หัก',
      payment_method: employee.payment_method || '',
      bank: employee.bank || '',
      bank_account_number: employee.bank_account_number || '',
      bank_account_type: employee.bank_account_type || '',
      bank_branch: employee.bank_branch || '',
      notes: employee.notes || ''
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
            <h1 className="text-2xl font-bold text-black">จัดการพนักงาน</h1>
            <p className="text-black">ตั้งค่าเงินเดือนและค่าจ้างพนักงาน</p>
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

      {/* Employee List */}
      <Card className="border-[#E8E0D5]">
        <div className="p-4 border-b border-[#E8E0D5] bg-[#FAF8F5]">
          <h2 className="text-base font-bold text-black">รายชื่อพนักงาน</h2>
        </div>
        <div className="divide-y divide-[#E8E0D5]">
          {employees.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="h-12 w-12 text-[#D4C9B8] mx-auto mb-3" />
              <p className="text-black">ไม่มีพนักงาน</p>
              <p className="text-sm text-black mt-1">คลิก "เพิ่มพนักงาน" เพื่อเริ่มต้น</p>
            </div>
          ) : (
            employees.map((employee) => (
              <div key={employee.id} className="p-4 flex items-center justify-between hover:bg-[#FAF8F5]">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-[#F5F0E8] rounded-lg">
                    <UserCog className="h-5 w-5 text-[#A67B5B]" />
                  </div>
                  <div>
                    <p className="font-medium text-black">{employee.first_name} {employee.last_name}</p>
                    <div className="flex gap-2 text-sm text-black">
                      <span>{employee.position}</span>
                      <span>•</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                        employee.employment_type === 'รายวัน' 
                          ? 'bg-[#F5F0E8] text-[#A67B5B]' 
                          : 'bg-[#E8F5E9] text-[#2E7D32]'
                      }`}>
                        {employee.employment_type}
                      </span>
                    </div>
                    <p className="text-sm text-[#A67B5B] mt-0.5">
                      {employee.employment_type === 'รายวัน' 
                        ? `฿${employee.daily_wage}/วัน` 
                        : `฿${employee.monthly_salary?.toLocaleString()}/เดือน`
                      }
                    </p>
                    {employee.phone && (
                      <p className="text-xs text-black">โทร: {employee.phone}</p>
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
              <h3 className="text-lg font-bold text-black">
                {editingEmployee ? 'แก้ไขพนักงาน' : 'เพิ่มพนักงาน'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* ข้อมูลพนักงานพื้นฐาน */}
              <div className="border-b pb-4 mb-4">
                <h3 className="text-lg font-semibold text-[#4A90A4] mb-3">ข้อมูลพนักงานพื้นฐาน</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">รหัสพนักงาน *</label>
                    <Input
                      type="text"
                      value={formData.employee_code}
                      onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
                      placeholder="EMP001"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">ชื่อพนักงาน *</label>
                    <Input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      placeholder="ชื่อ"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">นามสกุล *</label>
                    <Input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      placeholder="นามสกุล"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">ชื่อเล่น</label>
                    <Input
                      type="text"
                      value={formData.nickname}
                      onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                      placeholder="ชื่อเล่น"
                    />
                  </div>
                </div>
              </div>
              </div>

              {/* ข้อมูลภาษาอังกฤษ */}
              <div className="border-b pb-4 mb-4">
                <h3 className="text-lg font-semibold text-[#4A90A4] mb-3">ชื่อพนักงาน (EN)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">คำนำหน้า (EN)</label>
                    <select
                      value={formData.first_name_en}
                      onChange={(e) => setFormData({ ...formData, first_name_en: e.target.value })}
                      className="w-full border-2 border-[#D5EAE7] rounded-lg px-3 py-2 focus:outline-none focus:border-[#4A90A4] bg-white"
                    >
                      <option value="">-- เลือก --</option>
                      <option value="Mr.">Mr.</option>
                      <option value="Mrs.">Mrs.</option>
                      <option value="Miss">Miss</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">ชื่อ (EN)</label>
                    <Input
                      type="text"
                      value={formData.last_name_en}
                      onChange={(e) => setFormData({ ...formData, last_name_en: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">ชื่อเล่น (EN)</label>
                    <Input
                      type="text"
                      value={formData.nickname_en}
                      onChange={(e) => setFormData({ ...formData, nickname_en: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* ข้อมูลบัตรประจำตัว */}
              <div className="border-b pb-4 mb-4">
                <h3 className="text-lg font-semibold text-[#4A90A4] mb-3">ข้อมูลบัตรประจำตัว</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">เลขบัตรประชาชน *</label>
                    <Input
                      type="text"
                      value={formData.id_card_number}
                      onChange={(e) => setFormData({ ...formData, id_card_number: e.target.value })}
                      placeholder="1-2345-67890-12-3"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">เลขหนังสือเดินทาง</label>
                    <Input
                      type="text"
                      value={formData.passport_number}
                      onChange={(e) => setFormData({ ...formData, passport_number: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* ข้อมูลการติดต่อ */}
              <div className="border-b pb-4 mb-4">
                <h3 className="text-lg font-semibold text-[#4A90A4] mb-3">ข้อมูลการติดต่อ</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">เบอร์มือถือ</label>
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="0xx-xxx-xxxx"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">อีเมล</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Line ID</label>
                    <Input
                      type="text"
                      value={formData.line_id}
                      onChange={(e) => setFormData({ ...formData, line_id: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">ที่อยู่พนักงาน</label>
                    <Input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* ข้อมูลฉุกเฉิน */}
              <div className="border-b pb-4 mb-4">
                <h3 className="text-lg font-semibold text-[#4A90A4] mb-3">ข้อมูลผู้ติดต่อฉุกเฉิน</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">ชื่อผู้ติดต่อฉุกเฉิน</label>
                    <Input
                      type="text"
                      value={formData.emergency_contact_name}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">เบอร์ผู้ติดต่อฉุกเฉิน</label>
                    <Input
                      type="tel"
                      value={formData.emergency_contact_phone}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                      placeholder="0xx-xxx-xxxx"
                    />
                  </div>
                </div>
              </div>

              {/* ข้อมูลการจ้างงาน */}
              <div className="border-b pb-4 mb-4">
                <h3 className="text-lg font-semibold text-[#4A90A4] mb-3">ข้อมูลการจ้างงาน</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">แผนก</label>
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value as any })}
                      className="w-full border-2 border-[#D5EAE7] rounded-lg px-3 py-2 focus:outline-none focus:border-[#4A90A4] bg-white"
                    >
                      <option value="">-- เลือกแผนก --</option>
                      {DEPARTMENTS.map((dept) => (
                        <option key={dept.value} value={dept.value}>{dept.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">ตำแหน่ง *</label>
                    <select
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value as any })}
                      className="w-full border-2 border-[#D5EAE7] rounded-lg px-3 py-2 focus:outline-none focus:border-[#4A90A4] bg-white"
                      required
                    >
                      {POSITIONS.map((pos) => (
                        <option key={pos.value} value={pos.value}>{pos.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">วันเกิด</label>
                    <Input
                      type="date"
                      value={formData.birth_date}
                      onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* ข้อมูลเงินเดือน/ค่าจ้าง */}
              <div className="border-b pb-4 mb-4">
                <h3 className="text-lg font-semibold text-[#4A90A4] mb-3">ข้อมูลเงินเดือน/ค่าจ้าง</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">ประเภทพนักงาน *</label>
                    <select
                      value={formData.employment_type}
                      onChange={(e) => setFormData({ ...formData, employment_type: e.target.value as any })}
                      className="w-full border-2 border-[#D5EAE7] rounded-lg px-3 py-2 focus:outline-none focus:border-[#4A90A4] bg-white"
                      required
                    >
                      {EMPLOYMENT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  {formData.employment_type === 'รายวัน' ? (
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">ค่าจ้าง/วัน (บาท)</label>
                      <Input
                        type="number"
                        value={formData.daily_wage}
                        onChange={(e) => setFormData({ ...formData, daily_wage: parseFloat(e.target.value) || 0 })}
                        min="0"
                        step="10"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">เงินเดือน/เดือน (บาท)</label>
                      <Input
                        type="number"
                        value={formData.monthly_salary}
                        onChange={(e) => setFormData({ ...formData, monthly_salary: parseFloat(e.target.value) || 0 })}
                        min="0"
                        step="100"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">สิทธิประกันสังคม</label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="social_security"
                          checked={formData.social_security === true}
                          onChange={() => setFormData({ ...formData, social_security: true })}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">ขึ้นสิทธิ</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="social_security"
                          checked={formData.social_security === false}
                          onChange={() => setFormData({ ...formData, social_security: false })}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">ไม่ขึ้นสิทธิ</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">เงื่อนไขการหักภาษี</label>
                    <select
                      value={formData.tax_condition}
                      onChange={(e) => setFormData({ ...formData, tax_condition: e.target.value as any })}
                      className="w-full border-2 border-[#D5EAE7] rounded-lg px-3 py-2 focus:outline-none focus:border-[#4A90A4] bg-white"
                    >
                      {TAX_CONDITIONS.map((tax) => (
                        <option key={tax.value} value={tax.value}>{tax.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* ข้อมูลการชำระเงิน */}
              <div className="border-b pb-4 mb-4">
                <h3 className="text-lg font-semibold text-[#4A90A4] mb-3">ข้อมูลการชำระเงิน</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">ช่องทางการรับชำระ</label>
                    <select
                      value={formData.payment_method}
                      onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as any })}
                      className="w-full border-2 border-[#D5EAE7] rounded-lg px-3 py-2 focus:outline-none focus:border-[#4A90A4] bg-white"
                    >
                      <option value="">-- เลือกช่องทาง --</option>
                      {PAYMENT_METHODS.map((method) => (
                        <option key={method.value} value={method.value}>{method.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">ธนาคาร</label>
                    <select
                      value={formData.bank}
                      onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
                      className="w-full border-2 border-[#D5EAE7] rounded-lg px-3 py-2 focus:outline-none focus:border-[#4A90A4] bg-white"
                    >
                      <option value="">-- กรุณาเลือกธนาคาร --</option>
                      {BANKS.map((bank) => (
                        <option key={bank.value} value={bank.value}>{bank.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">เลขที่บัญชี</label>
                    <Input
                      type="text"
                      value={formData.bank_account_number}
                      onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">ประเภทบัญชี</label>
                    <div className="flex gap-4 mt-2">
                      {ACCOUNT_TYPES.map((type) => (
                        <label key={type.value} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="bank_account_type"
                            value={type.value}
                            checked={formData.bank_account_type === type.value}
                            onChange={(e) => setFormData({ ...formData, bank_account_type: e.target.value as any })}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">{type.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">สาขาธนาคาร</label>
                    <Input
                      type="text"
                      value={formData.bank_branch}
                      onChange={(e) => setFormData({ ...formData, bank_branch: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">วันเริ่มงาน</label>
                    <Input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* หมายเหตุ */}
              <div className="border-b pb-4 mb-4">
                <h3 className="text-lg font-semibold text-[#4A90A4] mb-3">ข้อมูลเพิ่มเติม</h3>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">หมายเหตุ</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full border-2 border-[#D5EAE7] rounded-lg px-3 py-2 focus:outline-none focus:border-[#4A90A4]"
                  />
                </div>
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
