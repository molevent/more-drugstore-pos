/**
 * OCR Bill Scanner Service
 * Uses Gemini Vision API to extract structured data from supplier invoices/delivery notes
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

export interface ScannedBillItem {
  line_number: number
  supplier_product_id: string
  product_name: string
  lot_number: string
  expiry_date: string
  quantity: number
  unit: string
  unit_price: number
  discount: number
  total: number
}

export interface ScannedBillData {
  supplier_name: string
  supplier_tax_id: string
  document_type: string       // 'tax_invoice' | 'delivery_note' | 'receipt'
  document_number: string
  order_id: string
  document_date: string
  customer_name: string
  customer_id: string
  items: ScannedBillItem[]
  subtotal_before_discount: number
  discount: number
  subtotal: number
  voucher_discount: number
  transaction_fee: number
  total_before_vat: number
  vat_amount: number
  grand_total: number
  notes: string
}

/**
 * Convert a File to base64 string for Gemini Vision API
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove the data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Get MIME type for Gemini API
 */
function getMimeType(file: File): string {
  if (file.type === 'application/pdf') return 'application/pdf'
  if (file.type.startsWith('image/')) return file.type
  // Fallback based on extension
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return 'application/pdf'
  if (ext === 'png') return 'image/png'
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  return 'image/jpeg'
}

/**
 * Scan a bill image/PDF and extract structured data using Gemini Vision
 */
export async function scanBill(files: File[]): Promise<ScannedBillData> {
  if (!GEMINI_API_KEY) {
    throw new Error('ไม่พบ Gemini API Key กรุณาตั้งค่า VITE_GEMINI_API_KEY ในไฟล์ .env')
  }

  if (files.length === 0) {
    throw new Error('กรุณาอัพโหลดไฟล์อย่างน้อย 1 ไฟล์')
  }

  // Convert all files to base64
  const fileParts = await Promise.all(
    files.map(async (file) => ({
      inline_data: {
        mime_type: getMimeType(file),
        data: await fileToBase64(file)
      }
    }))
  )

  const prompt = `คุณเป็นระบบ OCR ที่แม่นยำสูง กรุณาอ่านเอกสารใบกำกับภาษี/ใบส่งสินค้า/ใบเสร็จรับเงินนี้ และดึงข้อมูลออกมาเป็น JSON

**กรุณาอ่านข้อมูลทุกรายการอย่างละเอียด ตรวจสอบตัวเลขให้ถูกต้อง**

ตอบเป็น JSON เท่านั้น ในรูปแบบนี้:
{
  "supplier_name": "ชื่อบริษัทผู้ขาย",
  "supplier_tax_id": "เลขประจำตัวผู้เสียภาษี",
  "document_type": "tax_invoice หรือ delivery_note หรือ receipt",
  "document_number": "เลขที่เอกสาร",
  "order_id": "เลขที่คำสั่งซื้อ/Order ID",
  "document_date": "วันที่เอกสาร ในรูปแบบ YYYY-MM-DD",
  "customer_name": "ชื่อลูกค้า/ผู้ซื้อ",
  "customer_id": "รหัสลูกค้า",
  "items": [
    {
      "line_number": 1,
      "supplier_product_id": "รหัสสินค้าของผู้ขาย (ID column)",
      "product_name": "ชื่อรายการสินค้า (Description)",
      "lot_number": "เลขที่ล็อต/Lot No.",
      "expiry_date": "วันหมดอายุ ในรูปแบบ YYYY-MM-DD",
      "quantity": 1,
      "unit": "หน่วย",
      "unit_price": 0.00,
      "discount": 0.00,
      "total": 0.00
    }
  ],
  "subtotal_before_discount": 0.00,
  "discount": 0.00,
  "subtotal": 0.00,
  "voucher_discount": 0.00,
  "transaction_fee": 0.00,
  "total_before_vat": 0.00,
  "vat_amount": 0.00,
  "grand_total": 0.00,
  "notes": "หมายเหตุอื่นๆ"
}

คำแนะนำ:
- อ่านทุกแถวในตารางรายการสินค้า อย่าข้ามรายการใดๆ
- รหัสสินค้า (supplier_product_id) คือ เลขในคอลัมน์ "รหัส" หรือ "ID" 
- unit_price คือ ราคาต่อหน่วย (Unit Price)
- discount คือ ส่วนลดต่อรายการ
- total คือ เงินรวมของรายการนั้น
- ถ้ามีหลายหน้า ให้รวมรายการจากทุกหน้า
- ตรวจสอบยอดรวมให้ตรงกับที่แสดงในเอกสาร
- วันที่หมดอายุให้แปลงเป็น YYYY-MM-DD (เช่น 31.07.2029 → 2029-07-31)`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 60000) // 60s timeout

  try {
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            ...fileParts,
            { text: prompt }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 1,
          maxOutputTokens: 32768,
        }
      }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini Vision API error:', response.status, errorText)
      if (response.status === 429) {
        throw new Error('ใช้งาน API เกินโควต้า กรุณาลองใหม่ภายหลัง')
      }
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!aiResponse) {
      throw new Error('ไม่ได้รับคำตอบจาก AI กรุณาลองใหม่')
    }

    console.log('OCR AI Response:', aiResponse)

    // Extract JSON from response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('ไม่สามารถแปลงข้อมูลจากเอกสารได้')
    }

    const result: ScannedBillData = JSON.parse(jsonMatch[0])
    
    // Validate items were parsed
    if (!result.items || result.items.length === 0) {
      console.warn('OCR: No items parsed from response. Full AI text:', aiResponse)
    } else {
      console.log(`OCR: Parsed ${result.items.length} items successfully`)
    }
    
    return result

  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error('การสแกนใช้เวลานานเกินไป กรุณาลองใหม่')
    }
    throw error
  }
}
