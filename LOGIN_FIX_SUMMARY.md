# 🔧 FE Login Issue - Root Cause & Fixes

## 🔴 Vấn Đề Gốc Rễ
Frontend không thể login được vì:

### 1️⃣ **CORS không được cấu hình trên Backend**
- Frontend (port 3000) không thể gọi API từ Backend (port 8080)
- Dù Postman có thể gọi được, browser có CORS restriction

### 2️⃣ **Frontend không gọi API Backend**
- `AuthScreen.tsx` chỉ kiểm tra localStorage (mock data)
- Không gọi endpoint `/api/auth/login` từ backend

---

## ✅ Giải Pháp Được Thực Hiện

### 1. Backend - Thêm CORS Configuration
📄 File: `movie-be/movie/src/main/java/com/movie_be/movie/config/SecurityConfig.java`

**Thay đổi:**
- Thêm `CorsConfigurationSource` bean
- Cho phép requests từ `http://localhost:3000` và `http://localhost:5173`
- Cho phép tất cả HTTP methods (GET, POST, PUT, DELETE, OPTIONS)
- Cho phép credentials (để sử dụng JWT tokens)

```java
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();
    configuration.setAllowedOrigins(Arrays.asList(
        "http://localhost:3000", 
        "http://localhost:5173"
    ));
    configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
    configuration.setAllowedHeaders(Arrays.asList("*"));
    configuration.setAllowCredentials(true);
    configuration.setMaxAge(3600L);
    // ...
}
```

**Build Status:** ✅ BUILD SUCCESS

---

### 2. Frontend - Gọi Backend API
📄 File: `fe_cinenoir/src/components/AuthScreen.tsx`

**Thay đổi Login:**
- Gọi `POST /api/auth/login` thay vì kiểm tra localStorage
- Gửi: `{ username, password }`
- Nhận: JWT token từ backend
- Lưu token vào `localStorage.cinenoir_jwt_token`

```typescript
const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
        const response = await fetch("http://localhost:8080/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: loginUsername,
                password: loginPassword,
            }),
        });

        if (!response.ok) {
            setErrorState(1);
            return;
        }

        const data = await response.json();
        localStorage.setItem("cinenoir_jwt_token", data.token);
        
        // Login successful
        onLoginSuccess(user);
    } catch (error) {
        setErrorState(1);
    } finally {
        setIsLoading(false);
    }
};
```

**Thay đổi Register:**
- Tương tự gọi `POST /api/auth/register`
- Gửi: `{ username, password, email, fullName }`

**UI Improvements:**
- Thêm `isLoading` state để disable button khi đang gửi
- Nút submit hiển thị "Authenticating..." khi loading
- Tương tự cho registration form

---

## 🚀 Cách Test

### 1️⃣ **Đảm bảo Backend đang chạy**
```bash
cd movie-be/movie
java -jar target/movie-0.0.1-SNAPSHOT.jar
```
✅ Backend đã chạy trên port 8080

### 2️⃣ **Chạy Frontend**
```bash
cd fe_cinenoir
npm run dev
```
Frontend sẽ chạy trên port 3000

### 3️⃣ **Test Login**
1. Mở browser: `http://localhost:3000`
2. Sử dụng username/password đã register trong PostgreSQL
3. Nếu login thành công:
   - ✅ Sẽ chuyển sang AdminPanel
   - ✅ JWT token được lưu trong localStorage
   - ✅ Không có CORS error trong console

### 4️⃣ **Kiểm tra Developer Console (F12)**
- **Network tab:** Kiểm tra request tới `http://localhost:8080/api/auth/login`
- **Console tab:** Không có error liên quan đến CORS
- **Storage tab:** Xem JWT token trong `localStorage.cinenoir_jwt_token`

---

## 📋 Checklist

- [x] Backend CORS configured
- [x] Frontend API call implemented  
- [x] JWT token storage
- [x] Loading states added
- [x] Backend rebuilt
- [ ] Frontend started (npm run dev)
- [ ] Login tested with valid credentials
- [ ] JWT token verified in localStorage

---

## 🔗 API Endpoints

### Login
```
POST http://localhost:8080/api/auth/login
Content-Type: application/json

{
  "username": "your_username",
  "password": "your_password"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Register
```
POST http://localhost:8080/api/auth/register
Content-Type: application/json

{
  "username": "new_user",
  "password": "password123",
  "email": "user@example.com",
  "fullName": "User Full Name"
}

Response:
"Register Success"
```

---

## 🐛 Troubleshooting

| Vấn đề | Nguyên nhân | Giải pháp |
|--------|-----------|---------|
| CORS error in console | CORS chưa được cấu hình hoặc port sai | Kiểm tra SecurityConfig, rebuild backend |
| 404 on /api/auth/login | Endpoint không tồn tại | Kiểm tra AuthController có `/api/auth` prefix không |
| Login không thành công | Username/password sai hoặc không tồn tại | Register username mới hoặc kiểm tra database |
| "Authenticating..." mãi không xong | Backend không respond | Kiểm tra backend có chạy, kiểm tra port 8080 |
| JWT token không được lưu | API response không chứa "token" field | Kiểm tra lại response format từ backend |

---

## 📝 Files Modified

1. ✅ `movie-be/movie/src/main/java/com/movie_be/movie/config/SecurityConfig.java`
   - Added CORS configuration

2. ✅ `fe_cinenoir/src/components/AuthScreen.tsx`
   - Modified login handler to call API
   - Modified register handler to call API
   - Added loading states
