import { Link } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { 
  CreditCard, 
  Store, 
  Users, 
  Pencil, 
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
  ClipboardList
} from 'lucide-react'
import { useState, useEffect } from 'react'
import Card from '../components/common/Card'
import Input from '../components/common/Input'
import Button from '../components/common/Button'
import React from 'react'

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
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
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

        {/* Actions - Compact inline, aligned right */}
        <div className="flex gap-2 mt-3 justify-end">
          <Link 
            to={link}
            className="flex items-center justify-center gap-2 py-2 px-4 bg-gray-50 rounded-full border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Pencil className="h-4 w-4" />
            <span className="text-xs">แก้ไข</span>
          </Link>
        </div>
      </div>
    </div>
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
      icon: Bike,
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      title: 'ช่องทางการขาย',
      subtitle: `ตั้งค่าแล้ว ${getConfiguredCount()}/${SALES_CHANNELS.length} ช่องทาง`,
      link: '/settings/sales-channels'
    },
    {
      icon: CreditCard,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      title: 'ช่องทางการชำระเงิน',
      subtitle: 'ตั้งค่าวิธีการรับเงิน',
      status: { text: 'เปิดใช้งาน', bgColor: 'bg-green-100', textColor: 'text-green-700' },
      link: '/payment-methods'
    },
    {
      icon: Store,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      title: 'ข้อมูลร้าน',
      subtitle: shopInfo.name,
      link: '/settings/shop'
    },
    {
      icon: Users,
      iconBg: 'bg-white',
      iconColor: 'text-gray-600',
      title: 'การจัดการผู้ใช้',
      subtitle: 'ผู้ใช้งานในระบบ',
      details: [
        { value: '1 ผู้ใช้งาน' },
      ],
      link: '/settings/users'
    },
    {
      icon: Warehouse,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      title: 'คลังสินค้า',
      subtitle: 'จัดการคลังสินค้าและสต็อก',
      link: '/warehouse-management'
    },
    {
      icon: FolderTree,
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
      title: 'หมวดหมู่สินค้า',
      subtitle: 'จัดการหมวดหมู่และหมวดหมู่ย่อย',
      link: '/categories-management'
    },
  ]

  // External Connection Settings Items
  const externalConnectionItems = [
    {
      icon: Building2,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      title: 'การเชื่อมต่อ FlowAccount',
      subtitle: 'บัญชีและใบกำกับภาษี',
      status: flowAccount.connected 
        ? { text: 'เชื่อมต่อแล้ว', bgColor: 'bg-green-100', textColor: 'text-green-700' }
        : { text: 'ยังไม่เชื่อมต่อ', bgColor: 'bg-red-100', textColor: 'text-red-700' },
      details: undefined,
      link: '/settings/flowaccount'
    },
    {
      icon: Plug,
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      title: 'การเชื่อมต่อ ZortOut',
      subtitle: 'ระบบจัดการสต็อก',
      status: { text: 'ยังไม่เชื่อมต่อ', bgColor: 'bg-gray-100', textColor: 'text-gray-600' },
      details: undefined,
      link: '/settings/zortout'
    },
  ]

  // Audit Section Items
  const auditItems = [
    {
      icon: AlertTriangle,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      title: 'รายงานสินค้าติดลบ',
      subtitle: 'ตรวจสอบสินค้าที่สต็อกติดลบและการเคลื่อนไหว',
      link: '/negative-stock-report'
    },
    {
      icon: ClipboardList,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      title: 'รายงานการปรับยอดสต็อก',
      subtitle: 'ตรวจสอบการปรับยอดสต็อกโดยผู้ใช้งาน',
      link: '/stock-adjustment-report'
    },
  ]
  
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="h-7 w-7 text-blue-600" />
            {t('settings.title')}
          </h1>
          <p className="text-gray-600 mt-1">ตั้งค่าระบบและการเชื่อมต่อ</p>
        </div>
      </div>

      {/* Business Settings Section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">ตั้งค่าธุรกิจ</h2>
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
        <h2 className="text-lg font-semibold text-gray-800 mb-4">ตั้งค่าการเชื่อมต่อภายนอก</h2>
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
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Audit - ตรวจสอบและควบคุม</h2>
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
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
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
