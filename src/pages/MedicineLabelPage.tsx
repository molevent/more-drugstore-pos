import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { Printer, Search, Package } from 'lucide-react'

interface Product {
  id: string
  name_th: string
  name_en: string
  barcode: string
  stock_quantity: number
  unit_of_measure: string
  medicine_details?: MedicineDetails
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
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'th' | 'en' | 'customize'>('th')
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

  useEffect(() => {
    fetchProducts()
  }, [])

  useEffect(() => {
    if (selectedProduct) {
      // อัพเดตคำแนะนำการใช้ยาอัตโนมัติ
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
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedProduct?.id === product.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">{product.name_th}</h3>
                      <p className="text-sm text-gray-600">{product.name_en}</p>
                      {product.medicine_details && (
                        <div className="mt-1">
                          <span className="text-xs text-gray-500">
                            {product.medicine_details.dosage_form} {product.medicine_details.strength}
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">{product.barcode}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

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
