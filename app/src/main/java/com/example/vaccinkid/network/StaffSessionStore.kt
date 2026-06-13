package com.example.vaccinkid.network

import com.example.vaccinkid.model.UserDto

interface StaffSessionStore {
    fun saveSession(accessToken: String, refreshToken: String, user: UserDto?)
    fun getRefreshToken(): String?
    fun clearTokens()
}

