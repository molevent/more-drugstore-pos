import { useState, useEffect } from 'react'
import { X, HelpCircle, FileText } from 'lucide-react'
import { supabase } from '../../services/supabase'

interface HelpModalProps {
  pageRoute: string
  isOpen: boolean
  onClose: () => void
}

interface HelpManual {
  id: string
  page_route: string
  page_name_th: string
  page_name_en: string
  content: string
  short_description: string
}

export default function HelpModal({ pageRoute, isOpen, onClose }: HelpModalProps) {
  const [manual, setManual] = useState<HelpManual | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      fetchHelpManual()
    }
  }, [isOpen, pageRoute])

  const fetchHelpManual = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('help_manuals')
        .select('*')
        .eq('page_route', pageRoute)
        .single()

      if (error) {
        // ถ้าไม่มีข้อมูล ให้แสดงข้อความเริ่มต้น
        setManual({
          id: '',
          page_route: pageRoute,
          page_name_th: 'คู่มือการใช้งาน',
          page_name_en: 'User Manual',
          content: 'ยังไม่มีคู่มือสำหรับหน้านี้ กรุณาติดต่อผู้ดูแลระบบ',
          short_description: ''
        })
      } else {
        setManual(data)
      }
    } catch (err) {
      console.error('Error fetching help manual:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-end">
      <div className="bg-white w-full max-w-md h-full shadow-xl overflow-y-auto animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-[#7D735F]" />
            <div>
              <h2 className="font-semibold text-gray-900">
                {loading ? 'กำลังโหลด...' : manual?.page_name_th}
              </h2>
              {manual?.short_description && (
                <p className="text-xs text-gray-500">{manual.short_description}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7D735F]"></div>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none">
              {manual?.content ? (
                <div className="text-gray-700 whitespace-pre-wrap">
                  {manual.content}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>ยังไม่มีคู่มือสำหรับหน้านี้</p>
                  <p className="text-sm mt-1">
                    สามารถเพิ่มคู่มือได้ที่เมนู ตั้งค่า {'>'} จัดการคู่มือ
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            ต้องการแก้ไขคู่มือ? ไปที่{' '}
            <a href="/help-management" className="text-[#7D735F] hover:underline">
              จัดการคู่มือ
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
