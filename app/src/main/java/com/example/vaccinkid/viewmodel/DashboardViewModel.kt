package com.example.vaccinkid.viewmodel

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.vaccinkid.model.DashboardStatsDto
import com.example.vaccinkid.model.UserDto
import com.example.vaccinkid.network.ApiClient
import com.example.vaccinkid.network.ApiService
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch

class DashboardViewModel(
    private val apiService: ApiService = ApiClient.apiService
) : ViewModel() {

    private val _stats = MutableLiveData<Result<DashboardStatsDto>>()
    val stats: LiveData<Result<DashboardStatsDto>> = _stats

    private val _user = MutableLiveData<UserDto?>()
    val user: LiveData<UserDto?> = _user

    private val _isLoading = MutableLiveData(false)
    val isLoading: LiveData<Boolean> = _isLoading

    fun loadAll() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                coroutineScope {
                    val statsDeferred = async {
                        runCatching { apiService.getDashboardStats() }
                    }
                    val meDeferred = async {
                        runCatching { apiService.getMe() }
                    }
                    val statsResult = statsDeferred.await()
                    val meResult = meDeferred.await()

                    statsResult.fold(
                        onSuccess = { response ->
                            _stats.value = if (response.status == "success" && response.data != null)
                                Result.success(response.data)
                            else
                                Result.failure(Exception(response.message ?: "Statistiques indisponibles"))
                        },
                        onFailure = { _stats.value = Result.failure(it) }
                    )
                    meResult.fold(
                        onSuccess = { response -> _user.value = response.data?.user },
                        onFailure = {}
                    )
                }
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun loadStats() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val response = apiService.getDashboardStats()
                _stats.value = if (response.status == "success" && response.data != null)
                    Result.success(response.data)
                else
                    Result.failure(Exception(response.message ?: "Statistiques indisponibles"))
            } catch (e: Exception) {
                _stats.value = Result.failure(e)
            } finally {
                _isLoading.value = false
            }
        }
    }
}
