import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Store } from 'lucide-react'
import Card from '../components/common/Card'
import Input from '../components/common/Input'
import Button from '../components/common/Button'
import { supabase } from '../services/supabase'

interface ShopInfo {
  name: string
  address: string
  phone: string
  tax_id: string
  email: string
}

export default function ShopSettingsPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [shopInfo, setShopInfo] = useState<ShopInfo>({
    name: 'More Drug Store',
    address: '123 ถนนสุขุมวิท กรุงเทพฯ',
    phone: '02-123-4567',
    tax_id: '',
    email: 'contact@moredrugstore.com'
  })

  useEffect(() => {
    fetchShopInfo()
  }, [])

  const fetchShopInfo = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('shop_settings')
        .select('*')
        .single()
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching shop info:', error)
        return
      }
      
      if (data) {
        setShopInfo({
          name: data.name || 'More Drug Store',
          address: data.address || '',
          phone: data.phone || '',
          tax_id: data.tax_id || '',
          email: data.email || ''
        })
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      const { error } = await supabase
        .from('shop_settings')
        .upsert({
          name: shopInfo.name,
          address: shopInfo.address,
          phone: shopInfo.phone,
          tax_id: shopInfo.tax_id,
          email: shopInfo.email,
          updated_at: new Date().toISOString()
        })
      
      if (error) {
        console.error('Error saving shop info:', error)
        alert('เกิดข้อผิดพลาดในการบันทึก')
        return
      }
      
      alert('บันทึกข้อมูลร้านสำเร็จ')
    } catch (error) {
      console.error('Error:', error)
      alert('เกิดข้อผิดพลาดในการบันทึก')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FBFF]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/settings')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center">
            <Store className="h-5 w-5 text-green-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">ข้อมูลร้าน</h1>
        </div>
      </div>

      <Card className="max-w-2xl">
        <div className="space-y-4">
          <Input
            label="ชื่อร้าน"
            value={shopInfo.name}
            onChange={(e) => setShopInfo({ ...shopInfo, name: e.target.value })}
            placeholder="More Drug Store"
          />
          
          <Input
            label="ที่อยู่"
            value={shopInfo.address}
            onChange={(e) => setShopInfo({ ...shopInfo, address: e.target.value })}
            placeholder="123 ถนนสุขุมวิท กรุงเทพฯ"
          />
          
          <Input
            label="เบอร์โทร"
            value={shopInfo.phone}
            onChange={(e) => setShopInfo({ ...shopInfo, phone: e.target.value })}
            placeholder="02-123-4567"
          />
          
          <Input
            label="อีเมล"
            value={shopInfo.email}
            onChange={(e) => setShopInfo({ ...shopInfo, email: e.target.value })}
            placeholder="contact@moredrugstore.com"
          />
          
          <Input
            label="เลขประจำตัวผู้เสียภาษี"
            value={shopInfo.tax_id}
            onChange={(e) => setShopInfo({ ...shopInfo, tax_id: e.target.value })}
            placeholder="x-xxxx-xxxxx-xx-x"
          />

          <div className="flex gap-3 pt-4">
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saving}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate('/settings')}
            >
              ยกเลิก
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
