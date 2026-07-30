package com.movie_be.movie.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MemberSearchResponse {
    private String memberId;
    private String accountId;
    private String fullName;
    private String phoneNumber;
    private String identityCard;
    private Integer score;
}