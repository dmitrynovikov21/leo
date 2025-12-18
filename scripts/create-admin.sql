-- SQL скрипт для создания первого администратора
-- Пароль: admin123 (хеш сгенерирован bcrypt с 10 раундами)
-- ОБЯЗАТЕЛЬНО смените пароль после первого входа!

INSERT INTO users (id, name, email, password, role, created_at, updated_at)
VALUES (
  'admin_' || substr(md5(random()::text), 1, 20),
  'Admin',
  'admin@example.com',
  '$2b$10$jxnXlv3ipl5qAErN9ayHZug4RIeyS2wyN5uTh18ZGqywL8uEHxddq',  -- admin123
  'ADMIN',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  role = 'ADMIN',
  password = '$2b$10$jxnXlv3ipl5qAErN9ayHZug4RIeyS2wyN5uTh18ZGqywL8uEHxddq',
  updated_at = NOW();

-- Проверка создания:
-- SELECT id, name, email, role FROM users WHERE email = 'admin@example.com';

-- Для смены пароля:
-- 1. Сгенерируйте хеш: npx -y bcryptjs-cli hash "newpassword" 12
-- 2. Обновите: UPDATE users SET password = '<новый_хеш>' WHERE email = 'admin@example.com';
