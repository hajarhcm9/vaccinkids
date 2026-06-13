package com.example.vaccinkid.viewmodel

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.vaccinkid.model.QueueEntryDto
import com.example.vaccinkid.model.QueueStatsDto
import com.example.vaccinkid.network.ApiClient
import com.example.vaccinkid.network.ApiService
import com.example.vaccinkid.network.TokenManager
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class QueueManagementViewModel(
    private val apiService: ApiService = ApiClient.apiService
) : ViewModel() {
    private val _queue = MutableLiveData<Result<List<QueueEntryDto>>>()
    val queue: LiveData<Result<List<QueueEntryDto>>> = _queue

    private val _queueStats = MutableLiveData<Result<QueueStatsDto>>()
    val queueStats: LiveData<Result<QueueStatsDto>> = _queueStats

    private val _calledNext = MutableLiveData<Result<QueueEntryDto>>()
    val calledNext: LiveData<Result<QueueEntryDto>> = _calledNext

    private val _isLoading = MutableLiveData(false)
    val isLoading: LiveData<Boolean> = _isLoading

    fun loadCentreQueue(centreId: Int? = TokenManager.getCentreId()) {
        viewModelScope.launch {
            try {
                val id = centreId ?: throw IllegalArgumentException("Aucun centre affecte")
                val queueResponse = apiService.getCentreQueue(id)
                val queueList = queueResponse.data?.entries
                _queue.value = if (queueResponse.status == "success" && queueList != null) {
                    Result.success(queueList)
                } else {
                    Result.failure(Exception(queueResponse.message ?: "File indisponible"))
                }

                val statsResponse = apiService.getQueueStats(id)
                val stats = statsResponse.data
                _queueStats.value = if (statsResponse.status == "success" && stats != null) {
                    Result.success(stats)
                } else {
                    Result.failure(Exception(statsResponse.message ?: "Stats indisponibles"))
                }
            } catch (e: Exception) {
                _queue.value = Result.failure(e)
            }
        }
    }

    fun callNext(centreId: Int? = TokenManager.getCentreId()) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val id = centreId ?: throw IllegalArgumentException("Aucun centre affecte")
                val response = apiService.callNext(mapOf("centre_id" to id))
                val entry = response.data
                _calledNext.value = if (response.status == "success" && entry != null) {
                    Result.success(entry)
                } else {
                    Result.failure(Exception(response.message ?: "Personne en attente"))
                }
                loadCentreQueue(id)
            } catch (e: Exception) {
                _calledNext.value = Result.failure(e)
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun completeService(entryId: Int, centreId: Int? = TokenManager.getCentreId()) {
        viewModelScope.launch {
            try {
                apiService.completeService(entryId)
                loadCentreQueue(centreId)
            } catch (_: Exception) {
            }
        }
    }

    fun startAutoRefresh(centreId: Int? = TokenManager.getCentreId()) {
        viewModelScope.launch {
            while (true) {
                loadCentreQueue(centreId)
                delay(15_000)
            }
        }
    }
}
