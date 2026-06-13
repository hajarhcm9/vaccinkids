package com.example.vaccinkid.viewmodel

import com.example.vaccinkid.model.ApiResponse
import com.example.vaccinkid.model.CreateVaccinationRequest
import com.example.vaccinkid.model.FlaconDto
import com.example.vaccinkid.model.VaccinationDto
import com.example.vaccinkid.network.ApiService
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever

class VaccinationViewModelTest {
    @get:Rule
    val rule = MainDispatcherRule()

    private val apiService: ApiService = mock()

    @Test
    fun loadSessionFlaconsPublishesServerList() = runTest {
        val flacons = listOf(FlaconDto(id = 3, dosesRestantes = 4))
        whenever(apiService.getSessionFlacons(9))
            .thenReturn(ApiResponse("success", data = flacons))

        val viewModel = VaccinationViewModel(apiService)
        viewModel.loadSessionFlacons(9)

        assertEquals(flacons, viewModel.flacons.value?.getOrNull())
    }

    @Test
    fun recordVaccinationPublishesConfirmedServerResult() = runTest {
        val request = CreateVaccinationRequest(3, 8.2, 70.0, "Aucune")
        val vaccination = VaccinationDto(id = 15, rendezVousId = 12, flaconId = 3)
        whenever(apiService.createVaccination(12, request))
            .thenReturn(ApiResponse("success", data = vaccination))

        val viewModel = VaccinationViewModel(apiService)
        viewModel.recordVaccination(12, 3, 8.2, 70.0, "Aucune")

        assertEquals(vaccination, viewModel.vaccinationResult.value?.getOrNull())
        assertFalse(viewModel.isLoading.value ?: true)
    }

    @Test
    fun recordVaccinationPublishesBackendError() = runTest {
        val request = CreateVaccinationRequest(3, 8.2, 70.0, null)
        whenever(apiService.createVaccination(12, request))
            .thenReturn(ApiResponse(status = "error", message = "Flacon vide"))

        val viewModel = VaccinationViewModel(apiService)
        viewModel.recordVaccination(12, 3, 8.2, 70.0, null)

        assertTrue(viewModel.vaccinationResult.value?.isFailure == true)
        assertEquals("Flacon vide", viewModel.vaccinationResult.value?.exceptionOrNull()?.message)
        assertFalse(viewModel.isLoading.value ?: true)
    }
}

