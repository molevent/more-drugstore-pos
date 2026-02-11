import { useState, useRef } from 'react'
import { supabase } from '../../services/supabase'
import Card from './Card'
import Button from './Button'
import { Upload, FileText, Type, Check, X, FileSpreadsheet, Loader2, AlertCircle } from 'lucide-react'

interface SalesChannelCSVImportModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface CSVRow {
  [key: string]: string
}

interface ParsedChannelProduct {
  row: number
  barcode?: string
  sku?: string
  name_th?: string
  sell_on_grab: boolean
  sell_on_lineman: boolean
  sell_on_lazada: boolean
  sell_on_shopee: boolean
  sell_on_line_shopping: boolean
  sell_on_tiktok: boolean
  price_grab?: number
  price_lineman?: number
  price_lazada?: number
  price_shopee?: number
  price_line_shopping?: number
  price_tiktok?: number
  isValid: boolean
  errors: string[]
  existingProductId?: string
}

const AVAILABLE_COLUMNS = [
  { th: 'รหัสสินค้า', en: 'sku, code', desc: 'รหัสสินค้า (SKU)' },
  { th: 'บาร์โค้ด', en: 'barcode', desc: 'บาร์โค้ดสินค้า' },
  { th: 'ชื่อสินค้า', en: 'name', desc: 'ชื่อสินค้า (สำหรับตรวจสอบ)' },
  { th: 'ขาย GRAB', en: 'grab, sell_grab', desc: 'ขายบน GRAB (Y/N หรือ 1/0)' },
  { th: 'ขาย LineMan', en: 'lineman, sell_lineman', desc: 'ขายบน LineMan (Y/N หรือ 1/0)' },
  { th: 'ขาย LAZADA', en: 'lazada, sell_lazada', desc: 'ขายบน LAZADA (Y/N หรือ 1/0)' },
  { th: 'ขาย Shopee', en: 'shopee, sell_shopee', desc: 'ขายบน Shopee (Y/N หรือ 1/0)' },
  { th: 'ขาย Line Shopping', en: 'line_shopping, sell_line_shopping', desc: 'ขายบน Line Shopping (Y/N หรือ 1/0)' },
  { th: 'ขาย TikTok', en: 'tiktok, sell_tiktok', desc: 'ขายบน TikTok (Y/N หรือ 1/0)' },
  { th: 'ราคา GRAB', en: 'price_grab', desc: 'ราคาขายบน GRAB' },
  { th: 'ราคา LineMan', en: 'price_lineman', desc: 'ราคาขายบน LineMan' },
  { th: 'ราคา LAZADA', en: 'price_lazada', desc: 'ราคาขายบน LAZADA' },
  { th: 'ราคา Shopee', en: 'price_shopee', desc: 'ราคาขายบน Shopee' },
  { th: 'ราคา Line Shopping', en: 'price_line_shopping', desc: 'ราคาขายบน Line Shopping' },
  { th: 'ราคา TikTok', en: 'price_tiktok', desc: 'ราคาขายบน TikTok' },
]

export default function SalesChannelCSVImportModal({ isOpen, onClose, onSuccess }: SalesChannelCSVImportModalProps) {
  const [importMode, setImportMode] = useState<'file' | 'text'>('file')
  const [file, setFile] = useState<File | null>(null)
  const [pasteText, setPasteText] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [parsedData, setParsedData] = useState<ParsedChannelProduct[]>([])
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const parseBoolean = (value: string): boolean => {
    if (!value) return false
    const normalized = value.toLowerCase().trim()
    return normalized === 'y' || normalized === 'yes' || normalized === 'true' || normalized === '1'
  }

  const parseCSV = (csvText: string): CSVRow[] => {
    const rows: CSVRow[] = []
    const lines = csvText.split('\n')
    
    if (lines.length === 0) return []

    // Parse header handling multiline quoted fields
    let headerLine = ''
    let inHeaderQuotes = false
    let headerLines: string[] = []
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j]
        if (char === '"') {
          if (inHeaderQuotes && line[j + 1] === '"') {
            j++
          } else {
            inHeaderQuotes = !inHeaderQuotes
          }
        }
      }
      
      if (headerLine) {
        headerLine += '\n' + line
      } else {
        headerLine = line
      }
      
      if (!inHeaderQuotes) {
        headerLines = parseCSVLine(headerLine)
        break
      }
    }
    
    if (headerLines.length === 0) return []
    
    const headers = headerLines.map(h => h.replace(/\n/g, '').replace(/"/g, '').trim().toLowerCase())

    // Parse data rows
    let currentLine = ''
    let inQuotes = false
    let dataStartIndex = headerLine.split('\n').length
    
    for (let i = dataStartIndex; i < lines.length; i++) {
      const line = lines[i]
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j]
        if (char === '"') {
          if (inQuotes && line[j + 1] === '"') {
            j++
          } else {
            inQuotes = !inQuotes
          }
        }
      }
      
      if (currentLine) {
        currentLine += '\n' + line
      } else {
        currentLine = line
      }
      
      if (!inQuotes && currentLine.trim()) {
        const values = parseCSVLine(currentLine)
        const row: CSVRow = {}
        headers.forEach((header, index) => {
          row[header] = values[index]?.trim() || ''
        })
        rows.push(row)
        currentLine = ''
      }
    }
    
    if (currentLine.trim() && !inQuotes) {
      const values = parseCSVLine(currentLine)
      const row: CSVRow = {}
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || ''
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
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim())
    return values
  }

  const findExistingProduct = async (barcode?: string, sku?: string): Promise<string | undefined> => {
    if (!barcode && !sku) return undefined
    
    try {
      if (barcode) {
        const { data } = await supabase
          .from('products')
          .select('id')
          .eq('barcode', barcode)
          .single()
        if (data) return data.id
      }
      
      if (sku) {
        const { data } = await supabase
          .from('products')
          .select('id')
          .eq('sku', sku)
          .single()
        if (data) return data.id
      }
    } catch (e) {
      // Product not found
    }
    return undefined
  }

  const mapRowToChannelProduct = async (row: CSVRow, rowNum: number): Promise<ParsedChannelProduct> => {
    const errors: string[] = []
    
    const getValue = (...possibleKeys: string[]): string => {
      for (const key of possibleKeys) {
        const value = row[key.toLowerCase()]
        if (value) return value
      }
      return ''
    }

    const barcode = getValue('บาร์โค้ด', 'barcode', 'bar_code')
    const sku = getValue('รหัสสินค้า', 'sku', 'code')
    const name_th = getValue('ชื่อสินค้า', 'name', 'product_name')
    
    if (!barcode && !sku) {
      errors.push('ต้องระบุรหัสสินค้า (SKU) หรือบาร์โค้ด')
    }

    const parsePrice = (priceStr: string): number | undefined => {
      if (!priceStr) return undefined
      const cleaned = priceStr.replace(/[฿,\s]/g, '')
      const num = parseFloat(cleaned)
      return isNaN(num) ? undefined : num
    }

    // Find existing product
    const existingProductId = await findExistingProduct(barcode, sku)
    if (!existingProductId) {
      errors.push('ไม่พบสินค้าในระบบ')
    }

    return {
      row: rowNum,
      barcode,
      sku,
      name_th,
      sell_on_grab: parseBoolean(getValue('ขาย grab', 'grab', 'sell_grab', 'ขาย_grab')),
      sell_on_lineman: parseBoolean(getValue('ขาย lineman', 'lineman', 'sell_lineman', 'ขาย_lineman')),
      sell_on_lazada: parseBoolean(getValue('ขาย lazada', 'lazada', 'sell_lazada', 'ขาย_lazada')),
      sell_on_shopee: parseBoolean(getValue('ขาย shopee', 'shopee', 'sell_shopee', 'ขาย_shopee')),
      sell_on_line_shopping: parseBoolean(getValue('ขาย line shopping', 'line_shopping', 'sell_line_shopping', 'line shopping')),
      sell_on_tiktok: parseBoolean(getValue('ขาย tiktok', 'tiktok', 'sell_tiktok', 'ขาย_tiktok')),
      price_grab: parsePrice(getValue('ราคา grab', 'price_grab')),
      price_lineman: parsePrice(getValue('ราคา lineman', 'price_lineman')),
      price_lazada: parsePrice(getValue('ราคา lazada', 'price_lazada')),
      price_shopee: parsePrice(getValue('ราคา shopee', 'price_shopee')),
      price_line_shopping: parsePrice(getValue('ราคา line shopping', 'price_line_shopping')),
      price_tiktok: parsePrice(getValue('ราคา tiktok', 'price_tiktok')),
      isValid: errors.length === 0,
      errors,
      existingProductId
    }
  }

  const processCSVText = async (text: string) => {
    setIsParsing(true)
    setImportResult(null)

    try {
      const rows = parseCSV(text)
      const products = await Promise.all(
        rows.map((row, index) => mapRowToChannelProduct(row, index + 2))
      )
      setParsedData(products)
    } catch (error) {
      console.error('Error parsing CSV:', error)
      alert('เกิดข้อผิดพลาดในการอ่านไฟล์ CSV')
    } finally {
      setIsParsing(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)

    try {
      const text = await selectedFile.text()
      await processCSVText(text)
    } catch (error) {
      console.error('Error reading file:', error)
      alert('เกิดข้อผิดพลาดในการอ่านไฟล์')
    }
  }

  const handlePasteImport = async () => {
    if (!pasteText.trim()) {
      alert('กรุณาวางข้อมูล CSV')
      return
    }
    await processCSVText(pasteText)
  }

  const handleImport = async () => {
    const validProducts = parsedData.filter(p => p.isValid && p.existingProductId)
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
        const updateData: any = {}
        
        // Only update fields that are explicitly set
        if (product.sell_on_grab !== undefined) updateData.sell_on_grab = product.sell_on_grab
        if (product.sell_on_lineman !== undefined) updateData.sell_on_lineman = product.sell_on_lineman
        if (product.sell_on_lazada !== undefined) updateData.sell_on_lazada = product.sell_on_lazada
        if (product.sell_on_shopee !== undefined) updateData.sell_on_shopee = product.sell_on_shopee
        if (product.sell_on_line_shopping !== undefined) updateData.sell_on_line_shopping = product.sell_on_line_shopping
        if (product.sell_on_tiktok !== undefined) updateData.sell_on_tiktok = product.sell_on_tiktok
        
        if (product.price_grab !== undefined) updateData.price_grab = product.price_grab
        if (product.price_lineman !== undefined) updateData.price_lineman = product.price_lineman
        if (product.price_lazada !== undefined) updateData.price_lazada = product.price_lazada
        if (product.price_shopee !== undefined) updateData.price_shopee = product.price_shopee
        if (product.price_line_shopping !== undefined) updateData.price_line_shopping = product.price_line_shopping
        if (product.price_tiktok !== undefined) updateData.price_tiktok = product.price_tiktok

        const { error } = await supabase
          .from('products')
          .update(updateData)
          .eq('id', product.existingProductId)

        if (error) throw error
        success++
      } catch (error: any) {
        console.error('Error updating product channels:', error)
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
    const headers = 'รหัสสินค้า,บาร์โค้ด,ชื่อสินค้า,ขาย GRAB,ขาย LineMan,ขาย LAZADA,ขาย Shopee,ขาย Line Shopping,ขาย TikTok,ราคา GRAB,ราคา LineMan,ราคา LAZADA,ราคา Shopee,ราคา Line Shopping,ราคา TikTok'
    const example = 'SKU001,1234567890123,พาราเซตามอล 500mg,Y,Y,N,N,Y,N,35,35,,,38,'
    const csv = `${headers}\n${example}`
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'sales_channel_import_template.csv'
    link.click()
  }

  const getChannelStatus = (enabled: boolean) => {
    return enabled ? (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
        ขาย
      </span>
    ) : (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
        ไม่ขาย
      </span>
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileSpreadsheet className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">นำเข้าช่องทางการขาย</h2>
              <p className="text-sm text-gray-500">Import Sales Channels</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Import Mode Toggle */}
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setImportMode('file')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                importMode === 'file' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText className="h-4 w-4" />
              ไฟล์ CSV
            </button>
            <button
              onClick={() => setImportMode('text')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                importMode === 'text' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Type className="h-4 w-4" />
              วางข้อความ
            </button>
          </div>

          {/* Available Columns Info */}
          <Card className="p-4 bg-purple-50 border-purple-200">
            <h3 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              หัวคอลัมน์ที่รองรับ
            </h3>
            <p className="text-sm text-purple-700 mb-3">
              ระบุช่องทางการขายด้วย Y/Yes/1 สำหรับขาย หรือ N/No/0 สำหรับไม่ขาย
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
              {AVAILABLE_COLUMNS.map((col, idx) => (
                <div key={idx} className="flex flex-col bg-white rounded p-2">
                  <span className="font-medium text-gray-900">{col.th}</span>
                  <span className="text-xs text-gray-500">{col.en}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* File Upload */}
          {importMode === 'file' && (
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
          )}

          {/* Text Paste */}
          {importMode === 'text' && (
            <Card className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                วางข้อมูล CSV (หัวคอลัมน์แถวแรก + ข้อมูลสินค้า)
              </label>
              <textarea
                ref={textareaRef}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="รหัสสินค้า,บาร์โค้ด,ชื่อสินค้า,ขาย GRAB,ขาย LineMan,ขาย LAZADA,ขาย Shopee,ขาย Line Shopping,ขาย TikTok&#10;SKU001,1234567890123,พาราเซตามอล 500mg,Y,Y,N,N,Y,N"
                className="w-full h-48 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
              <div className="mt-3 flex justify-end">
                <Button
                  variant="primary"
                  onClick={handlePasteImport}
                  disabled={isParsing || !pasteText.trim()}
                  className="flex items-center gap-2"
                >
                  {isParsing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      กำลังประมวลผล...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      ตรวจสอบข้อมูล
                    </>
                  )}
                </Button>
              </div>
            </Card>
          )}

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
                      <th className="px-3 py-2 text-left">รหัส/บาร์โค้ด</th>
                      <th className="px-3 py-2 text-left">GRAB</th>
                      <th className="px-3 py-2 text-left">LineMan</th>
                      <th className="px-3 py-2 text-left">LAZADA</th>
                      <th className="px-3 py-2 text-left">Shopee</th>
                      <th className="px-3 py-2 text-left">Line Shop</th>
                      <th className="px-3 py-2 text-left">TikTok</th>
                      <th className="px-3 py-2 text-center">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {parsedData.slice(0, 10).map((product, idx) => (
                      <tr key={idx} className={!product.isValid ? 'bg-red-50' : ''}>
                        <td className="px-3 py-2 text-gray-500">{product.row}</td>
                        <td className="px-3 py-2">
                          <div className="font-medium">{product.sku || product.barcode}</div>
                          {product.name_th && <div className="text-xs text-gray-500">{product.name_th}</div>}
                        </td>
                        <td className="px-3 py-2">{getChannelStatus(product.sell_on_grab)}</td>
                        <td className="px-3 py-2">{getChannelStatus(product.sell_on_lineman)}</td>
                        <td className="px-3 py-2">{getChannelStatus(product.sell_on_lazada)}</td>
                        <td className="px-3 py-2">{getChannelStatus(product.sell_on_shopee)}</td>
                        <td className="px-3 py-2">{getChannelStatus(product.sell_on_line_shopping)}</td>
                        <td className="px-3 py-2">{getChannelStatus(product.sell_on_tiktok)}</td>
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
            {file && importMode === 'file' && <span>ไฟล์: {file.name}</span>}
            {importMode === 'text' && pasteText && <span>ข้อความ: {pasteText.split('\n').length - 1} แถว</span>}
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
