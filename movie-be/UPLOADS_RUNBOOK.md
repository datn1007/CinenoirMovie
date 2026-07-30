# Fix ảnh 404 khi load `/uploads/**`

## Vấn đề thường gặp
Khi backend serve ảnh bằng endpoint `GET /uploads/**` nhưng trả `404 Not Found`, nguyên nhân hay là do backend đang resolve thư mục `uploads` theo **working directory** khác nhau giữa máy dev.

## Cấu hình hiện tại
Trong `movie-be/movie/src/main/resources/application.properties`:
- `app.upload.base-dir=uploads`

`FileServeController` và `FileUploadServiceImpl` đều dùng `app.upload.base-dir` để đọc/ghi file vật lý.

## Cách chạy để đảm bảo đúng thư mục uploads
1. Chạy backend tại thư mục:
   - `movie-be/movie/`
2. (Ví dụ) `mvn spring-boot:run`

Khi chạy đúng thư mục `movie-be/movie/` thì `uploads/` sẽ trỏ đúng tới:
- `movie-be/movie/uploads/`

## Test nhanh
Mở URL:
- `http://localhost:<PORT>/uploads/doraemon.jpg`

Nếu còn 404:
- kiểm tra backend có đang chạy từ thư mục `movie-be/movie/` hay không
- kiểm tra file tồn tại: `movie-be/movie/uploads/doraemon.jpg`

