package com.movie_be.movie.service;

import com.movie_be.movie.dto.AccountDTO;
import com.movie_be.movie.dto.CreateAccountRequest;
import com.movie_be.movie.dto.UpdateAccountRequest;

import java.util.List;

public interface AccountService {
    List<AccountDTO> getAllAccounts();
    AccountDTO getAccountById(String id);
    AccountDTO getAccountByUsername(String username);
    AccountDTO createAccount(CreateAccountRequest request);
    AccountDTO updateAccount(String id, UpdateAccountRequest request);
    void deleteAccount(String id);
}
