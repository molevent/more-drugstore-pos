import { useState, useRef } from 'react'
import { Upload, X, FileSpreadsheet, Check, AlertCircle, Loader2 } from 'lucide-react'
import Button from './Button'
import Card from './Card'
import { supabase } from '../../services/supabase'

interface CSVImportModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface CSVRow {
  [key: string]: string
}

interface ParsedProduct {
  row: number
  barcode: string
  sku: string
  name_th: string
  name_en: string
  base_price: number
  cost_price: number
  stock_quantity: number
  unit: string
  description_th: string
  category: string
  isValid: boolean
  errors: string[]
}

// Available column headers (flexible matching - any subset works)
const AVAILABLE_COLUMNS = [
  // Required (at least one)
  { th: 'รหัสสินค้า', en: 'sku, code', desc: 'รหัสสินค้า (SKU)' },
  { th: 'บาร์โค้ด', en: 'barcode, bar_code', desc: 'บาร์โค้ดสินค้า' },
  { th: 'ชื่อสินค้า', en: 'name_th, name, product_name', desc: 'ชื่อสินค้าภาษาไทย (จำเป็น)' },
  
  // Optional
  { th: 'ชื่อภาษาอังกฤษ', en: 'name_en, english_name', desc: 'ชื่อสินค้าภาษาอังกฤษ' },
  { th: 'ราคาขาย', en: 'base_price, price, selling_price', desc: 'ราคาขาย (รวม VAT)' },
  { th: 'ราคาทุน', en: 'cost_price, cost, purchase_price', desc: 'ราคาทุน' },
  { th: 'จำนวนคงเหลือ', en: 'stock_quantity, stock, quantity', desc: 'จำนวนสต็อกคงเหลือ' },
  { th: 'หน่วย', en: 'unit, uom', desc: 'หน่วยนับ (เช่น เม็ด, ขวด, กล่อง)' },
  { th: 'คำอธิบาย', en: 'description_th, description, desc', desc: 'คำอธิบายสินค้า' },
  { th: 'หมวดหมู่', en: 'category, category_name', desc: 'หมวดหมู่สินค้า' },
]

export default function CSVImportModal({ isOpen, onClose, onSuccess }: CSVImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedProduct[]>([])
  const [isParsing, setIsParsing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parseCSV = (csvText: string): CSVRow[] => {
    const lines = csvText.trim().split('\n')
    if (lines.length === 0) return []

    // Parse header
    const headerLine = lines[0]
    const headers = parseCSVLine(headerLine)

    const rows: CSVRow[] = []
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      const row: CSVRow = {}
      headers.forEach((header, index) => {
        row[header.trim()] = values[index]?.trim() || ''
      })
      rows.push(row)
    }

    return rows
  }

  const parseCSVLine = (line: string): string[] => {
    const values: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current)
        current = ''
      } else {
        current += char
      }
    }
    values.push(current)
    return values
  }

  const mapRowToProduct = (row: CSVRow, rowNum: number): ParsedProduct => {
    const errors: string[] = []
    
    // Find column values (case-insensitive)
    const getValue = (...possibleKeys: string[]): string => {
      for (const key of possibleKeys) {
        const value = row[key] || row[key.toLowerCase()] || row[key.toUpperCase()]
        if (value) return value
      }
      return ''
    }

    // Get Thai column mappings
    const sku = getValue('รหัสสินค้า', 'sku', 'code')
    const barcode = getValue('บาร์โค้ด', 'barcode', 'bar_code')
    const name_th = getValue('ชื่อสินค้า', 'name_th', 'name', 'product_name')
    const name_en = getValue('ชื่อภาษาอังกฤษ', 'name_en', 'english_name')
    const priceStr = getValue('ราคาขาย', 'base_price', 'price', 'selling_price')
    const costStr = getValue('ราคาทุน', 'cost_price', 'cost', 'purchase_price')
    const stockStr = getValue('จำนวนคงเหลือ', 'stock_quantity', 'stock', 'quantity')
    const unit = getValue('หน่วย', 'unit', 'uom') || 'ชิ้น'
    const description = getValue('คำอธิบาย', 'description_th', 'description', 'desc')
    const category = getValue('หมวดหมู่', 'category', 'category_name')

    // Validation
    if (!sku && !barcode) {
      errors.push('ต้องระบุรหัสสินค้า (SKU) หรือบาร์โค้ด')
    }
    if (!name_th) {
      errors.push('ต้องระบุชื่อสินค้า')
    }

    // Parse numbers
    const base_price = parseFloat(priceStr) || 0
    const cost_price = parseFloat(costStr) || 0
    const stock_quantity = parseFloat(stockStr) || 0

    return {
      row: rowNum,
      barcode: barcode || sku,
      sku: sku || barcode,
      name_th,
      name_en,
      base_price,
      cost_price,
      stock_quantity,
      unit,
      description_th: description,
      category,
      isValid: errors.length === 0,
      errors
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setIsParsing(true)
    setImportResult(null)

    try {
      const text = await selectedFile.text()
      const rows = parseCSV(text)
      const products = rows.map((row, index) => mapRowToProduct(row, index + 2)) // +2 because row 1 is header
      setParsedData(products)
    } catch (error) {
      console.error('Error parsing CSV:', error)
      alert('เกิดข้อผิดพลาดในการอ่านไฟล์ CSV')
    } finally {
      setIsParsing(false)
    }
  }

  const handleImport = async () => {
    const validProducts = parsedData.filter(p => p.isValid)
    if (validProducts.length === 0) {
      alert('ไม่มีข้อมูลที่ถูกต้องสำหรับนำเข้า')
      return
    }

    setIsImporting(true)
    let success = 0
    let failed = 0
    const errors: string[] = []

    for (const product of validProducts) {
      try {
        // Check if product exists
        const { data: existing } = await supabase
          .from('products')
          .select('id')
          .or(`sku.eq.${product.sku},barcode.eq.${product.barcode}`)
          .single()

        const productData = {
          sku: product.sku,
          barcode: product.barcode,
          name_th: product.name_th,
          name_en: product.name_en,
          base_price: product.base_price,
          selling_price_incl_vat: product.base_price,
          cost_price: product.cost_price,
          stock_quantity: product.stock_quantity,
          min_stock_level: 10,
          unit: product.unit,
          description_th: product.description_th,
          is_active: true,
          product_type: 'finished_goods',
          stock_tracking_type: 'tracked'
        }

        if (existing) {
          // Update existing
          const { error } = await supabase
            .from('products')
            .update(productData)
            .eq('id', existing.id)
          if (error) throw error
        } else {
          // Insert new
          const { error } = await supabase
            .from('products')
            .insert(productData)
          if (error) throw error
        }

        success++
      } catch (error: any) {
        console.error('Error importing product:', error)
        failed++
        errors.push(`แถว ${product.row}: ${error.message}`)
      }
    }

    setImportResult({ success, failed, errors })
    setIsImporting(false)

    if (success > 0) {
      onSuccess()
    }
  }

  const downloadTemplate = () => {
    const headers = 'รหัสสินค้า,บาร์โค้ด,ชื่อสินค้า,ชื่อภาษาอังกฤษ,ราคาขาย,ราคาทุน,จำนวนคงเหลือ,หน่วย,คำอธิบาย,หมวดหมู่'
    const example = 'SKU001,1234567890123,พาราเซตามอล 500mg,Paracetamol 500mg,35,20,100,เม็ด,ยาบรรเทาปวด,ยาสามัญ'
    const csv = `${headers}\n${example}`
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'product_import_template.csv'
    link.click()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <FileSpreadsheet className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">นำเข้าสินค้าจาก CSV</h2>
              <p className="text-sm text-gray-500">Import Products from CSV</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Available Columns Info */}
          <Card className="p-4 bg-blue-50 border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              หัวคอลัมน์ที่รองรับ (เลือกใช้ได้ตามต้องการ)
            </h3>
            <p className="text-sm text-blue-700 mb-3">
              ไฟล์ CSV ไม่จำเป็นต้องมีครบทุกคอลัมน์ แค่มีหัวข้อตรงกับตารางด้านล่างก็จะนำเข้าได้
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {AVAILABLE_COLUMNS.map((col, idx) => (
                <div key={idx} className="flex flex-col bg-white rounded p-2">
                  <span className="font-medium text-gray-900">{col.th}</span>
                  <span className="text-xs text-gray-500">หรือ: {col.en}</span>
                  <span className="text-xs text-blue-600">{col.desc}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 p-2 bg-yellow-50 rounded text-xs text-yellow-800">
              <strong>หมายเหตุ:</strong> ต้องมีอย่างน้อย <strong>รหัสสินค้า</strong> หรือ <strong>บาร์โค้ด</strong> + <strong>ชื่อสินค้า</strong>
            </div>
          </Card>

          {/* File Upload */}
          <Card className="p-4">
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-blue-400 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className="h-12 w-12 text-gray-400 mb-3" />
              <p className="text-sm text-gray-600 mb-2">ลากไฟล์ CSV มาวางที่นี่ หรือ</p>
              <Button
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={isParsing || isImporting}
              >
                เลือกไฟล์
              </Button>
              <p className="text-xs text-gray-400 mt-3">รองรับไฟล์ .csv เท่านั้น</p>
            </div>

            {/* Template Download */}
            <div className="mt-4 pt-4 border-t">
              <button
                onClick={downloadTemplate}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <FileSpreadsheet className="h-4 w-4" />
                ดาวน์โหลดไฟล์ตัวอย่าง (Template)
              </button>
            </div>
          </Card>

          {/* Parsed Data Preview */}
          {parsedData.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">
                  ตัวอย่างข้อมูล ({parsedData.length} รายการ)
                </h3>
                <div className="text-sm">
                  <span className="text-green-600 font-medium">{parsedData.filter(p => p.isValid).length} ถูกต้อง</span>
                  <span className="mx-2">|</span>
                  <span className="text-red-600 font-medium">{parsedData.filter(p => !p.isValid).length} มีข้อผิดพลาด</span>
                </div>
              </div>

              <div className="overflow-x-auto max-h-64">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">#</th>
                      <th className="px-3 py-2 text-left">รหัส</th>
                      <th className="px-3 py-2 text-left">ชื่อสินค้า</th>
                      <th className="px-3 py-2 text-right">ราคา</th>
                      <th className="px-3 py-2 text-right">สต็อก</th>
                      <th className="px-3 py-2 text-center">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {parsedData.slice(0, 10).map((product, idx) => (
                      <tr key={idx} className={!product.isValid ? 'bg-red-50' : ''}>
                        <td className="px-3 py-2 text-gray-500">{product.row}</td>
                        <td className="px-3 py-2 font-mono text-xs">{product.sku}</td>
                        <td className="px-3 py-2">
                          <div className="font-medium">{product.name_th}</div>
                          {product.name_en && <div className="text-xs text-gray-500">{product.name_en}</div>}
                        </td>
                        <td className="px-3 py-2 text-right">฿{product.base_price.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">{product.stock_quantity} {product.unit}</td>
                        <td className="px-3 py-2 text-center">
                          {product.isValid ? (
                            <Check className="h-4 w-4 text-green-500 mx-auto" />
                          ) : (
                            <div className="group relative">
                              <AlertCircle className="h-4 w-4 text-red-500 mx-auto cursor-help" />
                              <div className="absolute z-10 hidden group-hover:block bg-red-100 text-red-700 text-xs rounded p-2 -mt-2 left-1/2 transform -translate-x-1/2 w-48">
                                {product.errors.join(', ')}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedData.length > 10 && (
                  <p className="text-center text-sm text-gray-500 py-2">
                    และอีก {parsedData.length - 10} รายการ...
                  </p>
                )}
              </div>
            </Card>
          )}

          {/* Import Result */}
          {importResult && (
            <Card className={`p-4 ${importResult.failed === 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <div className="flex items-center gap-3">
                {importResult.failed === 0 ? (
                  <Check className="h-8 w-8 text-green-600" />
                ) : (
                  <AlertCircle className="h-8 w-8 text-yellow-600" />
                )}
                <div>
                  <h3 className="font-semibold">
                    นำเข้าเสร็จสิ้น: {importResult.success} สำเร็จ, {importResult.failed} ล้มเหลว
                  </h3>
                  {importResult.errors.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-sm text-red-600 cursor-pointer">
                        ดูข้อผิดพลาด ({importResult.errors.length})
                      </summary>
                      <ul className="mt-2 text-xs text-red-600 space-y-1 max-h-32 overflow-y-auto">
                        {importResult.errors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {file && <span>ไฟล์: {file.name}</span>}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} disabled={isImporting}>
              ปิด
            </Button>
            {parsedData.filter(p => p.isValid).length > 0 && !importResult && (
              <Button
                variant="primary"
                onClick={handleImport}
                disabled={isImporting || isParsing}
                className="flex items-center gap-2"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    กำลังนำเข้า...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    นำเข้า {parsedData.filter(p => p.isValid).length} รายการ
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
