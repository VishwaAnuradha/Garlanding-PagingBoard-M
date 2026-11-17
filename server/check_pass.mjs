import bcrypt from 'bcryptjs';

const hashes = {
  1001: '$2a$12$n7.b//sZanY69kUGWPPXf.wmcHxAUb87sJJ.WTgBcXa9hPngPP6nq',
  1002: '$2a$12$iJc/wmUx8nul9PxMsLXRNeypzY0.0QQpw2/h3F8UL1/FhFrJIErNO',
  1003: '$2a$12$71O9Lzm.R587KgP3oqlZpuOKRwUS6r9YWBEdaYpOZDUYe9EsHjYR2',
  1004: '$2a$12$gWIj0bweKs5dRW7/F6QZIOYKrZTdkGeddN4A7SDoK.Ybt.klyqjfy',
  1005: '$2a$12$VPAjr4ET6b4/NQI46aGfhOS/Sl3U7CGhuWfkrW7bkflBAwRo3xY0y'
};

const candidates = [
  'MyPassword123',
  'mypassword123',
  '1001', '1002', '1003', '1004', '1005',
  'admin', 'Admin', 'Admin123', 'admin123', 'Admin@123',
  'superadmin', 'SuperAdmin', 'Superadmin', 'superadmin123', 'SuperAdmin123', 'SuperAdmin@123',
  'user', 'User', 'User123', 'user123',
  'password', 'Password', 'Password123', 'password123',
  '123', '1234', '12345', '123456', '12345678', '123456789',
  'Aasl', 'Aasl123', 'Aasl@123', 'aasl', 'aasl123',
  'sa', 'sa123', 'root',
  '1002@123', '1002123', 'Admin1002', 'admin1002'
];

for (const [user, hash] of Object.entries(hashes)) {
  let found = false;
  for (const c of candidates) {
    if (bcrypt.compareSync(c, hash)) {
      console.log(`User ${user} password is: "${c}"`);
      found = true;
      break;
    }
  }
  if (!found) console.log(`User ${user}: not found in quick list`);
}
