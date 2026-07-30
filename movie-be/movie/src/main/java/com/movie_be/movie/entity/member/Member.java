package com.movie_be.movie.entity.member;

import com.movie_be.movie.entity.account.Account;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "member")
@Getter
@Setter
@NoArgsConstructor
public class Member {

    @Id
    @Column(name = "member_id", length = 10)
    private String memberId;

    @Column(name = "score")
    private Integer score;

    @OneToOne
    @JoinColumn(name = "account_id")
    private Account account;
}