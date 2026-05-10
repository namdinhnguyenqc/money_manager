import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log("Đang xóa dữ liệu cũ trong bảng public.users...");
  // Lấy danh sách users để xóa
  const { data: users, error: fetchError } = await supabase.from('users').select('id');
  if (fetchError) {
    console.error("Lỗi khi lấy users:", fetchError);
    return;
  }
  
  if (users && users.length > 0) {
    const ids = users.map(u => u.id);
    const { error: deleteError } = await supabase.from('users').delete().in('id', ids);
    if (deleteError) {
      console.error("Lỗi khi xóa users:", deleteError);
    } else {
      console.log(`Đã dọn dẹp thành công ${users.length} tài khoản rác cũ!`);
    }
  } else {
    console.log("Bảng users đã sạch sẽ, không có gì để xóa.");
  }
}

run();
