# Swagger TODO

- [x] Thêm dependency Springdoc OpenAPI vào `movie-be/movie/pom.xml` để có Swagger UI.
- [x] Cập nhật `SecurityConfig` để `permitAll` cho `/swagger-ui/**` và `/v3/api-docs/**` (để mở docs không bị chặn bởi Spring Security).
- [ ] Cập nhật OpenAPI config để Swagger UI hiện nút Authorize (JWT Bearer) và tự gắn header khi test.
- [ ] Chạy app và test Swagger UI: `http://localhost:<port>/swagger-ui/index.html`.
- [ ] Test auth flow qua Swagger (Authorize Bearer token) với các endpoint bảo vệ.

