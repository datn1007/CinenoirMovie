package com.movie_be.movie.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.movie_be.movie.dto.MemberSearchResponse;
import com.movie_be.movie.service.MemberService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/members")
@RequiredArgsConstructor
public class MemberController {

    private final MemberService memberService;

    @GetMapping("/search")
    public ResponseEntity<List<MemberSearchResponse>> searchMembers(
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(memberService.search(keyword));
    }
}