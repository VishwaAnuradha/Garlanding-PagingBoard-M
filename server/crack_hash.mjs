import bcrypt from 'bcryptjs';

const hash1001 = '$2a$12$n7.b//sZanY69kUGWPPXf.wmcHxAUb87sJJ.WTgBcXa9hPngPP6nq';
const hash1002 = '$2a$12$iJc/wmUx8nul9PxMsLXRNeypzY0.0QQpw2/h3F8UL1/FhFrJIErNO';
const hash1003 = '$2a$12$71O9Lzm.R587KgP3oqlZpuOKRwUS6r9YWBEdaYpOZDUYe9EsHjYR2';
const hash1004 = '$2a$12$gWIj0bweKs5dRW7/F6QZIOYKrZTdkGeddN4A7SDoK.Ybt.klyqjfy';

const candidates = [
  // variations of 1002
  '1002', '1002#', '1002@', '1002$', '1002!', '1002*',
  'pass1002', 'Pass1002', '1002pass', '1002Pass',
  '1002@123', '1002#123', '1002123', '10021234',
  'admin1002', 'Admin1002', 'Admin@1002', 'admin@1002',
  'superadmin1002', 'SuperAdmin1002', 'Superadmin1002', 'Superadmin@1002', 'SuperAdmin@1002',
  // variations of words
  'SuperAdmin', 'superadmin', 'Superadmin', 'SUPERADMIN',
  'SuperAdmin123', 'superadmin123', 'Superadmin123',
  'SuperAdmin@123', 'superadmin@123', 'Superadmin@123',
  'SuperAdmin123#', 'SuperAdmin123!', 'SuperAdmin123$',
  'SuperAdmin@2024', 'SuperAdmin@2025', 'SuperAdmin@2026',
  'SuperAdmin#123', 'superAdmin@123', 'superAdmin123',
  'Superuser', 'SuperUser', 'Superuser123', 'SuperUser123', 'SuperUser@123',
  'Admin', 'admin', 'ADMIN',
  'Admin123', 'admin123', 'ADMIN123',
  'Admin@123', 'admin@123', 'Admin#123', 'admin#123',
  'Admin1234', 'admin1234', 'Admin@1234',
  'Admin@2024', 'Admin@2025', 'Admin@2026',
  'MyPassword123', 'mypassword123', 'MyPassword@123',
  'password', 'Password', 'PASSWORD',
  'password123', 'Password123', 'Password@123', 'password@123',
  'pass123', 'Pass123', 'Pass@123',
  '123456', '12345678', '123456789', '1234', '12345',
  'Aasl@123', 'AASL@123', 'aasl@123', 'Aasl123', 'AASL123', 'aasl123',
  'Aasl@2024', 'Aasl@2025', 'Aasl@2026',
  'airport', 'Airport', 'Airport123', 'Airport@123',
  'Garlanding', 'garlanding', 'Garlanding123', 'Garlanding@123',
  'Paging', 'paging', 'PagingBoard', 'PagingBoard123',
  'BIA123', 'Bia123', 'BIA@123',
  'sa123', 'sa@123',
  'welcome', 'Welcome', 'Welcome123', 'Welcome@123',
  'abcde', 'abcde123', 'abcde@123',
  '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '0000',
  '1122', '1212', '123123',
  'Colombo', 'colombo', 'SriLanka', 'srilanka'
];

for (const c of candidates) {
  if (bcrypt.compareSync(c, hash1002)) {
    console.log(`FOUND 1002: "${c}"`);
  }
  if (bcrypt.compareSync(c, hash1001)) {
    console.log(`FOUND 1001: "${c}"`);
  }
  if (bcrypt.compareSync(c, hash1003)) {
    console.log(`FOUND 1003: "${c}"`);
  }
  if (bcrypt.compareSync(c, hash1004)) {
    console.log(`FOUND 1004: "${c}"`);
  }
}
console.log('Done checking dictionary list.');
