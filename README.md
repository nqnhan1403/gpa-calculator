# GPA Calculator

Công cụ tính GPA và lập kế hoạch cải thiện điểm — hỗ trợ thang 4.0 và thang 10. Tách ra từ dự án `simulation-tools` thành ứng dụng standalone.

## Tính năng

- Tính GPA cuối khoá theo công thức trung bình có trọng số tín chỉ.
- Tính GPA cần đạt cho phần còn lại để chạm mục tiêu.
- Mô phỏng kịch bản tốt nhất / xấu nhất.
- Biểu đồ tương tác (recharts) hiển thị quan hệ GPA tương lai → GPA cuối.
- UI shadcn (slider, input, toggle-group, badge, card, separator).

## Chạy local

```bash
npm install
npm run dev
```

Mở `http://localhost:5173`.

## Build

```bash
npm run build
npm run preview
```

## Cấu trúc

```text
src/
├── GpaCalculator.jsx       # Component chính
├── main.jsx                # Entry point
├── index.css               # Tailwind + CSS variables
├── components/ui/          # shadcn components (card, slider, input, ...)
└── lib/utils.js            # cn() helper
```
