import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../services/supabase'
import { User, UserRole } from '../types'
import { 
  Users, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  UserCheck, 
  UserX,
  Activity,
  Shield,
  ArrowLeft
} from 'lucide-react'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import { getRoleDisplayName, getRoleBadgeColor, getRoleDescription, canPerformAction } from '../utils/permissions'
import { ActivityLog, getUserActivityLogs, formatActivityLog } from '../services/activityLogService'

interface UserFormData {
  username: string
  email: string
  full_name: string
  role: UserRole
  password: string
  is_active: boolean
}

export default function UserManagementPage() {
  const navigate = useNavigate()
  const { user: currentUser } = useAuthStore()
  
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userLogs, setUserLogs] = useState<ActivityLog[]>([])
  const [showLogsModal, setShowLogsModal] = useState(false)
  
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    email: '',
    full_name: '',
    role: 'pharmacist',
    password: '',
    is_active: true
  })

  // Check if current user can manage users (owner or admin for backward compatibility)
  const canManageUsers = ['owner', 'admin'].includes(currentUser?.role as string)

  useEffect(() => {
    if (!canManageUsers) {
      navigate('/dashboard')
      return
    }
    fetchUsers()
  }, [canManageUsers, navigate])

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      console.error('Failed to fetch users:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user)
      setFormData({
        username: user.username || '',
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        password: '',
        is_active: user.is_active
      })
    } else {
      setEditingUser(null)
      setFormData({
        username: '',
        email: '',
        full_name: '',
        role: 'pharmacist',
        password: '',
        is_active: true
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingUser(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (editingUser) {
        // Update existing user
        const { error } = await supabase
          .from('users')
          .update({
            username: formData.username,
            email: formData.email,
            full_name: formData.full_name,
            role: formData.role,
            is_active: formData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingUser.id)
        
        if (error) throw error
      } else {
        // Create new user via Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password || '888888',
          options: {
            data: {
              full_name: formData.full_name,
              username: formData.username,
              role: formData.role
            }
          }
        })
        
        if (authError) throw authError
        
        if (authData.user) {
          // Create user profile
          const { error } = await supabase
            .from('users')
            .insert({
              id: authData.user.id,
              username: formData.username,
              email: formData.email,
              full_name: formData.full_name,
              role: formData.role,
              is_active: formData.is_active
            })
          
          if (error) throw error
        }
      }
      
      handleCloseModal()
      fetchUsers()
    } catch (err: any) {
      console.error('Failed to save user:', err)
      alert('เกิดข้อผิดพลาด: ' + err.message)
    }
  }

  const handleToggleActive = async (user: User) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          is_active: !user.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
      
      if (error) throw error
      fetchUsers()
    } catch (err) {
      console.error('Failed to toggle user status:', err)
      alert('เกิดข้อผิดพลาดในการเปลี่ยนสถานะผู้ใช้')
    }
  }

  const handleDelete = async (user: User) => {
    if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบผู้ใช้ ${user.full_name}?`)) {
      return
    }
    
    try {
      // Delete from auth.users will cascade to public.users
      const { error } = await supabase.auth.admin.deleteUser(user.id)
      if (error) throw error
      
      fetchUsers()
    } catch (err) {
      console.error('Failed to delete user:', err)
      alert('เกิดข้อผิดพลาดในการลบผู้ใช้')
    }
  }

  const handleViewLogs = async (user: User) => {
    setSelectedUser(user)
    const logs = await getUserActivityLogs(user.id, 50)
    setUserLogs(logs)
    setShowLogsModal(true)
  }

  const filteredUsers = users.filter(user => 
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Role options for dropdown
  const roleOptions: { value: UserRole; label: string }[] = [
    { value: 'owner', label: 'เจ้าของร้าน' },
    { value: 'manager', label: 'ผู้จัดการร้าน' },
    { value: 'pharmacist', label: 'เภสัชกร' },
    { value: 'part_time', label: 'พนักงานไพรท์ไทม์' },
    { value: 'accountant', label: 'นักบัญชี' }
  ]

  return (
    <div className="min-h-screen bg-[#F5EFE6]">
      {/* Header */}
      <div className="bg-white border-b border-[#E8E0D5] px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/settings')}
              className="p-2 text-[#8B7355] hover:text-[#5C4A32] hover:bg-[#F5EFE6] rounded-full transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-[#5C4A32]">การจัดการผู้ใช้</h1>
              <p className="text-[#8B7355]">จัดการบัญชีผู้ใช้และสิทธิ์การเข้าถึง</p>
            </div>
            <Button
              onClick={() => handleOpenModal()}
              className="bg-[#2E5266] hover:bg-[#1e3a4a]"
            >
              <Plus className="h-4 w-4 mr-2" />
              เพิ่มผู้ใช้
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {roleOptions.map(role => {
            const count = users.filter(u => u.role === role.value).length
            return (
              <Card key={role.value} className="bg-white border-[#E8E0D5]">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getRoleBadgeColor(role.value).split(' ')[0]}`}>
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-[#8B7355]">{role.label}</p>
                    <p className="text-xl font-bold text-[#5C4A32]">{count}</p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        {/* Search */}
        <Card className="mb-6 bg-white border-[#E8E0D5]">
          <div className="flex items-center gap-2 bg-[#F5EFE6] rounded-lg px-4 py-2">
            <Search className="h-5 w-5 text-[#8B7355]" />
            <input
              type="text"
              placeholder="ค้นหาผู้ใช้ (ชื่อ, อีเมล, ชื่อผู้ใช้)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-[#5C4A32] placeholder-[#8B7355]"
            />
          </div>
        </Card>

        {/* Users Table */}
        <Card className="bg-white border-[#E8E0D5]">
          {loading ? (
            <div className="text-center py-8 text-[#8B7355]">กำลังโหลด...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-[#8B7355]">
              <Users className="h-12 w-12 mx-auto mb-4 text-[#C5D5C8]" />
              <p>ไม่พบผู้ใช้</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F5EFE6]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#5C4A32] uppercase">ชื่อผู้ใช้</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#5C4A32] uppercase">อีเมล</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#5C4A32] uppercase">บทบาท</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#5C4A32] uppercase">สถานะ</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#5C4A32] uppercase">สร้างเมื่อ</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-[#5C4A32] uppercase">การดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E0D5]">
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-[#F5EFE6]/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-[#B8D4E3] flex items-center justify-center text-[#2E5266] font-medium text-sm">
                            {user.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-[#5C4A32]">{user.full_name}</p>
                            {user.username && (
                              <p className="text-xs text-[#8B7355]">@{user.username}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#8B7355]">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                          {getRoleDisplayName(user.role)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleActive(user)}
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                            user.is_active 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {user.is_active ? (
                            <><UserCheck className="h-3 w-3" /> ใช้งาน</>
                          ) : (
                            <><UserX className="h-3 w-3" /> ระงับ</>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#8B7355]">
                        {new Date(user.created_at).toLocaleDateString('th-TH')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewLogs(user)}
                            className="p-1.5 text-[#8B7355] hover:text-[#2E5266] hover:bg-[#B8D4E3]/20 rounded-lg transition-colors"
                            title="ดูประวัติ"
                          >
                            <Activity className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenModal(user)}
                            className="p-1.5 text-[#8B7355] hover:text-[#5C4A32] hover:bg-[#C5C9E8]/20 rounded-lg transition-colors"
                            title="แก้ไข"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          {user.id !== currentUser?.id && (
                            <button
                              onClick={() => handleDelete(user)}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="ลบ"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Add/Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#E8E0D5]">
              <h2 className="text-xl font-bold text-[#5C4A32]">
                {editingUser ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#5C4A32] mb-1">ชื่อผู้ใช้ (Username)</label>
                <Input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="เช่น Som, Kai, Ing"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#5C4A32] mb-1">อีเมล</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="user@moredrug.com"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#5C4A32] mb-1">ชื่อเต็ม</label>
                <Input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="ชื่อ-นามสกุล"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#5C4A32] mb-1">บทบาท</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 border border-[#E8E0D5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B8D4E3] bg-white text-[#5C4A32]"
                  required
                >
                  {roleOptions.map(role => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-[#8B7355]">
                  {getRoleDescription(formData.role)}
                </p>
              </div>
              
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-[#5C4A32] mb-1">รหัสผ่าน</label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="เว้นว่างเพื่อใช้รหัสผ่านเริ่มต้น (888888)"
                  />
                </div>
              )}
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 text-[#2E5266] focus:ring-[#B8D4E3] border-[#E8E0D5] rounded"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-[#5C4A32]">
                  เปิดใช้งานบัญชีนี้
                </label>
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCloseModal}
                  className="flex-1"
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-[#2E5266] hover:bg-[#1e3a4a]"
                >
                  {editingUser ? 'บันทึก' : 'สร้าง'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Activity Logs Modal */}
      {showLogsModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#E8E0D5]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[#B8D4E3] flex items-center justify-center text-[#2E5266] font-medium">
                  {selectedUser.full_name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#5C4A32]">ประวัติการใช้งาน</h2>
                  <p className="text-sm text-[#8B7355]">{selectedUser.full_name}</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {userLogs.length === 0 ? (
                <p className="text-center text-[#8B7355] py-4">ไม่พบประวัติการใช้งาน</p>
              ) : (
                <div className="space-y-3">
                  {userLogs.map(log => {
                    const formatted = formatActivityLog(log)
                    return (
                      <div key={log.id} className="flex items-start gap-3 p-3 bg-[#F5EFE6] rounded-lg">
                        <div className="p-2 bg-white rounded-full">
                          <Activity className="h-4 w-4 text-[#2E5266]" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-[#5C4A32]">{formatted.title}</p>
                          {formatted.description && (
                            <p className="text-sm text-[#8B7355]">{formatted.description}</p>
                          )}
                          <p className="text-xs text-[#8B7355] mt-1">{formatted.timestamp}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-[#E8E0D5]">
              <Button
                onClick={() => setShowLogsModal(false)}
                variant="secondary"
                className="w-full"
              >
                ปิด
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
