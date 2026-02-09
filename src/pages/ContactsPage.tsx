import { useState, useEffect } from 'react'
import { 
  Users, 
  UserPlus, 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  Edit2, 
  Trash2, 
  X,
  Building2,
  User,
  ArrowLeftRight
} from 'lucide-react'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { supabase } from '../services/supabase'

interface Contact {
  id: string
  name: string
  type: 'buyer' | 'seller' | 'both'
  phone?: string
  email?: string
  address?: string
  company_name?: string
  tax_id?: string
  notes?: string
  created_at: string
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'buyer' | 'seller' | 'both'>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    type: 'buyer' as 'buyer' | 'seller' | 'both',
    phone: '',
    email: '',
    address: '',
    company_name: '',
    tax_id: '',
    notes: ''
  })

  useEffect(() => {
    fetchContacts()
  }, [])

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setContacts(data || [])
    } catch (error) {
      console.error('Error fetching contacts:', error)
      // Demo data
      setContacts([
        {
          id: '1',
          name: 'ร้านขายยาดีเภสัช',
          type: 'seller',
          phone: '02-123-4567',
          email: 'contact@deepharmacy.com',
          address: '123 ถนนสุขุมวิท กรุงเทพฯ',
          company_name: 'บริษัท ดีเภสัช จำกัด',
          tax_id: '1234567890123',
          notes: 'ผู้จำหน่ายหลัก',
          created_at: '2024-01-01'
        },
        {
          id: '2',
          name: 'คลินิกหมอสมชาย',
          type: 'buyer',
          phone: '02-987-6543',
          email: 'clinic@example.com',
          address: '456 ถนนราชดำริ กรุงเทพฯ',
          company_name: 'คลินิกสมชาย',
          tax_id: '0987654321098',
          notes: 'ลูกค้าประจำ',
          created_at: '2024-01-15'
        },
        {
          id: '3',
          name: 'ร้านขายยาเพชรบุรี',
          type: 'both',
          phone: '02-555-8888',
          email: 'pharmacy@example.com',
          address: '789 ถนนเพชรบุรี กรุงเทพฯ',
          company_name: 'ร้านขายยาเพชรบุรี',
          tax_id: '5555555555555',
          notes: 'ซื้อขายร่วมกัน',
          created_at: '2024-02-01'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (editingContact) {
        const { error } = await supabase
          .from('contacts')
          .update(formData)
          .eq('id', editingContact.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('contacts')
          .insert([formData])
        if (error) throw error
      }
      
      setShowModal(false)
      setEditingContact(null)
      resetForm()
      fetchContacts()
    } catch (error) {
      console.error('Error saving contact:', error)
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('ต้องการลบผู้ติดต่อนี้?')) return
    
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id)
      if (error) throw error
      fetchContacts()
    } catch (error) {
      console.error('Error deleting contact:', error)
      alert('เกิดข้อผิดพลาดในการลบข้อมูล')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'buyer',
      phone: '',
      email: '',
      address: '',
      company_name: '',
      tax_id: '',
      notes: ''
    })
  }

  const openEditModal = (contact: Contact) => {
    setEditingContact(contact)
    setFormData({
      name: contact.name,
      type: contact.type,
      phone: contact.phone || '',
      email: contact.email || '',
      address: contact.address || '',
      company_name: contact.company_name || '',
      tax_id: contact.tax_id || '',
      notes: contact.notes || ''
    })
    setShowModal(true)
  }

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contact.phone?.includes(searchTerm) ||
                         contact.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || contact.type === filterType
    return matchesSearch && matchesType
  })

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'buyer': return { label: 'ผู้ซื้อ', color: 'bg-blue-100 text-blue-700', icon: User }
      case 'seller': return { label: 'ผู้ขาย', color: 'bg-green-100 text-green-700', icon: Building2 }
      case 'both': return { label: 'ซื้อ/ขาย', color: 'bg-purple-100 text-purple-700', icon: ArrowLeftRight }
      default: return { label: type, color: 'bg-gray-100', icon: User }
    }
  }

  const getTypeCount = (type: 'buyer' | 'seller' | 'both') => {
    return contacts.filter(c => c.type === type).length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-7 w-7 text-blue-600" />
            ผู้ติดต่อ
          </h1>
          <p className="text-gray-600 mt-1">จัดการผู้ซื้อ ผู้ขาย และคู่ค้า</p>
        </div>
        <Button variant="primary" onClick={() => { setEditingContact(null); resetForm(); setShowModal(true) }}>
          <UserPlus className="h-4 w-4 mr-2" />
          เพิ่มผู้ติดต่อ
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="ค้นหาชื่อ, เบอร์โทร, อีเมล..."
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'all', label: 'ทั้งหมด', count: contacts.length },
              { key: 'buyer', label: 'ผู้ซื้อ', count: getTypeCount('buyer') },
              { key: 'seller', label: 'ผู้ขาย', count: getTypeCount('seller') },
              { key: 'both', label: 'ซื้อ/ขาย', count: getTypeCount('both') }
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setFilterType(filter.key as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterType === filter.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filter.label} ({filter.count})
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Contacts List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredContacts.map((contact) => {
          const typeInfo = getTypeLabel(contact.type)
          const TypeIcon = typeInfo.icon
          
          return (
            <Card key={contact.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${typeInfo.color} flex items-center justify-center`}>
                    <TypeIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{contact.name}</h3>
                    {contact.company_name && (
                      <p className="text-sm text-gray-500">{contact.company_name}</p>
                    )}
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeInfo.color}`}>
                  {typeInfo.label}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                {contact.phone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="h-4 w-4" />
                    <span>{contact.phone}</span>
                  </div>
                )}
                {contact.email && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{contact.email}</span>
                  </div>
                )}
                {contact.address && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">{contact.address}</span>
                  </div>
                )}
                {contact.tax_id && (
                  <div className="text-gray-500 text-xs">
                    เลขผู้เสียภาษี: {contact.tax_id}
                  </div>
                )}
              </div>

              {contact.notes && (
                <div className="mt-3 p-2 bg-gray-50 rounded text-sm text-gray-600">
                  {contact.notes}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => openEditModal(contact)}>
                  <Edit2 className="h-4 w-4 mr-1" />
                  แก้ไข
                </Button>
                <Button variant="secondary" className="text-red-600 hover:bg-red-50" onClick={() => handleDelete(contact.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          )
        })}
      </div>

      {filteredContacts.length === 0 && !loading && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">ไม่พบผู้ติดต่อ</p>
          <p className="text-sm text-gray-500">ลองค้นหาด้วยคำอื่น หรือเพิ่มผู้ติดต่อใหม่</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {editingContact ? 'แก้ไขผู้ติดต่อ' : 'เพิ่มผู้ติดต่อ'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ประเภท *</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'buyer', label: 'ผู้ซื้อ', icon: User, color: 'blue' },
                    { key: 'seller', label: 'ผู้ขาย', icon: Building2, color: 'green' },
                    { key: 'both', label: 'ซื้อ/ขาย', icon: ArrowLeftRight, color: 'purple' }
                  ].map((type) => {
                    const Icon = type.icon
                    return (
                      <button
                        key={type.key}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: type.key as any })}
                        className={`p-3 border-2 rounded-lg text-center transition-all ${
                          formData.type === type.key
                            ? `border-${type.color}-500 bg-${type.color}-50`
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon className={`h-5 w-5 mx-auto mb-1 ${formData.type === type.key ? `text-${type.color}-600` : 'text-gray-500'}`} />
                        <span className={`text-sm font-medium ${formData.type === type.key ? `text-${type.color}-700` : 'text-gray-700'}`}>
                          {type.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="ชื่อผู้ติดต่อหรือบริษัท"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อบริษัท/ร้าน</label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="ชื่อบริษัทหรือร้านค้า (ถ้ามี)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0xx-xxx-xxxx"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ที่อยู่</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="ที่อยู่สำหรับจัดส่งหรือติดต่อ"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">เลขผู้เสียภาษี</label>
                <input
                  type="text"
                  value={formData.tax_id}
                  onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="เลข 13 หลัก"
                  maxLength={13}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="บันทึกเพิ่มเติม"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" variant="primary" className="flex-1">
                  {editingContact ? 'บันทึกการแก้ไข' : 'เพิ่มผู้ติดต่อ'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                  ยกเลิก
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
