package com.movie_be.movie.service;

import org.springframework.web.multipart.MultipartFile;

public interface FileUploadService {
    String uploadMovieImage(MultipartFile file);
    String uploadMovieVideo(MultipartFile file);
}
