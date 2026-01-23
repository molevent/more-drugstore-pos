-- ============================================================================
-- Create consultation history table to store patient consultations
-- ============================================================================

-- Create consultation_history table
CREATE TABLE IF NOT EXISTS public.consultation_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_name VARCHAR(255),
  patient_phone VARCHAR(20),
  age INTEGER NOT NULL,
  gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
  weight DECIMAL(5,2),
  height DECIMAL(5,2),
  pregnant BOOLEAN DEFAULT false,
  breastfeeding BOOLEAN DEFAULT false,
  allergies TEXT,
  current_medications TEXT,
  chronic_conditions TEXT,
  symptom_duration VARCHAR(50),
  symptoms TEXT NOT NULL,
  temperature DECIMAL(4,1),
  blood_pressure VARCHAR(20),
  pulse_rate INTEGER,
  chief_complaint TEXT,
  ai_recommendations JSONB,
  pharmacist_notes TEXT,
  final_medications JSONB,
  consultation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_consultation_patient_phone ON public.consultation_history(patient_phone);
CREATE INDEX IF NOT EXISTS idx_consultation_date ON public.consultation_history(consultation_date);
CREATE INDEX IF NOT EXISTS idx_consultation_created_by ON public.consultation_history(created_by);

-- Enable RLS
ALTER TABLE public.consultation_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can manage consultations" ON public.consultation_history
  FOR ALL USING (auth.role() = 'authenticated');

-- Create trigger for updated_at
CREATE TRIGGER update_consultation_history_updated_at
  BEFORE UPDATE ON public.consultation_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Create common symptoms table for quick selection
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.common_symptoms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category VARCHAR(100) NOT NULL,
  symptom_th VARCHAR(255) NOT NULL,
  symptom_en VARCHAR(255) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- Insert common symptoms
INSERT INTO public.common_symptoms (category, symptom_th, symptom_en, sort_order) VALUES
-- General symptoms
('general', 'ไข้', 'Fever', 1),
('general', 'ปวดหัว', 'Headache', 2),
('general', 'เมื่อยตัว', 'Body aches', 3),
('general', 'อ่อนเพลีย', 'Fatigue', 4),
('general', 'หนาวสั่น', 'Chills', 5),
('general', 'เบื่ออาหาร', 'Loss of appetite', 6),

-- Respiratory symptoms
('respiratory', 'ไอ', 'Cough', 10),
('respiratory', 'เจ็บคอ', 'Sore throat', 11),
('respiratory', 'น้ำมูกไหล', 'Runny nose', 12),
('respiratory', 'คัดจมูก', 'Nasal congestion', 13),
('respiratory', 'หายใจลำบาก', 'Difficulty breathing', 14),
('respiratory', 'เสมหะ', 'Phlegm', 15),

-- Digestive symptoms
('digestive', 'ท้องเสีย', 'Diarrhea', 20),
('digestive', 'ท้องผูก', 'Constipation', 21),
('digestive', 'คลื่นไส้', 'Nausea', 22),
('digestive', 'อาเจียน', 'Vomiting', 23),
('digestive', 'ปวดท้อง', 'Stomach ache', 24),
('digestive', 'ท้องอืด', 'Bloating', 25),

-- Skin symptoms
('skin', 'ผื่นคัน', 'Itchy rash', 30),
('skin', 'ผื่นแดง', 'Red rash', 31),
('skin', 'ลมพิษ', 'Hives', 32),
('skin', 'แผลพุพอง', 'Blisters', 33),

-- Pain symptoms
('pain', 'ปวดหลัง', 'Back pain', 40),
('pain', 'ปวดข้อ', 'Joint pain', 41),
('pain', 'ปวดกล้ามเนื้อ', 'Muscle pain', 42),
('pain', 'ปวดฟัน', 'Toothache', 43),
('pain', 'ปวดหู', 'Ear pain', 44)
ON CONFLICT DO NOTHING;

-- Enable RLS for common_symptoms
ALTER TABLE public.common_symptoms ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for common_symptoms
CREATE POLICY "Anyone can view common symptoms" ON public.common_symptoms
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage common symptoms" ON public.common_symptoms
  FOR ALL USING (auth.role() = 'authenticated');
