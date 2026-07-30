package com.movie_be.movie.service;

import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

import com.movie_be.movie.entity.account.Account;
import com.movie_be.movie.repository.AccountRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService
        implements UserDetailsService {

    private final AccountRepository accountRepository;

    @Override
    public UserDetails loadUserByUsername(
            String username)
            throws UsernameNotFoundException {

        Account account = accountRepository
                .findByUsername(username)
                .orElseThrow(
                        () -> new UsernameNotFoundException(
                                "User not found"));
                              
        return org.springframework.security.core.userdetails.User
                .builder()
                .username(account.getUsername())
                .password(account.getPassword())
                .roles(account.getRole().getRoleName())
                .disabled(account.getStatus() != null && account.getStatus() == 0)
                .build();
    }
}