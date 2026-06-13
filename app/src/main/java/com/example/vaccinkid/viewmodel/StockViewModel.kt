package com.example.vaccinkid.viewmodel

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.vaccinkid.model.StockDto
import com.example.vaccinkid.model.UpdateStockRequest
import com.example.vaccinkid.network.ApiClient
import com.example.vaccinkid.network.ApiService
import com.example.vaccinkid.network.TokenManager
import kotlinx.coroutines.launch

class StockViewModel(
    private val apiService: ApiService = ApiClient.apiService
) : ViewModel() {
    private val _stock = MutableLiveData<Result<List<StockDto>>>()
    val stock: LiveData<Result<List<StockDto>>> = _stock

    private val _updateResult = MutableLiveData<Result<StockDto>>()
    val updateResult: LiveData<Result<StockDto>> = _updateResult

    private val _isLoading = MutableLiveData(false)
    val isLoading: LiveData<Boolean> = _isLoading

    fun loadStock(centreId: Int? = TokenManager.getCentreId()) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val id = centreId ?: throw IllegalArgumentException("Aucun centre affecte")
                val response = apiService.getStock(id)
                val data = response.data
                _stock.value = if (response.status == "success" && data != null) {
                    Result.success(data)
                } else {
                    Result.failure(Exception(response.message ?: "Stock indisponible"))
                }
            } catch (e: Exception) {
                _stock.value = Result.failure(e)
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun updateStock(stockId: Int, quantite: Int?, seuilAlerte: Int?) {
        viewModelScope.launch {
            try {
                val response = apiService.updateStock(
                    stockId,
                    UpdateStockRequest(quantite, seuilAlerte)
                )
                val data = response.data
                _updateResult.value = if (response.status == "success" && data != null) {
                    Result.success(data)
                } else {
                    Result.failure(Exception(response.message ?: "Mise a jour impossible"))
                }
                if (response.status == "success" && data != null) loadStock(data.centreId)
            } catch (e: Exception) {
                _updateResult.value = Result.failure(e)
            }
        }
    }
}
