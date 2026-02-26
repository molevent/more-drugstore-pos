// Supabase Edge Function — LINE Webhook Handler (v2 — RAG + Chain-of-Thought)
//
// Architecture:
//   1. Receive LINE message
//   2. Load conversation history (RAG) from chat_memory
//   3. Gemini classifies intent → decides which DB tables to query
//   4. Fetch relevant data based on intent
//   5. Gemini generates human-like response using data + chat history
//   6. Save both user message and bot reply to chat_memory
//
// Requires env variables:
//   LINE_CHANNEL_ACCESS_TOKEN, LINE_CHANNEL_SECRET
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   GEMINI_API_KEY

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

// ─── Gemini AI ───────────────────────────────────────────────

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

async function callGemini(prompt: string, temperature = 0.4, maxTokens = 1500): Promise<string | null> {
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
  if (!geminiApiKey) return null

  const response = await fetch(`${GEMINI_API_URL}?key=${geminiApiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature, maxOutputTokens: maxTokens }
    }),
  })

  if (!response.ok) {
    console.error('Gemini error:', response.status, await response.text())
    return null
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || null
}

// ─── RAG: Conversation Memory ────────────────────────────────

async function loadChatHistory(lineUserId: string, supabase: any): Promise<string> {
  const { data } = await supabase
    .from('chat_memory')
    .select('role, message, intent, created_at')
    .eq('line_user_id', lineUserId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (!data?.length) return ''

  // Reverse to chronological order
  const history = data.reverse().map((m: any) => {
    const time = new Date(m.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    return `[${time}] ${m.role === 'user' ? '👤ลูกค้า' : '🤖บอท'}: ${m.message}`
  }).join('\n')

  return history
}

async function saveChatMemory(lineUserId: string, role: string, message: string, intent: string, supabase: any) {
  await supabase.from('chat_memory').insert({
    line_user_id: lineUserId,
    role,
    message: message.substring(0, 2000),
    intent,
  })
}

// ─── Step 1: Intent Classification (Think before answering) ──

interface IntentResult {
  intent: string        // category: product, symptom, sales, expense, schedule, outstanding, stock_alert, contact, purchase_order, petty_cash, category, general, help, greeting, followup
  product_search?: string  // extracted product name if applicable
  time_range?: string      // today, this_week, this_month
  reasoning: string        // chain-of-thought
}

async function classifyIntent(question: string, chatHistory: string): Promise<IntentResult> {
  const prompt = `คุณเป็นระบบวิเคราะห์คำถามของร้านยา "More Drug Store"

ประวัติสนทนา:
${chatHistory || '(ยังไม่มีประวัติ)'}

คำถามใหม่: "${question}"

วิเคราะห์แล้วตอบเป็น JSON เท่านั้น (ไม่ต้องมี markdown):
{
  "intent": "หมวด (เลือก 1): product | symptom | sales | expense | schedule | outstanding | stock_alert | contact | purchase_order | petty_cash | category | general | help | greeting | followup",
  "product_search": "ชื่อสินค้าที่ถาม (ถ้ามี) หรือ null",
  "time_range": "today | this_week | this_month | null",
  "reasoning": "อธิบายสั้นๆ ว่าทำไมถึงจัดหมวดนี้"
}

กฎสำคัญ:
- "followup" = ถามต่อจากคำถามก่อนหน้า เช่น "แล้วอันนี้ล่ะ" "อันไหนดีกว่า" "เพิ่มเติม"
- "greeting" = ทักทาย เช่น "สวัสดี" "หวัดดี" "ดีจ้า"
- "symptom" = มีอาการป่วย เช่น "ปวดหัว" "ไข้" "ท้องเสีย" "คลื่นไส้"
- "product" = ถามเกี่ยวกับสินค้าเฉพาะตัว (ราคา, คำอธิบาย, วิธีใช้)
- "schedule" = ถามเกี่ยวกับตารางงาน, ใครเข้างาน, ลา
- ถ้าเป็น followup ให้ดูจากประวัติว่า intent ก่อนหน้าคืออะไร`

  const result = await callGemini(prompt, 0.1, 500)
  if (!result) {
    return { intent: 'general', reasoning: 'fallback — Gemini unavailable' }
  }

  try {
    // Clean markdown fences if present
    const clean = result.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    console.error('Intent parse error:', result)
    return { intent: 'general', reasoning: 'parse error' }
  }
}

// ─── Thai timezone helper (UTC+7) ────────────────────────────

function getThaiNow(): Date {
  const utc = new Date()
  return new Date(utc.getTime() + 7 * 60 * 60 * 1000)
}

function getThaiToday(): string {
  const thai = getThaiNow()
  return thai.toISOString().split('T')[0]
}

// ─── Step 2: Fetch data by intent ────────────────────────────

async function fetchDataByIntent(intent: IntentResult, question: string, supabase: any): Promise<string> {
  const today = getThaiToday()
  const monthStart = today.substring(0, 7) + '-01'
  const sections: string[] = []

  switch (intent.intent) {

    case 'product': {
      const search = intent.product_search || question.replace(/ราคา|เท่าไหร่|คือ|อะไร|บอก|ดู|หา|สินค้า|ยา|มี|ไหม|ข้อมูล|รายละเอียด|คำอธิบาย|วิธีใช้|ผลข้างเคียง|ส่วนประกอบ|สรรพคุณ|ของ|ตัว|ชื่อ|เหลือ|กี่|สต็อก/gi, '').trim()

      if (search.length >= 2) {
        const { data: matched } = await supabase
          .from('products')
          .select(`
            name_th, name_en, barcode, description_th,
            base_price, cost_price, stock_quantity, min_stock_level, unit,
            is_active, category:categories(name_th),
            drug_info (active_ingredients, dosage, side_effects, contraindications, usage_instructions_th, warnings, storage_info)
          `)
          .or(`name_th.ilike.%${search}%,name_en.ilike.%${search}%,barcode.eq.${search}`)
          .limit(5)

        if (matched?.length) {
          matched.forEach((p: any) => {
            sections.push(`สินค้า: ${p.name_th}${p.name_en ? ` (${p.name_en})` : ''}`)
            if (p.category?.name_th) sections.push(`หมวดหมู่: ${p.category.name_th}`)
            sections.push(`ราคาขาย: ฿${p.base_price} | ราคาทุน: ฿${p.cost_price}`)
            sections.push(`สต็อก: ${p.stock_quantity} ${p.unit || 'ชิ้น'}${p.stock_quantity <= p.min_stock_level ? ' (ต่ำกว่าขั้นต่ำ!)' : ''}`)
            if (p.barcode) sections.push(`Barcode: ${p.barcode}`)
            if (p.description_th) sections.push(`คำอธิบาย: ${p.description_th}`)
            const drug = p.drug_info?.[0]
            if (drug) {
              if (drug.active_ingredients) sections.push(`สารออกฤทธิ์: ${drug.active_ingredients}`)
              if (drug.dosage) sections.push(`ขนาดยา: ${drug.dosage}`)
              if (drug.usage_instructions_th) sections.push(`วิธีใช้: ${drug.usage_instructions_th}`)
              if (drug.side_effects) sections.push(`ผลข้างเคียง: ${drug.side_effects}`)
              if (drug.contraindications) sections.push(`ข้อห้ามใช้: ${drug.contraindications}`)
              if (drug.warnings) sections.push(`คำเตือน: ${drug.warnings}`)
              if (drug.storage_info) sections.push(`การเก็บรักษา: ${drug.storage_info}`)
            }
            sections.push('---')
          })
        } else {
          sections.push(`ไม่พบสินค้าที่ตรงกับ "${search}"`)
        }
      }
      break
    }

    case 'symptom': {
      const { data: products } = await supabase
        .from('products')
        .select(`
          name_th, base_price, stock_quantity, is_prescription_required,
          category:categories(name_th),
          medicine_details (dosage_form, strength, active_ingredients)
        `)
        .eq('is_active', true)
        .gt('stock_quantity', 0)

      if (products?.length) {
        sections.push(`ยาในร้าน (${products.length} รายการ):`)
        products.forEach((p: any, i: number) => {
          const med = p.medicine_details?.[0]
          let line = `${i + 1}. ${p.name_th}`
          if (med?.strength) line += ` ${med.strength}`
          if (med?.active_ingredients) line += ` [${med.active_ingredients}]`
          if (p.is_prescription_required) line += ' (ใบสั่งยา)'
          sections.push(line)
        })
      }
      break
    }

    case 'sales': {
      const { data: todayOrders } = await supabase
        .from('orders')
        .select('total_amount, payment_method, created_at')
        .gte('created_at', today)
        .lte('created_at', today + 'T23:59:59')

      const todayTotal = todayOrders?.reduce((s: number, o: any) => s + (o.total_amount || 0), 0) || 0
      sections.push(`ยอดขายวันนี้: ${todayOrders?.length || 0} บิล = ฿${formatCurrency(todayTotal)}`)

      const { data: monthOrders } = await supabase
        .from('orders')
        .select('total_amount')
        .gte('created_at', monthStart)

      const monthTotal = monthOrders?.reduce((s: number, o: any) => s + (o.total_amount || 0), 0) || 0
      sections.push(`ยอดขายเดือนนี้: ${monthOrders?.length || 0} บิล = ฿${formatCurrency(monthTotal)}`)

      // Top sellers
      const { data: topItems } = await supabase
        .from('order_items')
        .select('product_name, quantity, total_price')
        .limit(200)

      if (topItems?.length) {
        const sales: Record<string, { qty: number; rev: number }> = {}
        for (const item of topItems) {
          const name = item.product_name || 'ไม่ทราบ'
          if (!sales[name]) sales[name] = { qty: 0, rev: 0 }
          sales[name].qty += item.quantity || 0
          sales[name].rev += item.total_price || 0
        }
        const sorted = Object.entries(sales).sort((a, b) => b[1].qty - a[1].qty).slice(0, 10)
        sections.push('\nสินค้าขายดี:')
        sorted.forEach(([name, d], i) => sections.push(`${i + 1}. ${name} — ${d.qty} ชิ้น (฿${formatCurrency(d.rev)})`))
      }
      break
    }

    case 'expense': {
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
        sections.push(`ค่าใช้จ่ายเดือนนี้: ${expenses.length} รายการ = ฿${formatCurrency(total)}`)
        sections.push(`ยังไม่ชำระ: ${unpaid.length} รายการ = ฿${formatCurrency(unpaidTotal)}`)
        sections.push('\nรายการล่าสุด:')
        expenses.slice(0, 10).forEach((e: any) => {
          sections.push(`- ${e.expense_date} | ${e.vendor || '-'} | ฿${formatCurrency(e.amount)} | ${e.payment_voucher_id ? 'ชำระแล้ว' : 'ค้าง'}`)
        })
      }
      break
    }

    case 'outstanding': {
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

      const { data: expenses } = await supabase
        .from('expenses')
        .select('vendor, expense_date, document_date, amount, description, payment_voucher_id')
        .gte('expense_date', ninetyDaysAgo.toISOString().split('T')[0])
        .is('payment_voucher_id', null)
        .order('expense_date', { ascending: false })

      if (expenses?.length) {
        const total = expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0)
        sections.push(`ยอดค้างชำระ: ${expenses.length} รายการ = ฿${formatCurrency(total)}`)
        expenses.slice(0, 10).forEach((e: any) => {
          sections.push(`- ${e.vendor || '-'} | ฿${formatCurrency(e.amount)} | ${e.expense_date}`)
        })
      } else {
        sections.push('ไม่มียอดค้างชำระ')
      }
      break
    }

    case 'schedule': {
      const q = question.toLowerCase()
      const askTomorrow = !!q.match(/พรุ่งนี้|พรุ่ง|tomorrow/)
      const askWeek = !!q.match(/สัปดาห์|อาทิตย์|week|7.*วัน/)
      const askMonth = !!q.match(/เดือน|month|สรุป|ค่าแรง|wage|ชั่วโมงรวม|กี่ชั่วโมง/)
      const askEmployee = !!q.match(/พนักงาน.*ทั้งหมด|กี่คน|รายชื่อ|employee|เงินเดือน/)
      const askLeave = !!q.match(/ลา|leave|หยุด/)
      // Default: ask about today
      const askToday = !askTomorrow || q.match(/วันนี้|today|เข้างาน|ใครเข้า|ใครทำงาน|ใครมา/)

      // Employees (only if explicitly asked)
      const { data: emps } = await supabase
        .from('employees')
        .select('name, position, employment_type, hourly_wage, monthly_salary, phone, is_active')
        .eq('is_active', true)

      if (askEmployee && emps?.length) {
        sections.push(`👥 พนักงานทั้งหมด (${emps.length} คน):`)
        emps.forEach((e: any) => {
          let info = `- ${e.name} (${e.position}) [${e.employment_type}]`
          if (e.hourly_wage) info += ` ค่าแรง ฿${e.hourly_wage}/ชม.`
          if (e.monthly_salary) info += ` เงินเดือน ฿${formatCurrency(e.monthly_salary)}`
          sections.push(info)
        })
      }

      // Today's shifts (default)
      if (askToday) {
        console.log(`[Schedule] Querying work_shifts for today=${today}`)
        const { data: todayShifts, error: shiftError } = await supabase
          .from('work_shifts')
          .select('employee_name, position, start_time, end_time, total_hours, notes')
          .eq('work_date', today)
          .order('start_time', { ascending: true })
        console.log(`[Schedule] Result: ${todayShifts?.length || 0} shifts, error: ${shiftError?.message || 'none'}`)

        if (todayShifts?.length) {
          sections.push(`📅 ตารางวันนี้ (${getThaiNow().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' })}):`)
          const working = todayShifts.filter((s: any) => s.notes !== 'ลา')
          const onLeave = todayShifts.filter((s: any) => s.notes === 'ลา')
          working.forEach((s: any) => {
            sections.push(`- ${s.employee_name} (${s.position || '-'}) — ${s.start_time}-${s.end_time} (${s.total_hours?.toFixed(1) || '-'} ชม.)`)
          })
          if (onLeave.length) {
            sections.push(`🏖️ ลาวันนี้:`)
            onLeave.forEach((s: any) => sections.push(`- ${s.employee_name} (${s.position || '-'}) — ลา`))
          }
          sections.push(`สรุป: ทำงาน ${working.length} คน, ลา ${onLeave.length} คน`)
        } else {
          sections.push('📅 วันนี้: ยังไม่มีตารางเข้างาน')
        }
      }

      // Tomorrow (only if asked)
      if (askTomorrow) {
        const tmr = getThaiNow(); tmr.setDate(tmr.getDate() + 1)
        const tmrStr = tmr.toISOString().split('T')[0]
        const { data: tmrShifts } = await supabase
          .from('work_shifts')
          .select('employee_name, position, start_time, end_time, notes')
          .eq('work_date', tmrStr)
          .order('start_time', { ascending: true })

        if (tmrShifts?.length) {
          sections.push(`📅 พรุ่งนี้ (${tmr.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' })}):`)
          tmrShifts.forEach((s: any) => {
            sections.push(s.notes === 'ลา'
              ? `- ${s.employee_name} — ลา`
              : `- ${s.employee_name} (${s.position || '-'}) — ${s.start_time}-${s.end_time}`)
          })
        } else {
          sections.push('📅 พรุ่งนี้: ยังไม่มีตารางเข้างาน')
        }
      }

      // Month summary (only if asked about month/wages/hours)
      if (askMonth) {
        const { data: monthShifts } = await supabase
          .from('work_shifts')
          .select('employee_name, total_hours, notes')
          .gte('work_date', monthStart)
          .lte('work_date', today)

        if (monthShifts?.length) {
          const stats: Record<string, { hours: number; days: number; leaves: number }> = {}
          monthShifts.forEach((s: any) => {
            if (!stats[s.employee_name]) stats[s.employee_name] = { hours: 0, days: 0, leaves: 0 }
            if (s.notes === 'ลา') { stats[s.employee_name].leaves++ }
            else { stats[s.employee_name].hours += (s.total_hours || 0); stats[s.employee_name].days++ }
          })

          sections.push(`📊 สรุปเดือนนี้ (${getThaiNow().toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}):`)
          Object.entries(stats).forEach(([name, d]) => {
            const emp = emps?.find((e: any) => e.name === name)
            let line = `- ${name}: ทำงาน ${d.days} วัน (${d.hours.toFixed(1)} ชม.)`
            if (d.leaves > 0) line += `, ลา ${d.leaves} วัน`
            if (emp?.hourly_wage) line += ` → ค่าแรง ≈ ฿${formatCurrency(d.hours * emp.hourly_wage)}`
            sections.push(line)
          })
        }
      }

      // Leave info (whenever asking about leave)
      if (askLeave) {
        const { data: leaveShifts } = await supabase
          .from('work_shifts')
          .select('employee_name, work_date, position')
          .eq('notes', 'ลา')
          .gte('work_date', monthStart)
          .order('work_date', { ascending: false })

        if (leaveShifts?.length) {
          // Group by employee
          const byEmp: Record<string, string[]> = {}
          leaveShifts.forEach((s: any) => {
            if (!byEmp[s.employee_name]) byEmp[s.employee_name] = []
            byEmp[s.employee_name].push(s.work_date)
          })
          sections.push(`\n🏖️ การลาเดือนนี้ (${leaveShifts.length} วัน):`)
          Object.entries(byEmp).forEach(([name, dates]) => {
            sections.push(`- ${name}: ลา ${dates.length} วัน (${dates.join(', ')})`)
          })
        } else {
          sections.push('\n🏖️ เดือนนี้ยังไม่มีใครลา')
        }
      }

      // Weekly (only if asked)
      if (askWeek) {
        const weekEnd = getThaiNow(); weekEnd.setDate(weekEnd.getDate() + 6)
        const { data: weekShifts } = await supabase
          .from('work_shifts')
          .select('employee_name, position, work_date, start_time, end_time, notes')
          .gte('work_date', today).lte('work_date', weekEnd.toISOString().split('T')[0])
          .order('work_date').order('start_time')

        if (weekShifts?.length) {
          sections.push(`📆 ตารางสัปดาห์นี้:`)
          let lastDate = ''
          weekShifts.forEach((s: any) => {
            if (s.work_date !== lastDate) {
              lastDate = s.work_date
              sections.push(`\n${new Date(s.work_date).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })}:`)
            }
            sections.push(s.notes === 'ลา' ? `  ${s.employee_name} — ลา` : `  ${s.employee_name} ${s.start_time}-${s.end_time}`)
          })
        }
      }
      break
    }

    case 'stock_alert': {
      const { data: lowStock } = await supabase
        .from('products')
        .select('name_th, stock_quantity, min_stock_level')
        .eq('is_active', true)
        .lte('stock_quantity', 10)
        .order('stock_quantity', { ascending: true })
        .limit(20)

      if (lowStock?.length) {
        sections.push(`สินค้าสต็อกต่ำ (${lowStock.length} รายการ):`)
        lowStock.forEach((p: any) => {
          sections.push(`- ${p.name_th}: เหลือ ${p.stock_quantity} (ขั้นต่ำ ${p.min_stock_level})${p.stock_quantity === 0 ? ' หมด!' : ''}`)
        })
      } else {
        sections.push('ไม่มีสินค้าสต็อกต่ำ')
      }
      break
    }

    case 'contact': {
      const { data: contacts } = await supabase
        .from('contacts')
        .select('name, company_name, phone, email, contact_type')
        .limit(20)

      if (contacts?.length) {
        sections.push(`ผู้ติดต่อ (${contacts.length} รายการ):`)
        contacts.forEach((c: any) => sections.push(`- ${c.name || c.company_name} | ${c.contact_type || '-'} | ${c.phone || '-'}`))
      }
      break
    }

    case 'purchase_order': {
      const { data: pos } = await supabase
        .from('purchase_orders')
        .select('po_number, supplier_name, total_amount, status, created_at')
        .order('created_at', { ascending: false })
        .limit(10)

      if (pos?.length) {
        sections.push(`ใบสั่งซื้อล่าสุด:`)
        pos.forEach((po: any) => sections.push(`- ${po.po_number} | ${po.supplier_name} | ฿${formatCurrency(po.total_amount)} | ${po.status}`))
      }
      break
    }

    case 'petty_cash': {
      const { data: petty } = await supabase
        .from('petty_cash_transactions')
        .select('description, amount, transaction_type, created_at')
        .order('created_at', { ascending: false })
        .limit(10)

      if (petty?.length) {
        sections.push(`เงินสดย่อยล่าสุด:`)
        petty.forEach((t: any) => sections.push(`- ${t.created_at?.split('T')[0]} | ${t.transaction_type === 'income' ? 'รับ' : 'จ่าย'} ฿${formatCurrency(t.amount)} | ${t.description}`))
      }
      break
    }

    case 'category': {
      const { data: cats } = await supabase
        .from('categories')
        .select('name_th, name_en')
        .order('sort_order')

      if (cats?.length) {
        sections.push(`หมวดหมู่สินค้า (${cats.length}):`)
        cats.forEach((c: any) => sections.push(`- ${c.name_th} (${c.name_en})`))
      }
      break
    }

    case 'greeting':
    case 'help': {
      // No data needed, Gemini will generate greeting/help
      sections.push('ร้านยา More Drug Store ยินดีให้บริการครับ/ค่ะ')
      sections.push('สามารถถามได้ทุกเรื่องเกี่ยวกับร้าน: ราคายา, สต็อก, ยอดขาย, ตารางเข้างาน, อาการป่วย, ค่าใช้จ่าย ฯลฯ')
      break
    }

    case 'followup':
    default: {
      // General: fetch summary stats for context
      const { count: productCount } = await supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true)
      const { count: orderCount } = await supabase.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', today)
      const { data: todayOrders } = await supabase.from('orders').select('total_amount').gte('created_at', today)
      const todayTotal = todayOrders?.reduce((s: number, o: any) => s + (o.total_amount || 0), 0) || 0
      const { count: lowStockCount } = await supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true).lte('stock_quantity', 10)

      sections.push(`สรุปร้าน:`)
      sections.push(`สินค้า: ${productCount || 0} รายการ`)
      sections.push(`ยอดขายวันนี้: ${orderCount || 0} บิล = ฿${formatCurrency(todayTotal)}`)
      sections.push(`สต็อกต่ำ: ${lowStockCount || 0} รายการ`)
      break
    }
  }

  return sections.join('\n')
}

// ─── Step 3: Generate human-like response ────────────────────

async function generateResponse(
  question: string,
  intent: IntentResult,
  storeData: string,
  chatHistory: string
): Promise<string> {
  const isSymptom = intent.intent === 'symptom'

  const systemPrompt = isSymptom
    ? `คุณเป็นเภสัชกรประจำร้านยา "More Drug Store" ชื่อ "พี่หมอมอร์" ตอบลูกค้าผ่าน LINE
คุณเป็นกันเอง อบอุ่น เหมือนเภสัชกรตัวจริงที่คุยกับลูกค้าประจำ

กฎสำคัญ:
- วิเคราะห์อาการ แนะนำยาจากในร้านเท่านั้น
- ห้ามแนะนำยาที่ต้องใบสั่งแพทย์
- บอกวิธีใช้ยาชัดเจน
- เตือนผลข้างเคียงที่สำคัญ
- แนะนำพบแพทย์ถ้าอาการรุนแรง
- ลงท้ายด้วย "⚠️ คำแนะนำจาก AI ไม่ใช่การวินิจฉัยทางการแพทย์"`
    : `คุณเป็นผู้ช่วยอัจฉริยะประจำร้านยา "More Drug Store" ชื่อ "น้องมอร์" ตอบผ่าน LINE
คุณเป็นกันเอง อบอุ่น ฉลาด เหมือนพนักงานที่รู้ทุกเรื่องในร้าน

บุคลิก:
- พูดภาษาไทยเป็นธรรมชาติ เหมือนคนจริงๆ ไม่ใช่หุ่นยนต์
- ใช้ emoji พอเหมาะ ไม่เยอะเกินไป
- ถ้าลูกค้าทักทาย ก็ทักกลับอย่างเป็นกันเอง
- จำบริบทจากประวัติสนทนาได้ ถ้าถามต่อจากเรื่องเดิมก็ตอบต่อเนื่อง
- ตอบสั้นกระชับ เหมาะกับ LINE (ไม่เกิน 2000 ตัวอักษร)`

  const prompt = `${systemPrompt}

${chatHistory ? `ประวัติสนทนา:\n${chatHistory}\n` : ''}
คำถามใหม่: "${question}"

${intent.reasoning ? `[วิเคราะห์: ${intent.reasoning}]` : ''}

ข้อมูลจากระบบร้าน:
${storeData || '(ไม่มีข้อมูลเพิ่มเติม)'}

กฎตอบ:
- ใช้ข้อมูลจากระบบเท่านั้น ห้ามเดาหรือแต่ง
- ถ้าไม่มีข้อมูล ให้บอกตรงๆ ว่าไม่พบ
- ตอบเป็นธรรมชาติเหมือนคนคุยกัน ไม่ต้องเป็นรายการยาว
- ถ้าเป็น followup ให้ตอบต่อเนื่องจากประวัติ
- สรุปตัวเลขสำคัญให้ชัดเจน
- ถ้าถามเรื่องตารางเข้างาน ต้องบอกชื่อ ตำแหน่ง เวลาเข้า-ออก และชั่วโมงทำงานของทุกคนเสมอ ห้ามละเว้น
- ข้อมูลตัวเลข เวลา ราคา จำนวน ที่มีในระบบ ต้องแสดงทุกครั้ง ห้ามสรุปรวบรัดจนตัวเลขหาย`

  console.log(`[GenerateResponse] intent=${intent.intent}, storeData length=${storeData.length}`)
  console.log(`[GenerateResponse] storeData preview: ${storeData.substring(0, 500)}`)

  // For data-heavy intents, guarantee raw data is always in the reply
  const dataIntents = ['schedule', 'sales', 'expense', 'outstanding', 'stock_alert', 'product']
  if (dataIntents.includes(intent.intent) && storeData.length > 10) {
    // Ask Gemini for a short friendly intro only
    const introPrompt = `${systemPrompt}

${chatHistory ? `ประวัติสนทนา:\n${chatHistory}\n` : ''}
คำถามใหม่: "${question}"

ตอบแค่ประโยคทักทาย/นำเข้าสั้นๆ 1-2 ประโยค (ไม่เกิน 100 ตัวอักษร) ก่อนที่จะแสดงข้อมูล
ห้ามใส่ข้อมูลตัวเลขหรือรายละเอียดในส่วนนี้
ตัวอย่าง: "วันนี้มีคนเข้างาน 2 คนค่ะ ดูรายละเอียดเลยนะคะ 👇"`

    const intro = await callGemini(introPrompt, 0.7, 200) || ''
    return `${intro}\n\n📋 ${storeData}`
  }

  return await callGemini(prompt, 0.5, 1500) || '❌ ขออภัยค่ะ ระบบขัดข้อง กรุณาลองใหม่อีกครั้งนะคะ'
}

// ─── Main handler ────────────────────────────────────────────

Deno.serve(async (req: any) => {
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
      const lineUserId = event.source?.userId || 'unknown'
      const replyToken = event.replyToken

      // Step 1: Load conversation history (RAG)
      const chatHistory = await loadChatHistory(lineUserId, supabase)

      // Step 2: Classify intent — keyword override first, then Gemini
      const msgLower = userMessage.toLowerCase()
      let intent: IntentResult

      // Fast keyword-based intent detection (bypass Gemini for obvious queries)
      if (msgLower.match(/เข้างาน|ตารางงาน|ตาราง|ใครเข้า|ใครทำงาน|กะงาน|เวร|ลา.*วัน|shift|schedule|ใครมา|พนักงาน.*วัน/)) {
        intent = { intent: 'schedule', reasoning: 'keyword match: schedule' }
      } else if (msgLower.match(/ยอดค้าง|ค้างชำระ|ยังไม่จ่าย/)) {
        intent = { intent: 'outstanding', reasoning: 'keyword match: outstanding' }
      } else if (msgLower.match(/ยอดขาย|ยอดวันนี้|ขายวันนี้|ขายเดือน/)) {
        intent = { intent: 'sales', reasoning: 'keyword match: sales' }
      } else if (msgLower.match(/^(สวัสดี|หวัดดี|ดีจ้า|ดีค่ะ|ดีครับ|hello|hi)\s*$/i)) {
        intent = { intent: 'greeting', reasoning: 'keyword match: greeting' }
      } else if (msgLower.match(/^(help|ช่วยเหลือ|เมนู|คำสั่ง)\s*$/i)) {
        intent = { intent: 'help', reasoning: 'keyword match: help' }
      } else {
        // Gemini classification for complex/ambiguous queries
        intent = await classifyIntent(userMessage, chatHistory)
      }
      console.log(`[Intent] ${intent.intent} — ${intent.reasoning}`)

      // Step 3: Fetch relevant data from DB
      const storeData = await fetchDataByIntent(intent, userMessage, supabase)

      // Step 4: Generate human-like response
      let replyText = await generateResponse(userMessage, intent, storeData, chatHistory)

      // Truncate for LINE limit
      if (replyText.length > 4900) {
        replyText = replyText.substring(0, 4900) + '\n...'
      }

      // Step 5: Save to chat memory (RAG)
      await saveChatMemory(lineUserId, 'user', userMessage, intent.intent, supabase)
      await saveChatMemory(lineUserId, 'assistant', replyText, intent.intent, supabase)

      // Step 6: Reply
      await replyMessage(replyToken, [textMsg(replyText)], channelAccessToken)
    }

    return new Response('OK', { status: 200 })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
})
