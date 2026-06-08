package com.example.vaccinkid.viewmodel

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.vaccinkid.model.DashboardStatsDto
import com.example.vaccinkid.network.ApiClient
import com.example.vaccinkid.network.ApiService
import kotlinx.coroutines.launch

class DashboardViewModel(
    private val apiService: ApiService = ApiClient.apiService
) : ViewModel() {
    private val _stats = MutableLiveData<Result<DashboardStatsDto>>()
    val stats: LiveData<Result<DashboardStatsDto>> = _stats

    private val _isLoading = MutableLiveData(false)
    val isLoading: LiveData<Boolean> = _isLoading

    fun loadStats() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val response = apiService.getDashboardStats()
                val data = response.data
                _stats.value = if (response.status == "success" && data != null) {
                    Result.success(data)
                } else {
                    Result.failure(Exception(response.message ?: "Statistiques indisponibles"))
                }
            } catch (e: Exception) {
                _stats.value = Result.failure(e)
            } finally {
                _isLoading.value = false
            }
        }
    }
}
