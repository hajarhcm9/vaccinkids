package com.example.vaccinkid.viewmodel

import com.example.vaccinkid.model.ApiResponse
import com.example.vaccinkid.model.AuthResponse
import com.example.vaccinkid.model.LoginRequest
import com.example.vaccinkid.model.TokenDto
import com.example.vaccinkid.model.UserDto
import com.example.vaccinkid.network.ApiService
import com.example.vaccinkid.network.StaffSessionStore
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.mockito.kotlin.mock
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever

class InfirmierAuthViewModelTest {
    @get:Rule
    val rule = MainDispatcherRule()

    private val apiService: ApiService = mock()
    private val sessionStore: StaffSessionStore = mock()

    @Test
    fun loginSavesServerConfirmedSession() = runTest {
        val user = UserDto(id = 4, role = "infirmier", centreId = 2)
        val tokens = TokenDto("access", "refresh")
        whenever(apiService.personnelLogin(LoginRequest("AA1234", "secret")))
            .thenReturn(ApiResponse("success", data = AuthResponse(user = user, tokens = tokens)))

        val viewModel = InfirmierAuthViewModel(apiService, sessionStore)
        viewModel.login("AA1234", "secret")

        assertEquals(user, viewModel.loginResult.value?.getOrNull())
        verify(sessionStore).saveSession("access", "refresh", user)
        assertFalse(viewModel.isLoading.value ?: true)
    }

    @Test
    fun loginDoesNotSaveIncompleteServerResponse() = runTest {
        whenever(apiService.personnelLogin(LoginRequest("AA1234", "secret")))
            .thenReturn(ApiResponse("success", data = AuthResponse()))

        val viewModel = InfirmierAuthViewModel(apiService, sessionStore)
        viewModel.login("AA1234", "secret")

        assertTrue(viewModel.loginResult.value?.isFailure == true)
        verify(sessionStore, org.mockito.kotlin.never())
            .saveSession(org.mockito.kotlin.any(), org.mockito.kotlin.any(), org.mockito.kotlin.any())
    }

    @Test
    fun logoutPurgesLocalSessionEvenWhenServerFails() = runTest {
        whenever(sessionStore.getRefreshToken()).thenReturn("refresh")
        whenever(apiService.logout(mapOf("refreshToken" to "refresh")))
            .thenThrow(IllegalStateException("offline"))
        var completed = false

        val viewModel = InfirmierAuthViewModel(apiService, sessionStore)
        viewModel.logout { completed = true }

        verify(sessionStore).clearTokens()
        assertTrue(completed)
    }
}

