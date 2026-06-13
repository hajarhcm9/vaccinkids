package com.example.vaccinkid.viewmodel

import com.example.vaccinkid.model.ApiResponse
import com.example.vaccinkid.model.QueueEntryDto
import com.example.vaccinkid.model.QueueListDto
import com.example.vaccinkid.model.QueueStatsDto
import com.example.vaccinkid.network.ApiService
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever

class QueueManagementViewModelTest {
    @get:Rule
    val rule = MainDispatcherRule()

    private val apiService: ApiService = mock()

    @Test
    fun loadCentreQueuePublishesQueueAndStats() = runTest {
        val entry = QueueEntryDto(id = 7, numeroAttente = 12)
        val stats = QueueStatsDto(total = 1, enAttente = 1)
        whenever(apiService.getCentreQueue(2))
            .thenReturn(ApiResponse("success", data = QueueListDto(listOf(entry))))
        whenever(apiService.getQueueStats(2)).thenReturn(ApiResponse("success", data = stats))

        val viewModel = QueueManagementViewModel(apiService)
        viewModel.loadCentreQueue(2)

        assertEquals(listOf(entry), viewModel.queue.value?.getOrNull())
        assertEquals(stats, viewModel.queueStats.value?.getOrNull())
    }

    @Test
    fun loadCentreQueueRejectsMissingCentreWithoutCallingServer() = runTest {
        val viewModel = QueueManagementViewModel(apiService)
        viewModel.loadCentreQueue(null)

        assertTrue(viewModel.queue.value?.isFailure == true)
        assertEquals("Aucun centre affecte", viewModel.queue.value?.exceptionOrNull()?.message)
    }

    @Test
    fun callNextPublishesServerRefusalAndStopsLoading() = runTest {
        whenever(apiService.callNext(mapOf("centre_id" to 2)))
            .thenReturn(ApiResponse(status = "error", message = "File vide"))
        whenever(apiService.getCentreQueue(2))
            .thenReturn(ApiResponse("success", data = QueueListDto()))
        whenever(apiService.getQueueStats(2))
            .thenReturn(ApiResponse("success", data = QueueStatsDto()))

        val viewModel = QueueManagementViewModel(apiService)
        viewModel.callNext(2)

        assertTrue(viewModel.calledNext.value?.isFailure == true)
        assertEquals("File vide", viewModel.calledNext.value?.exceptionOrNull()?.message)
        assertFalse(viewModel.isLoading.value ?: true)
    }
}

