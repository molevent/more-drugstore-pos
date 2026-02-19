import { useState, FormEvent, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useLanguage } from '../contexts/LanguageContext'
import Input from '../components/common/Input'
import Button from '../components/common/Button'
import LanguageSwitcher from '../components/common/LanguageSwitcher'
import { Eye, EyeOff, User, Mail } from 'lucide-react'

export default function LoginPage() {
  const navigate = useNavigate()
  const { signIn } = useAuthStore()
  const { t } = useLanguage()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loginMethod, setLoginMethod] = useState<'username' | 'email'>('username')

  // Load saved credentials on mount
  useEffect(() => {
    const savedIdentifier = localStorage.getItem('rememberedIdentifier')
    const savedPassword = localStorage.getItem('rememberedPassword')
    const savedRemember = localStorage.getItem('rememberMe') === 'true'
    const savedMethod = localStorage.getItem('loginMethod') as 'username' | 'email' || 'username'
    
    if (savedRemember && savedIdentifier) {
      setIdentifier(savedIdentifier)
      setLoginMethod(savedMethod)
      setRememberMe(true)
      if (savedPassword) {
        setPassword(savedPassword)
      }
    }
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signIn(identifier, password)
      
      // Save credentials if remember me is checked
      if (rememberMe) {
        localStorage.setItem('rememberedIdentifier', identifier)
        localStorage.setItem('rememberedPassword', password)
        localStorage.setItem('rememberMe', 'true')
        localStorage.setItem('loginMethod', loginMethod)
      } else {
        localStorage.removeItem('rememberedIdentifier')
        localStorage.removeItem('rememberedPassword')
        localStorage.removeItem('rememberMe')
        localStorage.removeItem('loginMethod')
      }
      
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message || t('login.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F5EFE6] to-[#F5E6C8] px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-[#E8E0D5]">
          <div className="flex justify-end mb-4">
            <LanguageSwitcher />
          </div>
          
          <div className="flex justify-center mb-6">
            <img 
              src="/logo.png" 
              alt="More Drug Store Logo" 
              className="h-32 w-32 object-contain"
            />
          </div>
          
          <h2 className="text-3xl font-bold text-center text-[#5C4A32] mb-2">
            {t('login.title')}
          </h2>
          <p className="text-center text-[#8B7355] mb-8">
            {t('login.subtitle')}
          </p>

          {/* Login Method Toggle */}
          <div className="flex rounded-lg bg-[#F5EFE6] p-1 mb-6">
            <button
              type="button"
              onClick={() => setLoginMethod('username')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                loginMethod === 'username'
                  ? 'bg-white text-[#5C4A32] shadow-sm'
                  : 'text-[#8B7355] hover:text-[#5C4A32]'
              }`}
            >
              <User className="h-4 w-4" />
              ชื่อผู้ใช้
            </button>
            <button
              type="button"
              onClick={() => setLoginMethod('email')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                loginMethod === 'email'
                  ? 'bg-white text-[#5C4A32] shadow-sm'
                  : 'text-[#8B7355] hover:text-[#5C4A32]'
              }`}
            >
              <Mail className="h-4 w-4" />
              อีเมล
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                label={loginMethod === 'username' ? 'ชื่อผู้ใช้' : t('login.email')}
                type={loginMethod === 'email' ? 'email' : 'text'}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={loginMethod === 'username' ? 'เช่น Som, Kai, Ing' : 'admin@moredrug.com'}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#5C4A32] mb-1">
                {t('login.password')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-[#E8E0D5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B8D4E3] focus:border-transparent text-[#5C4A32] placeholder-gray-400 bg-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B7355] hover:text-[#5C4A32]"
                  title={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-[#2E5266] focus:ring-[#B8D4E3] border-[#E8E0D5] rounded"
              />
              <label htmlFor="rememberMe" className="ml-2 block text-sm text-[#8B7355]">
                {t('login.rememberMe')}
              </label>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200">
                {error}
              </div>
            )}
            
            <Button
              type="submit"
              variant="primary"
              className="w-full bg-[#2E5266] hover:bg-[#1e3a4a]"
              disabled={loading}
            >
              {loading ? t('common.loading') : t('login.submit')}
            </Button>
          </form>

          <p className="text-center text-sm text-[#8B7355] mt-6">
            {t('login.footer')}
          </p>
        </div>
      </div>
    </div>
  )
}
