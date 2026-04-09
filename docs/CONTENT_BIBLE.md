# CONTENT BIBLE — Hệ Thống Quản Lý Xe Esuhai

> Tài liệu chuẩn hoá toàn bộ nội dung hiển thị với người dùng cuối.
> Mọi thay đổi ngôn ngữ phải tuân theo tài liệu này.

---

## I. TRIẾT LÝ NGÔN NGỮ

### Châm ngôn gốc

> "Mỗi chuyến xe là một chuyến yêu thương"

Câu này xuất hiện ở **mọi điểm chạm cuối cùng** — chân trang email, chân trang dashboard, chân trang hướng dẫn. Nó là lời nhắc nhở, không phải slogan quảng cáo. Không viết hoa toàn bộ, không thêm dấu chấm than.

### Ba trụ cột giọng văn

| Trụ cột | Ý nghĩa | Ví dụ đúng | Ví dụ sai |
|---------|---------|------------|-----------|
| **Trang trọng** | Kính trọng mọi vai trò — quản lý, nhân viên, tài xế đều nhận ngôn ngữ lịch sự ngang nhau | "Kính gửi anh Minh" | "Hi Minh", "Gửi bạn Minh" |
| **Ấm áp** | Không lạnh lùng máy móc, có tình người, có sự quan tâm | "Vui lòng xem xét và phân bổ tài xế phù hợp" | "Bạn cần xử lý booking #42" |
| **Rõ ràng** | Luôn nói rõ: ai cần làm gì, ở đâu, bao giờ | "Tài xế sẽ nhận email thông báo ngay lập tức" | "Hệ thống sẽ tự xử lý" |

### Quy tắc tuyệt đối

1. **Không emoji** trong email, dashboard, hay bất kỳ UI nào
2. **Tiếng Việt có dấu** — không viết tắt, không Việt-Anh lẫn lộn
3. **Không dùng "bạn"** — dùng "anh/chị" hoặc gọi tên/chức danh
4. **Không mệnh lệnh trần** — luôn thêm "vui lòng" hoặc mở đầu bằng ngữ cảnh
5. **Xưng "hệ thống"** khi nói về hành động tự động, **xưng "Phòng Tổng Hợp"** khi nói về tổ chức

---

## II. DANH XƯNG THEO VAI TRÒ

| Vai trò | Cách gọi trong email | Cách gọi trong dashboard | Ghi chú |
|---------|---------------------|--------------------------|---------|
| Quản lý (Chị Thúy Hà) | "Kính gửi Thúy Hà" | "Chị" (trong hướng dẫn thao tác) | Tên lấy từ CONFIG.MANAGER_NAME |
| Tài xế | "Kính gửi anh [Tên]" | "Tài xế [Tên]" | Luôn "anh", vì đội xe hiện tại toàn nam |
| Người đặt xe (nhân viên) | "Kính gửi anh/chị" | — (không dùng dashboard) | "anh/chị" vì không biết giới tính |
| NV phụ trách chuyến | "Kính gửi anh/chị [Tên]" | — | Người đi trên xe, liên lạc tài xế |

### Quy tắc danh xưng trong code

- `CONFIG.MANAGER_NAME` = "Thúy Hà" — không thêm "chị" trước khi dùng trong email (template tự thêm "Kính gửi")
- Tên tài xế: lấy nguyên từ Sheet, không chỉnh sửa
- Tên nhân viên: lấy nguyên từ Sheet, bọc "anh/chị" phía trước

---

## III. THUẬT NGỮ CHUẨN

Mỗi khái niệm chỉ có **một cách gọi duy nhất** xuyên suốt hệ thống. Không dùng từ đồng nghĩa.

### Thực thể

| Thuật ngữ chuẩn | Nghĩa | KHÔNG dùng |
|-----------------|-------|------------|
| Yêu cầu (sử dụng xe) | Một booking | "đơn đặt xe", "booking", "request", "đơn hàng" |
| Tài xế | Người lái xe | "driver", "lái xe", "anh tài" |
| Xe | Phương tiện | "vehicle", "ô tô", "xe hơi" |
| Chuyến xe | Một lượt phục vụ đã xác nhận | "trip", "chuyến đi", "ca" (ngoại trừ "nhận ca") |
| Phòng Tổng Hợp | Bộ phận quản lý xe | "admin", "quản trị", "ban quản lý" |
| Ban Điều Phối | Nhóm duyệt và phân công | "dispatcher", "điều phối viên" |
| Người yêu cầu | Nhân viên gửi form | "người đặt xe", "booker", "requester" |
| NV phụ trách chuyến | Người đi trên xe, đầu mối liên lạc | "người phụ trách", "contact person" |

### Hành động

| Thuật ngữ chuẩn | Ngữ cảnh | KHÔNG dùng |
|-----------------|---------|------------|
| Phân bổ | Gán tài xế + xe cho yêu cầu | "assign", "phân công" (trong email) |
| Phân công | Dùng trên dashboard UI (ngắn gọn hơn) | — |
| Duyệt | Quản lý chấp thuận yêu cầu | "approve", "đồng ý" |
| Không duyệt | Quản lý từ chối yêu cầu | "reject", "bác bỏ", "từ chối" (dành cho TX) |
| Xác nhận nhận ca | Tài xế đồng ý phục vụ | "accept", "chấp nhận", "OK" |
| Từ chối | Tài xế không nhận ca | "decline", "không đồng ý" |
| Phân bổ lại | Gán tài xế khác sau khi bị từ chối | "reassign", "đổi tài xế" |

### Trạng thái (giá trị trong Sheet — KHÔNG ĐƯỢC THAY ĐỔI)

| Giá trị cột L (Trạng thái) | Giá trị cột O (TX Xác nhận) | Hiển thị trên Dashboard |
|----------------------------|------------------------------|------------------------|
| `Chờ duyệt` | — | Badge vàng: "Chờ duyệt" |
| `Đã duyệt` | — | Badge xanh lá: "Đã duyệt" |
| `Không duyệt` | — | Badge đỏ: "Không duyệt" |
| — | `Chờ TX xác nhận` | Badge xanh dương: "Chờ TX xác nhận" |
| — | `TX đã nhận` | Badge xanh lá: "TX đã nhận" |
| — | `TX từ chối` | Badge đỏ: "TX từ chối" |
| `Hoàn tất` | — | Badge xám: "Hoàn tất" |

---

## IV. QUY TRÌNH 4 BƯỚC — Ngôn ngữ chuẩn

Bốn bước này xuất hiện ở: thanh tiến trình email, stepper dashboard, hướng dẫn sử dụng.

| Bước | Tên ngắn (stepper) | Tên đầy đủ (panel) | Mô tả cho quản lý |
|------|--------------------|--------------------|-------------------|
| 1 | Tiếp nhận yêu cầu | TIẾP NHẬN YÊU CẦU | Các phòng ban gửi yêu cầu sử dụng xe qua Google Form. Chị xem xét thông tin và quyết định duyệt hoặc từ chối. |
| 2 | Duyệt & Phân bổ | DUYỆT & PHÂN BỔ | Yêu cầu đã được duyệt. Chị chọn tài xế và xe phù hợp để phân công. |
| 3 | Tài xế xác nhận | TÀI XẾ XÁC NHẬN | Tài xế đã nhận email thông báo. Đang chờ tài xế bấm xác nhận hoặc từ chối trong email. |
| 4 | Sẵn sàng phục vụ | SẴN SÀNG PHỤC VỤ | Tài xế đã xác nhận. Hệ thống đã gửi email thông báo đến người đặt xe, nhân viên phụ trách và chị. |

### Thanh tiến trình trong email (2 dòng)

```
Bước 1: "Tiếp nhận\nyêu cầu"
Bước 2: "Duyệt và\nphân bổ"
Bước 3: "Tài xế\nxác nhận"
Bước 4: "Sẵn sàng\nphục vụ"
```

---

## V. NỘI DUNG EMAIL — 6 mẫu

### Nguyên tắc chung

- **Lời chào**: luôn mở bằng "Kính gửi [danh xưng],"
- **Đoạn mở**: 1-2 câu tóm tắt tình huống + hành động cần thiết
- **Bảng thông tin**: nhãn trái — giá trị phải, nhất quán
- **CTA (nút bấm)**: 1 hành động chính, văn bản ngắn gọn, động từ mở đầu
- **Chân trang**: "Trân trọng," → "PHÒNG TỔNG HỢP — ESUHAI GROUP" → "Mỗi chuyến xe là một chuyến yêu thương"
- **Subject line**: luôn có prefix trong ngoặc vuông, theo sau là thông tin chính

### Chi tiết từng mẫu

#### Mẫu 1 — Yêu cầu mới (gửi Quản lý)

| Thành phần | Nội dung |
|-----------|---------|
| Subject | `[Yêu cầu xe mới] {Tên khách} — {Ngày đi}` |
| Header email | "Yêu cầu sử dụng xe mới" |
| Lời mở | "Kính gửi {Tên quản lý}, Hệ thống vừa tiếp nhận một yêu cầu sử dụng xe mới. Vui lòng xem xét và phân bổ tài xế phù hợp." |
| CTA | "Mở bảng điều phối" |
| Ghi chú cuối | "Dòng #{row} trong bảng dữ liệu. Vui lòng phân bổ tài xế và xe sớm nhất có thể." |
| Process bar | Bước 1 (active) |

#### Mẫu 2 — Phân công tài xế (gửi Tài xế)

| Thành phần | Nội dung |
|-----------|---------|
| Subject | `[Phân công xe] {Ngày đi} — {Tên khách}` |
| Header email | "Phân công phục vụ chuyến xe" |
| Lời mở | "Kính gửi anh {Tên tài xế}, Ban Điều Phối phân công anh phục vụ chuyến xe theo thông tin bên dưới. Vui lòng xác nhận để hoàn tất quy trình." |
| Khối nổi bật | "NGÀY VÀ GIỜ ĐÓN" — font lớn, viền xanh |
| CTA chính | "Xác nhận nhận ca" (xanh lá) |
| CTA phụ | "Từ chối — ghi lý do" (xám) |
| Ghi chú cuối | "Nếu xác nhận, thông tin sẽ được gửi đến người yêu cầu và nhân viên phụ trách. Nếu từ chối, vui lòng ghi rõ lý do để Ban Điều Phối sắp xếp tài xế khác." |
| Process bar | Bước 2 (active) |

#### Mẫu 3 — Xác nhận cho người yêu cầu

| Thành phần | Nội dung |
|-----------|---------|
| Subject | `[Xe đã sẵn sàng] {Tên khách} — {Ngày đi}` |
| Header email | "Chuyến xe đã được xác nhận" |
| Lời mở | "Kính gửi anh/chị, Yêu cầu sử dụng xe của anh/chị đã được phê duyệt và tài xế đã xác nhận nhận ca. Dưới đây là thông tin chi tiết để anh/chị chủ động liên hệ khi cần." |
| Khối thành công | "Chuyến xe đã sẵn sàng phục vụ" + nút gọi tài xế |
| Ghi chú cuối | "Nếu có thay đổi lịch trình, vui lòng liên hệ Phòng Tổng Hợp sớm nhất có thể." |
| Process bar | Bước 4 (done) |

#### Mẫu 4 — Thông tin cho NV phụ trách chuyến

| Thành phần | Nội dung |
|-----------|---------|
| Subject | `[Lịch xe đã xác nhận] {Ngày đi} — Tài xế: {Tên}` |
| Header email | "Thông tin chuyến xe đã xác nhận" |
| Lời mở | "Kính gửi anh/chị {Tên NV}, Anh/chị được giao phụ trách chuyến xe bên dưới. Tài xế đã xác nhận nhận ca. Vui lòng liên hệ trực tiếp với tài xế nếu cần phối hợp trước chuyến đi." |
| CTA | Nút gọi tài xế (xanh lá) |
| Process bar | Bước 4 (done) |

#### Mẫu 5 — Báo cáo hoàn tất (gửi Quản lý)

| Thành phần | Nội dung |
|-----------|---------|
| Subject | `[Hoàn tất] Yêu cầu #{row} — {Tên khách}` |
| Header email | "Quy trình phân bổ hoàn tất" |
| Lời mở | "Kính gửi {Tên quản lý}, Tài xế {Tên} đã xác nhận nhận ca. Quy trình phân bổ cho yêu cầu bên dưới đã hoàn tất." |
| Khối thành công | "Quy trình đã hoàn tất — Chuyến xe sẵn sàng phục vụ" |
| CTA | "Mở bảng điều phối" |
| Process bar | Bước 4 (done) |

#### Mẫu 6 — Tài xế từ chối (gửi Quản lý)

| Thành phần | Nội dung |
|-----------|---------|
| Subject | `[Cần phân bổ lại] Yêu cầu #{row} — {Tên khách}` |
| Header email | "Cần phân bổ tài xế khác" |
| Lời mở | "Kính gửi {Tên quản lý}, Tài xế {Tên} không nhận ca cho yêu cầu bên dưới. Vui lòng phân bổ tài xế khác sớm nhất có thể để đảm bảo phục vụ đúng lịch." |
| Khối cảnh báo | "LÝ DO TỪ CHỐI" — viền đỏ, nền hồng nhạt |
| CTA | "Mở bảng điều phối — phân bổ lại" (đỏ) |
| Process bar | Bước 3 (active — quay lại) |

### Nhãn bảng thông tin (email)

Dùng nhất quán trong mọi mẫu:

| Nhãn | Giá trị |
|------|---------|
| Khách / Đối tượng | Tên khách hoặc đối tác |
| Ngày đi | dd/MM/yyyy |
| Giờ đón | HH:mm |
| Giờ kết thúc | HH:mm |
| Số lượng người | N người |
| NV phụ trách chuyến | Tên nhân viên |
| Người yêu cầu | Tên người điền form |
| Phòng ban | Tên phòng ban |
| Xe phục vụ / Xe được phân bổ | Biển số — loại xe |
| Tài xế phục vụ | Tên tài xế |
| Liên hệ tài xế | SĐT (clickable) |
| Liên hệ NV phụ trách | SĐT hoặc "Liên hệ Phòng Tổng Hợp" |
| Phân loại | "Đối tác" hoặc "Nội bộ" |
| Mã yêu cầu | #{row} |
| Thời gian | HH:mm — HH:mm |

### Subject line prefix

| Prefix | Mẫu |
|--------|-----|
| `[Yêu cầu xe mới]` | Mẫu 1 |
| `[Phân công xe]` | Mẫu 2 |
| `[Xe đã sẵn sàng]` | Mẫu 3 |
| `[Lịch xe đã xác nhận]` | Mẫu 4 |
| `[Hoàn tất]` | Mẫu 5 |
| `[Cần phân bổ lại]` | Mẫu 6 |

---

## VI. NỘI DUNG DASHBOARD (Quản lý)

### Header

```
Tiêu đề:  Quản lý Xe
Phụ đề:   Phòng Tổng Hợp — Esuhai Group
```

### Tab bar (bottom navigation)

| Icon | Label |
|------|-------|
| Clipboard | Quy trình |
| Chart | Thống kê |
| Car | Tài xế |

### Stepper labels

```
Bước 1: Tiếp nhận yêu cầu
Bước 2: Duyệt & Phân bổ
Bước 3: Tài xế xác nhận
Bước 4: Sẵn sàng phục vụ
```

### Hướng dẫn thao tác (Step panels)

**Bước 1:**
1. Xem danh sách yêu cầu bên dưới
2. Bấm vào yêu cầu để xem chi tiết
3. Chọn "Duyệt & Phân công ngay", "Duyệt — Phân công sau", hoặc "Không duyệt"

**Bước 2:**
1. Bấm vào yêu cầu đã duyệt
2. Chọn "Phân công Tài xế"
3. Chọn tài xế và xe từ danh sách
4. Bấm "Xác nhận phân công"

**Bước 3:**
1. Chờ tài xế phản hồi qua email
2. Nếu tài xế từ chối → quay lại bước 2 để phân công lại
3. Nếu tài xế xác nhận → tự động chuyển bước 4

**Bước 4:** (không có hướng dẫn — quy trình hoàn tất)

### Checklist items

**Bước 1:**
- Đã xem xét thông tin yêu cầu
- Đã duyệt hoặc từ chối

**Bước 2:**
- Đã chọn tài xế
- Đã chọn xe
- Đã xác nhận phân công

**Bước 3:**
- Email đã gửi cho tài xế
- Tài xế đã phản hồi

**Bước 4:**
- Tài xế đã xác nhận
- Đã thông báo người đặt xe
- Chuyến xe sẵn sàng

### CTA buttons (Modal chi tiết)

| Ngữ cảnh | Nút | Gợi ý bên dưới |
|----------|-----|----------------|
| Bước 1 | "Duyệt & Phân công ngay" (xanh lá) | "Duyệt xong chọn tài xế + xe luôn" |
| Bước 1 | "Duyệt — Phân công sau" (xanh dương) | "Duyệt trước, phân công ở bước 2" |
| Bước 1 | "Không duyệt yêu cầu này" (đỏ viền) | — |
| Bước 2 | "Phân công Tài xế & Xe" (xanh dương) | "Tài xế sẽ nhận email thông báo ngay lập tức" |
| Bước 3 | "Gọi tài xế: {SĐT}" (xanh lá) | — |
| Bước 3 | "Đổi tài xế khác" (vàng) | — |
| Bước 4 | "Gọi tài xế: {SĐT}" (xanh lá) | — |
| Modal phân công | "Xác nhận phân công" (xanh dương) | "Tài xế sẽ nhận email thông báo ngay lập tức" |
| Modal phân công | "Huỷ" (đỏ viền) | — |
| Modal từ chối | "Xác nhận từ chối" (đỏ) | — |
| Modal từ chối | "Huỷ" (đỏ viền) | — |

### Modal titles

| Modal | Tiêu đề |
|-------|--------|
| Chi tiết booking | "Chi tiết yêu cầu" (hoặc tên khách) |
| Phân công | "Phân công Tài xế & Xe" |
| Từ chối | "Lý do không duyệt" |

### Form labels (Modal phân công)

```
"Chọn tài xế"
"Chọn xe"
```

### Trạng thái tài xế trong modal phân công

| Trạng thái | Hiển thị |
|-----------|---------|
| Rảnh | Xanh lá, in đậm |
| Bận (có chuyến) | Vàng, hiện "{N} chuyến hôm nay" |

### Empty states

| Ngữ cảnh | Icon | Dòng chính | Dòng phụ |
|----------|------|-----------|---------|
| Không có booking ở bước này | Checkmark | "Không có yêu cầu ở bước này" | "Chọn bước khác trên thanh quy trình" |
| Chưa có tài xế | Car | "Chưa có tài xế" | — |

### Thống kê (Stats view)

| Nhãn | Màu |
|------|-----|
| Chờ duyệt | Vàng |
| Chờ TX xác nhận | Xanh dương |
| Hoàn tất | Xanh lá |
| TX từ chối | Đỏ |
| Hôm nay | Xanh dương |
| Ngày mai | Vàng |
| Tổng booking | Xanh lá |
| Không duyệt | Đỏ |

### Toast messages

| Ngữ cảnh | Kiểu | Nội dung |
|----------|------|---------|
| Load thất bại | error | "Không tải được dữ liệu" |
| Lỗi chung | error | "Lỗi: {message}" |
| Duyệt thành công | success | Từ API response |
| Phân công thành công | success | "Đã phân công {Tên}. Email đã gửi cho tài xế." |

### Loading state

```
Spinner + "Đang tải dữ liệu..."
```

### Detail row labels (Modal chi tiết)

```
Phòng ban
Người đặt
Phân loại
Tên khách
Ngày đi
Thời gian
Lịch trình
Số lượng
NV phụ trách
Tài xế
Xe
Ghi chú
```

### Card metadata (danh sách booking)

Mỗi card hiện 4 thông tin: Ngày đi, Thời gian, Số lượng người, Phòng ban.

### Tag phân loại

| Giá trị | Màu | Hiển thị |
|---------|-----|---------|
| Đối tác | Tím nhạt | "ĐỐI TÁC" (email) / "Đối tác" (dashboard) |
| Nội bộ | Xanh biển nhạt | "NỘI BỘ" (email) / "Nội bộ" (dashboard) |

---

## VII. NỘI DUNG TRANG TÀI XẾ (Driver Response)

Trang web tài xế nhận được khi bấm link trong email.

### Trạng thái Loading

```
Icon:    Hourglass (animated)
Tiêu đề: "Đang xử lý..."
Mô tả:   "Vui lòng chờ trong giây lát."
```

### Form từ chối

```
Tiêu đề:    "Vui lòng cho biết lý do"
Mô tả:      "Ban Điều Phối sẽ sắp xếp tài xế khác."
Label:       "Lý do từ chối:"
Placeholder: "Ví dụ: Nghỉ phép, trùng lịch, xe đang bảo trì..."
Nút:         "Gửi lý do từ chối"
Nút loading: "Đang gửi..."
```

### Kết quả phản hồi

| Tình huống | Kiểu | Tiêu đề | Mô tả |
|-----------|------|--------|-------|
| Xác nhận thành công | success | "Đã xác nhận nhận ca" | "Thông tin chuyến xe sẽ được gửi đến người yêu cầu và nhân viên phụ trách." |
| Đã xác nhận trước đó | success | "Đã xác nhận trước đó" | "Anh đã xác nhận nhận ca rồi. Không cần thao tác thêm." |
| Từ chối thành công | warning | "Đã gửi lý do từ chối" | "Phòng Tổng Hợp sẽ sắp xếp tài xế khác cho chuyến xe này." |
| Đã từ chối trước đó | warning | "Đã từ chối trước đó" | "Anh đã gửi lý do từ chối rồi. Phòng Tổng Hợp sẽ sắp xếp tài xế khác." |
| Link không hợp lệ | error | "Đường dẫn không hợp lệ" | "Vui lòng sử dụng đường dẫn từ email gốc." |
| Lỗi action | error | "Không hợp lệ" | "Vui lòng sử dụng đường dẫn từ email gốc." |
| Lỗi hệ thống | error | "Lỗi hệ thống" | "Vui lòng thử lại." / Hoặc message cụ thể |

### Dòng kết thúc (mọi kết quả)

```
"Anh có thể đóng trang này."
```

---

## VIII. NỘI DUNG HƯỚNG DẪN SỬ DỤNG (Guide sidebar)

### Tiêu đề

```
Hướng dẫn sử dụng Hệ thống Quản lý Xe
Phòng Tổng Hợp — Esuhai Group
```

### Quy trình tổng quan (flow bar)

```
Nhân viên đặt xe → Chị Hà duyệt → Tài xế xác nhận → Phục vụ chuyến xe
```

### 6 phần hướng dẫn

1. **Nhân viên đặt xe qua Form** — Mô tả 7 bước điền form
2. **Chị duyệt và phân bổ tài xế** — Mô tả 3 bước trên Sheets
3. **Tài xế xác nhận nhận ca** — Mô tả flow email A/B
4. **Theo dõi trạng thái** — Giải thích 4 trạng thái màu
5. **Các tab trong bảng tính** — Liệt kê 7 tab
6. **Lưu ý quan trọng** — 5 điểm cần nhớ

### Tips (khối vàng nhạt)

| Vị trí | Tiêu đề | Nội dung |
|--------|--------|---------|
| Sau phần 1 | "Sau khi gửi" | "Chị sẽ nhận email thông báo có yêu cầu mới. Đồng thời dữ liệu xuất hiện ngay trong bảng 'Dữ liệu Booking'." |
| Sau phần 2 | "Tự động xảy ra" | "Ngay khi chị điền xong cả 2 cột Tài xế và Xe, hệ thống sẽ: Tự chuyển trạng thái thành 'Đã duyệt' — Gửi email cho tài xế kèm nút xác nhận/từ chối — CC cho hoangkha@ và hanhchanh@esuhai.com" |
| Sau phần 3 | "Sau khi tài xế xác nhận" | "Hệ thống tự gửi email thông báo đến: Người yêu cầu xe (kèm SĐT tài xế) — Nhân viên phụ trách chuyến đi — Chị (báo cáo quy trình hoàn tất)" |

### Chân trang guide

```
Phòng Tổng Hợp — Esuhai Group
Mỗi chuyến xe là một chuyến yêu thương
```

---

## IX. THÔNG BÁO LỖI & TRẠNG THÁI HỆ THỐNG

### Error messages (dashboard_api.js)

| Ngữ cảnh | Message |
|----------|---------|
| Lock timeout | "Hệ thống đang xử lý, vui lòng thử lại." |
| Sheet không tìm thấy | "Không tìm thấy tab dữ liệu." |
| Sai trạng thái duyệt | "Yêu cầu này không ở trạng thái chờ duyệt." |
| Sai trạng thái từ chối | "Chỉ có thể từ chối yêu cầu đang 'Chờ duyệt'." |
| Sai trạng thái phân công | "Không thể phân công — trạng thái hiện tại: '{status}'" |
| Tài xế thiếu email | "Tài xế '{name}' chưa có email. Vui lòng cập nhật tab Danh sách Tài xế." |
| Phân công thành công | "Đã phân công {name}. Email đã gửi cho tài xế." |

### Toast validation (driver response)

```
Alert: "Vui lòng nhập lý do"
```

---

## X. ĐỊNH DẠNG SỐ & NGÀY GIỜ

| Loại | Format | Ví dụ |
|------|--------|-------|
| Ngày | dd/MM/yyyy | 15/04/2026 |
| Giờ | HH:mm | 08:30 |
| Khoảng thời gian | HH:mm — HH:mm | 08:30 — 17:00 |
| Số người | N người | 5 người |
| Mã yêu cầu | #N | #42 |
| SĐT | Giữ nguyên format gốc từ Sheet | 0901-234-567 |
| Timestamp | dd/MM/yyyy HH:mm | 15/04/2026 08:30 |

### Giá trị trống

Khi dữ liệu không có, hiển thị "—" (em dash), **không** hiện "N/A", "null", "undefined", hay để trống.

Ngoại lệ: lịch trình trống → "Chưa ghi rõ"

---

## XI. THƯƠNG HIỆU & CHỮ KÝ

### Tên tổ chức

| Ngữ cảnh | Cách viết |
|----------|----------|
| Chân trang email | "PHÒNG TỔNG HỢP — ESUHAI GROUP" (caps, em dash) |
| Phụ đề header | "Phòng Tổng Hợp — Esuhai Group" (title case, em dash) |
| Trong nội dung | "Phòng Tổng Hợp" (title case) |
| Email sender | "Phòng Tổng hợp - Esuhai" (config — hyphen) |

### Sender identity

```
Tên hiển thị: Phòng Tổng hợp - Esuhai
Email:         booking.xe@esuhai.com
```

### CC mặc định

```
hoangkha@esuhai.com, hanhchanh@esuhai.com
```

---

## XII. MÀU SẮC & Ý NGHĨA

Màu sắc mang ý nghĩa ngữ cảnh xuyên suốt, không dùng tuỳ tiện.

| Màu | Hex | Ý nghĩa | Dùng cho |
|-----|-----|---------|---------|
| Xanh dương (Blue) | #2563eb | Hành động, đang xử lý | CTA chính, bước đang active, "Chờ TX xác nhận" |
| Xanh lá (Green) | #16a34a | Thành công, hoàn tất | "Đã duyệt", "TX đã nhận", "Hoàn tất", nút gọi TX |
| Đỏ (Red) | #dc2626 | Cảnh báo, từ chối, cần hành động | "TX từ chối", "Không duyệt", nút từ chối |
| Vàng (Amber) | #d97706 | Chờ xử lý, lưu ý | "Chờ duyệt", lịch trình, tips, phân công lại |
| Header tối | #0f172a | Thương hiệu, chuyên nghiệp | Header email, header dashboard |

---

## XIII. PHỤ LỤC — Văn bản gốc từ Điều Lệ Tài Xế

Các trích dẫn dưới đây là nguồn cảm hứng cho giọng văn hệ thống. Không sử dụng trực tiếp trong UI, nhưng tinh thần phải nhất quán.

> "Nghề tài xế không chỉ là cầm lái — mà là cầm cả trách nhiệm và danh dự"

> "Không chở người bằng miễn cưỡng — mà đưa người bằng thương yêu"

> "Phục vụ không phải hạ mình — mà là nâng cao giá trị con người"

> "Được giao nhiều việc là được tin tưởng — Hãy làm bằng tâm, không tính toán hơn thua"

Tinh thần cốt lõi: **Tôn trọng — Phục vụ — Chuyên nghiệp — Yêu thương**

---

*Phòng Tổng Hợp — Esuhai Group*
*Cập nhật: 2026-04-09*
