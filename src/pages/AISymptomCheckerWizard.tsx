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

  if (currentStep > totalSteps) {
    return renderResults()
  }

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
        {/* Render step content dynamically - will be added in next part */}
        <div className="min-h-[400px]">
          {/* Step content will be rendered here */}
          <p className="text-center text-gray-500">Loading step content...</p>
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
