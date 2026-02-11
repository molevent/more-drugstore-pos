import { useState, useRef, useEffect, useCallback } from 'react'
import Card from './Card'
import Button from './Button'
import { Camera, X, ScanLine } from 'lucide-react'

interface BarcodeScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onBarcodeDetected: (barcode: string) => void
}

export default function BarcodeScannerModal({ isOpen, onClose, onBarcodeDetected }: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastScanned, setLastScanned] = useState<string | null>(null)
  const codeReaderRef = useRef<any>(null)
  const controlsRef = useRef<any>(null)

  // Check camera support and permissions
  const checkCameraAvailability = useCallback(async () => {
    // Check if running on HTTPS or localhost
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    const isHttps = window.location.protocol === 'https:'
    
    if (!isLocalhost && !isHttps) {
      setError('กล้องต้องใช้ HTTPS หรือ localhost\n\nสำหรับ iPad/Mac:\n1. ใช้ http://localhost:5173 บนเครื่องนี้\n2. หรือตั้งค่า HTTPS สำหรับ local network')
      setIsScanning(false)
      return false
    }

    // Check if mediaDevices is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('เบราว์เซอร์นี้ไม่รองรับการใช้งานกล้อง\n\nกรุณาใช้ Safari (iOS) หรือ Chrome/Edge (Mac)')
      setIsScanning(false)
      return false
    }

    try {
      // Check permission
      const permission = await navigator.permissions.query({ name: 'camera' as PermissionName })
      if (permission.state === 'denied') {
        setError('ถูกปฏิเสธสิทธิ์ใช้กล้อง\n\nกรุณา:\n1. ไปที่ Settings > Privacy & Security > Camera\n2. อนุญาตให้เบราว์เซอร์นี้ใช้กล้อง')
        setIsScanning(false)
        return false
      }
      return true
    } catch {
      // Some browsers don't support permissions API for camera
      return true
    }
  }, [])

  // Dynamically import ZXing only when needed
  const startScanning = useCallback(async () => {
    try {
      setError(null)
      setIsScanning(true)

      // Check camera availability first
      const canUseCamera = await checkCameraAvailability()
      if (!canUseCamera) return

      // Dynamic import to avoid bundling issues
      const { BrowserMultiFormatReader } = await import('@zxing/browser')
      
      const codeReader = new BrowserMultiFormatReader()
      codeReaderRef.current = codeReader

      const videoElement = videoRef.current
      if (!videoElement) return

      // Start decoding from video device
      controlsRef.current = await codeReader.decodeFromVideoDevice(
        undefined, // Use default camera
        videoElement,
        (result: any, error?: any) => {
          if (result && result.getText) {
            const barcode = result.getText()
            setLastScanned(barcode)
            onBarcodeDetected(barcode)
            // Auto-close after successful scan
            setTimeout(() => {
              stopScanning()
              onClose()
            }, 500)
          }
          if (error && error.message !== 'No MultiFormat Readers were able to detect the code.') {
            // Ignore "no code found" errors which are normal
            console.log('Scan error:', error.message)
          }
        }
      )
    } catch (err: any) {
      console.error('Error starting scanner:', err)
      if (err.name === 'NotAllowedError') {
        setError('ผู้ใช้ปฏิเสธการใช้งานกล้อง\n\nกรุณากด "อนุญาต" เมื่อเบราว์เซอร์ขอสิทธิ์ใช้กล้อง')
      } else if (err.name === 'NotFoundError') {
        setError('ไม่พบกล้องบนอุปกรณ์นี้\n\nกรุณาตรวจสอบว่ามีกล้องติดตั้งและไม่ถูกใช้งานโดยโปรแกรมอื่น')
      } else if (err.name === 'NotReadableError') {
        setError('ไม่สามารถเข้าถึงกล้องได้\n\nกล้องอาจถูกใช้งานโดยโปรแกรมอื่น กรุณาปิดโปรแกรมอื่นและลองใหม่')
      } else {
        setError(err.message || 'ไม่สามารถเปิดกล้องได้')
      }
      setIsScanning(false)
    }
  }, [onBarcodeDetected, onClose, checkCameraAvailability])

  const stopScanning = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.stop()
      controlsRef.current = null
    }
    if (codeReaderRef.current) {
      codeReaderRef.current = null
    }
    setIsScanning(false)
  }, [])

  // Start/stop scanning when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure video element is mounted
      const timer = setTimeout(() => {
        startScanning()
      }, 100)
      return () => {
        clearTimeout(timer)
      }
    } else {
      stopScanning()
    }
  }, [isOpen, startScanning, stopScanning])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanning()
    }
  }, [stopScanning])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg p-6 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Camera className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-medium">สแกนบาร์โค้ด</h3>
          </div>
          <button 
            onClick={() => {
              stopScanning()
              onClose()
            }}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          ชี้กล้องไปที่บาร์โค้ดสินค้า ระบบจะอ่านอัตโนมัติ
        </p>

        {/* Video Preview */}
        <div className="relative bg-black rounded-lg overflow-hidden mb-4" style={{ aspectRatio: '4/3' }}>
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
          
          {/* Scanning Overlay */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Corner markers */}
              <div className="absolute top-1/4 left-1/4 w-12 h-12 border-l-4 border-t-4 border-blue-400"></div>
              <div className="absolute top-1/4 right-1/4 w-12 h-12 border-r-4 border-t-4 border-blue-400"></div>
              <div className="absolute bottom-1/4 left-1/4 w-12 h-12 border-l-4 border-b-4 border-blue-400"></div>
              <div className="absolute bottom-1/4 right-1/4 w-12 h-12 border-r-4 border-b-4 border-blue-400"></div>
              
              {/* Scan line animation */}
              <div className="absolute left-0 right-0 h-0.5 bg-blue-400 animate-pulse"
                style={{
                  top: '50%',
                  animation: 'scan 2s linear infinite'
                }}
              />
            </div>
          )}

          {/* Loading state */}
          {!isScanning && !error && (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
                <p>กำลังเปิดกล้อง...</p>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-900/80 text-white p-4">
              <div className="text-center">
                <p className="mb-2">❌ {error}</p>
                <p className="text-sm">ตรวจสอบว่าให้สิทธิ์ใช้งานกล้องแล้ว</p>
              </div>
            </div>
          )}
        </div>

        {/* Last Scanned */}
        {lastScanned && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800">อ่านได้: {lastScanned}</span>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-gray-500 space-y-1 mb-4">
          <p>💡 เคล็ดลับ:</p>
          <ul className="list-disc list-inside pl-2">
            <li>ให้แสงสว่างเพียงพอ</li>
            <li>ถ่ายให้บาร์โค้ดอยู่ตรงกลาง</li>
            <li>ห่างจากบาร์โค้ดประมาณ 10-20 ซม.</li>
            <li>รอจนกว่าจะมีเสียง "บี๊บ" หรือข้อความขึ้น</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              stopScanning()
              onClose()
            }}
            className="flex-1"
          >
            ปิด
          </Button>
          {error && (
            <Button
              variant="primary"
              onClick={() => {
                stopScanning()
                startScanning()
              }}
              className="flex-1"
            >
              ลองใหม่
            </Button>
          )}
        </div>
      </Card>

      {/* Scan Animation Styles */}
      <style>{`
        @keyframes scan {
          0%, 100% { top: 25%; }
          50% { top: 75%; }
        }
      `}</style>
    </div>
  )
}
