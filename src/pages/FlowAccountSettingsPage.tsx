import { useState, useEffect } from 'react';
import { 
  Settings, 
  Check, 
  AlertCircle, 
  RefreshCw,
  ExternalLink,
  Database,
  Zap,
  Save
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { 
  testConnection, 
  clearToken 
} from '../services/flowaccount/auth';
import { 
  FLOWACCOUNT_SANDBOX_CONFIG, 
  FLOWACCOUNT_PROD_CONFIG,
  setFlowAccountConfig,
  getFlowAccountConfig,
  isSandboxMode
} from '../services/flowaccount/config';

interface AutoSyncConfig {
  enabled: boolean;
  channels: string[];       // e.g. ['walk-in','grab','shopee']
  paymentMethods: string[]; // e.g. ['cash','transfer','promptpay']
}

const DEFAULT_AUTO_SYNC: AutoSyncConfig = {
  enabled: false,
  channels: [],
  paymentMethods: []
};

export const getAutoSyncConfig = (): AutoSyncConfig => {
  try {
    const saved = localStorage.getItem('fa_auto_sync_cash_invoice');
    if (saved) return { ...DEFAULT_AUTO_SYNC, ...JSON.parse(saved) };
  } catch {}
  return DEFAULT_AUTO_SYNC;
};

export default function FlowAccountSettingsPage() {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [config, setConfig] = useState(getFlowAccountConfig());
  const [isSandbox, setIsSandbox] = useState(isSandboxMode());
  const [showCredentials, setShowCredentials] = useState(false);

  // Auto-sync settings
  const [autoSync, setAutoSync] = useState<AutoSyncConfig>(getAutoSyncConfig());
  const [salesChannels, setSalesChannels] = useState<Array<{id: string; name: string}>>([]);
  const [paymentMethodsList, setPaymentMethodsList] = useState<Array<{id: string; name: string}>>([]);
  const [autoSyncSaved, setAutoSyncSaved] = useState(false);

  useEffect(() => {
    // Check current config on mount
    const current = getFlowAccountConfig();
    setConfig(current);
    setIsSandbox(isSandboxMode());

    // Load sales channels
    const savedChannels = localStorage.getItem('pos_sales_channels');
    if (savedChannels) {
      try {
        setSalesChannels(JSON.parse(savedChannels).map((c: any) => ({ id: c.id, name: c.name })));
      } catch {}
    }
    if (salesChannels.length === 0) {
      setSalesChannels([
        { id: 'walk-in', name: 'หน้าร้าน' },
        { id: 'grab', name: 'GRAB' },
        { id: 'shopee', name: 'SHOPEE' },
        { id: 'lineman', name: 'LINEMAN' },
        { id: 'lazada', name: 'LAZADA' }
      ]);
    }

    // Load payment methods from Supabase
    supabase
      .from('payment_methods')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        if (data && data.length > 0) {
          setPaymentMethodsList(data);
        } else {
          setPaymentMethodsList([
            { id: 'cash', name: 'เงินสด' },
            { id: 'transfer', name: 'โอนเงิน' },
            { id: 'credit_card', name: 'บัตรเครดิต' },
            { id: 'promptpay', name: 'พร้อมเพย์' }
          ]);
        }
      });
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const result = await testConnection();
      setTestResult(result);
    } catch (error) {
      console.error('Test connection failed:', error);
      setTestResult(false);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSwitchEnvironment = (useSandbox: boolean) => {
    clearToken(); // Clear cached token when switching
    
    if (useSandbox) {
      setFlowAccountConfig(FLOWACCOUNT_SANDBOX_CONFIG);
    } else {
      setFlowAccountConfig(FLOWACCOUNT_PROD_CONFIG);
    }
    
    const newConfig = getFlowAccountConfig();
    setConfig(newConfig);
    setIsSandbox(useSandbox);
    setTestResult(null);
  };

  const handleUpdateCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    setFlowAccountConfig({
      clientId: formData.get('clientId') as string,
      clientSecret: formData.get('clientSecret') as string
    });
    
    setTestResult(null);
    alert('บันทึกการตั้งค่าเรียบร้อย');
  };

  // Auto-sync helpers
  const toggleAutoSyncChannel = (channelId: string) => {
    setAutoSync(prev => {
      const channels = prev.channels.includes(channelId)
        ? prev.channels.filter(c => c !== channelId)
        : [...prev.channels, channelId];
      return { ...prev, channels };
    });
  };

  const toggleAutoSyncPayment = (methodId: string) => {
    setAutoSync(prev => {
      const paymentMethods = prev.paymentMethods.includes(methodId)
        ? prev.paymentMethods.filter(m => m !== methodId)
        : [...prev.paymentMethods, methodId];
      return { ...prev, paymentMethods };
    });
  };

  const handleSaveAutoSync = () => {
    localStorage.setItem('fa_auto_sync_cash_invoice', JSON.stringify(autoSync));
    setAutoSyncSaved(true);
    setTimeout(() => setAutoSyncSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#4A90A4] rounded-lg">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">ตั้งค่า FlowAccount</h1>
              <p className="text-gray-500">เชื่อมต่อกับระบบบัญชีและใบเสร็จ FlowAccount</p>
            </div>
          </div>
        </div>

        {/* Environment Selection */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">สภาพแวดล้อม</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleSwitchEnvironment(true)}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                isSandbox 
                  ? 'border-[#4A90A4] bg-[#4A90A4]/5' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-900">Sandbox (ทดสอบ)</span>
                {isSandbox && <Check className="h-5 w-5 text-[#4A90A4]" />}
              </div>
              <p className="text-sm text-gray-500">
                สำหรับทดสอบการเชื่อมต่อ<br/>
                URL: sandbox-new.flowaccount.com
              </p>
            </button>

            <button
              onClick={() => handleSwitchEnvironment(false)}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                !isSandbox 
                  ? 'border-[#4A90A4] bg-[#4A90A4]/5' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-900">Production (ใช้งานจริง)</span>
                {!isSandbox && <Check className="h-5 w-5 text-[#4A90A4]" />}
              </div>
              <p className="text-sm text-gray-500">
                สำหรับใช้งานจริง<br/>
                URL: flowaccount.com
              </p>
            </button>
          </div>
        </div>

        {/* Connection Test */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">ทดสอบการเชื่อมต่อ</h2>
          
          <div className="flex items-center gap-4">
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="flex items-center gap-2 px-4 py-2 bg-[#4A90A4] text-white rounded-lg hover:bg-[#3A8094] disabled:opacity-50 transition-colors"
            >
              {isTesting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Database className="h-4 w-4" />
              )}
              {isTesting ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ'}
            </button>

            {testResult !== null && (
              <div className={`flex items-center gap-2 ${testResult ? 'text-green-600' : 'text-red-600'}`}>
                {testResult ? (
                  <>
                    <Check className="h-5 w-5" />
                    <span>เชื่อมต่อสำเร็จ</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5" />
                    <span>เชื่อมต่อไม่สำเร็จ</span>
                  </>
                )}
              </div>
            )}
          </div>

          {testResult === false && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
              <p className="font-medium">ไม่สามารถเชื่อมต่อได้</p>
              <p className="text-sm mt-1">
                กรุณาตรวจสอบ Client ID และ Client Secret ว่าถูกต้อง<br/>
                หรือลองสลับไปใช้ Sandbox mode สำหรับทดสอบ
              </p>
            </div>
          )}
        </div>

        {/* Credentials Configuration */}
        {!isSandbox && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">ตั้งค่า API Credentials</h2>
              <a 
                href="https://developers.flowaccount.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-[#4A90A4] hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                เอกสาร API
              </a>
            </div>

            <form onSubmit={handleUpdateCredentials} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client ID
                </label>
                <input
                  type="text"
                  name="clientId"
                  defaultValue={config.clientId}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A90A4] focus:border-[#4A90A4]"
                  placeholder="your-client-id"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Secret
                </label>
                <input
                  type={showCredentials ? 'text' : 'password'}
                  name="clientSecret"
                  defaultValue={config.clientSecret}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A90A4] focus:border-[#4A90A4]"
                  placeholder="your-client-secret"
                />
                <label className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={showCredentials}
                    onChange={(e) => setShowCredentials(e.target.checked)}
                    className="rounded"
                  />
                  แสดง Client Secret
                </label>
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                บันทึก Credentials
              </button>
            </form>
          </div>
        )}

        {/* Sandbox Info */}
        {isSandbox && (
          <div className="bg-[#2B9CD8]/10 rounded-lg p-6">
            <h3 className="font-semibold text-[#2B9CD8] mb-2">ข้อมูล Sandbox</h3>
            <div className="text-sm text-gray-700 space-y-1">
              <p><strong>Client ID:</strong> {FLOWACCOUNT_SANDBOX_CONFIG.clientId}</p>
              <p><strong>Scope:</strong> {FLOWACCOUNT_SANDBOX_CONFIG.scope}</p>
              <p><strong>Grant Type:</strong> {FLOWACCOUNT_SANDBOX_CONFIG.grantType}</p>
              <p className="mt-2 text-[#2B9CD8]">
                Sandbox mode ใช้สำหรับทดสอบการเชื่อมต่อโดยไม่กระทบข้อมูลจริง
              </p>
            </div>
          </div>
        )}

        {/* Auto-Sync Cash Invoice Settings */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              <h2 className="text-lg font-semibold text-gray-900">Auto-Sync Cash Invoice</h2>
            </div>
            <div className="flex items-center gap-3">
              {autoSyncSaved && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <Check className="h-4 w-4" /> บันทึกแล้ว
                </span>
              )}
              <button
                onClick={handleSaveAutoSync}
                className="flex items-center gap-1 px-4 py-2 bg-[#4A90A4] text-white rounded-lg hover:bg-[#3A8094] transition-colors text-sm font-medium"
              >
                <Save className="h-4 w-4" />
                บันทึก
              </button>
            </div>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            เมื่อเปิดใช้งาน ระบบจะ sync ใบเสร็จ (Cash Invoice) ไปยัง FlowAccount โดยอัตโนมัติทุกครั้งที่ขายสำเร็จ
            ตามช่องทางและวิธีชำระเงินที่เลือกไว้
          </p>

          {/* Master Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-4">
            <span className="font-medium text-gray-800">เปิดใช้งาน Auto-Sync</span>
            <button
              onClick={() => setAutoSync(prev => ({ ...prev, enabled: !prev.enabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoSync.enabled ? 'bg-[#4A90A4]' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                autoSync.enabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {autoSync.enabled && (
            <div className="space-y-4">
              {/* Channels */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">ช่องทางการขายที่ sync อัตโนมัติ</h3>
                <p className="text-xs text-gray-400 mb-2">เลือกอย่างน้อย 1 ช่องทาง — ถ้าไม่เลือก จะ sync ทุกช่องทาง</p>
                <div className="flex flex-wrap gap-2">
                  {salesChannels.map(ch => (
                    <button
                      key={ch.id}
                      onClick={() => toggleAutoSyncChannel(ch.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all ${
                        autoSync.channels.includes(ch.id)
                          ? 'border-[#4A90A4] bg-[#4A90A4]/10 text-[#4A90A4]'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {autoSync.channels.includes(ch.id) && <Check className="h-3 w-3 inline mr-1" />}
                      {ch.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">วิธีชำระเงินที่ sync อัตโนมัติ</h3>
                <p className="text-xs text-gray-400 mb-2">เลือกอย่างน้อย 1 วิธี — ถ้าไม่เลือก จะ sync ทุกวิธีชำระเงิน</p>
                <div className="flex flex-wrap gap-2">
                  {paymentMethodsList.map(pm => (
                    <button
                      key={pm.id}
                      onClick={() => toggleAutoSyncPayment(pm.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all ${
                        autoSync.paymentMethods.includes(pm.id)
                          ? 'border-[#4A90A4] bg-[#4A90A4]/10 text-[#4A90A4]'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {autoSync.paymentMethods.includes(pm.id) && <Check className="h-3 w-3 inline mr-1" />}
                      {pm.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                <strong>สรุป:</strong> sync อัตโนมัติสำหรับ{' '}
                {autoSync.channels.length === 0 ? 'ทุกช่องทาง' : autoSync.channels.map(c => salesChannels.find(s => s.id === c)?.name || c).join(', ')}
                {' '}เมื่อชำระด้วย{' '}
                {autoSync.paymentMethods.length === 0 ? 'ทุกวิธี' : autoSync.paymentMethods.map(m => paymentMethodsList.find(p => p.id === m)?.name || m).join(', ')}
              </div>
            </div>
          )}
        </div>

        {/* Features Info */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">ฟีเจอร์ที่รองรับ</h2>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              สร้าง/อัพเดท Contacts (ผู้ติดต่อ)
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              สร้างใบเสร็จ/ใบกำกับภาษี
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              ดึงข้อมูลบริษัทและเอกสาร
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              OAuth2 Client Credentials Authentication
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
