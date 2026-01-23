import { supabase } from './supabase'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

interface PatientInfo {
  age: number
  gender?: string
  weight?: number
  height?: number
  pregnant?: boolean
  breastfeeding?: boolean
  allergies: string
  currentMedications?: string
  chronicConditions: string
  symptomDuration: string
}

interface DrugRecommendation {
  productId?: string
  name: string
  type?: string
  reason: string
  dosage: string
  warnings?: string
  confidence?: number
  product?: any
}

export async function analyzeSymptoms(symptoms: string, patientInfo: PatientInfo): Promise<DrugRecommendation[]> {
  if (!GEMINI_API_KEY) {
    console.error('Gemini API key is missing')
    throw new Error('ไม่พบ API Key สำหรับ Gemini กรุณาตั้งค่า VITE_GEMINI_API_KEY ในไฟล์ .env')
  }

  // Fetch available products from database with medicine details
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
      unit_of_measure,
      is_prescription_required,
      category:categories(name_th, name_en),
      medicine_details (
        dosage_form,
        strength,
        dosage_instructions,
        warnings,
        active_ingredients
      )
    `)
    .eq('is_active', true)
    .gt('stock_quantity', 0)

  if (error) {
    console.error('Database error:', error)
    throw new Error('ไม่สามารถดึงข้อมูลสินค้าจากฐานข้อมูลได้: ' + error.message)
  }
  
  if (!products || products.length === 0) {
    throw new Error('ไม่พบสินค้าในฐานข้อมูล กรุณาเพิ่มสินค้าก่อนใช้งาน')
  }

  // Create product list for AI
  const productList = products.map(p => {
    const medicine = (p as any).medicine_details?.[0]
    return {
      id: p.id,
      name: p.name_th,
      nameEn: p.name_en,
      description: p.description_th,
      category: (p as any).category?.name_th || 'ไม่มีหมวดหมู่',
      dosageForm: medicine?.dosage_form || '',
      strength: medicine?.strength || '',
      dosageInstructions: medicine?.dosage_instructions || '',
      warnings: medicine?.warnings || '',
      activeIngredients: medicine?.active_ingredients || '',
      isPrescriptionRequired: p.is_prescription_required || false
    }
  })

  // Build AI prompt
  const prompt = `คุณเป็นเภสัชกรผู้เชี่ยวชาญ กรุณาวิเคราะห์อาการและแนะนำยาที่เหมาะสมจากรายการสินค้าที่มีในร้าน

ข้อมูลผู้ป่วย:
- อายุ: ${patientInfo.age} ปี
- เพศ: ${patientInfo.gender || 'ไม่ระบุ'}
- ท้อง/ให้นมบุตร: ${patientInfo.pregnant || patientInfo.breastfeeding ? 'ใช่' : 'ไม่ใช่'}
- แพ้ยา: ${patientInfo.allergies || 'ไม่มี'}
- กำลังกินยา: ${patientInfo.currentMedications || 'ไม่มี'}
- โรคประจำตัว: ${patientInfo.chronicConditions || 'ไม่มี'}
- มีอาการมา: ${patientInfo.symptomDuration}

อาการ: ${symptoms}

รายการยาที่มีในร้าน:
${productList.map((p, i) => {
  let details = `${i + 1}. ${p.name} (${p.category})`
  if (p.strength) details += ` - ${p.strength}`
  if (p.dosageForm) details += ` - ${p.dosageForm}`
  if (p.activeIngredients) details += ` - ตัวยาสำคัญ: ${p.activeIngredients}`
  if (p.description) details += ` - ${p.description}`
  if (p.isPrescriptionRequired) details += ' [ต้องมีใบสั่งยา]'
  return details
}).join('\n')}

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
      const errorData = await response.text()
      console.error('Gemini API error:', response.status, errorData)
      
      if (response.status === 400) {
        throw new Error('ข้อมูลที่ส่งไม่ถูกต้อง กรุณาตรวจสอบข้อมูลผู้ป่วย')
      } else if (response.status === 401 || response.status === 403) {
        throw new Error('API Key ไม่ถูกต้องหรือหมดอายุ กรุณาตรวจสอบ VITE_GEMINI_API_KEY')
      } else if (response.status === 429) {
        throw new Error('ใช้งาน API เกินโควต้า กรุณาลองใหม่ภายหลัง')
      } else if (response.status === 500 || response.status === 503) {
        throw new Error('ระบบ AI ขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง')
      } else {
        throw new Error(`เกิดข้อผิดพลาดจาก Gemini API: ${response.status} ${response.statusText}`)
      }
    }

    const data = await response.json()
    
    // Check for API errors in response
    if (data.error) {
      console.error('Gemini API returned error:', data.error)
      throw new Error(`Gemini API: ${data.error.message || 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'}`)
    }
    
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!aiResponse) {
      console.error('No valid response from AI:', data)
      throw new Error('ไม่ได้รับคำตอบจาก AI กรุณาลองใหม่อีกครั้ง')
    }

    // Parse JSON from AI response
    console.log('AI Response:', aiResponse)
    
    // Try to extract JSON from the response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('Could not find JSON in AI response:', aiResponse)
      throw new Error('รูปแบบคำตอบจาก AI ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง')
    }

    let result
    try {
      result = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', jsonMatch[0], parseError)
      throw new Error('ไม่สามารถแปลงคำตอบจาก AI ได้ กรุณาลองใหม่อีกครั้ง')
    }

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

  } catch (error: any) {
    console.error('Error in analyzeSymptoms:', error)
    
    // Re-throw with more user-friendly message if needed
    if (error.message?.includes('fetch')) {
      throw new Error('ไม่สามารถเชื่อมต่อกับ Gemini API ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต')
    }
    
    throw error
  }
}
