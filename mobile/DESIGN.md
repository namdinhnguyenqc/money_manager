# TrọCare Mobile Design System

## Direction

Fintech vận hành dành cho chủ trọ: bề mặt sáng, phẳng, chắc chắn; một điểm nhấn xanh thương hiệu; số liệu và quyết định là trọng tâm. Logo TrọCare và biểu tượng TC là tài sản cố định, không vẽ lại hoặc thay đổi màu.

## Color

- Brand primary: `#2563EB`; dùng cho CTA chính, trạng thái chọn và liên kết.
- Supporting teal: `#06B6D4`; chỉ dùng như chi tiết thương hiệu hiếm.
- Ink: `#0F172A`; nội dung chính và số liệu.
- Secondary text: `#475569`; supporting copy.
- Muted text: `#64748B`; nhãn phụ nhưng vẫn đảm bảo tương phản.
- Canvas: `#F8FAFC`; surface: `#FFFFFF`; hairline: `#E2E8F0`.
- Success `#059669`, warning `#D97706`, danger `#DC2626`; chỉ dùng cho trạng thái thực.

## Typography

Inter là font UI duy nhất. Heading 20–24/700, section title 16–18/700, body 14/400–500, caption 12/500. Số tiền dùng 24–34/700–800, letter spacing nhẹ và tabular alignment khi so sánh.

## Layout

Lề ngang 20px, nhịp dọc 8/12/16/24/32. Section được phân tách chủ yếu bằng khoảng trắng hoặc hairline. Card chỉ dùng khi nội dung thực sự là một nhóm độc lập; radius 16px, control 12px, không kết hợp border với shadow rộng.

## Components

- Primary action: nền xanh, chữ trắng, cao tối thiểu 48px.
- Icon action: Ionicons outline 20–22px, vùng chạm 44px; inactive dùng màu ink/secondary.
- Financial hero: một surface navy hoặc xanh thương hiệu duy nhất, có dải accent mảnh; không dùng gradient soup.
- Metric row: nhãn trái, số căn phải hoặc ba cột có đường phân cách; tránh mỗi metric thành một card.
- List: surface phẳng, divider hairline; chevron chỉ khi hàng điều hướng.
- Status: text + icon/dot, màu semantic; pill chỉ khi trạng thái cần nhận diện nhanh.

## States

Skeleton phải mô phỏng bố cục thật. Empty state giải thích bước tiếp theo và có CTA. Error state nói rõ không tải được dữ liệu, giữ navigation hoạt động và cho phép thử lại. Pull-to-refresh cho dashboard và danh sách.

## Motion

150–220ms cho press/selection/state change. Không có page-load choreography; reduced motion phải bỏ transform và chuyển ngay trạng thái.
