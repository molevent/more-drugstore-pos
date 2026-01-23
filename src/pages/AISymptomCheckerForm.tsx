import { useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { analyzeSymptoms } from '../services/gemini'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { Brain, AlertTriangle, Pill, ShoppingCart, Save } from 'lucide-react'

interface ConsultationData {
  patientName: string
  patientPhone: string
  age: number
  gender: 'male' | 'female' | 'other'
  weight: number
  height: number
  pregnant: boolean
  breastfeeding: boolean
  allergies: string
  currentMedications: string
  chronicConditions: string
  symptomDuration: string
  symptoms: string
  temperature: number
  bloodPressure: string
  pulseRate: number
  chiefComplaint: string
}

export default function AISymptomCheckerForm() {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  
  const [consultationData, setConsultationData] = useState<ConsultationData>({
    patientName: '',
    patientPhone: '',
    age: 30,
    gender: 'male',
    weight: 60,
    height: 170,
    pregnant: false,
    breastfeeding: false,
    allergies: 'ไม่มี',
    currentMedications: 'ไม่มี',
    chronicConditions: 'ไม่มี',
    symptomDuration: '1to3Days',
    symptoms: '',
    temperature: 36.5,
    bloodPressure: '120/80',
    pulseRate: 72,
    chiefComplaint: ''
  })

  const handleAnalyze = async () => {
    setLoading(true)
    setError('')
    setSuccessMessage('')

    try {
      const allSymptoms = consultationData.symptoms

      const patientInfo = {
        age: consultationData.age,
        gender: consultationData.gender,
        weight: consultationData.weight,
        height: consultationData.height,
        pregnant: consultationData.pregnant,
        breastfeeding: consultationData.breastfeeding,
        allergies: consultationData.allergies,
        currentMedications: consultationData.currentMedications,
        chronicConditions: consultationData.chronicConditions,
        symptomDuration: consultationData.symptomDuration
      }

      const result = await analyzeSymptoms(allSymptoms, patientInfo)
      setRecommendations(result || [])

      // Save to database
      await saveConsultation(result || [])
      
      setSuccessMessage('✅ วิเคราะห์และบันทึกข้อมูลเรียบร้อยแล้ว')
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการวิเคราะห์')
    } finally {
      setLoading(false)
    }
  }

  const saveConsultation = async (aiRecommendations: any[]) => {
    setSaving(true)
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
        symptoms: consultationData.symptoms,
        temperature: consultationData.temperature,
        blood_pressure: consultationData.bloodPressure,
        pulse_rate: consultationData.pulseRate,
        chief_complaint: consultationData.chiefComplaint,
        ai_recommendations: aiRecommendations,
        created_by: userData?.user?.id
      })
    } catch (error) {
      console.error('Error saving consultation:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveOnly = async () => {
    setSaving(true)
    setError('')
    setSuccessMessage('')
    
    try {
      await saveConsultation([])
      setSuccessMessage('✅ บันทึกข้อมูลเรียบร้อยแล้ว')
    } catch (err: any) {
      setError('เกิดข้อผิดพลาดในการบันทึก')
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setConsultationData({
      patientName: '',
      patientPhone: '',
      age: 30,
      gender: 'male',
      weight: 60,
      height: 170,
      pregnant: false,
      breastfeeding: false,
      allergies: 'ไม่มี',
      currentMedications: 'ไม่มี',
      chronicConditions: 'ไม่มี',
      symptomDuration: '1to3Days',
      symptoms: '',
      temperature: 36.5,
      bloodPressure: '120/80',
      pulseRate: 72,
      chiefComplaint: ''
    })
    setRecommendations([])
    setError('')
    setSuccessMessage('')
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Brain className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">AI ช่วยแนะนำยา</h1>
        </div>
        <p className="text-gray-600">กรอกข้อมูลผู้ป่วยและอาการในแบบฟอร์มเดียว</p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800">{t('ai.disclaimer')}</p>
        </div>
      </div>

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-medium">{successMessage}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <Card>
        <div className="space-y-8">
          {/* Section 1: Patient Info */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-500">
              📋 ข้อมูลผู้ป่วย
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ชื่อผู้ป่วย *</label>
                <input
                  type="text"
                  value={consultationData.patientName}
                  onChange={(e) => setConsultationData({...consultationData, patientName: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="ชื่อ-นามสกุล"
                  required
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
                <label className="block text-sm font-medium text-gray-700 mb-2">อายุ (ปี) *</label>
                <input
                  type="number"
                  value={consultationData.age}
                  onChange={(e) => setConsultationData({...consultationData, age: parseInt(e.target.value) || 0})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">เพศ *</label>
                <div className="flex gap-3">
                  {[
                    { value: 'male', label: '👨 ชาย' },
                    { value: 'female', label: '👩 หญิง' },
                    { value: 'other', label: '⚧ อื่นๆ' }
                  ].map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setConsultationData({...consultationData, gender: option.value as any})}
                      className={`flex-1 px-4 py-2 rounded-lg border transition-all ${
                        consultationData.gender === option.value
                          ? 'bg-blue-500 text-white border-blue-500 shadow-lg'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">น้ำหนัก (กก.) *</label>
                <input
                  type="number"
                  value={consultationData.weight}
                  onChange={(e) => setConsultationData({...consultationData, weight: parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ส่วนสูง (ซม.) *</label>
                <input
                  type="number"
                  value={consultationData.height}
                  onChange={(e) => setConsultationData({...consultationData, height: parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {consultationData.gender === 'female' && (
              <div className="mt-4 bg-pink-50 border border-pink-200 rounded-lg p-4">
                <p className="text-sm font-medium text-pink-900 mb-3">🤰 สำหรับผู้หญิงเท่านั้น:</p>
                <div className="flex gap-6">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consultationData.pregnant}
                      onChange={(e) => setConsultationData({...consultationData, pregnant: e.target.checked})}
                      className="mr-2 h-5 w-5 text-pink-600"
                    />
                    <span className="text-gray-700">ตั้งครรภ์</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consultationData.breastfeeding}
                      onChange={(e) => setConsultationData({...consultationData, breastfeeding: e.target.checked})}
                      className="mr-2 h-5 w-5 text-pink-600"
                    />
                    <span className="text-gray-700">ให้นมบุตร</span>
                  </label>
                </div>
              </div>
            )}

            {consultationData.weight > 0 && consultationData.height > 0 && (
              <div className="mt-4 bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">
                  <strong>BMI:</strong> {(consultationData.weight / Math.pow(consultationData.height / 100, 2)).toFixed(1)}
                  {' - '}
                  <span className={`font-medium ${
                    consultationData.weight / Math.pow(consultationData.height / 100, 2) < 18.5
                      ? 'text-blue-600'
                      : consultationData.weight / Math.pow(consultationData.height / 100, 2) < 25
                      ? 'text-green-600'
                      : consultationData.weight / Math.pow(consultationData.height / 100, 2) < 30
                      ? 'text-yellow-600'
                      : 'text-red-600'
                  }`}>
                    {consultationData.weight / Math.pow(consultationData.height / 100, 2) < 18.5
                      ? 'น้ำหนักต่ำกว่าเกณฑ์'
                      : consultationData.weight / Math.pow(consultationData.height / 100, 2) < 25
                      ? 'น้ำหนักปกติ'
                      : consultationData.weight / Math.pow(consultationData.height / 100, 2) < 30
                      ? 'น้ำหนักเกิน'
                      : 'อ้วน'}
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* Section 2: Vital Signs */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-green-500">
              🩺 สัญญาณชีพ
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      type="button"
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
                      type="button"
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
                      type="button"
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
          </div>

          {/* Section 3: Symptoms */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-red-500">
              🤒 อาการและระยะเวลา
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">อาการสำคัญที่มาพบ (Chief Complaint) *</label>
                <textarea
                  value={consultationData.chiefComplaint}
                  onChange={(e) => setConsultationData({...consultationData, chiefComplaint: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="เช่น ปวดหัวมาก 2 วัน กินยาแล้วไม่ดีขึ้น"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">อาการเพิ่มเติม *</label>
                <textarea
                  value={consultationData.symptoms}
                  onChange={(e) => setConsultationData({...consultationData, symptoms: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="อธิบายอาการอื่นๆ เพิ่มเติม..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ระยะเวลาที่มีอาการ</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'วันนี้', value: 'lessThan1Day' },
                    { label: '1-3 วัน', value: '1to3Days' },
                    { label: '3-7 วัน', value: '3to7Days' },
                    { label: '1 สัปดาห์+', value: 'moreThan1Week' }
                  ].map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setConsultationData({...consultationData, symptomDuration: option.value})}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        consultationData.symptomDuration === option.value
                          ? 'border-blue-500 bg-blue-50 shadow-lg'
                          : 'border-gray-300 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <p className="font-medium text-gray-900">{option.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Medical History */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-purple-500">
              💊 ประวัติการแพ้และโรคประจำตัว
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ประวัติแพ้ยา</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
                  {[
                    { label: 'ไม่มี', value: 'ไม่มี' },
                    { label: 'เพนนิซิลลิน', value: 'แพ้เพนนิซิลลิน' },
                    { label: 'แอสไพริน', value: 'แพ้แอสไพริน' },
                    { label: 'ซัลฟา', value: 'แพ้ยากลุ่มซัลฟา' },
                    { label: 'NSAIDs', value: 'แพ้ยาแก้ปวด NSAIDs' }
                  ].map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setConsultationData({...consultationData, allergies: option.value})}
                      className={`px-3 py-2 rounded-lg border transition-all text-sm ${
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">โรคประจำตัว</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
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
                      type="button"
                      onClick={() => setConsultationData({...consultationData, chronicConditions: option.value})}
                      className={`px-3 py-2 rounded-lg border transition-all text-sm ${
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ยาที่กินอยู่ปัจจุบัน</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
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
                      type="button"
                      onClick={() => setConsultationData({...consultationData, currentMedications: option.value})}
                      className={`px-3 py-2 rounded-lg border transition-all text-sm ${
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
                  rows={2}
                  placeholder="พิมพ์ชื่อยาที่กินอยู่ (ถ้ามี)"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-4 border-t">
            <Button
              variant="primary"
              onClick={handleAnalyze}
              disabled={loading || saving || !consultationData.patientName || !consultationData.symptoms}
              className="flex-1 min-w-[200px]"
            >
              {loading ? 'กำลังวิเคราะห์...' : (
                <>
                  <Brain className="h-5 w-5 mr-2" />
                  วิเคราะห์และบันทึก
                </>
              )}
            </Button>

            <Button
              variant="secondary"
              onClick={handleSaveOnly}
              disabled={loading || saving || !consultationData.patientName}
              className="flex-1 min-w-[200px]"
            >
              {saving ? 'กำลังบันทึก...' : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  บันทึกเท่านั้น
                </>
              )}
            </Button>

            <Button
              variant="secondary"
              onClick={resetForm}
              disabled={loading || saving}
            >
              เริ่มใหม่
            </Button>
          </div>
        </div>
      </Card>

      {/* Results Section */}
      {recommendations.length > 0 && (
        <div className="mt-6 space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">🎯 ผลการวิเคราะห์และแนะนำยา</h2>
          
          {recommendations.map((rec, index) => (
            <Card key={index}>
              {rec.type === 'medication' ? (
                <>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Pill className="h-6 w-6 text-blue-600" />
                      <h3 className="text-lg font-bold text-gray-900">{rec.name}</h3>
                    </div>
                    {rec.product && rec.product.stock_quantity > 0 && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        มีสินค้า
                      </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">เหตุผลที่แนะนำ:</p>
                      <p className="text-sm text-gray-600">{rec.reason}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">วิธีใช้:</p>
                      <p className="text-sm text-gray-600">{rec.dosage}</p>
                    </div>
                    {rec.warnings && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                        <p className="text-sm font-medium text-yellow-800">คำเตือน:</p>
                        <p className="text-sm text-yellow-700">{rec.warnings}</p>
                      </div>
                    )}
                  </div>

                  {rec.product && rec.product.stock_quantity > 0 && (
                    <Button variant="primary" size="sm" className="w-full mt-4">
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
            <Button variant="primary" onClick={resetForm}>
              เริ่มการปรึกษาใหม่
            </Button>
            <Button variant="secondary" onClick={() => window.print()}>
              พิมพ์ผลการวิเคราะห์
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
