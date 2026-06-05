package com.example.vaccinkid.viewmodel

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.vaccinkid.model.LoginRequest
import com.example.vaccinkid.model.UserDto
import com.example.vaccinkid.network.ApiClient
import com.example.vaccinkid.network.TokenManager
import kotlinx.coroutines.launch

class InfirmierAuthViewModel : ViewModel() {
    private val _loginResult = MutableLiveData<Result<UserDto>>()
    val loginResult: LiveData<Result<UserDto>> = _loginResult

    private val _isLoading = MutableLiveData(false)
    val isLoading: LiveData<Boolean> = _isLoading

    fun login(cin: String, password: String) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val response = ApiClient.apiService.personnelLogin(LoginRequest(cin, password))
                val auth = response.data
                val tokens = auth?.tokens
                val user = auth?.user
                if (response.status == "success" && tokens != null && user != null) {
                    TokenManager.saveSession(tokens.accessToken, tokens.refreshToken, user)
                    _loginResult.value = Result.success(user)
                } else {
                    _loginResult.value = Result.failure(Exception(response.message ?: "Connexion impossible"))
                }
            } catch (e: Exception) {
                _loginResult.value = Result.failure(e)
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            val refreshToken = TokenManager.getRefreshToken()
            try {
                ApiClient.apiService.logout(mapOf("refreshToken" to refreshToken))
            } catch (_: Exception) {
            } finally {
                TokenManager.clearTokens()
            }
        }
    }
}
