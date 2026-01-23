import { useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { analyzeSymptoms } from '../services/gemini'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import Input from '../components/common/Input'
import Button from '../components/common/Button'
import { Brain, AlertTriangle, Pill, ShoppingCart } from 'lucide-react'

interface PatientInfo {
  age: number
  pregnant: boolean
  allergies: string
  currentMeds: string
  chronicConditions: string
  symptomDuration: string
  symptoms: string
}

interface Recommendation {
  productId: string
  name: string
  reason: string
  dosage: string
  warnings: string
  confidence: number
  product?: any
}

export default function AISymptomCheckerPage() {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [patientInfo, setPatientInfo] = useState<PatientInfo>({
    age: 30,
    pregnant: false,
    allergies: '',
    currentMeds: '',
    chronicConditions: '',
    symptomDuration: '1to3Days',
    symptoms: ''
  })
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [error, setError] = useState('')

  const handleAnalyze = async () => {
    if (!patientInfo.symptoms.trim()) {
      setError('กรุณากรอกอาการ')
      return
    }

    setLoading(true)
    setError('')
    setRecommendations([])

    try {
      const results = await analyzeSymptoms(patientInfo)
      
      // Fetch full product details for recommendations
      const enrichedResults: Recommendation[] = []
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
    } catch (err: any) {
      console.error('Analysis error:', err)
      if (err.message.includes('VITE_GEMINI_API_KEY')) {
        setError(t('ai.apiKeyMissing'))
      } else {
        setError(t('ai.error'))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setPatientInfo({
      age: 30,
      pregnant: false,
      allergies: '',
      currentMeds: '',
      chronicConditions: '',
      symptomDuration: '1to3Days',
      symptoms: ''
    })
    setRecommendations([])
    setError('')
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Brain className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('ai.title')}</h1>
        </div>
        <p className="text-gray-600">{t('ai.subtitle')}</p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800">{t('ai.disclaimer')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card title={t('ai.patientInfo')}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={t('ai.age')}
                  type="number"
                  value={patientInfo.age}
                  onChange={(e) => setPatientInfo({ ...patientInfo, age: parseInt(e.target.value) || 0 })}
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('ai.pregnant')}
                  </label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={patientInfo.pregnant}
                        onChange={() => setPatientInfo({ ...patientInfo, pregnant: true })}
                        className="mr-2"
                      />
                      {t('ai.yes')}
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={!patientInfo.pregnant}
                        onChange={() => setPatientInfo({ ...patientInfo, pregnant: false })}
                        className="mr-2"
                      />
                      {t('ai.no')}
                    </label>
                  </div>
                </div>
              </div>

              <Input
                label={t('ai.allergies')}
                value={patientInfo.allergies}
                onChange={(e) => setPatientInfo({ ...patientInfo, allergies: e.target.value })}
                placeholder={t('ai.allergiesPlaceholder')}
              />

              <Input
                label={t('ai.currentMeds')}
                value={patientInfo.currentMeds}
                onChange={(e) => setPatientInfo({ ...patientInfo, currentMeds: e.target.value })}
                placeholder={t('ai.currentMedsPlaceholder')}
              />

              <Input
                label={t('ai.chronicConditions')}
                value={patientInfo.chronicConditions}
                onChange={(e) => setPatientInfo({ ...patientInfo, chronicConditions: e.target.value })}
                placeholder={t('ai.chronicConditionsPlaceholder')}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('ai.symptomDuration')}
                </label>
                <select
                  value={patientInfo.symptomDuration}
                  onChange={(e) => setPatientInfo({ ...patientInfo, symptomDuration: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                >
                  <option value="lessThan1Day">{t('ai.lessThan1Day')}</option>
                  <option value="1to3Days">{t('ai.1to3Days')}</option>
                  <option value="3to7Days">{t('ai.3to7Days')}</option>
                  <option value="moreThan1Week">{t('ai.moreThan1Week')}</option>
                </select>
              </div>
            </div>
          </Card>

          <Card title={t('ai.symptoms')}>
            <textarea
              value={patientInfo.symptoms}
              onChange={(e) => setPatientInfo({ ...patientInfo, symptoms: e.target.value })}
              placeholder={t('ai.symptomsPlaceholder')}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              required
            />

            <div className="flex gap-3 mt-4">
              <Button
                variant="primary"
                onClick={handleAnalyze}
                disabled={loading}
                className="flex-1"
              >
                <Brain className="h-5 w-5 mr-2" />
                {loading ? t('ai.analyzing') : t('ai.analyze')}
              </Button>
              <Button
                variant="secondary"
                onClick={handleReset}
                disabled={loading}
              >
                {t('ai.reset')}
              </Button>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </Card>
        </div>

        <div>
          {recommendations.length > 0 && (
            <Card title={t('ai.results')}>
              <div className="space-y-4">
                {recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    {rec.productId ? (
                      <>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Pill className="h-5 w-5 text-blue-600" />
                            <h3 className="font-bold text-lg text-gray-900">{rec.name}</h3>
                          </div>
                          <span className="text-sm font-medium text-blue-600">
                            {rec.confidence}% {t('ai.confidence')}
                          </span>
                        </div>

                        {rec.product && (
                          <div className="mb-3 text-sm text-gray-600">
                            <p><strong>{t('products.category')}:</strong> {(rec.product as any).category?.name_th || '-'}</p>
                            <p><strong>{t('ai.price')}:</strong> ฿{rec.product.base_price.toFixed(2)}</p>
                            <p><strong>{t('ai.stock')}:</strong> {rec.product.stock_quantity} {rec.product.unit}</p>
                          </div>
                        )}

                        <div className="space-y-2 mb-3">
                          <div>
                            <p className="text-sm font-medium text-gray-700">เหตุผล:</p>
                            <p className="text-sm text-gray-600">{rec.reason}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">{t('ai.dosage')}:</p>
                            <p className="text-sm text-gray-600">{rec.dosage}</p>
                          </div>
                          {rec.warnings && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                              <p className="text-sm font-medium text-yellow-800">{t('ai.warnings')}:</p>
                              <p className="text-sm text-yellow-700">{rec.warnings}</p>
                            </div>
                          )}
                        </div>

                        {rec.product && rec.product.stock_quantity > 0 && (
                          <Button variant="primary" size="sm" className="w-full">
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            {t('ai.addToCart')}
                          </Button>
                        )}
                      </>
                    ) : (
                      <div className="bg-red-50 border border-red-200 rounded p-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0" />
                          <div>
                            <p className="font-bold text-red-900 mb-2">{t('ai.seeDoctor')}</p>
                            <p className="text-sm text-red-800">{rec.name}</p>
                            {rec.warnings && (
                              <p className="text-sm text-red-700 mt-2">{rec.warnings}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {recommendations.length === 0 && !loading && (
                  <div className="text-center py-8 text-gray-500">
                    <p>{t('ai.noResults')}</p>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
