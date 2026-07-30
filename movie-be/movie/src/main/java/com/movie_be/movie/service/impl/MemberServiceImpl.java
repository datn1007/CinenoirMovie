package com.movie_be.movie.service.impl;

import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.stereotype.Service;

import com.movie_be.movie.dto.MemberSearchResponse;
import com.movie_be.movie.entity.account.Account;
import com.movie_be.movie.entity.member.Member;
import com.movie_be.movie.repository.AccountRepository;
import com.movie_be.movie.repository.MemberRepository;
import com.movie_be.movie.service.MemberService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MemberServiceImpl implements MemberService {

    private final MemberRepository memberRepository;
    private final AccountRepository accountRepository;

    /**
     * Lists every Customer_Member account (not just the ones that already have
     * a `member` loyalty-score row) so staff can pick any customer at the
     * counter. Accounts without a Member row simply show 0 points.
     */
    @Override
    public List<MemberSearchResponse> search(String keyword) {
        Stream<Account> accounts = accountRepository.findByRole_RoleName("Customer_Member").stream();

        if (keyword != null && !keyword.isBlank()) {
            String kw = keyword.trim().toLowerCase();
            accounts = accounts.filter(a ->
                    (a.getFullName() != null && a.getFullName().toLowerCase().contains(kw))
                            || (a.getPhone() != null && a.getPhone().contains(kw))
                            || (a.getEmail() != null && a.getEmail().toLowerCase().contains(kw))
                            || (a.getIdentityCard() != null && a.getIdentityCard().contains(kw))
                            || (a.getAccountId() != null && a.getAccountId().toLowerCase().contains(kw)));
        }

        return accounts.map(this::toSearchResponse).collect(Collectors.toList());
    }

    @Override
    public MemberSearchResponse getByAccountId(String accountId) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new RuntimeException("Account not found: " + accountId));
        return toSearchResponse(account);
    }

    private MemberSearchResponse toSearchResponse(Account account) {
        MemberSearchResponse resp = new MemberSearchResponse();
        resp.setAccountId(account.getAccountId());
        resp.setFullName(account.getFullName());
        resp.setPhoneNumber(account.getPhone());
        resp.setIdentityCard(account.getIdentityCard());

        Member member = memberRepository.findByAccount_AccountId(account.getAccountId()).orElse(null);
        resp.setMemberId(member != null ? member.getMemberId() : null);
        resp.setScore(member != null && member.getScore() != null ? member.getScore() : 0);
        return resp;
    }
}