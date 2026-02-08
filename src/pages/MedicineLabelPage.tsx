import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { Printer, Search, Package, Heart } from 'lucide-react'

// Helper to get URL query params
function useQueryParams() {
  const [params, setParams] = useState<Record<string, string>>({})
  
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const result: Record<string, string> = {}
    searchParams.forEach((value, key) => {
      result[key] = value
    })
    setParams(result)
  }, [])
  
  return params
}

interface Product {
  id: string
  name_th: string
  name_en: string
  barcode: string
  sku?: string
  stock_quantity: number
  unit_of_measure: string
  base_price?: number
  cost_price?: number
  medicine_details?: MedicineDetails
  // Label fields from ProductsPage
  label_dosage_instructions_th?: string
  label_special_instructions_th?: string
  label_dosage_instructions_en?: string
  label_special_instructions_en?: string
  label_custom_line1?: string
  label_custom_line2?: string
  label_custom_line3?: string
}

interface MedicineDetails {
  id: string
  product_id: string
  dosage_form: string
  strength: string
  dosage_instructions: string
  usage_before_meal: boolean
  usage_after_meal: boolean
  usage_morning: boolean
  usage_noon: boolean
  usage_evening: boolean
  usage_bedtime: boolean
  usage_as_needed: boolean
  special_instructions: string
  warnings: string
  storage_conditions: string
  registration_number: string
  manufacturer: string
  active_ingredients: string
}

interface LabelData {
  product_id: string
  dosage_instructions_th: string
  special_instructions_th: string
  dosage_instructions_en: string
  special_instructions_en: string
}

interface CustomizeData {
  patient_name: string
  doctor_name: string
  date: string
  custom_instructions: string
  quantity: string
  hospital_clinic: string
}

export default function MedicineLabelPage() {
  const queryParams = useQueryParams()
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'th' | 'en' | 'customize' | 'barcode' | 'calculator'>('th')
  const [labelData, setLabelData] = useState<LabelData>({
    product_id: '',
    dosage_instructions_th: '',
    special_instructions_th: '',
    dosage_instructions_en: '',
    special_instructions_en: ''
  })
  const [customizeData, setCustomizeData] = useState<CustomizeData>({
    patient_name: '',
    doctor_name: '',
    date: new Date().toISOString().split('T')[0],
    custom_instructions: '',
    quantity: '',
    hospital_clinic: ''
  })
  const [showPreview, setShowPreview] = useState(false)
  const [barcodeSize, setBarcodeSize] = useState<'small' | 'medium' | 'large' | 'custom'>('medium')
  const [customBarcodeWidth, setCustomBarcodeWidth] = useState(50)
  const [customBarcodeHeight, setCustomBarcodeHeight] = useState(30)
  const [showProductName, setShowProductName] = useState(false)
  const [showPrice, setShowPrice] = useState(false)
  const [showCostPrice, setShowCostPrice] = useState(false)
  const [showBarcodeInfo, setShowBarcodeInfo] = useState(true)
  const [lotNumber, setLotNumber] = useState('')
  const [expiryDate, setExpiryDate] = useState('')

  // Dosage calculator states
  const [dosageCalc, setDosageCalc] = useState({
    patientWeight: '',
    dosagePerKg: '',
    frequency: '3',
    calculatedDose: 0,
    totalDose: 0,
    age: ''
  })

  // Favorites and sales data states
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [salesData, setSalesData] = useState<Record<string, number>>({})

  useEffect(() => {
    fetchProducts()
    fetchFavorites()
    fetchSalesData()
  }, [])

  // Handle query params from ProductsPage
  useEffect(() => {
    if (queryParams.data) {
      try {
        const parsedData = JSON.parse(queryParams.data)
        // Pre-fill label data from query params
        setLabelData({
          product_id: '',
          dosage_instructions_th: parsedData.label_dosage_instructions_th || '',
          special_instructions_th: parsedData.label_special_instructions_th || '',
          dosage_instructions_en: parsedData.label_dosage_instructions_en || '',
          special_instructions_en: parsedData.label_special_instructions_en || ''
        })
        // Pre-fill lot and expiry
        if (parsedData.lot_number) setLotNumber(parsedData.lot_number)
        if (parsedData.expiry_date) setExpiryDate(parsedData.expiry_date)
        // Store custom lines for potential use
        if (parsedData.label_custom_line1 || parsedData.label_custom_line2 || parsedData.label_custom_line3) {
          setCustomizeData(prev => ({
            ...prev,
            custom_instructions: [
              parsedData.label_custom_line1,
              parsedData.label_custom_line2,
              parsedData.label_custom_line3
            ].filter(Boolean).join('\n')
          }))
        }
      } catch (e) {
        console.error('Error parsing query params:', e)
      }
    }
  }, [queryParams.data])

  useEffect(() => {
    if (selectedProduct) {
      // ใช้ข้อมูลฉลากจาก database ที่บันทึกในเมนูสินค้า (ถ้ามี)
      // ถ้าไม่มีจะใช้ข้อมูลจาก medicine_details แทน
      const hasLabelData = selectedProduct.label_dosage_instructions_th || 
                           selectedProduct.label_special_instructions_th ||
                           selectedProduct.label_dosage_instructions_en ||
                           selectedProduct.label_special_instructions_en
      
      if (hasLabelData) {
        // ใช้ข้อมูลที่บันทึกจากแท็บ "ฉลาก" ในเมนูสินค้า
        setLabelData(prev => ({
          ...prev,
          product_id: selectedProduct.id,
          dosage_instructions_th: selectedProduct.label_dosage_instructions_th || '',
          special_instructions_th: selectedProduct.label_special_instructions_th || '',
          dosage_instructions_en: selectedProduct.label_dosage_instructions_en || '',
          special_instructions_en: selectedProduct.label_special_instructions_en || ''
        }))
        // ใช้ข้อมูล custom lines ถ้ามี
        if (selectedProduct.label_custom_line1 || selectedProduct.label_custom_line2 || selectedProduct.label_custom_line3) {
          setCustomizeData(prev => ({
            ...prev,
            custom_instructions: [
              selectedProduct.label_custom_line1,
              selectedProduct.label_custom_line2,
              selectedProduct.label_custom_line3
            ].filter(Boolean).join('\n')
          }))
        }
      } else {
        // ถ้าไม่มีข้อมูล label ให้สร้างจาก medicine_details (fallback)
        const details = selectedProduct.medicine_details
        if (details) {
          let instructions = []
          
          // เวลารับประทาน
          const timing = []
          if (details.usage_morning) timing.push('เช้า')
          if (details.usage_noon) timing.push('กลางวัน')
          if (details.usage_evening) timing.push('เย็น')
          if (details.usage_bedtime) timing.push('ก่อนนอน')
          if (timing.length > 0) instructions.push(`รับประทาน${timing.join(' ')}`)
          
          // ก่อน/หลังอาหาร
          if (details.usage_before_meal) instructions.push('ก่อนอาหาร')
          if (details.usage_after_meal) instructions.push('หลังอาหาร')
          
          // ตามอาการ
          if (details.usage_as_needed) instructions.push('เมื่อมีอาการ')
          
          // รวมคำแนะนำ
          const fullInstructions = instructions.join(' ') || details.dosage_instructions || ''
          
          setLabelData(prev => ({
            ...prev,
            product_id: selectedProduct.id,
            dosage_instructions_th: fullInstructions,
            special_instructions_th: details.special_instructions || '',
            dosage_instructions_en: '',
            special_instructions_en: ''
          }))
        }
      }
    }
  }, [selectedProduct])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          medicine_details (*)
        `)
        .order('name_th')

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchFavorites = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return

      const { data, error } = await supabase
        .from('favorite_labels')
        .select('product_id')
        .eq('user_id', userData.user.id)

      if (error) throw error
      setFavorites(new Set(data.map(f => f.product_id)))
    } catch (error) {
      console.error('Error fetching favorites:', error)
    }
  }

  const fetchSalesData = async () => {
    try {
      // Get sales data from sale_items for the last 90 days
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

      const { data, error } = await supabase
        .from('sale_items')
        .select('product_id, quantity')
        .gte('created_at', ninetyDaysAgo.toISOString())

      if (error) throw error

      // Aggregate sales by product
      const salesMap: Record<string, number> = {}
      data?.forEach(item => {
        salesMap[item.product_id] = (salesMap[item.product_id] || 0) + (item.quantity || 0)
      })
      setSalesData(salesMap)
    } catch (error) {
      console.error('Error fetching sales data:', error)
    }
  }

  const toggleFavorite = async (productId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        alert('กรุณาเข้าสู่ระบบก่อน')
        return
      }

      const isFavorite = favorites.has(productId)

      if (isFavorite) {
        // Remove from favorites
        await supabase
          .from('favorite_labels')
          .delete()
          .eq('product_id', productId)
          .eq('user_id', userData.user.id)
        setFavorites(prev => {
          const newSet = new Set(prev)
          newSet.delete(productId)
          return newSet
        })
      } else {
        // Add to favorites
        await supabase
          .from('favorite_labels')
          .insert({ product_id: productId, user_id: userData.user.id })
        setFavorites(prev => new Set(prev).add(productId))
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  const handlePrintLabel = async () => {
    if (!selectedProduct || (!labelData.dosage_instructions_th && !labelData.dosage_instructions_en)) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน')
      return
    }

    try {
      const { data: userData } = await supabase.auth.getUser()

      // บันทึกประวัติการพิมพ์
      await supabase
        .from('printed_labels')
        .insert({
          product_id: selectedProduct.id,
          dosage_instructions: labelData.dosage_instructions_th || labelData.dosage_instructions_en,
          printed_data: labelData,
          printed_by: userData?.user?.id
        })

      // เปิดหน้าต่างพิมพ์
      window.print()
    } catch (error) {
      console.error('Error printing label:', error)
      alert('เกิดข้อผิดพลาดในการพิมพ์ฉลาก')
    }
  }

  const filteredProducts = products.filter(product =>
    product.name_th?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.name_en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.barcode?.includes(searchTerm)
  ).sort((a, b) => {
    // Sort: favorites first, then by sales volume
    const aIsFavorite = favorites.has(a.id)
    const bIsFavorite = favorites.has(b.id)
    
    if (aIsFavorite && !bIsFavorite) return -1
    if (!aIsFavorite && bIsFavorite) return 1
    
    // If both are favorites or both are not, sort by sales
    const aSales = salesData[a.id] || 0
    const bSales = salesData[b.id] || 0
    return bSales - aSales
  })

  // Find medicines without label data
  const medicinesWithoutLabel = products.filter(product => 
    product.medicine_details && 
    !product.label_dosage_instructions_th &&
    !product.label_dosage_instructions_en
  )


  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Printer className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">พิมพ์ฉลากยา</h1>
        </div>
        <p className="text-gray-600">สร้างและพิมพ์ฉลากยาสำหรับผู้ป่วย</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Selection */}
        <Card>
          <h2 className="text-lg font-bold text-gray-900 mb-4">เลือกยา</h2>
          
          <div className="mb-4">
            <div className="flex items-center gap-3">
              <Search className="h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาชื่อยา หรือบาร์โค้ด..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {loading ? (
            <p className="text-center text-gray-600">กำลังโหลด...</p>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className={`p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedProduct?.id === product.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{product.name_th}</h3>
                        {favorites.has(product.id) && (
                          <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{product.name_en}</p>
                      {product.medicine_details && (
                        <div className="mt-1">
                          <span className="text-xs text-gray-500">
                            {product.medicine_details.dosage_form} {product.medicine_details.strength}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => toggleFavorite(product.id, e)}
                        className={`p-1.5 rounded-full transition-colors ${
                          favorites.has(product.id)
                            ? 'text-red-500 hover:bg-red-100'
                            : 'text-gray-400 hover:text-red-500 hover:bg-gray-100'
                        }`}
                      >
                        <Heart className={`h-4 w-4 ${favorites.has(product.id) ? 'fill-current' : ''}`} />
                      </button>
                      <span className="text-xs text-gray-500">{product.barcode}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Warning Section: Medicines Without Label Data */}
        {medicinesWithoutLabel.length > 0 && (
          <Card className="mt-4 border-amber-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              <h3 className="font-semibold text-amber-700">ยาที่ยังไม่มีข้อมูลฉลาก ({medicinesWithoutLabel.length})</h3>
            </div>
            <p className="text-sm text-amber-600 mb-3">
              ยาเหล่านี้อยู่ในหมวดหมู่ยาแต่ยังไม่ได้บันทึกข้อมูลฉลาก กรุณาคลิกเพื่อไปบันทึก
            </p>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {medicinesWithoutLabel.slice(0, 5).map((product) => (
                <a
                  key={product.id}
                  href={`/products?id=${product.id}`}
                  className="flex items-center justify-between p-2 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{product.name_th}</p>
                    <p className="text-xs text-gray-500">{product.barcode}</p>
                  </div>
                  <span className="text-xs text-amber-600">ไปบันทึกฉลาก →</span>
                </a>
              ))}
              {medicinesWithoutLabel.length > 5 && (
                <p className="text-xs text-gray-500 text-center py-2">
                  ...และอีก {medicinesWithoutLabel.length - 5} รายการ
                </p>
              )}
            </div>
          </Card>
        )}

        {/* Label Form */}
        <Card>
          <h2 className="text-lg font-bold text-gray-900 mb-4">ข้อมูลฉลากยา</h2>
          
          {selectedProduct ? (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="font-medium text-blue-900">{selectedProduct.name_th}</p>
                <p className="text-sm text-blue-700">{selectedProduct.name_en}</p>
                {selectedProduct.medicine_details && (
                  <p className="text-sm text-blue-600 mt-1">
                    {selectedProduct.medicine_details.strength} - {selectedProduct.medicine_details.dosage_form}
                  </p>
                )}
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('th')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'th'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  ภาษาไทย
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('en')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'en'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('customize')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'customize'
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  ปรับแต่งเฉพาะบุคคล
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('barcode')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'barcode'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  บาร์โค้ด
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('calculator')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'calculator'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  คำนวณขนาดยา
                </button>
              </div>

              {/* Thai Tab */}
              {activeTab === 'th' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">วิธีใช้ *</label>
                    <textarea
                      value={labelData.dosage_instructions_th}
                      onChange={(e) => setLabelData({...labelData, dosage_instructions_th: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      rows={3}
                      placeholder="เช่น รับประทานครั้งละ 1 เม็ด วันละ 3 ครั้ง หลังอาหาร"
                    />
                    {selectedProduct.medicine_details && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setLabelData({...labelData, dosage_instructions_th: 'ครั้งละ 1 เม็ด วันละ 3 ครั้ง หลังอาหาร'})}
                          className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                        >
                          1x3 หลังอาหาร
                        </button>
                        <button
                          type="button"
                          onClick={() => setLabelData({...labelData, dosage_instructions_th: 'ครั้งละ 1 เม็ด วันละ 2 ครั้ง เช้า-เย็น'})}
                          className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                        >
                          1x2 เช้า-เย็น
                        </button>
                        <button
                          type="button"
                          onClick={() => setLabelData({...labelData, dosage_instructions_th: 'ครั้งละ 1 เม็ด ก่อนนอน'})}
                          className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                        >
                          ก่อนนอน
                        </button>
                        <button
                          type="button"
                          onClick={() => setLabelData({...labelData, dosage_instructions_th: 'เมื่อมีอาการ'})}
                          className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                        >
                          เมื่อมีอาการ
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">คำเตือน/ข้อควรระวัง</label>
                    <textarea
                      value={labelData.special_instructions_th}
                      onChange={(e) => setLabelData({...labelData, special_instructions_th: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      rows={2}
                      placeholder="เช่น ห้ามดื่มแอลกอฮอล์, เก็บในตู้เย็น"
                    />
                  </div>
                </div>
              )}

              {/* English Tab */}
              {activeTab === 'en' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Dosage Instructions *</label>
                    <textarea
                      value={labelData.dosage_instructions_en}
                      onChange={(e) => setLabelData({...labelData, dosage_instructions_en: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      rows={3}
                      placeholder="e.g., Take 1 tablet 3 times daily after meals"
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setLabelData({...labelData, dosage_instructions_en: 'Take 1 tablet 3 times daily after meals'})}
                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                      >
                        1x3 after meals
                      </button>
                      <button
                        type="button"
                        onClick={() => setLabelData({...labelData, dosage_instructions_en: 'Take 1 tablet twice daily morning and evening'})}
                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                      >
                        1x2 morning-evening
                      </button>
                      <button
                        type="button"
                        onClick={() => setLabelData({...labelData, dosage_instructions_en: 'Take 1 tablet at bedtime'})}
                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                      >
                        At bedtime
                      </button>
                      <button
                        type="button"
                        onClick={() => setLabelData({...labelData, dosage_instructions_en: 'Take as needed'})}
                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                      >
                        As needed
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Warnings/Precautions</label>
                    <textarea
                      value={labelData.special_instructions_en}
                      onChange={(e) => setLabelData({...labelData, special_instructions_en: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      rows={2}
                      placeholder="e.g., Avoid alcohol, store in refrigerator"
                    />
                  </div>
                </div>
              )}

              {/* Customize Tab - ปรับแต่งเฉพาะบุคคล */}
              {activeTab === 'customize' && (
                <div className="space-y-4">
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-sm text-purple-700">กรอกข้อมูลเฉพาะบุคคลสำหรับฉลากยานี้</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">ชื่อผู้ป่วย *</label>
                      <input
                        type="text"
                        value={customizeData.patient_name}
                        onChange={(e) => setCustomizeData({...customizeData, patient_name: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="ชื่อ-นามสกุล"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">วันที่</label>
                      <input
                        type="date"
                        value={customizeData.date}
                        onChange={(e) => setCustomizeData({...customizeData, date: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">ชื่อแพทย์</label>
                      <input
                        type="text"
                        value={customizeData.doctor_name}
                        onChange={(e) => setCustomizeData({...customizeData, doctor_name: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="ชื่อแพทย์/ผู้สั่งยา"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">โรงพยาบาล/คลินิก</label>
                      <input
                        type="text"
                        value={customizeData.hospital_clinic}
                        onChange={(e) => setCustomizeData({...customizeData, hospital_clinic: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="ชื่อสถานพยาบาล"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">จำนวน / ระยะเวลา</label>
                    <input
                      type="text"
                      value={customizeData.quantity}
                      onChange={(e) => setCustomizeData({...customizeData, quantity: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="เช่น 7 วัน, 30 เม็ด"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">คำแนะนำเพิ่มเติม</label>
                    <textarea
                      value={customizeData.custom_instructions}
                      onChange={(e) => setCustomizeData({...customizeData, custom_instructions: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      rows={3}
                      placeholder="คำแนะนำเฉพาะสำหรับผู้ป่วยรายนี้"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCustomizeData({
                        patient_name: '',
                        doctor_name: '',
                        date: new Date().toISOString().split('T')[0],
                        custom_instructions: '',
                        quantity: '',
                        hospital_clinic: ''
                      })}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700"
                    >
                      ล้างข้อมูลส่วนบุคคล
                    </button>
                  </div>
                </div>
              )}

              {/* Barcode Tab */}
              {activeTab === 'barcode' && (
                <div className="space-y-5">
                  {/* Header */}
                  <div className="p-3 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg flex items-center gap-2">
                    <Printer className="h-5 w-5 text-orange-600" />
                    <p className="text-sm text-orange-800 font-medium">ตั้งค่าฉลากบาร์โค้ด</p>
                  </div>

                  {/* Section 1: Label Size */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700">1. ขนาดฉลาก</h4>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { key: 'small', label: 'เล็ก', size: '30×20' },
                        { key: 'medium', label: 'กลาง', size: '50×30' },
                        { key: 'large', label: 'ใหญ่', size: '80×50' },
                        { key: 'custom', label: 'กำหนดเอง', size: '-' }
                      ].map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setBarcodeSize(opt.key as any)}
                          className={`p-2 border-2 rounded-lg text-center transition-all ${
                            barcodeSize === opt.key
                              ? 'border-orange-500 bg-orange-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="text-sm font-medium">{opt.label}</div>
                          <div className="text-xs text-gray-500">{opt.size}</div>
                        </button>
                      ))}
                    </div>
                    {barcodeSize === 'custom' && (
                      <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg">
                        <input
                          type="number"
                          value={customBarcodeWidth}
                          onChange={(e) => setCustomBarcodeWidth(parseInt(e.target.value) || 50)}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                          placeholder="กว้าง (มม.)"
                        />
                        <input
                          type="number"
                          value={customBarcodeHeight}
                          onChange={(e) => setCustomBarcodeHeight(parseInt(e.target.value) || 30)}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                          placeholder="สูง (มม.)"
                        />
                      </div>
                    )}
                  </div>

                  {/* Section 2: Display Options */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700">2. ข้อมูลที่แสดง</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { checked: showBarcodeInfo, onChange: setShowBarcodeInfo, label: 'ข้อมูลร้าน วัน เวลา', color: 'blue' },
                        { checked: showProductName, onChange: setShowProductName, label: 'ชื่อสินค้า', color: 'orange' },
                        { checked: showPrice, onChange: setShowPrice, label: 'ราคาขาย', color: 'green' },
                        { checked: showCostPrice, onChange: setShowCostPrice, label: 'ราคาทุน (สำหรับพนักงาน)', color: 'red' }
                      ].map((opt, idx) => (
                        <label key={idx} className="flex items-center gap-2 p-2 bg-white border rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={opt.checked}
                            onChange={(e) => opt.onChange(e.target.checked)}
                            className="h-4 w-4 rounded"
                          />
                          <span className="text-sm text-gray-700">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Section 3: Product Info */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700">3. ข้อมูลสินค้า (ถ้ามี)</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={lotNumber}
                        onChange={(e) => setLotNumber(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        placeholder="Lot Number"
                      />
                      <input
                        type="date"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                  </div>

                  {/* Section 4: Preview */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-700">4. ตัวอย่างฉลาก</h4>
                    <div className="border-2 border-dashed border-orange-300 rounded-xl p-5 bg-white">
                      <div className="text-center max-w-[180px] mx-auto">
                        {showBarcodeInfo && (
                          <div className="border-b border-gray-200 pb-1.5 mb-2">
                            <div className="text-xs font-bold text-gray-800">MORE DRUGSTORE</div>
                            <div className="text-[10px] text-gray-500">{new Date().toLocaleDateString('th-TH')} {new Date().toLocaleTimeString('th-TH', {hour: '2-digit', minute: '2-digit'})}</div>
                          </div>
                        )}

                        <div className="text-sm font-bold text-gray-800 truncate">{selectedProduct?.name_th || 'ชื่อสินค้า'}</div>

                        {selectedProduct?.sku && (
                          <div className="text-[10px] text-gray-500">SKU: {selectedProduct.sku}</div>
                        )}

                        <svg className="mx-auto my-1" width="130" height="40" viewBox="0 0 130 40">
                          {[0,4,7,12,16,20,26,30,34,40,44,48,54,60,64,70,76,80,86,92,96,102,108,112,118,124,130].map((x, i) => (
                            <rect key={i} x={x} y="0" width={[2,1,3,2,1,4,2,1,3,2,1,4,2,1,3,2,1,4,2,1,3,2,1,4,2,1,3][i] || 2} height="32" fill="black"/>
                          ))}
                        </svg>

                        <div className="text-[10px] text-gray-600 font-mono tracking-wider">{selectedProduct?.barcode || 'XXXXXXXXXXXXX'}</div>

                        {(lotNumber || expiryDate) && (
                          <div className="flex justify-center gap-2 text-[10px] text-gray-500 mt-1">
                            {lotNumber && <span>Lot: {lotNumber}</span>}
                            {expiryDate && <span>EXP: {new Date(expiryDate).toLocaleDateString('th-TH', {year: '2-digit', month: '2-digit', day: '2-digit'})}</span>}
                          </div>
                        )}

                        <div className="flex justify-center gap-2 mt-1.5">
                          {showPrice && (
                            <span className="text-xs font-bold text-green-600">฿{selectedProduct?.base_price?.toFixed(2) || '0.00'}</span>
                          )}
                          {showCostPrice && (
                            <span className="text-[10px] text-red-500">ทุน: ฿{selectedProduct?.cost_price?.toFixed(2) || '0.00'}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Print Button */}
                  <Button
                    variant="primary"
                    onClick={() => setShowPreview(true)}
                    disabled={!selectedProduct}
                    className="w-full"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    พิมพ์บาร์โค้ด
                  </Button>
                </div>
              )}

              {/* Dosage Calculator Tab */}
              {activeTab === 'calculator' && (
                <div className="space-y-4">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700">คำนวณขนาดยาตามน้ำหนักตัว (mg/kg)</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">น้ำหนัก (kg)</label>
                      <input
                        type="number"
                        value={dosageCalc.patientWeight}
                        onChange={(e) => {
                          const weight = e.target.value
                          const dosePerKg = dosageCalc.dosagePerKg
                          const calculated = weight && dosePerKg ? parseFloat(weight) * parseFloat(dosePerKg) : 0
                          setDosageCalc({...dosageCalc, patientWeight: weight, calculatedDose: calculated})
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="เช่น 50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">อายุ (ปี)</label>
                      <input
                        type="number"
                        value={dosageCalc.age}
                        onChange={(e) => setDosageCalc({...dosageCalc, age: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="เช่น 30"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ขนาดยา/กก (mg)</label>
                      <input
                        type="number"
                        value={dosageCalc.dosagePerKg}
                        onChange={(e) => {
                          const dosePerKg = e.target.value
                          const weight = dosageCalc.patientWeight
                          const calculated = weight && dosePerKg ? parseFloat(weight) * parseFloat(dosePerKg) : 0
                          setDosageCalc({...dosageCalc, dosagePerKg: dosePerKg, calculatedDose: calculated})
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="เช่น 10"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนครั้ง/วัน</label>
                      <select
                        value={dosageCalc.frequency}
                        onChange={(e) => setDosageCalc({...dosageCalc, frequency: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="1">1 ครั้ง/วัน</option>
                        <option value="2">2 ครั้ง/วัน</option>
                        <option value="3">3 ครั้ง/วัน</option>
                        <option value="4">4 ครั้ง/วัน</option>
                      </select>
                    </div>
                  </div>

                  {/* Result */}
                  {dosageCalc.calculatedDose > 0 && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-center">
                        <p className="text-sm text-blue-600 mb-1">ขนาดยาที่คำนวณได้</p>
                        <p className="text-3xl font-bold text-blue-700">
                          {dosageCalc.calculatedDose.toFixed(1)} mg
                        </p>
                        <p className="text-sm text-blue-600 mt-1">
                          ({(dosageCalc.calculatedDose / parseInt(dosageCalc.frequency || '1')).toFixed(1)} mg/ครั้ง)
                        </p>
                        <p className="text-sm text-blue-600 mt-1">
                          {dosageCalc.frequency} ครั้ง/วัน
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (dosageCalc.calculatedDose > 0) {
                          const doseText = `รับประทานครั้งละ ${(dosageCalc.calculatedDose / parseInt(dosageCalc.frequency || '1')).toFixed(1)} mg วันละ ${dosageCalc.frequency} ครั้ง`
                          setLabelData({...labelData, dosage_instructions_th: doseText})
                          setActiveTab('th')
                        }
                      }}
                      disabled={dosageCalc.calculatedDose === 0}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium"
                    >
                      ใช้คำแนะนำนี้
                    </button>
                    <button
                      type="button"
                      onClick={() => setDosageCalc({
                        patientWeight: '',
                        dosagePerKg: '',
                        frequency: '3',
                        calculatedDose: 0,
                        totalDose: 0,
                        age: ''
                      })}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700"
                    >
                      ล้าง
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="primary"
                  onClick={() => setShowPreview(true)}
                  disabled={!labelData.dosage_instructions_th && !labelData.dosage_instructions_en}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  ดูตัวอย่าง
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setLabelData({
                      product_id: selectedProduct.id,
                      dosage_instructions_th: '',
                      special_instructions_th: '',
                      dosage_instructions_en: '',
                      special_instructions_en: ''
                    })
                  }}
                >
                  ล้างข้อมูล
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">กรุณาเลือกยาที่ต้องการพิมพ์ฉลาก</p>
            </div>
          )}
        </Card>
      </div>

      {/* Label Preview Modal */}
      {showPreview && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">ตัวอย่างฉลากยา</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Label Preview */}
            <div className="border-2 border-dashed border-gray-300 p-6 rounded-lg bg-white" id="medicine-label">
              <div className="text-center mb-4">
                <h2 className="text-xl font-bold">ร้านขายยา MORE DRUGSTORE</h2>
                <p className="text-sm text-gray-600">โทร. 02-XXX-XXXX</p>
              </div>

              {/* Personalized Information */}
              {(customizeData.patient_name || customizeData.date || customizeData.doctor_name) && (
                <div className="border-b border-gray-300 pb-3 mb-3">
                  {customizeData.patient_name && (
                    <p className="font-bold text-lg">คุณ{customizeData.patient_name}</p>
                  )}
                  <div className="flex flex-wrap gap-x-4 text-sm text-gray-600">
                    {customizeData.date && (
                      <span>วันที่: {new Date(customizeData.date).toLocaleDateString('th-TH')}</span>
                    )}
                    {customizeData.doctor_name && (
                      <span>แพทย์: {customizeData.doctor_name}</span>
                    )}
                    {customizeData.hospital_clinic && (
                      <span>{customizeData.hospital_clinic}</span>
                    )}
                  </div>
                </div>
              )}

              <div className="mb-3">
                <h3 className="text-lg font-bold mb-1">{selectedProduct.name_th}</h3>
                <p className="text-sm text-gray-600">{selectedProduct.name_en}</p>
                {selectedProduct.medicine_details && (
                  <p className="text-sm">
                    {selectedProduct.medicine_details.strength} - {selectedProduct.medicine_details.dosage_form}
                  </p>
                )}
              </div>

              <div className="bg-gray-100 p-3 rounded mb-3">
                <p className="font-bold mb-1">วิธีใช้ / Dosage:</p>
                {labelData.dosage_instructions_th && (
                  <p className="whitespace-pre-wrap mb-2">{labelData.dosage_instructions_th}</p>
                )}
                {labelData.dosage_instructions_en && (
                  <p className="whitespace-pre-wrap text-gray-600 italic">{labelData.dosage_instructions_en}</p>
                )}
              </div>

              {/* Quantity */}
              {customizeData.quantity && (
                <div className="mb-3">
                  <p className="font-bold">จำนวน: <span className="font-normal">{customizeData.quantity}</span></p>
                </div>
              )}

              {/* Custom Instructions */}
              {customizeData.custom_instructions && (
                <div className="bg-yellow-50 border border-yellow-200 p-2 rounded mb-3">
                  <p className="text-sm font-bold text-yellow-800">คำแนะนำเฉพาะ:</p>
                  <p className="text-sm text-yellow-700">{customizeData.custom_instructions}</p>
                </div>
              )}

              {(labelData.special_instructions_th || labelData.special_instructions_en) && (
                <div className="border border-red-300 bg-red-50 p-2 rounded mb-3">
                  <p className="text-sm font-bold text-red-700">คำเตือน / Warnings:</p>
                  {labelData.special_instructions_th && (
                    <p className="text-sm text-red-600">{labelData.special_instructions_th}</p>
                  )}
                  {labelData.special_instructions_en && (
                    <p className="text-sm text-red-600 italic">{labelData.special_instructions_en}</p>
                  )}
                </div>
              )}

              {selectedProduct.medicine_details?.warnings && (
                <div className="mt-2 text-xs text-gray-600">
                  <p>{selectedProduct.medicine_details.warnings}</p>
                </div>
              )}

              <div className="mt-4 pt-3 border-t text-xs text-gray-500 text-center">
                <p>กรุณาปฏิบัติตามคำแนะนำของแพทย์หรือเภสัชกร</p>
                <p>เก็บยาให้พ้นมือเด็ก</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="primary"
                onClick={handlePrintLabel}
              >
                <Printer className="h-4 w-4 mr-2" />
                พิมพ์ฉลาก
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowPreview(false)}
              >
                ปิด
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #medicine-label, #medicine-label * {
            visibility: visible;
          }
          #medicine-label {
            position: absolute;
            left: 0;
            top: 0;
            width: 60mm;
            padding: 5mm;
            border: 1px solid #000;
          }
        }
      `}</style>
    </div>
  )
}
