package com.movie_be.movie.service;

import java.util.List;

import com.movie_be.movie.dto.MemberSearchResponse;

public interface MemberService {

    List<MemberSearchResponse> search(String keyword);

    MemberSearchResponse getByAccountId(String accountId);
}