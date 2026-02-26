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

// Local fallback help content for pages
const LOCAL_HELP: Record<string, { page_name_th: string, page_name_en: string, content: string, short_description: string }> = {
  '/pos': {
    page_name_th: 'ขายสินค้า (POS)',
    page_name_en: 'Point of Sale',
    short_description: 'หน้าขายสินค้าหน้าร้าน',
    content: `🛒 หน้าขายสินค้า (POS)

🔹 เพิ่มสินค้าลงตะกร้า
- พิมพ์ชื่อหรือบาร์โค้ดในช่องค้นหา แล้วเลือกสินค้าจากรายการ
- ใช้เครื่องสแกนบาร์โค้ดสแกนได้เลย ระบบเพิ่มสินค้าอัตโนมัติ
- กดปุ่มกล้องเพื่อถ่ายรูปบาร์โค้ด

🔹 เลือกช่องทางขาย
กดปุ่มช่องทางด้านบน เช่น หน้าร้าน, Grab, Shopee, LINE MAN ราคาจะปรับตามช่องทางที่ตั้งไว้

🔹 เลือกวิธีชำระเงิน
กดเลือกวิธีชำระ เช่น เงินสด, โอนเงิน
- ถ้าเลือก "เงินสด" จะมีช่องกรอกเงินที่ลูกค้าจ่าย ระบบคำนวณเงินทอนให้
- กด "อื่นๆ" เพื่อดูวิธีชำระเพิ่มเติม

🔹 ชำระเงิน
กดปุ่ม "ชำระเงิน" เพื่อยืนยันการขาย ระบบจะบันทึกออเดอร์และตัดสต็อกอัตโนมัติ

🔹 พักบิล
กดปุ่ม "พัก" เพื่อเก็บรายการไว้ชั่วคราว แล้วมาดำเนินการต่อทีหลังได้

🔹 พิมพ์ใบเสร็จ
กดปุ่ม "พิมพ์" เพื่อพิมพ์ใบเสร็จก่อนชำระเงิน

🔹 ปุ่มลัดด้านบน
- ยาตามหมวดหมู่ → เปิดหน้าหมวดหมู่สินค้า
- พิมพ์ฉลาก → พิมพ์ฉลากยา
- สรุปยอด/นับเงิน → ดูสรุปยอดชำระหรือนับเงินปิดรอบ
- รายการขายล่าสุด → ดูออเดอร์ที่ขายไปแล้ว`
  },
  '/dashboard': {
    page_name_th: 'แดชบอร์ด',
    page_name_en: 'Dashboard',
    short_description: 'ภาพรวมยอดขายและสต็อก',
    content: `📊 แดชบอร์ด

🔹 สรุปยอดขาย
แสดงยอดขายวันนี้ จำนวนออเดอร์ และยอดขายเฉลี่ย

🔹 สินค้าขายดี
แสดง Top สินค้าที่ขายได้มากที่สุดในช่วงเวลาที่เลือก

🔹 การแจ้งเตือน
แสดงสินค้าที่สต็อกต่ำ หรือใกล้หมดอายุ เพื่อเตรียมสั่งซื้อเพิ่ม

🔹 กราฟยอดขาย
กราฟแสดงแนวโน้มยอดขายรายวัน/รายสัปดาห์`
  },
  '/products': {
    page_name_th: 'สินค้า',
    page_name_en: 'Products',
    short_description: 'จัดการรายการสินค้าทั้งหมด',
    content: `📦 หน้าสินค้า

🔹 เพิ่มสินค้า
กดปุ่ม "เพิ่มสินค้า" กรอกชื่อ บาร์โค้ด ราคา หมวดหมู่ แล้วบันทึก

🔹 ค้นหาสินค้า
พิมพ์ชื่อ บาร์โค้ด หรือรหัสสินค้าในช่องค้นหา

🔹 แก้ไขสินค้า
กดที่สินค้าเพื่อแก้ไขข้อมูล ราคา รูปภาพ หรือสต็อก

🔹 จัดการแพลตฟอร์ม
กดปุ่ม "จัดการแพลตฟอร์ม" เพื่อตั้งค่าราคาขายแต่ละช่องทาง เช่น Grab, Shopee

🔹 Sync FlowAccount
กดปุ่ม "Sync FA" เพื่อส่งข้อมูลสินค้าไปยัง FlowAccount

🔹 นำเข้า/ส่งออก
- นำเข้าสินค้าจากไฟล์ Excel/CSV
- ส่งออกรายการสินค้าเป็น Excel`
  },
  '/sales-orders': {
    page_name_th: 'รายการขาย',
    page_name_en: 'Sales Orders',
    short_description: 'ดูและจัดการรายการขายทั้งหมด',
    content: `📋 หน้ารายการขาย

🔹 ดูรายการ
แสดงออเดอร์ทั้งหมด พร้อมยอดขายรวมและจำนวนรายการ

🔹 กรองข้อมูล
- กรองตามวันที่ (จากวันที่ - ถึงวันที่)
- กรองตามช่องทาง เช่น หน้าร้าน, Grab, Shopee
- กรองตามสถานะ sync FlowAccount

🔹 ค้นหา
พิมพ์เลขออเดอร์ หรือชื่อลูกค้าเพื่อค้นหา

🔹 ดึงจาก FA
กดปุ่ม "ดึงจาก FA" เพื่อ sync รายการขายจาก FlowAccount

🔹 รายละเอียดออเดอร์
กดที่ออเดอร์เพื่อดูรายละเอียดสินค้า ราคา วิธีชำระเงิน`
  },
  '/expenses': {
    page_name_th: 'เอกสาร',
    page_name_en: 'Documents',
    short_description: 'บันทึกและจัดการค่าใช้จ่าย',
    content: `📄 หน้าเอกสาร / ค่าใช้จ่าย

🔹 ค่าใช้จ่าย (ปุ่มหลัก)
ดูรายการค่าใช้จ่ายทั้งหมดที่บันทึกไว้ในระบบ กดเพื่อเพิ่ม แก้ไข หรือลบรายการ

🔹 สแกนบิล OCR
อัพโหลดรูปใบเสร็จ/ใบกำกับภาษี ระบบจะอ่านข้อมูลอัตโนมัติ แล้วจับคู่กับสินค้าในระบบ ช่วยบันทึกค่าใช้จ่ายได้เร็วขึ้น

🔹 รออนุมัติ
แสดงรายการที่นำเข้าจาก Google Sheets ที่ยังรอตรวจสอบ กดอนุมัติเพื่อบันทึกเข้าระบบ

🔹 ดึงข้อมูล
เชื่อมต่อกับ Google Sheets เพื่อดึงข้อมูลค่าใช้จ่ายเข้ามา เหมาะสำหรับทีมที่กรอกข้อมูลผ่าน Google Sheets

🔹 ปุ่มลัดอื่นๆ
- ใบสั่งซื้อ → จัดการใบสั่งซื้อสินค้า
- ใบเสนอราคา → สร้างและจัดการใบเสนอราคา
- ใบสำคัญจ่าย → จัดการใบสำคัญจ่ายเงิน
- ภาษี → หัก ณ ที่จ่าย, ภ.พ.30, ใบกำกับภาษี`
  },
  '/contacts': {
    page_name_th: 'ผู้ติดต่อ',
    page_name_en: 'Contacts',
    short_description: 'จัดการผู้ซื้อ ผู้ขาย และคู่ค้า',
    content: `📋 หน้าผู้ติดต่อ

🔹 ดึงจาก FA
Sync ข้อมูลผู้ติดต่อจาก FlowAccount มาใส่ในระบบ
ข้อดีคือ FlowAccount เชื่อมต่อกับกรมสรรพากร เมื่อคีย์เลขผู้เสียภาษี ชื่อและที่อยู่จะแสดงอัตโนมัติ

🔹 เพิ่มผู้ติดต่อ
กำหนดประเภท (ผู้ขาย/ผู้ซื้อ/คู่ค้า) แล้วกรอกข้อมูลที่อยู่ เลขผู้เสียภาษี เบอร์โทร อีเมล

🔹 ค้นหา
พิมพ์ชื่อ เลขผู้เสียภาษี หรือเบอร์โทร ในช่องค้นหา

🔹 แก้ไข / ลบ
กดที่รายชื่อเพื่อดูรายละเอียดและแก้ไขข้อมูล`
  },
  '/categories': {
    page_name_th: 'หมวดหมู่สินค้า',
    page_name_en: 'Categories',
    short_description: 'เรียกดูสินค้าตามหมวดหมู่',
    content: `📂 หน้าหมวดหมู่สินค้า

🔹 เลือกหมวดหมู่
กดที่หมวดหมู่เพื่อดูสินค้าในกลุ่มนั้น เช่น ยาแก้ปวด ยาลดไข้ วิตามิน

🔹 เพิ่มสินค้าลงตะกร้า
กดที่สินค้าเพื่อเพิ่มลงตะกร้า POS ได้เลย

🔹 ค้นหา
พิมพ์ชื่อสินค้าเพื่อกรองภายในหมวดหมู่`
  },
  '/inventory': {
    page_name_th: 'คลังสินค้า',
    page_name_en: 'Inventory',
    short_description: 'จัดการสต็อกและรับสินค้าเข้า',
    content: `📦 หน้าคลังสินค้า

🔹 ดูสต็อก
แสดงจำนวนสินค้าคงเหลือทั้งหมด แยกตามคลัง

🔹 รับสินค้าเข้า
บันทึกการรับสินค้าเข้าคลัง พร้อมระบุจำนวน ราคาต้นทุน

🔹 ปรับสต็อก
ปรับจำนวนสต็อกกรณีนับได้ไม่ตรง หรือสินค้าเสียหาย

🔹 โอนสต็อก
โอนสินค้าระหว่างคลัง`
  },
  '/bill-scan': {
    page_name_th: 'สแกนบิล OCR',
    page_name_en: 'Bill Scan OCR',
    short_description: 'อัพโหลดบิลแล้วดึงข้อมูลอัตโนมัติ',
    content: `📸 สแกนบิล OCR

🔹 อัพโหลดเอกสาร
ลากไฟล์มาวาง หรือกดเพื่อเลือกไฟล์ รองรับ PDF, JPG, PNG อัพโหลดได้หลายไฟล์พร้อมกัน

🔹 ระบบอ่านข้อมูล
หลังอัพโหลด ระบบจะสแกนเอกสารด้วย AI ดึงข้อมูลผู้ขาย วันที่ รายการสินค้า ราคาอัตโนมัติ

🔹 จับคู่สินค้า
ระบบจับคู่รายการในบิลกับสินค้าในระบบอัตโนมัติ ถ้าจับคู่ไม่ได้ สามารถเลือกสินค้าด้วยตนเอง หรือเพิ่มสินค้าใหม่

🔹 นำเข้าข้อมูล
กดยืนยันเพื่อบันทึกเป็นค่าใช้จ่ายในระบบ พร้อมอัพเดทต้นทุนสินค้า`
  },
  '/purchase-orders': {
    page_name_th: 'ใบสั่งซื้อ',
    page_name_en: 'Purchase Orders',
    short_description: 'สร้างและจัดการใบสั่งซื้อ',
    content: `🛍️ หน้าใบสั่งซื้อ

🔹 สร้างใบสั่งซื้อ
กดปุ่ม "สร้างใบสั่งซื้อ" เลือกผู้ขาย เพิ่มรายการสินค้า ระบุจำนวนและราคา

🔹 สถานะ
- ร่าง → ยังไม่ส่ง
- ส่งแล้ว → ส่งให้ผู้ขายแล้ว
- รับแล้ว → รับสินค้าเรียบร้อย

🔹 รับสินค้า
กดที่ใบสั่งซื้อ แล้วกด "รับสินค้า" ระบบจะเพิ่มสต็อกอัตโนมัติ`
  },
  '/payment-vouchers': {
    page_name_th: 'ใบสำคัญจ่าย',
    page_name_en: 'Payment Vouchers',
    short_description: 'จัดการใบสำคัญจ่ายเงิน',
    content: `💸 หน้าใบสำคัญจ่าย

🔹 สร้างใบสำคัญจ่าย
กดปุ่ม "สร้าง" กรอกข้อมูลผู้รับเงิน จำนวน วิธีชำระ รายละเอียด

🔹 Sync FlowAccount
กดปุ่ม "Sync FA" เพื่อส่งใบสำคัญจ่ายไปบันทึกเป็นค่าใช้จ่ายใน FlowAccount

🔹 พิมพ์
กดที่ใบสำคัญจ่ายเพื่อพิมพ์เอกสาร`
  },
  '/withholding-tax': {
    page_name_th: 'หัก ณ ที่จ่าย',
    page_name_en: 'Withholding Tax',
    short_description: 'จัดการภาษีหัก ณ ที่จ่าย',
    content: `🧾 หน้าหัก ณ ที่จ่าย

🔹 ดูรายการ
แสดงรายการค่าใช้จ่ายที่มีการหักภาษี ณ ที่จ่าย พร้อมยอดรวม

🔹 กรอง
กรองตามเดือน ประเภทภาษี หรือผู้ขาย

🔹 ออกหนังสือรับรอง
ออกหนังสือรับรองการหักภาษี ณ ที่จ่าย (50 ทวิ)`
  },
  '/tax-pp30': {
    page_name_th: 'ภ.พ.30 (VAT Return)',
    page_name_en: 'VAT Return (PP30)',
    short_description: 'รายงานภาษีมูลค่าเพิ่ม',
    content: `📊 ภ.พ.30 (VAT Return)

🔹 ภาษีซื้อ (Input VAT)
แสดงรายการค่าใช้จ่ายที่มี VAT รวมยอดภาษีซื้อทั้งหมด

🔹 ภาษีขาย (Output VAT)
แสดงรายการขายที่มี VAT รวมยอดภาษีขายทั้งหมด

🔹 สรุปยอด
- ภาษีขาย > ภาษีซื้อ → ต้องนำส่ง
- ภาษีซื้อ > ภาษีขาย → ขอคืนได้

🔹 เลือกเดือน
เปลี่ยนเดือนที่ต้องการดูรายงานได้จากตัวเลือกด้านบน`
  },
  '/tax-invoices': {
    page_name_th: 'ใบกำกับภาษี',
    page_name_en: 'Tax Invoices',
    short_description: 'จัดการใบกำกับภาษีขาย',
    content: `🧾 หน้าใบกำกับภาษี

🔹 ดูรายการ
แสดงใบกำกับภาษีทั้งหมด กรองตามวันที่และสถานะ sync

🔹 Sync FlowAccount
กดปุ่ม "Sync FA" เพื่อส่งใบกำกับภาษีไปยัง FlowAccount

🔹 พิมพ์
กดที่รายการเพื่อดูรายละเอียดและพิมพ์ใบกำกับภาษี`
  },
  '/medicine-labels': {
    page_name_th: 'พิมพ์ฉลากยา',
    page_name_en: 'Medicine Labels',
    short_description: 'พิมพ์ฉลากยาสำหรับติดซอง',
    content: `🏷️ พิมพ์ฉลากยา

🔹 ค้นหายา
พิมพ์ชื่อยาในช่องค้นหา เลือกยาที่ต้องการพิมพ์ฉลาก

🔹 กรอกข้อมูล
กรอกชื่อผู้ป่วย วิธีใช้ยา ข้อควรระวัง

🔹 พิมพ์
กดปุ่มพิมพ์ ฉลากจะพิมพ์ออกมาพร้อมติดซองยาได้เลย`
  },
  '/quotations': {
    page_name_th: 'ใบเสนอราคา',
    page_name_en: 'Quotations',
    short_description: 'สร้างและจัดการใบเสนอราคา',
    content: `📝 หน้าใบเสนอราคา

🔹 สร้างใบเสนอราคา
กดปุ่ม "สร้างใบเสนอราคา" เลือกลูกค้า เพิ่มรายการสินค้า กำหนดราคาและส่วนลด

🔹 ส่งให้ลูกค้า
พิมพ์ใบเสนอราคาเป็น PDF หรือส่งทางอีเมล

🔹 แปลงเป็นออเดอร์
กดเพื่อแปลงใบเสนอราคาเป็นออเดอร์ขายได้เลย`
  },
  '/reports': {
    page_name_th: 'รายงาน',
    page_name_en: 'Reports',
    short_description: 'รายงานสรุปต่างๆ',
    content: `📈 หน้ารายงาน

🔹 รายงานที่มี
- รายงานยอดขาย → สรุปยอดขายตามช่วงเวลา
- สรุปยอดชำระเงิน → แยกตามวิธีชำระ
- สรุปปิดรอบ → สรุปเงินสดเมื่อปิดรอบขาย
- รายงานสต็อก → สินค้าคงเหลือ ติดลบ ใกล้หมดอายุ
- ใบเสร็จ/ใบกำกับภาษี → รายงานเอกสารออกให้ลูกค้า

🔹 ส่งออก
กดปุ่มส่งออกเพื่อดาวน์โหลดรายงานเป็น Excel`
  },
  '/settings': {
    page_name_th: 'ตั้งค่า',
    page_name_en: 'Settings',
    short_description: 'ตั้งค่าระบบต่างๆ',
    content: `⚙️ หน้าตั้งค่า

🔹 ข้อมูลร้าน
ตั้งชื่อร้าน ที่อยู่ เลขผู้เสียภาษี โลโก้ สำหรับแสดงในใบเสร็จและเอกสาร

🔹 ช่องทางการขาย
เพิ่ม/แก้ไขช่องทางขาย เช่น หน้าร้าน, Grab, Shopee พร้อมตั้งค่าวิธีชำระเงินแต่ละช่องทาง

🔹 หมวดหมู่ค่าใช้จ่าย
จัดการหมวดหมู่สำหรับบันทึกค่าใช้จ่าย

🔹 กฎจ่ายเงิน
ตั้งค่าให้ระบบจับคู่วิธีชำระเงินอัตโนมัติตาม keyword

🔹 FlowAccount
ตั้งค่าเชื่อมต่อ FlowAccount, Auto-sync cash invoice

🔹 จัดการผู้ใช้
เพิ่ม/แก้ไขสิทธิ์ผู้ใช้ในระบบ`
  },
  '/settings/flowaccount': {
    page_name_th: 'ตั้งค่า FlowAccount',
    page_name_en: 'FlowAccount Settings',
    short_description: 'เชื่อมต่อและตั้งค่า FlowAccount',
    content: `🔗 ตั้งค่า FlowAccount

🔹 เชื่อมต่อ
กรอก API Key ของ FlowAccount เพื่อเชื่อมต่อระบบ

🔹 Auto-Sync Cash Invoice
เปิด/ปิดการส่งใบเสร็จอัตโนมัติไปยัง FlowAccount เมื่อขายสำเร็จ
สามารถเลือกได้ว่าช่องทางไหนและวิธีชำระแบบไหนจะ auto-sync

🔹 ทดสอบการเชื่อมต่อ
กดปุ่มทดสอบเพื่อตรวจสอบว่าเชื่อมต่อ FlowAccount ได้ถูกต้อง`
  },
  '/settings/sales-channels': {
    page_name_th: 'ช่องทางการขาย',
    page_name_en: 'Sales Channels',
    short_description: 'จัดการช่องทางและวิธีชำระเงิน',
    content: `🏪 ช่องทางการขาย

🔹 เพิ่มช่องทาง
กดปุ่ม "เพิ่มช่องทาง" ตั้งชื่อ เลือกสี ระบุค่าคอมมิชชั่น

🔹 วิธีชำระเงิน
แต่ละช่องทางสามารถตั้งวิธีชำระเงินแยกกันได้ เช่น หน้าร้านรับเงินสด, Grab รับโอน

🔹 จัดลำดับ
ลากเพื่อจัดลำดับช่องทางที่แสดงในหน้า POS`
  },
  '/stock-management': {
    page_name_th: 'จัดการสต็อก',
    page_name_en: 'Stock Management',
    short_description: 'ปรับสต็อก โอนสต็อก รับสินค้า',
    content: `📋 จัดการสต็อก

🔹 ปรับสต็อก
เลือกสินค้า กรอกจำนวนที่ต้องการปรับ ระบุเหตุผล เช่น นับได้ไม่ตรง สินค้าเสียหาย

🔹 โอนสต็อก
โอนสินค้าระหว่างคลัง เลือกคลังต้นทางและปลายทาง

🔹 รับสินค้าเข้า
บันทึกการรับสินค้าจากซัพพลายเออร์ ระบบเพิ่มสต็อกอัตโนมัติ`
  },
  '/stock-counting': {
    page_name_th: 'นับสต็อก',
    page_name_en: 'Stock Counting',
    short_description: 'นับสต็อกจริงเทียบกับระบบ',
    content: `📝 นับสต็อก

🔹 เริ่มนับ
สร้างรอบการนับ เลือกสินค้าหรือหมวดหมู่ที่จะนับ

🔹 กรอกจำนวน
สแกนบาร์โค้ดหรือพิมพ์ชื่อสินค้า แล้วกรอกจำนวนที่นับได้จริง

🔹 เปรียบเทียบ
ระบบแสดงส่วนต่างระหว่างจำนวนในระบบกับจำนวนที่นับได้

🔹 ปรับยอด
กดยืนยันเพื่อปรับสต็อกในระบบให้ตรงกับที่นับได้`
  },
  '/payment-summary': {
    page_name_th: 'สรุปยอดชำระเงิน',
    page_name_en: 'Payment Summary',
    short_description: 'สรุปยอดแยกตามวิธีชำระ',
    content: `💰 สรุปยอดชำระเงิน

🔹 สรุปตามวิธีชำระ
แสดงยอดรวมแยกตามวิธีชำระเงิน เช่น เงินสด โอน บัตรเครดิต

🔹 เลือกช่วงเวลา
กรองตามวันที่เพื่อดูสรุปยอดในช่วงที่ต้องการ

🔹 ส่งออก
ดาวน์โหลดข้อมูลเป็น Excel`
  },
  '/executive-summary': {
    page_name_th: 'สรุปผู้บริหาร',
    page_name_en: 'Executive Summary',
    short_description: 'ภาพรวมธุรกิจสำหรับผู้บริหาร',
    content: `📊 สรุปผู้บริหาร

🔹 ภาพรวม
แสดงยอดขาย กำไร ค่าใช้จ่าย ในรูปแบบกราฟที่เข้าใจง่าย

🔹 เปรียบเทียบ
เปรียบเทียบผลประกอบการรายเดือน/รายปี

🔹 แนวโน้ม
กราฟแสดงแนวโน้มยอดขายและค่าใช้จ่าย เพื่อวางแผนธุรกิจ`
  },
  '/work-schedule': {
    page_name_th: 'ตารางเวร',
    page_name_en: 'Work Schedule',
    short_description: 'จัดตารางเวรพนักงาน',
    content: `📅 ตารางเวร

🔹 จัดเวร
เลือกวันที่และพนักงาน ลากเพื่อจัดเวรในแต่ละวัน

🔹 ดูตาราง
ดูตารางเวรรายสัปดาห์หรือรายเดือน

🔹 แจ้งเตือน
ระบบแจ้งเตือนเมื่อมีเวรที่ยังไม่ได้จัด`
  },
  '/zortout-sync': {
    page_name_th: 'Sync ZortOut',
    page_name_en: 'ZortOut Sync',
    short_description: 'เชื่อมต่อสต็อกกับ ZortOut',
    content: `🔄 Sync ZortOut

🔹 เชื่อมต่อ
ตั้งค่า API Key ของ ZortOut เพื่อ sync สต็อกระหว่างระบบ

🔹 Sync สินค้า
กดปุ่ม Sync เพื่อดึงข้อมูลสินค้าจาก ZortOut มาอัพเดทในระบบ

🔹 ตรวจสอบ
ดูรายการที่ sync สำเร็จ/ล้มเหลว`
  },
  '/platform-management': {
    page_name_th: 'จัดการแพลตฟอร์ม',
    page_name_en: 'Platform Management',
    short_description: 'ตั้งราคาสินค้าแต่ละแพลตฟอร์ม',
    content: `🏪 จัดการแพลตฟอร์ม

🔹 ตั้งราคาตามแพลตฟอร์ม
เลือกแพลตฟอร์ม (Grab, Shopee, LINE MAN) แล้วตั้งราคาขายแยกสำหรับแต่ละสินค้า

🔹 ตั้งราคาแบบเปอร์เซ็นต์
ตั้งส่วนเพิ่มราคาเป็น % จากราคาปกติ เช่น +15% สำหรับ Grab

🔹 เปิด/ปิดสินค้า
เลือกว่าสินค้าไหนจะแสดงในแต่ละแพลตฟอร์ม`
  },
  '/cross-channel-stock': {
    page_name_th: 'สต็อกข้ามช่องทาง',
    page_name_en: 'Cross-Channel Stock',
    short_description: 'ดูสต็อกแยกตามช่องทางขาย',
    content: `📊 สต็อกข้ามช่องทาง

🔹 ดูสต็อก
แสดงจำนวนสินค้าคงเหลือแยกตามช่องทางขาย

🔹 เปรียบเทียบ
เปรียบเทียบยอดขายและสต็อกระหว่างช่องทาง`
  },
  '/petty-cash': {
    page_name_th: 'เงินสดย่อย',
    page_name_en: 'Petty Cash',
    short_description: 'จัดการเงินสดย่อยหน้าร้าน',
    content: `💵 เงินสดย่อย

🔹 บันทึกรายรับ-รายจ่าย
บันทึกการรับเงินเข้าและจ่ายเงินออกจากกล่องเงินสดย่อย

🔹 ยอดคงเหลือ
ดูยอดเงินสดย่อยคงเหลือปัจจุบัน

🔹 ปิดรอบ
สรุปยอดเมื่อสิ้นวัน ตรวจสอบเงินจริงกับเงินในระบบ`
  },
  '/ai-symptom-checker': {
    page_name_th: 'AI ตรวจอาการ',
    page_name_en: 'AI Symptom Checker',
    short_description: 'ให้ AI ช่วยแนะนำยาจากอาการ',
    content: `🤖 AI ตรวจอาการ

🔹 กรอกอาการ
พิมพ์อาการของลูกค้า เช่น "ปวดหัว มีไข้ น้ำมูกไหล"

🔹 AI แนะนำ
ระบบ AI จะวิเคราะห์อาการและแนะนำยาที่เหมาะสมจากสินค้าในร้าน

🔹 เพิ่มลงตะกร้า
กดเพื่อเพิ่มยาที่แนะนำลงตะกร้า POS ได้เลย

⚠️ ข้อควรระวัง
คำแนะนำจาก AI เป็นเพียงข้อมูลเบื้องต้น ควรใช้ดุลยพินิจของเภสัชกรร่วมด้วย`
  },
  '/warehouse-management': {
    page_name_th: 'จัดการคลังสินค้า',
    page_name_en: 'Warehouse Management',
    short_description: 'เพิ่ม/แก้ไขคลังสินค้า',
    content: `🏭 จัดการคลังสินค้า

🔹 เพิ่มคลัง
สร้างคลังสินค้าใหม่ ตั้งชื่อ ที่อยู่ ประเภท

🔹 แก้ไข
แก้ไขข้อมูลคลังสินค้าที่มีอยู่

🔹 ดูสต็อก
ดูจำนวนสินค้าในแต่ละคลัง`
  },
  '/employee-settings': {
    page_name_th: 'จัดการพนักงาน',
    page_name_en: 'Employee Settings',
    short_description: 'เพิ่ม/แก้ไขข้อมูลพนักงาน',
    content: `👥 จัดการพนักงาน

🔹 เพิ่มพนักงาน
กรอกชื่อ ตำแหน่ง เบอร์โทร อีเมล

🔹 กำหนดสิทธิ์
ตั้งค่าสิทธิ์การเข้าถึงเมนูต่างๆ ในระบบ

🔹 แก้ไข / ลบ
กดที่รายชื่อเพื่อแก้ไขข้อมูลหรือลบพนักงาน`
  },
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
        // ถ้าไม่มีใน DB ให้ดูจาก local fallback
        const local = LOCAL_HELP[pageRoute]
        if (local) {
          setManual({
            id: '',
            page_route: pageRoute,
            page_name_th: local.page_name_th,
            page_name_en: local.page_name_en,
            content: local.content,
            short_description: local.short_description
          })
        } else {
          setManual({
            id: '',
            page_route: pageRoute,
            page_name_th: 'คู่มือการใช้งาน',
            page_name_en: 'User Manual',
            content: 'ยังไม่มีคู่มือสำหรับหน้านี้ กรุณาติดต่อผู้ดูแลระบบ',
            short_description: ''
          })
        }
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
