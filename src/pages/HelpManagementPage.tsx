import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  BookOpen, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  HelpCircle,
  FileText,
  ArrowLeft
} from 'lucide-react'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'

interface HelpManual {
  id: string
  page_route: string
  page_name_th: string
  page_name_en: string
  content: string
  short_description: string
  created_at: string
  updated_at: string
}

const AVAILABLE_PAGES = [
  { route: '/products', name_th: 'สินค้า', name_en: 'Products' },
  { route: '/stock-management', name_th: 'จัดการสต็อก', name_en: 'Stock Management' },
  { route: '/quotations', name_th: 'รายการใบเสนอราคา', name_en: 'Quotations' },
  { route: '/contacts', name_th: 'ผู้ติดต่อ', name_en: 'Contacts' },
  { route: '/pos', name_th: 'ขายหน้าร้าน', name_en: 'POS' },
  { route: '/settings', name_th: 'ตั้งค่า', name_en: 'Settings' },
  { route: '/sales-orders', name_th: 'รายการขาย', name_en: 'Sales Orders' },
  { route: '/expenses', name_th: 'บัญชี', name_en: 'Expenses' },
  { route: '/product-catalogs', name_th: 'แคตตาล็อกสินค้า', name_en: 'Product Catalogs' },
  { route: '/categories-management', name_th: 'จัดการหมวดหมู่', name_en: 'Categories' },
  { route: '/warehouse-management', name_th: 'จัดการคลังสินค้า', name_en: 'Warehouse Management' },
  { route: '/payment-methods', name_th: 'ช่องทางการชำระเงิน', name_en: 'Payment Methods' },
  { route: '/dashboard', name_th: 'แดชบอร์ด', name_en: 'Dashboard' },
]

export default function HelpManagementPage() {
  const navigate = useNavigate()
  const [manuals, setManuals] = useState<HelpManual[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingManual, setEditingManual] = useState<HelpManual | null>(null)
  const [formData, setFormData] = useState({
    page_route: '',
    page_name_th: '',
    page_name_en: '',
    content: '',
    short_description: ''
  })

  useEffect(() => {
    fetchManuals()
  }, [])

  const fetchManuals = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('help_manuals')
        .select('*')
        .order('page_name_th', { ascending: true })

      if (error) throw error
      setManuals(data || [])
    } catch (err) {
      console.error('Error fetching manuals:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser()
      
      if (editingManual) {
        // Update existing
        const { error } = await supabase
          .from('help_manuals')
          .update({
            page_route: formData.page_route,
            page_name_th: formData.page_name_th,
            page_name_en: formData.page_name_en,
            content: formData.content,
            short_description: formData.short_description,
            updated_by: userData?.user?.id
          })
          .eq('id', editingManual.id)

        if (error) throw error
        alert('แก้ไขคู่มือสำเร็จ')
      } else {
        // Create new
        const { error } = await supabase
          .from('help_manuals')
          .insert({
            page_route: formData.page_route,
            page_name_th: formData.page_name_th,
            page_name_en: formData.page_name_en,
            content: formData.content,
            short_description: formData.short_description,
            created_by: userData?.user?.id
          })

        if (error) throw error
        alert('สร้างคู่มือสำเร็จ')
      }

      setShowModal(false)
      setEditingManual(null)
      setFormData({
        page_route: '',
        page_name_th: '',
        page_name_en: '',
        content: '',
        short_description: ''
      })
      fetchManuals()
    } catch (err: any) {
      console.error('Error saving manual:', err)
      alert('เกิดข้อผิดพลาด: ' + (err.message || 'ไม่สามารถบันทึกคู่มือได้'))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('ต้องการลบคู่มือนี้ใช่หรือไม่?')) return

    try {
      const { error } = await supabase
        .from('help_manuals')
        .delete()
        .eq('id', id)

      if (error) throw error
      alert('ลบคู่มือสำเร็จ')
      fetchManuals()
    } catch (err) {
      console.error('Error deleting manual:', err)
      alert('เกิดข้อผิดพลาดในการลบคู่มือ')
    }
  }

  const handleEdit = (manual: HelpManual) => {
    setEditingManual(manual)
    setFormData({
      page_route: manual.page_route,
      page_name_th: manual.page_name_th,
      page_name_en: manual.page_name_en,
      content: manual.content,
      short_description: manual.short_description
    })
    setShowModal(true)
  }

  const handleAddNew = () => {
    setEditingManual(null)
    setFormData({
      page_route: '',
      page_name_th: '',
      page_name_en: '',
      content: '',
      short_description: ''
    })
    setShowModal(true)
  }

  const handlePageSelect = (route: string) => {
    const page = AVAILABLE_PAGES.find(p => p.route === route)
    if (page) {
      setFormData(prev => ({
        ...prev,
        page_route: page.route,
        page_name_th: page.name_th,
        page_name_en: page.name_en
      }))
    }
  }

  const filteredManuals = manuals.filter(manual =>
    manual.page_name_th.toLowerCase().includes(searchTerm.toLowerCase()) ||
    manual.page_route.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Get pages that don't have manuals yet
  const existingRoutes = manuals.map(m => m.page_route)
  const availableNewPages = AVAILABLE_PAGES.filter(p => !existingRoutes.includes(p.route))

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <BookOpen className="h-8 w-8 text-[#7D735F] mt-1" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">จัดการคู่มือการใช้งาน</h1>
            <p className="text-gray-600">สร้างและแก้ไขคู่มือสำหรับแต่ละหน้า</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate('/settings')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            กลับ
          </Button>
          <Button
            variant="primary"
            onClick={handleAddNew}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            เพิ่มคู่มือใหม่
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="ค้นหาคู่มือ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Manuals Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7D735F]"></div>
        </div>
      ) : filteredManuals.length === 0 ? (
        <Card className="text-center py-12">
          <HelpCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'ไม่พบคู่มือที่ค้นหา' : 'ยังไม่มีคู่มือ'}
          </h3>
          <p className="text-gray-500 mb-4">
            {searchTerm ? 'ลองค้นหาด้วยคำอื่น' : 'เริ่มสร้างคู่มือการใช้งานสำหรับหน้าต่างๆ'}
          </p>
          {!searchTerm && (
            <Button variant="primary" onClick={handleAddNew}>
              <Plus className="h-4 w-4 mr-2" />
              สร้างคู่มือแรก
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredManuals.map((manual) => (
            <Card key={manual.id} className="hover:shadow-lg transition-shadow">
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#F5F0E6] rounded-lg">
                      <FileText className="h-5 w-5 text-[#7D735F]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{manual.page_name_th}</h3>
                      <p className="text-xs text-gray-500">{manual.page_route}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(manual)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="แก้ไข"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(manual.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="ลบ"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {manual.short_description && (
                  <p className="text-sm text-gray-600 mb-3">{manual.short_description}</p>
                )}

                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>แก้ไขล่าสุด: {new Date(manual.updated_at).toLocaleDateString('th-TH')}</span>
                  <span className="truncate max-w-[150px]">
                    {manual.content ? manual.content.substring(0, 50) + '...' : 'ไม่มีเนื้อหา'}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingManual ? 'แก้ไขคู่มือ' : 'สร้างคู่มือใหม่'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Page Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  เลือกหน้า <span className="text-red-500">*</span>
                </label>
                {editingManual ? (
                  <Input
                    value={formData.page_route}
                    disabled
                    className="bg-gray-100"
                  />
                ) : (
                  <select
                    value={formData.page_route}
                    onChange={(e) => handlePageSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7D735F] focus:border-transparent"
                  >
                    <option value="">เลือกหน้า...</option>
                    {availableNewPages.map((page) => (
                      <option key={page.route} value={page.route}>
                        {page.name_th} ({page.route})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Page Name TH */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ชื่อหน้า (ภาษาไทย) <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.page_name_th}
                  onChange={(e) => setFormData(prev => ({ ...prev, page_name_th: e.target.value }))}
                  placeholder="เช่น สินค้า"
                />
              </div>

              {/* Page Name EN */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ชื่อหน้า (ภาษาอังกฤษ)
                </label>
                <Input
                  value={formData.page_name_en}
                  onChange={(e) => setFormData(prev => ({ ...prev, page_name_en: e.target.value }))}
                  placeholder="เช่น Products"
                />
              </div>

              {/* Short Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  คำอธิบายสั้น
                </label>
                <Input
                  value={formData.short_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, short_description: e.target.value }))}
                  placeholder="คำอธิบายโดยสรุปเกี่ยวกับหน้านี้"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  เนื้อหาคู่มือ <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="เขียนคู่มือการใช้งานที่นี่...&#10;&#10;ตัวอย่าง:&#10;- วิธีการเพิ่มสินค้าใหม่&#10;- วิธีการแก้ไขข้อมูลสินค้า&#10;- คำอธิบายฟีเจอร์ต่างๆ"
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7D735F] focus:border-transparent resize-vertical"
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                ยกเลิก
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!formData.page_route || !formData.page_name_th || !formData.content}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                บันทึก
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
