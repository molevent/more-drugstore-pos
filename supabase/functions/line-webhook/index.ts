// Supabase Edge Function — LINE Webhook Handler
// Receives messages from LINE users and replies automatically.
//
// Supported commands (Thai):
//   ยอดค้าง / ค้างชำระ       → ดึงรายการค่าใช้จ่ายที่ยังไม่ชำระ
//   ยอดขาย / ยอดวันนี้       → ดึงยอดขายวันนี้
//   ถามเภสัชกร / อาการ:XXX  → AI วิเคราะห์อาการแนะนำยาจากสินค้าในร้าน
//   ช่วยเหลือ / help         → แสดงคำสั่งทั้งหมด
//
// Requires env variables:
//   LINE_CHANNEL_ACCESS_TOKEN
//   LINE_CHANNEL_SECRET (for signature verification)
//   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (for DB queries)
//   GEMINI_API_KEY (for AI pharmacist feature)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── Helpers ─────────────────────────────────────────────────

function getEnv(key: string): string {
  const v = Deno.env.get(key)
  if (!v) throw new Error(`Missing env: ${key}`)
  return v
}

async function verifySignature(body: string, signature: string, channelSecret: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(channelSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
  const digest = btoa(String.fromCharCode(...new Uint8Array(sig)))
  return digest === signature
}

async function replyMessage(replyToken: string, messages: any[], token: string) {
  const res = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  })
  const text = await res.text()
  console.log('Reply result:', res.status, text || '(ok)')
}

function textMsg(text: string) {
  return { type: 'text', text }
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2 }).format(n)
}

// ─── Command handlers ────────────────────────────────────────

async function handleOutstanding(supabase: any): Promise<string> {
  // Credit terms (same defaults as lineService.ts)
  const CREDIT_TERMS = [
    { vendor_match: 'ฟาร์มาแคร์', days: 7 },
  ]

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('id, vendor, expense_date, document_date, amount, description, payment_voucher_id')
    .gte('expense_date', ninetyDaysAgo.toISOString().split('T')[0])
    .is('payment_voucher_id', null)
    .order('expense_date', { ascending: false })

  if (error) return `❌ เกิดข้อผิดพลาด: ${error.message}`
  if (!expenses || expenses.length === 0) return '✅ ไม่มียอดค้างชำระ'

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const lines: string[] = ['\n📋 รายการค้างชำระ']
  lines.push('─────────────────')

  let total = 0
  let count = 0

  for (const exp of expenses) {
    if (!exp.vendor) continue

    const rule = CREDIT_TERMS.find(r => exp.vendor.includes(r.vendor_match))
    const baseDate = new Date(exp.document_date || exp.expense_date)
    const dueDate = new Date(baseDate)
    if (rule) {
      dueDate.setDate(dueDate.getDate() + rule.days)
    }
    dueDate.setHours(0, 0, 0, 0)

    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    let statusIcon = '🟢'
    let statusText = `อีก ${diffDays} วัน`
    if (diffDays < 0) {
      statusIcon = '🔴'
      statusText = `เลยกำหนด ${Math.abs(diffDays)} วัน`
    } else if (diffDays === 0) {
      statusIcon = '🟡'
      statusText = 'ครบกำหนดวันนี้'
    }

    lines.push(`${statusIcon} ${exp.vendor}`)
    lines.push(`   💰 ฿${formatCurrency(exp.amount)} — ${statusText}`)
    total += exp.amount
    count++

    if (count >= 10) {
      lines.push(`... และอีก ${expenses.length - 10} รายการ`)
      break
    }
  }

  lines.push('─────────────────')
  lines.push(`💰 รวม ${expenses.length} รายการ: ฿${formatCurrency(total)}`)

  return lines.join('\n')
}

async function handleTodaySales(supabase: any): Promise<string> {
  const today = new Date().toISOString().split('T')[0]

  const { data: orders, error } = await supabase
    .from('orders')
    .select('total_amount')
    .gte('created_at', today)
    .lte('created_at', today + 'T23:59:59')

  if (error) return `❌ เกิดข้อผิดพลาด: ${error.message}`

  const count = orders?.length || 0
  const total = orders?.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) || 0

  const lines: string[] = [
    `\n📊 ยอดขายวันนี้`,
    `📅 ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    '─────────────────',
    `🧾 จำนวนบิล: ${count} รายการ`,
    `💰 ยอดรวม: ฿${formatCurrency(total)}`,
  ]

  return lines.join('\n')
}

function handleHelp(): string {
  return [
    '\n📖 คำสั่งที่ใช้ได้:',
    '─────────────────',
    '🧠 "ถามเภสัชกร: อาการ..." — AI แนะนำยา',
    '📋 "ยอดค้าง" — ดูรายการค้างชำระ',
    '📊 "ยอดขาย" — ดูยอดขายวันนี้',
    '❓ "help" — แสดงเมนูนี้',
    '─────────────────',
    '💬 หรือถามอะไรก็ได้เกี่ยวกับร้าน เช่น:',
    '• "ราคาพาราเซตามอล"',
    '• "วิธีใช้ Amoxicillin"',
    '• "รายละเอียด ยาแก้ไอ"',
    '• "สินค้าขายดี 5 อันดับ"',
    '• "วันนี้ใครเข้างาน" / "เภสัชเข้าวันนี้ใคร"',
    '• "ตารางสัปดาห์นี้" / "ใครลาวันนี้"',
    '• "ยอดขายเดือนนี้" / "ค่าใช้จ่าย"',
    '• "สินค้าใกล้หมด" / "มีกี่รายการ"',
  ].join('\n')
}

// ─── Gemini AI helper ────────────────────────────────────────

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

async function callGemini(prompt: string): Promise<string | null> {
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
  if (!geminiApiKey) return null

  const response = await fetch(`${GEMINI_API_URL}?key=${geminiApiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 1024 }
    }),
  })

  if (!response.ok) {
    console.error('Gemini error:', response.status, await response.text())
    return null
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  return text || null
}

// ─── AI Pharmacist handler ───────────────────────────────────

function extractSymptoms(message: string): string | null {
  const patterns = [
    /(?:ถามเภสัชกร|ถามหมอ|แนะนำยา|อาการ|ปรึกษา)[:\s：]*(.+)/i,
    /(?:ปวด|เจ็บ|ไข้|ไอ|จาม|ท้องเสีย|คลื่นไส้|อาเจียน|ผื่น|คัน|แพ้|เวียนหัว|อักเสบ|บวม|แสบ|หวัด|น้ำมูก|เสียด|จุก|แน่น).+/i,
  ]
  for (const pattern of patterns) {
    const match = message.match(pattern)
    if (match) return match[1] || match[0]
  }
  return null
}

async function handleAIPharmacist(symptoms: string, supabase: any): Promise<string> {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        name_th, base_price, stock_quantity, is_prescription_required,
        category:categories(name_th),
        medicine_details (dosage_form, strength, active_ingredients)
      `)
      .eq('is_active', true)
      .gt('stock_quantity', 0)

    if (error || !products?.length) return '❌ ไม่สามารถดึงข้อมูลสินค้าได้'

    const productList = products.map((p: any, i: number) => {
      const med = p.medicine_details?.[0]
      let line = `${i + 1}. ${p.name_th}`
      if (med?.strength) line += ` ${med.strength}`
      if (med?.active_ingredients) line += ` [${med.active_ingredients}]`
      if (p.is_prescription_required) line += ' ⚠️ใบสั่งยา'
      return line
    }).join('\n')

    const aiText = await callGemini(`คุณเป็นเภสัชกรร้านยา "More Drug Store" ตอบลูกค้าผ่าน LINE

อาการ: ${symptoms}

ยาในร้าน (${products.length} รายการ):
${productList}

ตอบภาษาไทย สั้นกระชับ ≤1500 ตัวอักษร:
1. 🔍 วิเคราะห์อาการสั้นๆ
2. 💊 แนะนำยา 2-4 ตัวจากในร้าน พร้อมวิธีใช้
3. ⚠️ คำเตือน (ถ้ามี)
4. 🏥 ควรพบแพทย์เมื่อไหร่ (ถ้าจำเป็น)

เลือกยาจากในร้านเท่านั้น, ห้ามแนะนำยาที่ต้องใบสั่งยา
ขึ้นต้น "🧠 AI เภสัชกร", ลงท้าย "⚠️ คำแนะนำจาก AI ไม่ใช่การวินิจฉัยทางการแพทย์"`)

    return aiText || '❌ AI ไม่สามารถวิเคราะห์ได้ กรุณาลองใหม่'
  } catch (err: any) {
    console.error('AI Pharmacist error:', err)
    return '❌ เกิดข้อผิดพลาด กรุณาลองใหม่ภายหลัง'
  }
}

// ─── Data fetcher for general queries ────────────────────────

async function fetchStoreData(question: string, supabase: any): Promise<string> {
  const q = question.toLowerCase()
  const today = new Date().toISOString().split('T')[0]
  const sections: string[] = []

  // ── Product-specific search (price, description, details of a specific product) ──
  // Extract product name from the question by removing common Thai question words
  const searchTerms = question
    .replace(/ราคา|เท่าไหร่|เท่าไร|คือ|อะไร|บอก|ดู|หา|ค้นหา|สินค้า|ยา|มี|ไหม|บ้าง|ข้อมูล|รายละเอียด|คำอธิบาย|วิธีใช้|ผลข้างเคียง|ส่วนประกอบ|สรรพคุณ|description|price|detail|info|ของ|ตัว|ชื่อ|เหลือ|กี่|stock|สต็อก/gi, '')
    .trim()

  if (searchTerms.length >= 2) {
    // Search by name_th using ilike
    const { data: matched } = await supabase
      .from('products')
      .select(`
        name_th, name_en, barcode, sku, description_th, description_en,
        base_price, cost_price, stock_quantity, min_stock_level, unit,
        is_active, category:categories(name_th),
        drug_info (active_ingredients, dosage, side_effects, contraindications, usage_instructions_th, warnings, storage_info)
      `)
      .or(`name_th.ilike.%${searchTerms}%,name_en.ilike.%${searchTerms}%,barcode.eq.${searchTerms}`)
      .limit(10)

    if (matched?.length) {
      sections.push(`🔎 พบสินค้าที่ตรงกับ "${searchTerms}" (${matched.length} รายการ):`)
      matched.forEach((p: any) => {
        sections.push(`\n📌 ${p.name_th}${p.name_en ? ` (${p.name_en})` : ''}`)
        if (p.category?.name_th) sections.push(`   🏷️ หมวดหมู่: ${p.category.name_th}`)
        sections.push(`   💰 ราคาขาย: ฿${p.base_price} | ราคาทุน: ฿${p.cost_price}`)
        sections.push(`   📦 สต็อก: ${p.stock_quantity} ${p.unit || 'ชิ้น'}${p.stock_quantity <= p.min_stock_level ? ' ⚠️ต่ำกว่าขั้นต่ำ' : ''}`)
        if (p.barcode) sections.push(`   🔖 Barcode: ${p.barcode}`)
        if (p.description_th) sections.push(`   📝 คำอธิบาย: ${p.description_th}`)

        const drug = p.drug_info?.[0]
        if (drug) {
          if (drug.active_ingredients) sections.push(`   💊 สารออกฤทธิ์: ${drug.active_ingredients}`)
          if (drug.dosage) sections.push(`   📐 ขนาดยา: ${drug.dosage}`)
          if (drug.usage_instructions_th) sections.push(`   📋 วิธีใช้: ${drug.usage_instructions_th}`)
          if (drug.side_effects) sections.push(`   ⚠️ ผลข้างเคียง: ${drug.side_effects}`)
          if (drug.contraindications) sections.push(`   🚫 ข้อห้ามใช้: ${drug.contraindications}`)
          if (drug.warnings) sections.push(`   ⚠️ คำเตือน: ${drug.warnings}`)
          if (drug.storage_info) sections.push(`   🌡️ การเก็บรักษา: ${drug.storage_info}`)
        }
        sections.push(`   สถานะ: ${p.is_active ? '✅ขายอยู่' : '❌ปิดการขาย'}`)
      })
    }
  }

  // Products / Stock queries (general listing)
  if (q.match(/สินค้า|สต็อก|stock|คงเหลือ|หมด|เหลือ|ราคา|price|product|มีอะไร|กี่รายการ/) && sections.length === 0) {
    const { data: products } = await supabase
      .from('products')
      .select('name_th, barcode, base_price, cost_price, stock_quantity, min_stock_level, is_active, category:categories(name_th)')
      .eq('is_active', true)
      .order('stock_quantity', { ascending: true })
      .limit(50)

    if (products?.length) {
      sections.push(`📦 สินค้า (${products.length} รายการ, เรียงจากสต็อกน้อยสุด):`)
      products.forEach((p: any) => {
        sections.push(`- ${p.name_th} | สต็อก: ${p.stock_quantity} | ราคา: ฿${p.base_price} | ทุน: ฿${p.cost_price}${p.stock_quantity <= p.min_stock_level ? ' ⚠️ต่ำกว่าขั้นต่ำ' : ''}`)
      })
    }
  }

  // Sales / Orders queries
  if (q.match(/ยอดขาย|ขาย|sale|order|บิล|รายได้|revenue|กำไร|profit|วันนี้|เดือนนี้|สัปดาห์/)) {
    // Today's sales
    const { data: todayOrders } = await supabase
      .from('orders')
      .select('total_amount, payment_method, created_at')
      .gte('created_at', today)
      .lte('created_at', today + 'T23:59:59')

    const todayTotal = todayOrders?.reduce((s: number, o: any) => s + (o.total_amount || 0), 0) || 0
    sections.push(`📊 ยอดขายวันนี้: ${todayOrders?.length || 0} บิล = ฿${formatCurrency(todayTotal)}`)

    // This month's sales
    const monthStart = today.substring(0, 7) + '-01'
    const { data: monthOrders } = await supabase
      .from('orders')
      .select('total_amount')
      .gte('created_at', monthStart)

    const monthTotal = monthOrders?.reduce((s: number, o: any) => s + (o.total_amount || 0), 0) || 0
    sections.push(`📊 ยอดขายเดือนนี้: ${monthOrders?.length || 0} บิล = ฿${formatCurrency(monthTotal)}`)

    // Top selling products (this month)
    if (q.match(/ขายดี|top|อันดับ|best.*sell/)) {
      const { data: topItems } = await supabase
        .from('order_items')
        .select('product_name, quantity, total_price, order_id')
        .limit(200)

      if (topItems?.length) {
        const productSales: Record<string, { qty: number; revenue: number }> = {}
        for (const item of topItems) {
          const name = item.product_name || 'ไม่ทราบ'
          if (!productSales[name]) productSales[name] = { qty: 0, revenue: 0 }
          productSales[name].qty += item.quantity || 0
          productSales[name].revenue += item.total_price || 0
        }
        const sorted = Object.entries(productSales).sort((a, b) => b[1].qty - a[1].qty).slice(0, 10)
        sections.push('\n🏆 สินค้าขายดี:')
        sorted.forEach(([name, data], i) => {
          sections.push(`${i + 1}. ${name} — ${data.qty} ชิ้น (฿${formatCurrency(data.revenue)})`)
        })
      }
    }
  }

  // Expenses queries
  if (q.match(/ค่าใช้จ่าย|expense|รายจ่าย|ต้นทุน|ซื้อ|เบิก|จ่าย/)) {
    const monthStart = today.substring(0, 7) + '-01'
    const { data: expenses } = await supabase
      .from('expenses')
      .select('vendor, amount, description, expense_date, payment_voucher_id')
      .gte('expense_date', monthStart)
      .order('expense_date', { ascending: false })
      .limit(30)

    if (expenses?.length) {
      const total = expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0)
      const unpaid = expenses.filter((e: any) => !e.payment_voucher_id)
      const unpaidTotal = unpaid.reduce((s: number, e: any) => s + (e.amount || 0), 0)
      sections.push(`💸 ค่าใช้จ่ายเดือนนี้: ${expenses.length} รายการ = ฿${formatCurrency(total)}`)
      sections.push(`💸 ยังไม่ชำระ: ${unpaid.length} รายการ = ฿${formatCurrency(unpaidTotal)}`)
      sections.push('\nรายการล่าสุด:')
      expenses.slice(0, 10).forEach((e: any) => {
        sections.push(`- ${e.expense_date} | ${e.vendor || '-'} | ฿${formatCurrency(e.amount)} | ${e.payment_voucher_id ? '✅ชำระแล้ว' : '⏳ค้าง'}`)
      })
    }
  }

  // Work schedule / shifts
  if (q.match(/ตาราง|เข้างาน|กะ|shift|schedule|เภสัช|พนักงาน|ใครเข้า|ใครทำงาน|ลา|วันหยุด|เวร/)) {
    // Today's shifts
    const { data: todayShifts } = await supabase
      .from('work_shifts')
      .select('employee_name, position, start_time, end_time, total_hours, notes, work_date')
      .eq('work_date', today)
      .order('start_time', { ascending: true })

    if (todayShifts?.length) {
      sections.push(`📅 ตารางเข้างานวันนี้ (${new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' })}):`)
      todayShifts.forEach((s: any) => {
        if (s.notes === 'ลา') {
          sections.push(`  🏖️ ${s.employee_name}${s.position ? ` (${s.position})` : ''} — ลา`)
        } else {
          sections.push(`  👤 ${s.employee_name}${s.position ? ` (${s.position})` : ''} — ${s.start_time}-${s.end_time} (${s.total_hours?.toFixed(1) || '-'} ชม.)`)
        }
      })
    } else {
      sections.push(`📅 วันนี้: ยังไม่มีตารางเข้างาน`)
    }

    // Tomorrow's shifts
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    const { data: tomorrowShifts } = await supabase
      .from('work_shifts')
      .select('employee_name, position, start_time, end_time, total_hours, notes')
      .eq('work_date', tomorrowStr)
      .order('start_time', { ascending: true })

    if (tomorrowShifts?.length) {
      sections.push(`\n📅 พรุ่งนี้ (${tomorrow.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' })}):`)
      tomorrowShifts.forEach((s: any) => {
        if (s.notes === 'ลา') {
          sections.push(`  🏖️ ${s.employee_name}${s.position ? ` (${s.position})` : ''} — ลา`)
        } else {
          sections.push(`  👤 ${s.employee_name}${s.position ? ` (${s.position})` : ''} — ${s.start_time}-${s.end_time}`)
        }
      })
    }

    // This week's shifts (next 7 days)
    if (q.match(/สัปดาห์|อาทิตย์|week|7.*วัน/)) {
      const weekEnd = new Date()
      weekEnd.setDate(weekEnd.getDate() + 6)
      const weekEndStr = weekEnd.toISOString().split('T')[0]

      const { data: weekShifts } = await supabase
        .from('work_shifts')
        .select('employee_name, position, work_date, start_time, end_time, notes')
        .gte('work_date', today)
        .lte('work_date', weekEndStr)
        .order('work_date', { ascending: true })
        .order('start_time', { ascending: true })

      if (weekShifts?.length) {
        sections.push(`\n📆 ตารางสัปดาห์นี้ (${weekShifts.length} กะ):`)
        let lastDate = ''
        weekShifts.forEach((s: any) => {
          if (s.work_date !== lastDate) {
            lastDate = s.work_date
            const d = new Date(s.work_date)
            sections.push(`\n  ${d.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })}:`)
          }
          if (s.notes === 'ลา') {
            sections.push(`    🏖️ ${s.employee_name} — ลา`)
          } else {
            sections.push(`    👤 ${s.employee_name} ${s.start_time}-${s.end_time}`)
          }
        })
      }
    }

    // Employees info
    const { data: emps } = await supabase
      .from('employees')
      .select('name, position, employment_type, is_active')
      .eq('is_active', true)

    if (emps?.length) {
      sections.push(`\n👥 พนักงานทั้งหมด (${emps.length} คน):`)
      emps.forEach((e: any) => {
        sections.push(`  - ${e.name} (${e.position}) [${e.employment_type}]`)
      })
    }
  }

  // Contacts / customers
  if (q.match(/ลูกค้า|contact|customer|supplier|ซัพพลาย|ผู้ขาย|ผู้จำหน่าย/)) {
    const { data: contacts } = await supabase
      .from('contacts')
      .select('name, company_name, phone, email, contact_type')
      .limit(20)

    if (contacts?.length) {
      sections.push(`👥 รายชื่อผู้ติดต่อ (${contacts.length} รายการ):`)
      contacts.forEach((c: any) => {
        sections.push(`- ${c.name || c.company_name} | ${c.contact_type || '-'} | ${c.phone || '-'}`)
      })
    }
  }

  // Low stock alerts
  if (q.match(/แจ้งเตือน|alert|ใกล้หมด|สต็อกต่ำ|low.*stock|หมด/)) {
    const { data: lowStock } = await supabase
      .from('products')
      .select('name_th, stock_quantity, min_stock_level')
      .eq('is_active', true)
      .lte('stock_quantity', 10)
      .order('stock_quantity', { ascending: true })
      .limit(20)

    if (lowStock?.length) {
      sections.push(`⚠️ สินค้าสต็อกต่ำ (${lowStock.length} รายการ):`)
      lowStock.forEach((p: any) => {
        sections.push(`- ${p.name_th}: เหลือ ${p.stock_quantity} (ขั้นต่ำ ${p.min_stock_level})${p.stock_quantity === 0 ? ' 🔴หมด!' : ''}`)
      })
    }
  }

  // Purchase orders
  if (q.match(/ใบสั่งซื้อ|po|purchase.*order|สั่งซื้อ/)) {
    const { data: pos } = await supabase
      .from('purchase_orders')
      .select('po_number, supplier_name, total_amount, status, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (pos?.length) {
      sections.push(`📝 ใบสั่งซื้อล่าสุด:`)
      pos.forEach((po: any) => {
        sections.push(`- ${po.po_number} | ${po.supplier_name} | ฿${formatCurrency(po.total_amount)} | ${po.status}`)
      })
    }
  }

  // Petty cash
  if (q.match(/เงินสดย่อย|petty.*cash|เบ็ดเตล็ด/)) {
    const { data: petty } = await supabase
      .from('petty_cash_transactions')
      .select('description, amount, transaction_type, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (petty?.length) {
      sections.push(`💵 เงินสดย่อยล่าสุด:`)
      petty.forEach((t: any) => {
        sections.push(`- ${t.created_at?.split('T')[0]} | ${t.transaction_type === 'income' ? '➕' : '➖'} ฿${formatCurrency(t.amount)} | ${t.description}`)
      })
    }
  }

  // Categories
  if (q.match(/หมวดหมู่|categor|ประเภท/)) {
    const { data: cats } = await supabase
      .from('categories')
      .select('name_th, name_en')
      .order('sort_order')

    if (cats?.length) {
      sections.push(`🏷️ หมวดหมู่สินค้า (${cats.length}):`)
      cats.forEach((c: any) => sections.push(`- ${c.name_th} (${c.name_en})`))
    }
  }

  // General stats if nothing specific matched
  if (sections.length === 0) {
    // Fetch summary stats
    const { count: productCount } = await supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true)
    const { count: orderCount } = await supabase.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', today)
    const { data: todayOrders } = await supabase.from('orders').select('total_amount').gte('created_at', today)
    const todayTotal = todayOrders?.reduce((s: number, o: any) => s + (o.total_amount || 0), 0) || 0
    const { count: lowStockCount } = await supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true).lte('stock_quantity', 10)
    const { count: expenseCount } = await supabase.from('expenses').select('id', { count: 'exact', head: true }).gte('expense_date', today.substring(0, 7) + '-01')

    sections.push('📈 สรุปข้อมูลร้าน More Drug Store:')
    sections.push(`📦 สินค้าทั้งหมด: ${productCount || 0} รายการ`)
    sections.push(`🧾 ยอดขายวันนี้: ${orderCount || 0} บิล = ฿${formatCurrency(todayTotal)}`)
    sections.push(`⚠️ สินค้าสต็อกต่ำ: ${lowStockCount || 0} รายการ`)
    sections.push(`💸 ค่าใช้จ่ายเดือนนี้: ${expenseCount || 0} รายการ`)
  }

  return sections.join('\n')
}

// ─── AI General query handler ────────────────────────────────

async function handleGeneralQuery(question: string, supabase: any): Promise<string> {
  try {
    // Step 1: Fetch relevant data
    const storeData = await fetchStoreData(question, supabase)

    // Step 2: Ask Gemini to answer using the data
    const aiText = await callGemini(`คุณเป็นผู้ช่วย AI ร้านยา "More Drug Store" ตอบคำถามผ่าน LINE

คำถาม: ${question}

ข้อมูลจากระบบ:
${storeData}

กรุณาตอบภาษาไทย สั้นกระชับ เหมาะ LINE (≤2000 ตัวอักษร)
- ใช้ข้อมูลจากระบบเท่านั้น ห้ามเดา
- ใส่ตัวเลข emoji ให้อ่านง่าย
- ถ้าไม่มีข้อมูลที่เกี่ยวข้อง ให้บอกว่าไม่พบข้อมูล
- ขึ้นต้นด้วย "🏪 More Drug Store"`)

    return aiText || `🏪 More Drug Store\n\n${storeData}`
  } catch (err: any) {
    console.error('General query error:', err)
    return '❌ เกิดข้อผิดพลาด กรุณาลองใหม่'
  }
}

// ─── Main handler ────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('OK', { status: 200 })
  }

  try {
    const channelSecret = Deno.env.get('LINE_CHANNEL_SECRET')
    const channelAccessToken = getEnv('LINE_CHANNEL_ACCESS_TOKEN')
    const supabaseUrl = getEnv('SUPABASE_URL')
    const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')

    const bodyText = await req.text()

    if (channelSecret) {
      const signature = req.headers.get('x-line-signature') || ''
      const valid = await verifySignature(bodyText, signature, channelSecret)
      if (!valid) {
        console.error('Invalid signature')
        return new Response('Invalid signature', { status: 403 })
      }
    }

    const body = JSON.parse(bodyText)
    const events = body.events || []

    if (events.length === 0) {
      return new Response('OK', { status: 200 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    for (const event of events) {
      if (event.type !== 'message' || event.message.type !== 'text') continue

      const userMessage = (event.message.text || '').trim()
      const userMessageLower = userMessage.toLowerCase()
      const replyToken = event.replyToken

      let replyText: string

      // 1. Help command
      if (userMessageLower.includes('help') || userMessageLower === 'ช่วยเหลือ' || userMessageLower === 'เมนู' || userMessageLower === 'คำสั่ง') {
        replyText = handleHelp()
      }
      // 2. AI Pharmacist (symptom detection)
      else {
        const symptoms = extractSymptoms(userMessage)
        if (symptoms) {
          replyText = await handleAIPharmacist(symptoms, supabase)
        }
        // 3. Specific quick commands (faster than AI)
        else if (userMessageLower.includes('ยอดค้าง') || userMessageLower.includes('ค้างชำระ')) {
          replyText = await handleOutstanding(supabase)
        }
        // 4. General AI query — handles everything else
        else {
          replyText = await handleGeneralQuery(userMessage, supabase)
        }
      }

      // Truncate for LINE limit (5000 chars)
      if (replyText.length > 4900) {
        replyText = replyText.substring(0, 4900) + '\n...'
      }

      await replyMessage(replyToken, [textMsg(replyText)], channelAccessToken)
    }

    return new Response('OK', { status: 200 })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
})
