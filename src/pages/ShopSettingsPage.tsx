import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Store, Upload, X } from 'lucide-react'
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
  line: string
  logo_url: string
  stamp_url: string
  signature_url: string
}

export default function ShopSettingsPage() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const stampInputRef = useRef<HTMLInputElement>(null)
  const signatureInputRef = useRef<HTMLInputElement>(null)
  const [shopInfo, setShopInfo] = useState<ShopInfo>({
    name: 'หจก. สะอางพานิชย์',
    address: 'เลขที่ 8/8 ถ.สุขสันต์ ต.สุเทพ อ.เมืองเชียงใหม่ จ.เชียงใหม่ 50200',
    phone: '0646194546',
    tax_id: '0503560008650',
    email: 'moredrugstore.cm@gmail.com',
    line: '@moredrugstore',
    logo_url: '',
    stamp_url: '',
    signature_url: ''
  })

  useEffect(() => {
    fetchShopInfo()
  }, [])

  const fetchShopInfo = async () => {
    // First try to load from localStorage
    const localData = localStorage.getItem('shop_settings')
    if (localData) {
      try {
        const parsed = JSON.parse(localData)
        setShopInfo(parsed)
      } catch (e) {
        console.error('Error parsing localStorage:', e)
      }
    }
    
    // Then try to fetch from Supabase
    try {
      const { data, error } = await supabase
        .from('shop_settings')
        .select('*')
        .single()
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching shop info:', error)
        return
      }
      
      if (data) {
        const shopData = {
          name: data.name || '',
          address: data.address || '',
          phone: data.phone || '',
          tax_id: data.tax_id || '',
          email: data.email || '',
          line: data.line || '',
          logo_url: data.logo_url || '',
          stamp_url: data.stamp_url || '',
          signature_url: data.signature_url || ''
        }
        setShopInfo(shopData)
        // Update localStorage with latest data
        localStorage.setItem('shop_settings', JSON.stringify(shopData))
      } else if (error?.code === 'PGRST116') {
        // No record found - save defaults to database
        const defaultData = {
          id: 1,
          name: 'หจก. สะอางพานิชย์',
          address: 'เลขที่ 8/8 ถ.สุขสันต์ ต.สุเทพ อ.เมืองเชียงใหม่ จ.เชียงใหม่ 50200',
          phone: '0646194546',
          tax_id: '0503560008650',
          email: 'moredrugstore.cm@gmail.com',
          line: '@moredrugstore',
          logo_url: '',
          stamp_url: '',
          signature_url: '',
          updated_at: new Date().toISOString()
        }
        
        try {
          await supabase.from('shop_settings').insert(defaultData)
          console.log('Default shop settings saved to database')
          localStorage.setItem('shop_settings', JSON.stringify({
            name: defaultData.name,
            address: defaultData.address,
            phone: defaultData.phone,
            tax_id: defaultData.tax_id,
            email: defaultData.email,
            line: defaultData.line,
            logo_url: defaultData.logo_url,
            stamp_url: defaultData.stamp_url,
            signature_url: defaultData.signature_url
          }))
        } catch (insertError) {
          console.error('Error saving defaults:', insertError)
        }
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleFileUpload = async (file: File, type: 'logo' | 'stamp' | 'signature') => {
    console.log('Starting upload for:', type, 'file:', file.name, 'size:', file.size)
    try {
      // Try to create bucket if not exists
      try {
        await supabase.storage.createBucket('assets', { public: true })
        console.log('Created assets bucket')
      } catch (e: any) {
        // Bucket might already exist, ignore error
        if (!e.message?.includes('already exists')) {
          console.log('Bucket creation skipped:', e.message)
        }
      }
      
      const fileExt = file.name.split('.').pop()
      const fileName = `shop_${type}_${Date.now()}.${fileExt}`
      const filePath = `shop_settings/${fileName}`
      
      console.log('Uploading to path:', filePath)
      
      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, file)
      
      if (uploadError) {
        console.error('Upload error:', uploadError)
        alert('อัพโหลดไฟล์ไม่สำเร็จ: ' + uploadError.message)
        return
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(filePath)
      
      console.log('Upload successful, URL:', publicUrl)
      
      setShopInfo(prev => ({
        ...prev,
        [type + '_url']: publicUrl
      }))
    } catch (error: any) {
      console.error('Error uploading file:', error)
      alert('ไม่สามารถอัพโหลดไฟล์ได้: ' + (error?.message || 'Unknown error'))
    }
  }

  const removeImage = (type: 'logo' | 'stamp' | 'signature') => {
    setShopInfo(prev => ({
      ...prev,
      [type + '_url']: ''
    }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      // Try to save to Supabase
      const { error } = await supabase
        .from('shop_settings')
        .upsert({
          id: 1, // Use fixed ID for single record
          name: shopInfo.name,
          address: shopInfo.address,
          phone: shopInfo.phone,
          tax_id: shopInfo.tax_id,
          email: shopInfo.email,
          line: shopInfo.line,
          logo_url: shopInfo.logo_url,
          stamp_url: shopInfo.stamp_url,
          signature_url: shopInfo.signature_url,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' })
      
      if (error) {
        console.error('Error saving shop info:', error)
        // Fallback: save to localStorage
        localStorage.setItem('shop_settings', JSON.stringify(shopInfo))
        alert('บันทึกข้อมูลร้านสำเร็จ (Local Mode)')
        return
      }
      
      // Also save to localStorage as backup
      localStorage.setItem('shop_settings', JSON.stringify(shopInfo))
      alert('บันทึกข้อมูลร้านสำเร็จ')
    } catch (error) {
      console.error('Error:', error)
      // Fallback: save to localStorage
      localStorage.setItem('shop_settings', JSON.stringify(shopInfo))
      alert('บันทึกข้อมูลร้านสำเร็จ (Local Mode)')
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
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Store className="h-7 w-7 text-blue-600" />
          ข้อมูลร้าน
        </h1>
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

          <Input
            label="Line ID"
            value={shopInfo.line}
            onChange={(e) => setShopInfo({ ...shopInfo, line: e.target.value })}
            placeholder="@more_drugstore"
          />

          {/* Image Uploads Section */}
          <div className="border-t pt-6 mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4">รูปภาพเอกสาร</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Logo Upload */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">โลโก้</label>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'logo')}
                />
                {shopInfo.logo_url ? (
                  <div className="relative">
                    <img src={shopInfo.logo_url} alt="Logo" className="h-24 w-24 object-contain border rounded-lg" />
                    <button
                      onClick={() => removeImage('logo')}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    className="h-24 w-24 border-2 border-dashed border-[#7D735F] rounded-lg flex flex-col items-center justify-center text-[#7D735F] hover:border-[#5C5345] hover:text-[#5C5345]"
                  >
                    <Upload className="h-6 w-6 mb-1" />
                    <span className="text-xs">อัพโหลด</span>
                  </button>
                )}
              </div>

              {/* Stamp Upload */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">ตราประทับ</label>
                <input
                  ref={stampInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'stamp')}
                />
                {shopInfo.stamp_url ? (
                  <div className="relative">
                    <img src={shopInfo.stamp_url} alt="Stamp" className="h-24 w-24 object-contain border rounded-lg" />
                    <button
                      onClick={() => removeImage('stamp')}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => stampInputRef.current?.click()}
                    className="h-24 w-24 border-2 border-dashed border-[#7D735F] rounded-lg flex flex-col items-center justify-center text-[#7D735F] hover:border-[#5C5345] hover:text-[#5C5345]"
                  >
                    <Upload className="h-6 w-6 mb-1" />
                    <span className="text-xs">อัพโหลด</span>
                  </button>
                )}
              </div>

              {/* Signature Upload */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">ลายเซ็น</label>
                <input
                  ref={signatureInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'signature')}
                />
                {shopInfo.signature_url ? (
                  <div className="relative">
                    <img src={shopInfo.signature_url} alt="Signature" className="h-24 w-24 object-contain border rounded-lg" />
                    <button
                      onClick={() => removeImage('signature')}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => signatureInputRef.current?.click()}
                    className="h-24 w-24 border-2 border-dashed border-[#7D735F] rounded-lg flex flex-col items-center justify-center text-[#7D735F] hover:border-[#5C5345] hover:text-[#5C5345]"
                  >
                    <Upload className="h-6 w-6 mb-1" />
                    <span className="text-xs">อัพโหลด</span>
                  </button>
                )}
              </div>
            </div>
          </div>

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
