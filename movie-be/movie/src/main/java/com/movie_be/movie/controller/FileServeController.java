package com.movie_be.movie.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
public class FileServeController {

    @Value("${app.upload.base-dir:uploads}")
    private String baseUploadDir;

    /**
     * Serve bất kỳ file nào trong thư mục uploads/.
     * Ví dụ: GET /uploads/endgame.jpg  hoặc  GET /uploads/movie/abc123.jpg
     */
    @GetMapping("/uploads/{*subPath}")
    public ResponseEntity<Resource> serveFile(@PathVariable String subPath) throws IOException {
        // subPath có dạng "/endgame.jpg" hoặc "/movie/abc.jpg" — bỏ dấu "/" đầu
        String cleanPath = subPath.startsWith("/") ? subPath.substring(1) : subPath;

        Path filePath = Paths.get(baseUploadDir).resolve(cleanPath).normalize();
        Path basePath  = Paths.get(baseUploadDir).toAbsolutePath().normalize();

        // Bảo vệ path traversal: đảm bảo file nằm trong thư mục uploads/
        if (!filePath.toAbsolutePath().startsWith(basePath)) {
            return ResponseEntity.badRequest().build();
        }

        Resource resource = new FileSystemResource(filePath);
        if (!resource.exists() || !resource.isReadable()) {
            return ResponseEntity.notFound().build();
        }

        String contentType = Files.probeContentType(filePath);
        if (contentType == null) contentType = "application/octet-stream";

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .body(resource);
    }
}
