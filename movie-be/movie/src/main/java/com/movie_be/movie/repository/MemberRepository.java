package com.movie_be.movie.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.movie_be.movie.entity.member.Member;

public interface MemberRepository extends JpaRepository<Member, String> {

    Optional<Member> findByAccount_AccountId(String accountId);

    @Query("SELECT m FROM Member m JOIN FETCH m.account a WHERE m.memberId LIKE %:keyword% OR a.identityCard LIKE %:keyword%")
    List<Member> searchByMemberIdOrIdentityCard(@Param("keyword") String keyword);
}