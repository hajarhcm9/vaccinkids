package com.example.vaccinkid.viewmodel

import com.example.vaccinkid.model.ApiResponse
import com.example.vaccinkid.model.StockDto
import com.example.vaccinkid.model.UpdateStockRequest
import com.example.vaccinkid.network.ApiService
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever

class StockViewModelTest {
    @get:Rule
    val rule = MainDispatcherRule()

    private val apiService: ApiService = mock()

    @Test
    fun loadStockPublishesCentreStock() = runTest {
        val stocks = listOf(StockDto(id = 5, centreId = 2, quantiteDisponible = 11))
        whenever(apiService.getStock(2)).thenReturn(ApiResponse("success", data = stocks))

        val viewModel = StockViewModel(apiService)
        viewModel.loadStock(2)

        assertEquals(stocks, viewModel.stock.value?.getOrNull())
        assertFalse(viewModel.isLoading.value ?: true)
    }

    @Test
    fun loadStockRejectsMissingCentre() = runTest {
        val viewModel = StockViewModel(apiService)
        viewModel.loadStock(null)

        assertTrue(viewModel.stock.value?.isFailure == true)
        assertEquals("Aucun centre affecte", viewModel.stock.value?.exceptionOrNull()?.message)
    }

    @Test
    fun updateStockPublishesServerRefusal() = runTest {
        val request = UpdateStockRequest(4, 2)
        whenever(apiService.updateStock(5, request))
            .thenReturn(ApiResponse(status = "error", message = "Correction refusee"))
        whenever(apiService.getStock(2)).thenReturn(ApiResponse("success", data = emptyList()))

        val viewModel = StockViewModel(apiService)
        viewModel.updateStock(5, 4, 2)

        assertTrue(viewModel.updateResult.value?.isFailure == true)
        assertEquals("Correction refusee", viewModel.updateResult.value?.exceptionOrNull()?.message)
    }
}

