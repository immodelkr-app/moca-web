-- 팝업 관리 테이블
CREATE TABLE IF NOT EXISTS popups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT,
    image_url TEXT,
    link_url TEXT,
    is_active BOOLEAN DEFAULT true,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 공개 읽기 허용 (팝업은 로그인 없이도 보여야 함)
ALTER TABLE popups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "popups_public_read" ON popups FOR SELECT USING (true);
CREATE POLICY "popups_admin_all" ON popups FOR ALL USING (true);
