import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../services/supabase'
import { User, UserRole } from '../types'
import { Users, Plus, Search, Edit2, Trash2, UserCheck, UserX, Shield, ArrowLeft } from 'lucide-react'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import { getRoleDisplayName, getRoleBadgeColor, getRoleDescription } from '../utils/permissions'

import { useLanguage } from '../contexts/LanguageContext'

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
  const { t } = useLanguage()
  
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    email: '',
    full_name: '',
    role: 'pharmacist',
    password: '',
    is_active: true
  })

  useEffect(() => {
    fetchUsers()
  }, [])

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
    
    // Auto-generate email from username if not provided
    const email = formData.email || `${formData.username.toLowerCase()}@moredrug.co.th`
    
    try {
      if (editingUser) {
        const { error } = await supabase
          .from('users')
          .update({
            username: formData.username,
            email: email,
            full_name: formData.full_name,
            role: formData.role,
            is_active: formData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingUser.id)
        
        if (error) throw error
        alert('บันทึกสำเร็จ')
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email,
          password: formData.password || '888888',
          options: {
            data: {
              full_name: formData.full_name,
              username: formData.username,
              role: formData.role
            }
          }
        })
        
        if (authError) {
          alert('เกิดข้อผิดพลาด: ' + authError.message)
          return
        }
        
        if (authData.user) {
          const { error } = await supabase
            .from('users')
            .insert({
              id: authData.user.id,
              username: formData.username,
              email: email,
              full_name: formData.full_name,
              role: formData.role,
              is_active: formData.is_active
            })
          
          if (error) throw error
          alert('สร้างผู้ใช้สำเร็จ')
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
      alert('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ')
    }
  }

  const handleDelete = async (user: User) => {
    if (!confirm('ลบผู้ใช้ ' + user.full_name + '?')) return
    
    try {
      const { error } = await supabase.auth.admin.deleteUser(user.id)
      if (error) throw error
      fetchUsers()
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการลบ')
    }
  }

  const filteredUsers = users.filter(user => 
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const roleOptions = [
    { value: 'owner', label: t('role.owner') },
    { value: 'manager', label: t('role.manager') },
    { value: 'pharmacist', label: t('role.pharmacist') },
    { value: 'part_time', label: t('role.partTime') },
    { value: 'accountant', label: t('role.accountant') }
  ]

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/settings')} className="p-2 text-gray-600 hover:text-black rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-black">{t('userManagement.title')}</h1>
              <p className="text-gray-600">{t('userManagement.subtitle')}</p>
            </div>
            <Button onClick={() => handleOpenModal()} className="bg-[#2E5266]">
              <Plus className="h-4 w-4 mr-2" /> {t('userManagement.addUser')}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {roleOptions.map(role => {
            const count = users.filter(u => u.role === role.value).length
            return (
              <Card key={role.value} className="bg-white border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getRoleBadgeColor(role.value as UserRole).split(' ')[0]}`}>
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">{role.label}</p>
                    <p className="text-xl font-bold text-black">{count}</p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        <Card className="mb-6 bg-white border-gray-200">
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-4 py-2">
            <Search className="h-5 w-5 text-gray-600" />
            <input type="text" placeholder={t('userManagement.search')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 bg-transparent border-none outline-none text-black placeholder-gray-400" />
          </div>
        </Card>

        <Card className="bg-white border-gray-200">
          {loading ? (
            <div className="text-center py-8 text-gray-600">{t('common.loading')}</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-500" />
              <p>{t('userManagement.noUsers')}</p>
              <p className="text-sm mt-2">{t('userManagement.addUserPrompt')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">{t('userManagement.username')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">{t('userManagement.email')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">{t('userManagement.role')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">{t('userManagement.active')}</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-black uppercase">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-gray-100/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-[#B8D4E3] flex items-center justify-center text-[#2E5266] font-medium text-sm">{user.full_name.charAt(0)}</div>
                          <div>
                            <p className="font-medium text-black">{user.full_name}</p>
                            {user.username && <p className="text-xs text-gray-600">@{user.username}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{user.email}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>{getRoleDisplayName(user.role)}</span></td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleToggleActive(user)} className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {user.is_active ? <><UserCheck className="h-3 w-3" /> {t('userManagement.active')}</> : <><UserX className="h-3 w-3" /> {t('common.inactive')}</>}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleOpenModal(user)} className="p-1.5 text-gray-600 hover:text-black"><Edit2 className="h-4 w-4" /></button>
                          {user.id !== currentUser?.id && <button onClick={() => handleDelete(user)} className="p-1.5 text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>}
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

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-black">{editingUser ? t('userManagement.editUser') : t('userManagement.addUser')}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">{t('userManagement.username')} *</label>
                <Input type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} placeholder="Som, Kai, Ing..." required />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">{t('userManagement.emailAuto')}</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="user@moredrug.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">{t('userManagement.fullName')} *</label>
                <Input type="text" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} placeholder="Full Name" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">{t('userManagement.role')} *</label>
                <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-black" required>
                  {roleOptions.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}
                </select>
                <p className="mt-1 text-xs text-gray-600">{getRoleDescription(formData.role)}</p>
              </div>
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-black mb-1">{t('userManagement.passwordHint')}</label>
                  <Input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Leave blank for default" />
                </div>
              )}
              <div className="flex items-center">
                <input type="checkbox" id="is_active" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="h-4 w-4 text-[#2E5266]" />
                <label htmlFor="is_active" className="ml-2 text-sm text-black">{t('userManagement.activeAccount')}</label>
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={handleCloseModal} className="flex-1">{t('common.cancel')}</Button>
                <Button type="submit" className="flex-1 bg-[#2E5266]">{editingUser ? t('common.save') : t('userManagement.create')}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
