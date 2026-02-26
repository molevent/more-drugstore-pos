import { Link } from 'react-router-dom'

import { 
  CreditCard, 
  Store, 
  Users, 
  Building2,
  Plug,
  Save, 
  ExternalLink, 
  CheckCircle, 
  XCircle,
  FolderTree,
  Warehouse,
  Settings,
  Bike,
  AlertTriangle,
  ClipboardList,
  ArrowRightLeft,
  Wallet,
  Home,
  Receipt,
  Calendar,
  BookOpen,
  UserCog,
  BarChart3
} from 'lucide-react'
import { useState, useEffect } from 'react'
import Card from '../components/common/Card'
import Input from '../components/common/Input'
import Button from '../components/common/Button'
import React from 'react'
import { useLanguage } from '../contexts/LanguageContext'

interface SettingsCardProps {
  icon: React.ElementType
  iconBg: string
  iconColor: string
  title: string
  subtitle: string
  details?: { icon?: React.ElementType; label?: string; value: string }[]
  status?: { text: string; bgColor: string; textColor: string }
  link: string
}

function SettingsCard({ icon: Icon, iconBg, iconColor, title, subtitle, details, status, link }: SettingsCardProps) {
  const isReport = title.includes('รายงาน') || title.includes('Report')
  return (
    <Link 
      to={link}
      className={`block bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all cursor-pointer ${
        isReport ? 'hover:ring-2 hover:ring-[#B8D4E3] hover:shadow-[0_0_15px_rgba(184,212,227,0.5)]' : 'hover:border-blue-200'
      }`}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`h-12 w-12 rounded-full ${iconBg} flex items-center justify-center`}>
              <Icon className={`h-6 w-6 ${iconColor}`} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-500">{subtitle}</p>
            </div>
          </div>
          {status && (
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.textColor}`}>
              {status.text}
            </span>
          )}
        </div>

        {/* Details */}
        {details && (
          <div className="space-y-1 mb-3">
            {details.map((detail, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                {detail.icon && <detail.icon className="h-4 w-4 text-gray-400" />}
                {detail.label && <span className="text-gray-400">{detail.label}</span>}
                <span className="text-gray-700">{detail.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}

export default function SettingsPage() {
  const { t } = useLanguage()

  // Shop info state
  const [shopInfo, setShopInfo] = useState({
    name: 'More Drug Store',
    phone: '02-123-4567',
    email: 'contact@moredrugstore.com',
    address: '123 ถนนสุขุมวิท กรุงเทพฯ'
  })

  // Load shop info from localStorage on mount
  useEffect(() => {
    const localData = localStorage.getItem('shop_settings')
    if (localData) {
      try {
        const parsed = JSON.parse(localData)
        setShopInfo({
          name: parsed.name || 'More Drug Store',
          phone: parsed.phone || '02-123-4567',
          email: parsed.email || 'contact@moredrugstore.com',
          address: parsed.address || '123 ถนนสุขุมวิท กรุงเทพฯ'
        })
      } catch (e) {
        console.error('Error parsing shop settings:', e)
      }
    }
  }, [])
  
  // FlowAccount settings state
  const [flowAccount, setFlowAccount] = useState({
    enabled: false,
    clientId: '',
    clientSecret: '',
    redirectUri: '',
    accessToken: '',
    refreshToken: '',
    connected: false
  })

  const handleSaveFlowAccount = () => {
    alert('บันทึกการตั้งค่า FlowAccount สำเร็จ')
  }

  const handleConnectFlowAccount = () => {
    window.open('https://developer.flowaccount.com/oauth/authorize', '_blank')
  }

  // SALES_CHANNELS constant for display
  const SALES_CHANNELS = [
    { id: 'walk-in', name: 'หน้าร้าน' },
    { id: 'grab', name: 'GRAB' },
    { id: 'shopee', name: 'SHOPEE' },
    { id: 'lineman', name: 'LINEMAN' }
  ]

  // Channel payment map state
  const [channelPaymentMap, setChannelPaymentMap] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('pos_channel_payment_map')
    return saved ? JSON.parse(saved) : {}
  })

  // Load channel payment map from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('pos_channel_payment_map')
    if (saved) {
      setChannelPaymentMap(JSON.parse(saved))
    }
  }, [])

  const getConfiguredCount = () => {
    return Object.keys(channelPaymentMap).length
  }

  // Business Settings Items
  const businessSettingsItems = [
    {
      icon: Home,
      iconBg: 'bg-[#7D735F]/10',
      iconColor: 'text-[#7D735F]',
      title: t('settings.dashboard'),
      subtitle: t('settings.dashboardDesc'),
      link: '/dashboard'
    },
    {
      icon: Bike,
      iconBg: 'bg-[#B8C9B8]/10',
      iconColor: 'text-[#7D735F]',
      title: t('settings.salesChannels'),
      subtitle: `${t('settings.salesChannelsDesc')} ${getConfiguredCount()}/${SALES_CHANNELS.length} ${t('settings.salesChannelsUnit')}`,
      link: '/settings/sales-channels'
    },
    {
      icon: CreditCard,
      iconBg: 'bg-[#7D735F]/10',
      iconColor: 'text-[#7D735F]',
      title: t('settings.paymentChannels'),
      subtitle: t('settings.paymentChannelsDesc'),
      status: { text: t('settings.paymentChannelsStatus'), bgColor: 'bg-[#B8C9B8]/10', textColor: 'text-[#7D735F]' },
      link: '/payment-methods'
    },
    {
      icon: Store,
      iconBg: 'bg-[#A67B5B]/10',
      iconColor: 'text-[#A67B5B]',
      title: t('settings.shopInfo'),
      subtitle: shopInfo.name,
      link: '/settings/shop'
    },
    {
      icon: Users,
      iconBg: 'bg-[#F5F0E6]',
      iconColor: 'text-[#7D735F]',
      title: t('settings.userManagementTitle'),
      subtitle: t('settings.userManagementDesc'),
      details: [
        { value: `1 ${t('settings.usersCount')}` },
      ],
      link: '/settings/users'
    },
    {
      icon: UserCog,
      iconBg: 'bg-[#4A90A4]/10',
      iconColor: 'text-[#4A90A4]',
      title: t('settings.employeeManagement'),
      subtitle: t('settings.employeeManagementDesc'),
      link: '/employee-settings'
    },
    {
      icon: Warehouse,
      iconBg: 'bg-[#D4756A]/10',
      iconColor: 'text-[#D4756A]',
      title: t('settings.warehouse'),
      subtitle: t('settings.warehouseDesc'),
      link: '/warehouse-management'
    },
    {
      icon: FolderTree,
      iconBg: 'bg-[#B8C9B8]/10',
      iconColor: 'text-[#B8C9B8]',
      title: t('settings.productCategories'),
      subtitle: t('settings.productCategoriesDesc'),
      link: '/categories-management'
    },
    {
      icon: Receipt,
      iconBg: 'bg-[#A67B5B]/10',
      iconColor: 'text-[#A67B5B]',
      title: t('settings.expenseCategories'),
      subtitle: t('settings.expenseCategoriesDesc'),
      link: '/settings/expense-categories'
    },
    {
      icon: CreditCard,
      iconBg: 'bg-[#4A90A4]/10',
      iconColor: 'text-[#4A90A4]',
      title: t('settings.paymentRules'),
      subtitle: t('settings.paymentRulesDesc'),
      link: '/settings/payment-method-rules'
    },
  ]

  // Document Items (removed - accessible from Documents page)

  // External Connection Settings Items
  const externalConnectionItems = [
    {
      icon: Building2,
      iconBg: 'bg-[#7D735F]/10',
      iconColor: 'text-[#7D735F]',
      title: t('settings.flowAccount'),
      subtitle: t('settings.flowAccountDesc'),
      status: flowAccount.connected 
        ? { text: t('settings.flowAccountConnected'), bgColor: 'bg-[#B8C9B8]/10', textColor: 'text-[#7D735F]' }
        : { text: t('settings.flowAccountDisconnected'), bgColor: 'bg-[#D4756A]/10', textColor: 'text-[#D4756A]' },
      details: undefined,
      link: '/settings/flowaccount'
    },
    {
      icon: Plug,
      iconBg: 'bg-[#4D6FE8]/10',
      iconColor: 'text-[#2D2E5E]',
      title: t('settings.zortOut'),
      subtitle: t('settings.zortOutDesc'),
      status: { text: t('settings.zortOutStatus'), bgColor: 'bg-[#B8C9B8]/10', textColor: 'text-[#7D735F]' },
      details: undefined,
      link: '/zortout-sync'
    },
  ]

  // Audit Section Items
  const auditItems = [
    {
      icon: BarChart3,
      iconBg: 'bg-[#7D735F]/10',
      iconColor: 'text-[#7D735F]',
      title: t('settings.executiveSummary'),
      subtitle: t('settings.executiveSummaryDesc'),
      link: '/executive-summary'
    },
    {
      icon: Wallet,
      iconBg: 'bg-[#B8C9B8]/10',
      iconColor: 'text-[#B8C9B8]',
      title: t('settings.cashierClosing'),
      subtitle: t('settings.cashierClosingDesc'),
      link: '/cashier-closing-report'
    },
    {
      icon: AlertTriangle,
      iconBg: 'bg-[#D4756A]/10',
      iconColor: 'text-[#D4756A]',
      title: t('settings.negativeStock'),
      subtitle: t('settings.negativeStockDesc'),
      link: '/negative-stock-report'
    },
    {
      icon: ClipboardList,
      iconBg: 'bg-[#7D735F]/10',
      iconColor: 'text-[#7D735F]',
      title: t('settings.stockAdjustment'),
      subtitle: t('settings.stockAdjustmentDesc'),
      link: '/stock-adjustment-report'
    },
    {
      icon: ArrowRightLeft,
      iconBg: 'bg-[#B8C9B8]/10',
      iconColor: 'text-[#B8C9B8]',
      title: t('settings.stockTransfer'),
      subtitle: t('settings.stockTransferDesc'),
      link: '/stock-transfer-report'
    },
    {
      icon: AlertTriangle,
      iconBg: 'bg-[#A67B5B]/10',
      iconColor: 'text-[#A67B5B]',
      title: t('settings.abnormalOrders'),
      subtitle: t('settings.abnormalOrdersDesc'),
      link: '/abnormal-orders-report'
    },
    {
      icon: Receipt,
      iconBg: 'bg-[#7D735F]/10',
      iconColor: 'text-[#7D735F]',
      title: t('settings.receiptTaxInvoice'),
      subtitle: t('settings.receiptTaxInvoiceDesc'),
      link: '/receipt-tax-invoice-report'
    },
    {
      icon: Calendar,
      iconBg: 'bg-[#A67B5B]/10',
      iconColor: 'text-[#A67B5B]',
      title: t('settings.nearExpiry'),
      subtitle: t('settings.nearExpiryDesc'),
      link: '/near-expiry-report'
    },
    {
      icon: BookOpen,
      iconBg: 'bg-[#7D735F]/10',
      iconColor: 'text-[#7D735F]',
      title: t('settings.helpManagement'),
      subtitle: t('settings.helpManagementDesc'),
      link: '/help-management'
    },
  ]
  
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="h-7 w-7 text-[#7D735F]" />
            {t('settings.title')}
          </h1>
          <p className="text-gray-600 mt-1">{t('settings.subtitle')}</p>
        </div>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-help-modal'))}
          className="p-2 text-gray-400 hover:text-[#7D735F] hover:bg-[#F5F0E6] rounded-full transition-all"
          title={t('settings.helpManual')}
        >
          <BookOpen className="h-5 w-5" />
        </button>
      </div>

      {/* Business Settings Section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('settings.section.business')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {businessSettingsItems.map((item, index) => (
            <SettingsCard
              key={index}
              icon={item.icon}
              iconBg={item.iconBg}
              iconColor={item.iconColor}
              title={item.title}
              subtitle={item.subtitle}
              details={item.details}
              status={item.status}
              link={item.link}
            />
          ))}
        </div>
      </div>

      {/* External Connections Section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('settings.section.externalConnections')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {externalConnectionItems.map((item, index) => (
            <SettingsCard
              key={index}
              icon={item.icon}
              iconBg={item.iconBg}
              iconColor={item.iconColor}
              title={item.title}
              subtitle={item.subtitle}
              details={item.details}
              status={item.status}
              link={item.link}
            />
          ))}
        </div>
      </div>

      {/* Audit Section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('settings.section.audit')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {auditItems.map((item, index) => (
            <SettingsCard
              key={index}
              icon={item.icon}
              iconBg={item.iconBg}
              iconColor={item.iconColor}
              title={item.title}
              subtitle={item.subtitle}
              link={item.link}
            />
          ))}
        </div>
      </div>

      {/* Legacy Settings Sections - Keep for backward compatibility */}
      <div className="space-y-6 hidden">
        <Card title="ข้อมูลร้าน">
          <div className="space-y-4">
            <Input label="ชื่อร้าน" placeholder="More Drug Store" />
            <Input label="ที่อยู่" placeholder="123 ถนน..." />
            <Input label="เบอร์โทร" placeholder="02-xxx-xxxx" />
            <Input label="เลขประจำตัวผู้เสียภาษี" placeholder="x-xxxx-xxxxx-xx-x" />
            <Button variant="primary">
              <Save className="h-5 w-5 mr-2" />
              บันทึก
            </Button>
          </div>
        </Card>

        <Card title="การเชื่อมต่อ FlowAccount">
          <div className="space-y-4">
            <div className="p-3 bg-[#2B9CD8]/10 border border-[#2B9CD8]/30 rounded-lg">
              <p className="text-sm text-[#2B9CD8]">
                เชื่อมต่อกับ FlowAccount เพื่อส่งข้อมูลบัญชีและใบกำกับภาษีโดยอัตโนมัติ
              </p>
            </div>

            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              {flowAccount.connected ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-green-700 font-medium">เชื่อมต่อแล้ว</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="text-sm text-red-700 font-medium">ยังไม่ได้เชื่อมต่อ</span>
                </>
              )}
            </div>

            <Input 
              label="Client ID" 
              placeholder="flow_xxxxxxxxxxxxxxxx"
              value={flowAccount.clientId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFlowAccount({...flowAccount, clientId: e.target.value})}
            />
            
            <Input 
              label="Client Secret" 
              type="password"
              placeholder="••••••••"
              value={flowAccount.clientSecret}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFlowAccount({...flowAccount, clientSecret: e.target.value})}
            />
            
            <Input 
              label="Redirect URI" 
              placeholder="https://your-app.com/auth/flowaccount/callback"
              value={flowAccount.redirectUri}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFlowAccount({...flowAccount, redirectUri: e.target.value})}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Access Token" 
                type="password"
                placeholder="••••••••"
                value={flowAccount.accessToken}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFlowAccount({...flowAccount, accessToken: e.target.value})}
              />
              <Input 
                label="Refresh Token" 
                type="password"
                placeholder="••••••••"
                value={flowAccount.refreshToken}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFlowAccount({...flowAccount, refreshToken: e.target.value})}
              />
            </div>

            <div className="flex gap-3">
              <Button variant="primary" onClick={handleSaveFlowAccount}>
                <Save className="h-5 w-5 mr-2" />
                บันทึก
              </Button>
              <Button variant="secondary" onClick={handleConnectFlowAccount}>
                <ExternalLink className="h-5 w-5 mr-2" />
                เชื่อมต่อกับ FlowAccount
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
