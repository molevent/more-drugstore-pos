import { supabase } from './supabase'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'

interface PatientInfo {
  age: number
  pregnant: boolean
  allergies: string
  currentMeds: string
  chronicConditions: string
  symptomDuration: string
  symptoms: string
}

interface DrugRecommendation {
  productId: string
  name: string
  reason: string
  dosage: string
  warnings: string
  confidence: number
}

export async function analyzeSymptoms(patientInfo: PatientInfo): Promise<DrugRecommendation[]> {
  if (!GEMINI_API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY is not set in environment variables')
  }

  // Fetch available products from database
  const { data: products, error } = await supabase
    .from('products')
    .select(`
      id,
      name_th,
      name_en,
      description_th,
      description_en,
      base_price,
      stock_quantity,
      category:categories(name_th, name_en)
    `)
    .eq('is_active', true)
    .gt('stock_quantity', 0)

  if (error || !products) {
    throw new Error('Failed to fetch products from database')
  }

  // Create product list for AI
  const productList = products.map(p => ({
    id: p.id,
    name: p.name_th,
    nameEn: p.name_en,
    description: p.description_th,
    category: (p as any).category?.name_th || 'ไม่มีหมวดหมู่'
  }))

  // Build AI prompt
  const prompt = `คุณเป็นเภสัชกรผู้เชี่ยวชาญ กรุณาวิเคราะห์อาการและแนะนำยาที่เหมาะสมจากรายการสินค้าที่มีในร้าน

ข้อมูลผู้ป่วย:
- อายุ: ${patientInfo.age} ปี
- ท้อง/ให้นมบุตร: ${patientInfo.pregnant ? 'ใช่' : 'ไม่ใช่'}
- แพ้ยา: ${patientInfo.allergies || 'ไม่มี'}
- กำลังกินยา: ${patientInfo.currentMeds || 'ไม่มี'}
- โรคประจำตัว: ${patientInfo.chronicConditions || 'ไม่มี'}
- มีอาการมา: ${patientInfo.symptomDuration}

อาการ: ${patientInfo.symptoms}

รายการยาที่มีในร้าน:
${productList.map((p, i) => `${i + 1}. ${p.name} (${p.category}) - ${p.description || 'ไม่มีรายละเอียด'}`).join('\n')}

กรุณาตอบในรูปแบบ JSON เท่านั้น โดยมีโครงสร้างดังนี้:
{
  "shouldSeeDoctor": boolean,
  "doctorReason": "เหตุผลที่ควรพบแพทย์ (ถ้า shouldSeeDoctor เป็น true)",
  "recommendations": [
    {
      "productId": "id ของยาจากรายการ",
      "reason": "เหตุผลที่แนะนำยานี้",
      "dosage": "วิธีใช้และขนาดยา",
      "warnings": "คำเตือนและข้อควรระวัง",
      "confidence": 0-100
    }
  ]
}

หมายเหตุ:
- แนะนำยาเฉพาะที่มีในรายการเท่านั้น
- ตรวจสอบข้อห้ามสำหรับผู้ป่วยกลุ่มพิเศษ (เด็ก, ผู้สูงอายุ, ตั้งครรภ์)
- ตรวจสอบการแพ้ยาและยาที่ขัดกัน
- ถ้าอาการรุนแรงหรือต้องการการรักษาจากแพทย์ ให้ตั้ง shouldSeeDoctor เป็น true
- แนะนำยาไม่เกิน 3 รายการ เรียงตาม confidence จากมากไปน้อย`

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 2048,
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`)
    }

    const data = await response.json()
    const aiResponse = data.candidates[0]?.content?.parts[0]?.text

    if (!aiResponse) {
      throw new Error('No response from AI')
    }

    // Parse JSON from AI response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Invalid AI response format')
    }

    const result = JSON.parse(jsonMatch[0])

    // If should see doctor, return empty recommendations with warning
    if (result.shouldSeeDoctor) {
      return [{
        productId: '',
        name: result.doctorReason || 'อาการของคุณอาจต้องการการตรวจวินิจฉัยจากแพทย์',
        reason: 'แนะนำให้พบแพทย์',
        dosage: '',
        warnings: '⚠️ กรุณาพบแพทย์โดยเร็วที่สุด',
        confidence: 100
      }]
    }

    // Map recommendations with product details
    const recommendations: DrugRecommendation[] = []
    
    for (const rec of result.recommendations || []) {
      const product = products.find(p => p.id === rec.productId)
      if (product) {
        recommendations.push({
          productId: rec.productId,
          name: product.name_th,
          reason: rec.reason,
          dosage: rec.dosage,
          warnings: rec.warnings,
          confidence: rec.confidence
        })
      }
    }

    return recommendations

  } catch (error) {
    console.error('Gemini API error:', error)
    throw error
  }
}
