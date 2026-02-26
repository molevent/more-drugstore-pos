/**
 * Grab Order OCR Service
 * Uses Gemini Vision API to extract structured data from Grab/delivery platform order screenshots
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

// ─── Types ───────────────────────────────────────────────────

export interface GrabOrderItem {
  item_name: string
  quantity: number
  unit_price: number
  total_price: number
  notes: string
}

export interface GrabOrderData {
  order_number: string
  booking_code: string
  tracking_number: string
  platform: string
  customer_name: string
  customer_phone: string
  customer_notes: string
  driver_name: string
  driver_phone: string
  subtotal: number
  discount: number
  delivery_fee: number
  platform_fee: number
  vat: number
  grand_total: number
  items: GrabOrderItem[]
}

export interface PickVerifyResult {
  items_found: {
    item_name: string
    quantity_visible: number
    confidence: number
    notes: string
  }[]
  missing_items: string[]
  extra_items: string[]
  overall_match: boolean
  confidence: number
  notes: string
}

// ─── Helpers ─────────────────────────────────────────────────

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function getMimeType(file: File): string {
  if (file.type.startsWith('image/')) return file.type
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'png') return 'image/png'
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'webp') return 'image/webp'
  return 'image/jpeg'
}

async function callGeminiVision(files: File[], prompt: string, temperature = 0.1): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('ไม่พบ Gemini API Key กรุณาตั้งค่า VITE_GEMINI_API_KEY ในไฟล์ .env')
  }

  const fileParts = await Promise.all(
    files.map(async (file) => ({
      inline_data: {
        mime_type: getMimeType(file),
        data: await fileToBase64(file)
      }
    }))
  )

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 60000)

  try {
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{
          parts: [...fileParts, { text: prompt }]
        }],
        generationConfig: {
          temperature,
          topK: 1,
          topP: 1,
          maxOutputTokens: 8192,
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

    return aiResponse
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error('การสแกนใช้เวลานานเกินไป กรุณาลองใหม่')
    }
    throw error
  }
}

function parseJsonResponse<T>(response: string): T {
  // Try code block first
  const codeBlockMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
  let jsonStr = codeBlockMatch ? codeBlockMatch[1] : null

  // Try greedy match
  if (!jsonStr) {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) jsonStr = jsonMatch[0]
  }

  if (!jsonStr) {
    throw new Error('ไม่สามารถแปลงข้อมูลจากรูปภาพได้')
  }

  // Clean up
  let cleanJson = jsonStr
    .replace(/,\s*}/g, '}')
    .replace(/,\s*\]/g, ']')
    .replace(/[\x00-\x1F\x7F]/g, (c) => c === ' ' ? ' ' : '')

  try {
    return JSON.parse(cleanJson)
  } catch {
    // Remove comments and retry
    cleanJson = cleanJson
      .replace(/\/\/[^\n"]*(?=\n|$)/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/,\s*}/g, '}')
      .replace(/,\s*\]/g, ']')
    return JSON.parse(cleanJson)
  }
}

// ─── OCR: Scan Grab Order ────────────────────────────────────

export async function scanGrabOrder(files: File[]): Promise<GrabOrderData> {
  if (files.length === 0) {
    throw new Error('กรุณาถ่ายรูปหรืออัพโหลดรูปออเดอร์')
  }

  const prompt = `คุณเป็นระบบ OCR ที่แม่นยำสูง กรุณาอ่านรูปออเดอร์จากแอป Grab/LINE MAN/Robinhood/Foodpanda หรือแพลตฟอร์มเดลิเวอรี่

ดึงข้อมูลออกมาเป็น JSON เท่านั้น ห้ามมีข้อความอื่นนอก JSON:
{
  "order_number": "เลขออเดอร์ เช่น GM-624",
  "booking_code": "รหัสการจอง (ถ้ามี)",
  "tracking_number": "เลข tracking (ถ้ามี)",
  "platform": "grab หรือ lineman หรือ robinhood หรือ foodpanda",
  "customer_name": "ชื่อลูกค้า",
  "customer_phone": "เบอร์ลูกค้า",
  "customer_notes": "หมายเหตุจากลูกค้า",
  "driver_name": "ชื่อคนขับ",
  "driver_phone": "เบอร์คนขับ",
  "subtotal": 0.00,
  "discount": 0.00,
  "delivery_fee": 0.00,
  "platform_fee": 0.00,
  "vat": 0.00,
  "grand_total": 0.00,
  "items": [
    {
      "item_name": "ชื่อสินค้าเต็มๆ ตามที่เห็น",
      "quantity": 1,
      "unit_price": 0.00,
      "total_price": 0.00,
      "notes": "หมายเหตุรายการ (ถ้ามี)"
    }
  ]
}

คำแนะนำสำคัญ:
- อ่านทุกรายการสินค้าในออเดอร์ ห้ามข้ามรายการใดๆ
- ชื่อสินค้าให้ใส่เต็มตามที่เห็น รวม ขนาด/ปริมาณ เช่น "Bioflor 250 mg (10 capsules)"
- ถ้าไม่เห็นข้อมูลใดให้ใส่ "" (string ว่าง) สำหรับ text หรือ 0 สำหรับตัวเลข
- ระบุ platform จาก UI ที่เห็น (สี เขียว=grab, ชมพู/แดง=foodpanda, เขียวอ่อน=lineman)
- ราคาให้ใส่เป็นตัวเลข ไม่ต้องมีสัญลักษณ์ ฿`

  const response = await callGeminiVision(files, prompt)
  console.log('Grab OCR response:', response.substring(0, 500))

  const result = parseJsonResponse<GrabOrderData>(response)

  // Validate
  if (!result.items || result.items.length === 0) {
    console.warn('Grab OCR: No items found in response')
  } else {
    console.log(`Grab OCR: Found ${result.items.length} items`)
  }

  return result
}

// ─── Combined: Scan Order + Verify Pick in one shot ──────────

export interface CombinedScanResult {
  order: GrabOrderData
  verification: PickVerifyResult
}

export async function scanAndVerifyOrder(
  orderPhotos: File[],
  pickPhotos: File[]
): Promise<CombinedScanResult> {
  if (orderPhotos.length === 0) {
    throw new Error('กรุณาถ่ายรูปออเดอร์')
  }
  if (pickPhotos.length === 0) {
    throw new Error('กรุณาถ่ายรูปสินค้าที่หยิบ')
  }

  const allFiles = [...orderPhotos, ...pickPhotos]
  const orderCount = orderPhotos.length
  const pickCount = pickPhotos.length

  const prompt = `คุณเป็นระบบ AI สำหรับร้านขายยา ทำ 2 งานพร้อมกัน:

**งาน 1: อ่านออเดอร์** — รูปที่ 1-${orderCount} เป็นรูปออเดอร์จากแอป Grab/LINE MAN/Robinhood/Foodpanda
**งาน 2: ตรวจสอบสินค้า** — รูปที่ ${orderCount + 1}-${orderCount + pickCount} เป็นรูปสินค้าที่หยิบแล้ว

กรุณา:
1. อ่านข้อมูลออเดอร์จากรูปออเดอร์
2. เปรียบเทียบสินค้าในรูปหยิบกับรายการในออเดอร์
3. ตรวจว่าหยิบครบถูกต้องหรือไม่

ตอบเป็น JSON เท่านั้น ห้ามมีข้อความอื่น:
{
  "order": {
    "order_number": "เลขออเดอร์",
    "booking_code": "รหัสการจอง",
    "tracking_number": "",
    "platform": "grab/lineman/robinhood/foodpanda",
    "customer_name": "ชื่อลูกค้า",
    "customer_phone": "เบอร์ลูกค้า",
    "customer_notes": "",
    "driver_name": "ชื่อคนขับ",
    "driver_phone": "เบอร์คนขับ",
    "subtotal": 0.00,
    "discount": 0.00,
    "delivery_fee": 0.00,
    "platform_fee": 0.00,
    "vat": 0.00,
    "grand_total": 0.00,
    "items": [
      { "item_name": "ชื่อสินค้าเต็ม", "quantity": 1, "unit_price": 0.00, "total_price": 0.00, "notes": "" }
    ]
  },
  "verification": {
    "items_found": [
      { "item_name": "ชื่อสินค้าที่เห็นในรูปหยิบ", "quantity_visible": 1, "confidence": 90, "notes": "" }
    ],
    "missing_items": ["ชื่อสินค้าที่ไม่เห็นในรูปหยิบ"],
    "extra_items": ["ชื่อสินค้าที่เห็นเกินมา"],
    "overall_match": true,
    "confidence": 85,
    "notes": "สรุปผล"
  }
}

คำแนะนำ:
- อ่านทุกรายการสินค้า ห้ามข้าม
- ชื่อสินค้าให้ใส่เต็ม รวมขนาด/ปริมาณ
- เปรียบเทียบสินค้าบนกล่อง/ซอง กับรายการในออเดอร์
- นับจำนวนชิ้นที่เห็นในรูปหยิบ
- overall_match = true ถ้าหยิบครบทุกรายการ
- ถ้าไม่เห็นข้อมูล ใส่ "" หรือ 0`

  const response = await callGeminiVision(allFiles, prompt, 0.1)
  console.log('Combined scan+verify response:', response.substring(0, 500))

  const result = parseJsonResponse<CombinedScanResult>(response)

  if (!result.order?.items || result.order.items.length === 0) {
    console.warn('Combined scan: No order items found')
  }

  return result
}

// ─── AI: Verify Picked Items ─────────────────────────────────

export async function verifyPickedItems(
  pickPhotos: File[],
  expectedItems: { item_name: string; quantity: number }[]
): Promise<PickVerifyResult> {
  if (pickPhotos.length === 0) {
    throw new Error('กรุณาถ่ายรูปสินค้าที่หยิบ')
  }

  const itemsList = expectedItems
    .map((item, i) => `${i + 1}. ${item.item_name} จำนวน ${item.quantity} ชิ้น`)
    .join('\n')

  const prompt = `คุณเป็นระบบตรวจสอบการหยิบสินค้า กรุณาเปรียบเทียบสินค้าในรูปกับรายการที่ต้องหยิบ

รายการที่ต้องหยิบ:
${itemsList}

ดูรูปสินค้าที่หยิบแล้วตรวจสอบว่า:
1. สินค้าแต่ละรายการหยิบครบหรือไม่
2. จำนวนถูกต้องหรือไม่
3. มีสินค้าที่หยิบเกินมาหรือไม่

ตอบเป็น JSON เท่านั้น:
{
  "items_found": [
    {
      "item_name": "ชื่อสินค้าที่เห็นในรูป",
      "quantity_visible": 1,
      "confidence": 90,
      "notes": "หมายเหตุ เช่น เห็นชัด/ไม่ชัด"
    }
  ],
  "missing_items": ["ชื่อสินค้าที่ไม่เห็นในรูป"],
  "extra_items": ["ชื่อสินค้าที่เห็นเกินมา"],
  "overall_match": true,
  "confidence": 85,
  "notes": "สรุปผลการตรวจสอบ"
}

คำแนะนำ:
- เปรียบเทียบชื่อยา/สินค้าบนกล่อง/ซอง กับรายการ
- นับจำนวนชิ้นที่เห็น
- confidence 0-100 (100 = แน่ใจมาก)
- overall_match = true ถ้าหยิบครบทุกรายการและจำนวนถูกต้อง`

  const response = await callGeminiVision(pickPhotos, prompt, 0.2)
  console.log('Pick verify response:', response.substring(0, 500))

  return parseJsonResponse<PickVerifyResult>(response)
}
