package com.example.vaccinkid.viewmodel

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.vaccinkid.model.CreateVaccinationRequest
import com.example.vaccinkid.model.FlaconDto
import com.example.vaccinkid.model.VaccinationDto
import com.example.vaccinkid.network.ApiClient
import kotlinx.coroutines.launch

class VaccinationViewModel : ViewModel() {
    private val _flacons = MutableLiveData<Result<List<FlaconDto>>>()
    val flacons: LiveData<Result<List<FlaconDto>>> = _flacons

    private val _vaccinationResult = MutableLiveData<Result<VaccinationDto>>()
    val vaccinationResult: LiveData<Result<VaccinationDto>> = _vaccinationResult

    private val _isLoading = MutableLiveData(false)
    val isLoading: LiveData<Boolean> = _isLoading

    fun loadSessionFlacons(sessionId: Int) {
        viewModelScope.launch {
            try {
                val response = ApiClient.apiService.getSessionFlacons(sessionId)
                val data = response.data
                _flacons.value = if (response.status == "success" && data != null) {
                    Result.success(data)
                } else {
                    Result.failure(Exception(response.message ?: "Flacons indisponibles"))
                }
            } catch (e: Exception) {
                _flacons.value = Result.failure(e)
            }
        }
    }

    fun recordVaccination(
        rdvId: Int,
        flaconId: Int?,
        poids: Double?,
        taille: Double?,
        reactions: String?
    ) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val response = ApiClient.apiService.createVaccination(
                    rdvId,
                    CreateVaccinationRequest(flaconId, poids, taille, reactions)
                )
                val data = response.data
                _vaccinationResult.value = if (response.status == "success" && data != null) {
                    Result.success(data)
                } else {
                    Result.failure(Exception(response.message ?: "Enregistrement impossible"))
                }
            } catch (e: Exception) {
                _vaccinationResult.value = Result.failure(e)
            } finally {
                _isLoading.value = false
            }
        }
    }
}
