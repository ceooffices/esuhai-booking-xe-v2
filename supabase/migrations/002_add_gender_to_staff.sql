-- Thêm cột giới tính vào bảng staff
-- 'male' = nam (anh), 'female' = nữ (chị)
-- Dùng cho xưng hô trong email templates
ALTER TABLE staff ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female'));
COMMENT ON COLUMN staff.gender IS 'Giới tính: male = Nam, female = Nữ — dùng cho xưng hô email (anh/chị)';
