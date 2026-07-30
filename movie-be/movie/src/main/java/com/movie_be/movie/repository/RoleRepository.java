package com.movie_be.movie.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.movie_be.movie.entity.role.Role;

@Repository
public interface RoleRepository extends JpaRepository<Role, Long> {
}
