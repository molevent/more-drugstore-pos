import { Languages } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  const toggleLanguage = () => {
    setLanguage(language === 'th' ? 'en' : 'th')
  }

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      title={language === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย'}
    >
      <Languages className="h-4 w-4" />
      <span className="font-semibold">{language === 'th' ? 'TH' : 'EN'}</span>
    </button>
  )
}
