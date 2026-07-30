package com.movie_be.movie.controller;

import com.movie_be.movie.dto.UploadResponse;
import com.movie_be.movie.service.FileUploadService;
import com.movie_be.movie.service.MovieService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/upload")
@RequiredArgsConstructor
@Tag(name = "File Upload", description = "API upload file hình ảnh")
public class FileUploadController {

    private final FileUploadService fileUploadService;
    private final MovieService movieService;

    @Operation(summary = "Upload ảnh phim (chỉ upload, không gán vào phim)")
    @PostMapping("/movie")
    public ResponseEntity<UploadResponse> uploadMovieImage(
            @Parameter(description = "File hình ảnh", required = true, schema = @Schema(type = "string", format = "binary"))
            @RequestParam("file") MultipartFile file) {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(new UploadResponse(null, null, "File rỗng, vui lòng chọn file hợp lệ"));
        }

        String filePath = fileUploadService.uploadMovieImage(file);
        String fileName = filePath.substring(filePath.lastIndexOf("/") + 1);

        return ResponseEntity.ok(new UploadResponse(fileName, filePath, "Upload thành công"));
    }

    @Operation(summary = "Upload và gán ảnh large_image cho phim")
    @PostMapping("/movie/{movieId}/large-image")
    public ResponseEntity<UploadResponse> uploadAndSetLargeImage(
            @PathVariable @NonNull String movieId,
            @Parameter(description = "File hình ảnh", required = true, schema = @Schema(type = "string", format = "binary"))
            @RequestParam("file") MultipartFile file) {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(new UploadResponse(null, null, "File rỗng, vui lòng chọn file hợp lệ"));
        }

        String filePath = fileUploadService.uploadMovieImage(file);
        movieService.updateLargeImage(movieId, filePath);
        String fileName = filePath.substring(filePath.lastIndexOf("/") + 1);

        return ResponseEntity.ok(new UploadResponse(fileName, filePath, "Upload và cập nhật large_image thành công"));
    }

    @Operation(summary = "Upload file phim (.mp4) để chiếu online, không gán vào phim")
    @PostMapping("/movie/video")
    public ResponseEntity<UploadResponse> uploadMovieVideo(
            @Parameter(description = "File phim (.mp4)", required = true, schema = @Schema(type = "string", format = "binary"))
            @RequestParam("file") MultipartFile file) {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(new UploadResponse(null, null, "File rỗng, vui lòng chọn file hợp lệ"));
        }

        String filePath;
        try {
            filePath = fileUploadService.uploadMovieVideo(file);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(new UploadResponse(null, null, e.getMessage()));
        }
        String fileName = filePath.substring(filePath.lastIndexOf("/") + 1);

        return ResponseEntity.ok(new UploadResponse(fileName, filePath, "Upload thành công"));
    }

    @Operation(summary = "Upload và gán ảnh small_image cho phim")
    @PostMapping("/movie/{movieId}/small-image")
    public ResponseEntity<UploadResponse> uploadAndSetSmallImage(
            @PathVariable @NonNull String movieId,
            @Parameter(description = "File hình ảnh", required = true, schema = @Schema(type = "string", format = "binary"))
            @RequestParam("file") MultipartFile file) {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(new UploadResponse(null, null, "File rỗng, vui lòng chọn file hợp lệ"));
        }

        String filePath = fileUploadService.uploadMovieImage(file);
        movieService.updateSmallImage(movieId, filePath);
        String fileName = filePath.substring(filePath.lastIndexOf("/") + 1);

        return ResponseEntity.ok(new UploadResponse(fileName, filePath, "Upload và cập nhật small_image thành công"));
    }
}