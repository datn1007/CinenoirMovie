package com.movie_be.movie.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.movie_be.movie.entity.account.Account;
@Repository
public interface AccountRepository
        extends JpaRepository<Account, String> {

    Optional<Account> findByUsername(String username);

    Optional<Account> findByEmail(String email);

    List<Account> findByPhoneContaining(String phone);

    List<Account> findByIdentityCardContaining(String identityCard);

    List<Account> findByRole_RoleName(String roleName);
}
