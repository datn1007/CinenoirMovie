package com.movie_be.movie.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.movie_be.movie.dto.AccountDTO;
import com.movie_be.movie.dto.CreateAccountRequest;
import com.movie_be.movie.dto.UpdateAccountRequest;
import com.movie_be.movie.entity.account.Account;
import com.movie_be.movie.entity.role.Role;
import com.movie_be.movie.repository.AccountRepository;
import com.movie_be.movie.repository.RoleRepository;
import com.movie_be.movie.service.AccountService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AccountServiceImpl implements AccountService {

    private final AccountRepository accountRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public List<AccountDTO> getAllAccounts() {
        return accountRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    public AccountDTO getAccountById(String id) {
        Account account = accountRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản với ID: " + id));
        return toDTO(account);
    }

    @Override
    public AccountDTO getAccountByUsername(String username) {
        Account account = accountRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản: " + username));
        return toDTO(account);
    }

    @Override
    public AccountDTO createAccount(CreateAccountRequest request) {
        if (accountRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new RuntimeException("Username đã tồn tại");
        }

        long count = accountRepository.count() + 1;
        String accountId = String.format("CN-%04d", count);

        Long roleId = request.getRoleId() != null ? request.getRoleId() : 3L;
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy role với ID: " + roleId));

        Account account = new Account();
        account.setAccountId(accountId);
        account.setUsername(request.getUsername());
        account.setPassword(passwordEncoder.encode(request.getPassword()));
        account.setFullName(request.getFullName());
        account.setEmail(request.getEmail());
        account.setPhone(request.getPhone());
        account.setGender(request.getGender());
        account.setDateOfBirth(request.getDateOfBirth());
        account.setAddress(request.getAddress());
        account.setStatus(request.getStatus() != null ? request.getStatus() : 1);
        account.setRole(role);

        return toDTO(accountRepository.save(account));
    }

    @Override
    public AccountDTO updateAccount(String id, UpdateAccountRequest request) {
        Account account = accountRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản với ID: " + id));

        if (request.getFullName() != null) account.setFullName(request.getFullName());
        if (request.getEmail() != null) account.setEmail(request.getEmail());
        if (request.getPhone() != null) account.setPhone(request.getPhone());
        if (request.getGender() != null) account.setGender(request.getGender());
        if (request.getDateOfBirth() != null) account.setDateOfBirth(request.getDateOfBirth());
        if (request.getAddress() != null) account.setAddress(request.getAddress());
        if (request.getStatus() != null) account.setStatus(request.getStatus());
        if (request.getRoleId() != null) {
            Role role = roleRepository.findById(request.getRoleId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy role với ID: " + request.getRoleId()));
            account.setRole(role);
        }

        return toDTO(accountRepository.save(account));
    }

    @Override
    public void deleteAccount(String id) {
        Account account = accountRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản với ID: " + id));
        account.setStatus(0);
        accountRepository.save(account);
    }

    private AccountDTO toDTO(Account account) {
        AccountDTO dto = new AccountDTO();
        dto.setAccountId(account.getAccountId());
        dto.setUsername(account.getUsername());
        dto.setFullName(account.getFullName());
        dto.setEmail(account.getEmail());
        dto.setPhone(account.getPhone());
        dto.setGender(account.getGender());
        dto.setDateOfBirth(account.getDateOfBirth());
        dto.setIdentityCard(account.getIdentityCard());
        dto.setAddress(account.getAddress());
        dto.setStatus(account.getStatus());
        if (account.getRole() != null) {
            dto.setRoleId(account.getRole().getId());
            dto.setRoleName(account.getRole().getRoleName());
        }
        return dto;
    }
}
