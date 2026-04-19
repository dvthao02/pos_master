INSERT INTO platform.roles (role_key, role_name)
VALUES ('PLATFORM_STORE_CREATOR', 'Nhân viên tạo cửa hàng')
ON CONFLICT (role_key) DO NOTHING;
