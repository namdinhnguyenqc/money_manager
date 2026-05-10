const fs = require('fs');
const path = require('path');
const dbPath = path.resolve(__dirname, '../money-manager-mobile/backend/.mock-db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

const userId = 'mock-google-owner-6e616d6368656c7365613236';
if (db[userId]) {
  db[userId].userProfiles = [
    {
      id: "profile-" + userId,
      user_id: userId,
      full_name: "Nam Nguyễn",
      phone: "0901234567",
      province_code: "79",
      province_name: "Thành phố Hồ Chí Minh",
      district_code: "760",
      district_name: "Quận 1",
      address_line: "Số nhà, tên đường, khu phố",
      full_address: "Số nhà, tên đường, khu phố, Quận 1, Thành phố Hồ Chí Minh",
      avatar_url: "https://lh3.googleusercontent.com/a/ACg8ocKhlUl2oa8CMfhq6olB0Gen06BIC8onnxrzvTKYni6x2S5eBdDX=s96-c",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];
}

const user = db._globalUsers.find(u => u.id === userId);
if (user) {
  user.is_profile_completed = true;
  user.onboarding_step = "DONE";
  user.name = "Nam Nguyễn";
}

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
console.log('Mock DB fixed for Nam Nguyễn');
