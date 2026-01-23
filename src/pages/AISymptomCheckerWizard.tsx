import { useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { analyzeSymptoms } from '../services/gemini'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { 
  Brain, 
  AlertTriangle, 
  Pill, 
  ShoppingCart, 
  ChevronRight, 
  ChevronLeft,
  Check
} from 'lucide-react'

interface ConsultationData {
  // Patient Info
  patientName: string
  patientPhone: string
  age: number
  gender: 'male' | 'female' | 'other'
  weight: number
  height: number
  
  // Medical History
  pregnant: boolean
  breastfeeding: boolean
  allergies: string
  currentMedications: string
  chronicConditions: string
  
  // Current Symptoms
  symptomDuration: string
  symptoms: string
  temperature: number
  bloodPressure: string
  pulseRate: number
  chiefComplaint: string
  
  // Selected quick symptoms
  selectedSymptoms: string[]
}


export default function AISymptomCheckerWizard() {
  const { t } = useLanguage()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [error, setError] = useState('')
  
  const [consultationData, setConsultationData] = useState<ConsultationData>({
    patientName: '',
    patientPhone: '',
    age: 30,
    gender: 'male',
    weight: 60,
    height: 170,
    pregnant: false,
    breastfeeding: false,
    allergies: '',
    currentMedications: '',
    chronicConditions: '',
    symptomDuration: '1to3Days',
    symptoms: '',
    temperature: 36.5,
    bloodPressure: '120/80',
    pulseRate: 72,
    chiefComplaint: '',
    selectedSymptoms: []
  })

  const totalSteps = 7

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleAnalyze = async () => {
    setLoading(true)
    setError('')

    try {
      // Combine selected symptoms with free text
      const allSymptoms = [
        ...consultationData.selectedSymptoms,
        consultationData.symptoms
      ].filter(Boolean).join(', ')

      const patientInfo = {
        age: consultationData.age,
        pregnant: consultationData.pregnant || consultationData.breastfeeding,
        allergies: consultationData.allergies,
        currentMeds: consultationData.currentMedications,
        chronicConditions: consultationData.chronicConditions,
        symptomDuration: consultationData.symptomDuration,
        symptoms: allSymptoms || consultationData.chiefComplaint
      }

      const results = await analyzeSymptoms(patientInfo)
      
      // Save consultation to database
      await saveConsultation(results)
      
      // Fetch product details
      const enrichedResults = []
      for (const rec of results) {
        if (rec.productId) {
          const { data: product } = await supabase
            .from('products')
            .select('*, category:categories(name_th)')
            .eq('id', rec.productId)
            .single()
          
          enrichedResults.push({
            ...rec,
            product
          })
        } else {
          enrichedResults.push(rec)
        }
      }

      setRecommendations(enrichedResults)
      setCurrentStep(totalSteps + 1) // Go to results
    } catch (err: any) {
      console.error('Analysis error:', err)
      setError(err.message.includes('VITE_GEMINI_API_KEY') 
        ? t('ai.apiKeyMissing') 
        : t('ai.error'))
    } finally {
      setLoading(false)
    }
  }

  const saveConsultation = async (aiRecommendations: any[]) => {
    try {
      const { data: userData } = await supabase.auth.getUser()
      
      await supabase.from('consultation_history').insert({
        patient_name: consultationData.patientName,
        patient_phone: consultationData.patientPhone,
        age: consultationData.age,
        gender: consultationData.gender,
        weight: consultationData.weight,
        height: consultationData.height,
        pregnant: consultationData.pregnant,
        breastfeeding: consultationData.breastfeeding,
        allergies: consultationData.allergies,
        current_medications: consultationData.currentMedications,
        chronic_conditions: consultationData.chronicConditions,
        symptom_duration: consultationData.symptomDuration,
        symptoms: [...consultationData.selectedSymptoms, consultationData.symptoms].filter(Boolean).join(', '),
        temperature: consultationData.temperature,
        blood_pressure: consultationData.bloodPressure,
        pulse_rate: consultationData.pulseRate,
        chief_complaint: consultationData.chiefComplaint,
        ai_recommendations: aiRecommendations,
        created_by: userData?.user?.id
      })
    } catch (error) {
      console.error('Error saving consultation:', error)
    }
  }

  const resetConsultation = () => {
    setCurrentStep(1)
    setConsultationData({
      patientName: '',
      patientPhone: '',
      age: 30,
      gender: 'male',
      weight: 60,
      height: 170,
      pregnant: false,
      breastfeeding: false,
      allergies: '',
      currentMedications: '',
      chronicConditions: '',
      symptomDuration: '1to3Days',
      symptoms: '',
      temperature: 36.5,
      bloodPressure: '120/80',
      pulseRate: 72,
      chiefComplaint: '',
      selectedSymptoms: []
    })
    setRecommendations([])
    setError('')
  }

  const renderStepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {[...Array(totalSteps)].map((_, index) => {
          const stepNum = index + 1
          const isActive = stepNum === currentStep
          const isCompleted = stepNum < currentStep
          
          return (
            <div key={stepNum} className="flex items-center flex-1">
              <div className="relative">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    isActive
                      ? 'bg-blue-600 text-white ring-4 ring-blue-200'
                      : isCompleted
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {isCompleted ? <Check className="h-5 w-5" /> : stepNum}
                </div>
                {stepNum < totalSteps && (
                  <div
                    className={`absolute top-5 left-10 w-full h-0.5 ${
                      isCompleted ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                    style={{ width: 'calc(100vw / 8)' }}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex justify-between mt-2 text-xs text-gray-600">
        <span>ข้อมูลผู้ป่วย</span>
        <span>สัญญาณชีพ</span>
        <span>อาการ</span>
        <span>ระยะเวลา</span>
        <span>แพ้ยา</span>
        <span>โรคประจำตัว</span>
        <span>ยาปัจจุบัน</span>
      </div>
    </div>
  )

  const renderResults = () => (
    <div className="space-y-6">
      <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
        <h3 className="text-lg font-bold text-green-900 mb-2">ผลการวิเคราะห์</h3>
        <p className="text-green-700">ระบบ AI ได้วิเคราะห์และแนะนำยาดังนี้</p>
      </div>

      {recommendations.map((rec, index) => (
        <Card key={index}>
          {rec.productId ? (
            <>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Pill className="h-5 w-5 text-blue-600" />
                  <h3 className="font-bold text-lg">{rec.name}</h3>
                </div>
                <span className="text-sm font-medium text-blue-600">
                  {rec.confidence}% แนะนำ
                </span>
              </div>

              {rec.product && (
                <div className="mb-3 text-sm text-gray-600">
                  <p><strong>หมวดหมู่:</strong> {(rec.product as any).category?.name_th || '-'}</p>
                  <p><strong>ราคา:</strong> ฿{rec.product.base_price.toFixed(2)}</p>
                  <p><strong>คงเหลือ:</strong> {rec.product.stock_quantity} {rec.product.unit}</p>
                </div>
              )}

              <div className="space-y-2 mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">เหตุผล:</p>
                  <p className="text-sm text-gray-600">{rec.reason}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">วิธีใช้:</p>
                  <p className="text-sm text-gray-600">{rec.dosage}</p>
                </div>
                {rec.warnings && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                    <p className="text-sm font-medium text-yellow-800">คำเตือน:</p>
                    <p className="text-sm text-yellow-700">{rec.warnings}</p>
                  </div>
                )}
              </div>

              {rec.product && rec.product.stock_quantity > 0 && (
                <Button variant="primary" size="sm" className="w-full">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  เพิ่มลงตะกร้า
                </Button>
              )}
            </>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0" />
                <div>
                  <p className="font-bold text-red-900 mb-2">แนะนำให้พบแพทย์</p>
                  <p className="text-sm text-red-800">{rec.name}</p>
                  {rec.warnings && (
                    <p className="text-sm text-red-700 mt-2">{rec.warnings}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>
      ))}

      <div className="flex gap-3">
        <Button variant="primary" onClick={resetConsultation}>
          เริ่มการปรึกษาใหม่
        </Button>
        <Button variant="secondary" onClick={() => window.print()}>
          พิมพ์ผลการวิเคราะห์
        </Button>
      </div>
    </div>
  )

  const renderStepContent = () => {
    if (currentStep > totalSteps) return renderResults()
    if (currentStep === 1) return renderStep1PatientInfo()
    if (currentStep === 2) return renderStep2VitalSigns()
    if (currentStep === 3) return renderStep3Symptoms()
    if (currentStep === 4) return renderStep4Duration()
    if (currentStep === 5) return renderStep5Allergies()
    if (currentStep === 6) return renderStep6ChronicConditions()
    if (currentStep === 7) return renderStep7CurrentMedications()
    return null
  }

  const renderStep1PatientInfo = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <h3 className="text-lg font-bold text-blue-900 mb-2">ขั้นตอนที่ 1: ข้อมูลผู้ป่วย</h3>
        <p className="text-blue-700">กรุณากรอกข้อมูลพื้นฐานของผู้ป่วย</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">ชื่อผู้ป่วย</label>
          <input
            type="text"
            value={consultationData.patientName}
            onChange={(e) => setConsultationData({...consultationData, patientName: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="ชื่อ-นามสกุล"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">เบอร์โทรศัพท์</label>
          <input
            type="tel"
            value={consultationData.patientPhone}
            onChange={(e) => setConsultationData({...consultationData, patientPhone: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="08X-XXX-XXXX"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">อายุ (ปี)</label>
          <input
            type="number"
            value={consultationData.age}
            onChange={(e) => setConsultationData({...consultationData, age: parseInt(e.target.value) || 0})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">เพศ</label>
          <div className="flex gap-4">
            {['male', 'female', 'other'].map(gender => (
              <button
                key={gender}
                onClick={() => setConsultationData({...consultationData, gender: gender as any})}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  consultationData.gender === gender
                    ? 'bg-blue-500 text-white border-blue-500 shadow-lg scale-105'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {gender === 'male' ? '👨 ชาย' : gender === 'female' ? '👩 หญิง' : '⚧ อื่นๆ'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">น้ำหนัก (กก.)</label>
          <input
            type="number"
            value={consultationData.weight}
            onChange={(e) => setConsultationData({...consultationData, weight: parseFloat(e.target.value) || 0})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">ส่วนสูง (ซม.)</label>
          <input
            type="number"
            value={consultationData.height}
            onChange={(e) => setConsultationData({...consultationData, height: parseFloat(e.target.value) || 0})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {consultationData.gender === 'female' && (
        <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
          <p className="text-sm font-medium text-pink-900 mb-3">🤰 สำหรับผู้หญิงเท่านั้น:</p>
          <div className="space-y-3">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={consultationData.pregnant}
                onChange={(e) => setConsultationData({...consultationData, pregnant: e.target.checked})}
                className="mr-3 h-5 w-5 text-pink-600"
              />
              <span className="text-gray-700">ตั้งครรภ์</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={consultationData.breastfeeding}
                onChange={(e) => setConsultationData({...consultationData, breastfeeding: e.target.checked})}
                className="mr-3 h-5 w-5 text-pink-600"
              />
              <span className="text-gray-700">ให้นมบุตร</span>
            </label>
          </div>
        </div>
      )}
    </div>
  )

  const renderStep2VitalSigns = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <h3 className="text-lg font-bold text-blue-900 mb-2">ขั้นตอนที่ 2: สัญญาณชีพ</h3>
        <p className="text-blue-700">บันทึกสัญญาณชีพของผู้ป่วย</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">อุณหภูมิ (°C)</label>
          <input
            type="number"
            step="0.1"
            value={consultationData.temperature}
            onChange={(e) => setConsultationData({...consultationData, temperature: parseFloat(e.target.value) || 36.5})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {[36.5, 37.0, 37.5, 38.0, 38.5, 39.0].map(temp => (
              <button
                key={temp}
                onClick={() => setConsultationData({...consultationData, temperature: temp})}
                className={`px-3 py-1 rounded text-sm transition-all ${
                  temp === consultationData.temperature ? 'ring-2 ring-offset-1' : ''
                } ${
                  temp >= 37.5 
                    ? temp >= 38.5
                      ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                      : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {temp}°
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">ความดันโลหิต (mmHg)</label>
          <input
            type="text"
            value={consultationData.bloodPressure}
            onChange={(e) => setConsultationData({...consultationData, bloodPressure: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="120/80"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {['120/80', '130/85', '140/90'].map(bp => (
              <button
                key={bp}
                onClick={() => setConsultationData({...consultationData, bloodPressure: bp})}
                className={`px-3 py-1 rounded text-sm transition-all ${
                  bp === consultationData.bloodPressure ? 'ring-2 ring-offset-1' : ''
                } ${
                  bp === '120/80' 
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                }`}
              >
                {bp}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">อัตราชีพจร (ครั้ง/นาที)</label>
          <input
            type="number"
            value={consultationData.pulseRate}
            onChange={(e) => setConsultationData({...consultationData, pulseRate: parseInt(e.target.value) || 72})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {[60, 72, 80, 90, 100].map(pulse => (
              <button
                key={pulse}
                onClick={() => setConsultationData({...consultationData, pulseRate: pulse})}
                className={`px-3 py-1 rounded text-sm transition-all ${
                  pulse === consultationData.pulseRate ? 'ring-2 ring-offset-1' : ''
                } bg-green-100 text-green-700 hover:bg-green-200`}
              >
                {pulse}
              </button>
            ))}
          </div>
        </div>
      </div>

      {consultationData.weight > 0 && consultationData.height > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">
            BMI: {(consultationData.weight / Math.pow(consultationData.height / 100, 2)).toFixed(1)}
          </p>
        </div>
      )}
    </div>
  )

  const renderStep3Symptoms = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <h3 className="text-lg font-bold text-blue-900 mb-2">ขั้นตอนที่ 3: อาการสำคัญ</h3>
        <p className="text-blue-700">อธิบายอาการที่ผู้ป่วยมา</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">อาการสำคัญที่มาพบ</label>
        <textarea
          value={consultationData.chiefComplaint}
          onChange={(e) => setConsultationData({...consultationData, chiefComplaint: e.target.value})}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          rows={3}
          placeholder="เช่น ปวดหัวมาก 2 วัน กินยาแล้วไม่ดีขึ้น"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">อาการเพิ่มเติม</label>
        <textarea
          value={consultationData.symptoms}
          onChange={(e) => setConsultationData({...consultationData, symptoms: e.target.value})}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          rows={4}
          placeholder="อธิบายอาการอื่นๆ เพิ่มเติม..."
        />
      </div>
    </div>
  )

  const renderStep4Duration = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <h3 className="text-lg font-bold text-blue-900 mb-2">ขั้นตอนที่ 4: ระยะเวลาที่มีอาการ</h3>
        <p className="text-blue-700">อาการเริ่มมาตั้งแต่เมื่อไหร่?</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'วันนี้', value: 'lessThan1Day', color: 'blue' },
          { label: '1-3 วัน', value: '1to3Days', color: 'yellow' },
          { label: '3-7 วัน', value: '3to7Days', color: 'orange' },
          { label: '1 สัปดาห์+', value: 'moreThan1Week', color: 'red' }
        ].map(option => (
          <button
            key={option.value}
            onClick={() => setConsultationData({...consultationData, symptomDuration: option.value})}
            className={`p-4 rounded-lg border-2 transition-all ${
              consultationData.symptomDuration === option.value
                ? 'border-blue-500 bg-blue-50 shadow-lg scale-105'
                : 'border-gray-300 bg-white hover:bg-gray-50'
            }`}
          >
            <p className="font-medium text-gray-900">{option.label}</p>
          </button>
        ))}
      </div>
    </div>
  )

  const renderStep5Allergies = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <h3 className="text-lg font-bold text-blue-900 mb-2">ขั้นตอนที่ 5: ประวัติแพ้ยา</h3>
        <p className="text-blue-700">มีประวัติแพ้ยาหรือไม่?</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
        {[
          { label: 'ไม่มี', value: 'ไม่มี' },
          { label: 'เพนนิซิลลิน', value: 'แพ้เพนนิซิลลิน' },
          { label: 'แอสไพริน', value: 'แพ้แอสไพริน' },
          { label: 'ซัลฟา', value: 'แพ้ยากลุ่มซัลฟา' },
          { label: 'NSAIDs', value: 'แพ้ยาแก้ปวด NSAIDs' }
        ].map(option => (
          <button
            key={option.value}
            onClick={() => setConsultationData({...consultationData, allergies: option.value})}
            className={`px-4 py-2 rounded-lg border transition-all ${
              consultationData.allergies === option.value
                ? option.value === 'ไม่มี'
                  ? 'bg-green-500 text-white'
                  : 'bg-red-500 text-white'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={consultationData.allergies}
        onChange={(e) => setConsultationData({...consultationData, allergies: e.target.value})}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        placeholder="พิมพ์ชื่อยาที่แพ้ (ถ้ามี)"
      />
    </div>
  )

  const renderStep6ChronicConditions = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <h3 className="text-lg font-bold text-blue-900 mb-2">ขั้นตอนที่ 6: โรคประจำตัว</h3>
        <p className="text-blue-700">มีโรคประจำตัวหรือไม่?</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
        {[
          { label: 'ไม่มี', value: 'ไม่มี' },
          { label: 'เบาหวาน', value: 'เบาหวาน' },
          { label: 'ความดัน', value: 'ความดันโลหิตสูง' },
          { label: 'หัวใจ', value: 'โรคหัวใจ' },
          { label: 'ไต', value: 'โรคไต' },
          { label: 'ตับ', value: 'โรคตับ' },
          { label: 'หอบหืด', value: 'หอบหืด' }
        ].map(option => (
          <button
            key={option.value}
            onClick={() => setConsultationData({...consultationData, chronicConditions: option.value})}
            className={`px-4 py-2 rounded-lg border transition-all ${
              consultationData.chronicConditions === option.value
                ? option.value === 'ไม่มี'
                  ? 'bg-green-500 text-white'
                  : 'bg-orange-500 text-white'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={consultationData.chronicConditions}
        onChange={(e) => setConsultationData({...consultationData, chronicConditions: e.target.value})}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        placeholder="พิมพ์โรคประจำตัว (ถ้ามี)"
      />
    </div>
  )

  const renderStep7CurrentMedications = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <h3 className="text-lg font-bold text-blue-900 mb-2">ขั้นตอนที่ 7: ยาที่กินอยู่ปัจจุบัน</h3>
        <p className="text-blue-700">กำลังกินยาอะไรอยู่บ้าง?</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
        {[
          { label: 'ไม่มี', value: 'ไม่มี' },
          { label: 'ยาเบาหวาน', value: 'ยาเบาหวาน' },
          { label: 'ยาความดัน', value: 'ยาความดัน' },
          { label: 'ยาหัวใจ', value: 'ยาหัวใจ' },
          { label: 'ยาละลายลิ่มเลือด', value: 'ยาละลายลิ่มเลือด' },
          { label: 'ยาคุมกำเนิด', value: 'ยาคุมกำเนิด' }
        ].map(option => (
          <button
            key={option.value}
            onClick={() => setConsultationData({...consultationData, currentMedications: option.value})}
            className={`px-4 py-2 rounded-lg border transition-all ${
              consultationData.currentMedications === option.value
                ? option.value === 'ไม่มี'
                  ? 'bg-green-500 text-white'
                  : 'bg-purple-500 text-white'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <textarea
        value={consultationData.currentMedications}
        onChange={(e) => setConsultationData({...consultationData, currentMedications: e.target.value})}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        rows={3}
        placeholder="พิมพ์ชื่อยาที่กินอยู่ (ถ้ามี)"
      />
    </div>
  )

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Brain className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">AI ช่วยแนะนำยา</h1>
        </div>
        <p className="text-gray-600">ระบบช่วยแนะนำยาตามอาการ - แบบเภสัชกรมืออาชีพ</p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800">{t('ai.disclaimer')}</p>
        </div>
      </div>

      {renderStepIndicator()}

      <Card>
        <div className="min-h-[400px]">
          {renderStepContent()}
        </div>

        <div className="flex justify-between mt-6 pt-4 border-t">
          <Button
            variant="secondary"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            ย้อนกลับ
          </Button>

          {currentStep < totalSteps ? (
            <Button
              variant="primary"
              onClick={nextStep}
            >
              ถัดไป
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleAnalyze}
              disabled={loading}
            >
              {loading ? 'กำลังวิเคราะห์...' : 'วิเคราะห์และแนะนำยา'}
              <Brain className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
      </Card>
    </div>
  )
}
