-- Petty Cash (เงินสดย่อย) System
-- Monthly fund: 5000 Baht

-- Table for petty cash fund records (replenishments)
CREATE TABLE petty_cash_funds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    month INTEGER NOT NULL, -- 1-12
    year INTEGER NOT NULL,
    initial_amount DECIMAL(12,2) NOT NULL DEFAULT 5000.00,
    current_balance DECIMAL(12,2) NOT NULL DEFAULT 5000.00,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, closed, replenished
    replenished_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(month, year)
);

-- Table for petty cash expenses
CREATE TABLE petty_cash_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fund_id UUID NOT NULL REFERENCES petty_cash_funds(id) ON DELETE CASCADE,
    expense_date DATE NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    category VARCHAR(50) NOT NULL, -- office_supplies, utilities, travel, food, etc.
    description TEXT NOT NULL,
    receipt_number VARCHAR(100),
    receipt_image_url TEXT,
    paid_by UUID REFERENCES employees(id), -- who paid from their pocket
    approved_by UUID REFERENCES auth.users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, approved, rejected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE petty_cash_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE petty_cash_expenses ENABLE ROW LEVEL SECURITY;

-- Policies for petty_cash_funds
CREATE POLICY "Allow all access to petty_cash_funds" 
    ON petty_cash_funds FOR ALL 
    USING (true) 
    WITH CHECK (true);

-- Policies for petty_cash_expenses
CREATE POLICY "Allow all access to petty_cash_expenses" 
    ON petty_cash_expenses FOR ALL 
    USING (true) 
    WITH CHECK (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_petty_cash_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_petty_cash_funds_updated_at
    BEFORE UPDATE ON petty_cash_funds
    FOR EACH ROW
    EXECUTE FUNCTION update_petty_cash_updated_at();

CREATE TRIGGER update_petty_cash_expenses_updated_at
    BEFORE UPDATE ON petty_cash_expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_petty_cash_updated_at();

-- Indexes
CREATE INDEX idx_petty_cash_funds_month_year ON petty_cash_funds(month, year);
CREATE INDEX idx_petty_cash_expenses_fund_id ON petty_cash_expenses(fund_id);
CREATE INDEX idx_petty_cash_expenses_date ON petty_cash_expenses(expense_date);
CREATE INDEX idx_petty_cash_expenses_category ON petty_cash_expenses(category);
