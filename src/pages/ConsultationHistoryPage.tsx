import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { FileText, Search, Calendar, User, Phone, Thermometer, Eye } from 'lucide-react'

interface Consultation {
  id: string
  patient_name: string
  patient_phone: string
  age: number
  gender: string
  symptoms: string
  chief_complaint: string
  temperature: number
  blood_pressure: string
  pulse_rate: number
  allergies: string
  chronic_conditions: string
  current_medications: string
  ai_recommendations: any
  consultation_date: string
  created_by: string
  users?: {
    full_name: string
    email: string
  }
}

export default function ConsultationHistoryPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  useEffect(() => {
    fetchConsultations()
  }, [])

  const fetchConsultations = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('consultation_history')
        .select(`
          *,
          users:created_by (
            full_name,
            email
          )
        `)
        .order('consultation_date', { ascending: false })

      if (error) throw error
      setConsultations(data || [])
    } catch (error) {
      console.error('Error fetching consultations:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredConsultations = consultations.filter(consultation =>
    consultation.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    consultation.patient_phone?.includes(searchTerm) ||
    consultation.symptoms?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const viewDetail = (consultation: Consultation) => {
    setSelectedConsultation(consultation)
    setShowDetail(true)
  }

  const closeDetail = () => {
    setShowDetail(false)
    setSelectedConsultation(null)
  }

  if (showDetail && selectedConsultation) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">รายละเอียดการปรึกษา</h1>
            <p className="text-gray-600 mt-1">ข้อมูลการปรึกษาผู้ป่วย</p>
          </div>
          <Button variant="secondary" onClick={closeDetail}>
            ← กลับ
          </Button>
        </div>

        <div className="space-y-6">
          {/* Patient Info */}
          <Card>
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-500">
              📋 ข้อมูลผู้ป่วย
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">ชื่อผู้ป่วย</p>
                <p className="font-medium text-gray-900">{selectedConsultation.patient_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">เบอร์โทรศัพท์</p>
                <p className="font-medium text-gray-900">{selectedConsultation.patient_phone || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">อายุ</p>
                <p className="font-medium text-gray-900">{selectedConsultation.age} ปี</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">เพศ</p>
                <p className="font-medium text-gray-900">
                  {selectedConsultation.gender === 'male' ? 'ชาย' : selectedConsultation.gender === 'female' ? 'หญิง' : 'อื่นๆ'}
                </p>
              </div>
            </div>
          </Card>

          {/* Vital Signs */}
          <Card>
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-green-500">
              🩺 สัญญาณชีพ
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">อุณหภูมิ</p>
                <p className="font-medium text-gray-900">{selectedConsultation.temperature}°C</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">ความดันโลหิต</p>
                <p className="font-medium text-gray-900">{selectedConsultation.blood_pressure} mmHg</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">ชีพจร</p>
                <p className="font-medium text-gray-900">{selectedConsultation.pulse_rate} ครั้ง/นาที</p>
              </div>
            </div>
          </Card>

          {/* Symptoms */}
          <Card>
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-red-500">
              🤒 อาการ
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">อาการสำคัญ</p>
                <p className="font-medium text-gray-900">{selectedConsultation.chief_complaint || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">อาการเพิ่มเติม</p>
                <p className="font-medium text-gray-900">{selectedConsultation.symptoms}</p>
              </div>
            </div>
          </Card>

          {/* Medical History */}
          <Card>
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-purple-500">
              💊 ประวัติการแพ้และโรคประจำตัว
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">ประวัติแพ้ยา</p>
                <p className="font-medium text-gray-900">{selectedConsultation.allergies || 'ไม่มี'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">โรคประจำตัว</p>
                <p className="font-medium text-gray-900">{selectedConsultation.chronic_conditions || 'ไม่มี'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">ยาที่กินอยู่</p>
                <p className="font-medium text-gray-900">{selectedConsultation.current_medications || 'ไม่มี'}</p>
              </div>
            </div>
          </Card>

          {/* AI Recommendations */}
          {selectedConsultation.ai_recommendations && Array.isArray(selectedConsultation.ai_recommendations) && selectedConsultation.ai_recommendations.length > 0 && (
            <Card>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-yellow-500">
                🎯 ยาที่แนะนำ
              </h2>
              <div className="space-y-3">
                {selectedConsultation.ai_recommendations.map((rec: any, index: number) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <p className="font-bold text-gray-900 mb-2">{rec.name}</p>
                    <p className="text-sm text-gray-600 mb-1"><strong>เหตุผล:</strong> {rec.reason}</p>
                    <p className="text-sm text-gray-600"><strong>วิธีใช้:</strong> {rec.dosage}</p>
                    {rec.warnings && (
                      <p className="text-sm text-yellow-700 mt-2"><strong>คำเตือน:</strong> {rec.warnings}</p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Consultation Info */}
          <Card>
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-500">
              📝 ข้อมูลการบันทึก
            </h2>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-600">วันที่บันทึก</p>
                <p className="font-medium text-gray-900">{formatDate(selectedConsultation.consultation_date)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">บันทึกโดย</p>
                <p className="font-medium text-gray-900">
                  {selectedConsultation.users?.full_name || selectedConsultation.users?.email || '-'}
                </p>
              </div>
            </div>
          </Card>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={closeDetail}>
              ← กลับ
            </Button>
            <Button variant="secondary" onClick={() => window.print()}>
              พิมพ์
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">ประวัติการปรึกษา</h1>
        </div>
        <p className="text-gray-600">รายการบันทึกการปรึกษาผู้ป่วยทั้งหมด</p>
      </div>

      {/* Search Bar */}
      <Card className="mb-6">
        <div className="flex items-center gap-3">
          <Search className="h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาด้วยชื่อ, เบอร์โทร, หรืออาการ..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">ทั้งหมด</p>
              <p className="text-2xl font-bold text-gray-900">{consultations.length}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">วันนี้</p>
              <p className="text-2xl font-bold text-gray-900">
                {consultations.filter(c => new Date(c.consultation_date).toDateString() === new Date().toDateString()).length}
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <User className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">ผู้ป่วยทั้งหมด</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(consultations.map(c => c.patient_name)).size}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Consultations List */}
      <Card>
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
          </div>
        ) : filteredConsultations.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">
              {searchTerm ? 'ไม่พบข้อมูลที่ค้นหา' : 'ยังไม่มีประวัติการปรึกษา'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">วันที่</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ชื่อผู้ป่วย</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">เบอร์โทร</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">อาการ</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">อุณหภูมิ</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">บันทึกโดย</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredConsultations.map((consultation) => (
                  <tr key={consultation.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {new Date(consultation.consultation_date).toLocaleDateString('th-TH', {
                          day: '2-digit',
                          month: 'short',
                          year: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{consultation.patient_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        {consultation.patient_phone || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                      {consultation.chief_complaint || consultation.symptoms}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Thermometer className="h-4 w-4 text-gray-400" />
                        <span className={`font-medium ${
                          consultation.temperature >= 37.5 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {consultation.temperature}°C
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {consultation.users?.full_name || consultation.users?.email || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => viewDetail(consultation)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        ดู
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
