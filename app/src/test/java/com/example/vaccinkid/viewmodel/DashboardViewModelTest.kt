package com.example.vaccinkid.viewmodel

import androidx.arch.core.executor.testing.InstantTaskExecutorRule
import com.example.vaccinkid.model.ApiResponse
import com.example.vaccinkid.model.DashboardStatsDto
import com.example.vaccinkid.network.ApiService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever

@OptIn(ExperimentalCoroutinesApi::class)
class DashboardViewModelTest {
    @get:Rule
    val instantTaskExecutorRule = InstantTaskExecutorRule()

    private val dispatcher = UnconfinedTestDispatcher()
    private lateinit var apiService: ApiService

    @Before
    fun setUp() {
        Dispatchers.setMain(dispatcher)
        apiService = mock()
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun loadStatsPublishesServerDataAndStopsLoading() = runTest {
        val stats = DashboardStatsDto(rdvConfirmes = 4, alertesStock = 2)
        whenever(apiService.getDashboardStats()).thenReturn(ApiResponse("success", data = stats))

        val viewModel = DashboardViewModel(apiService)
        viewModel.loadStats()

        assertEquals(stats, viewModel.stats.value?.getOrNull())
        assertFalse(viewModel.isLoading.value ?: true)
    }

    @Test
    fun loadStatsPublishesServerErrorAndStopsLoading() = runTest {
        whenever(apiService.getDashboardStats())
            .thenReturn(ApiResponse(status = "error", message = "Indisponible"))

        val viewModel = DashboardViewModel(apiService)
        viewModel.loadStats()

        assertTrue(viewModel.stats.value?.isFailure == true)
        assertEquals("Indisponible", viewModel.stats.value?.exceptionOrNull()?.message)
        assertFalse(viewModel.isLoading.value ?: true)
    }
}
