package com.example.vaccinkid.viewmodel

import com.example.vaccinkid.model.ApiResponse
import com.example.vaccinkid.model.NotificationCountDto
import com.example.vaccinkid.model.NotificationDto
import com.example.vaccinkid.network.ApiService
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever

class NotificationsViewModelTest {
    @get:Rule
    val rule = MainDispatcherRule()

    private val apiService: ApiService = mock()

    @Test
    fun loadsNotificationsAndUnreadCount() = runTest {
        val notifications = listOf(NotificationDto(id = 1, titre = "Session"))
        whenever(apiService.getNotifications())
            .thenReturn(ApiResponse("success", data = notifications))
        whenever(apiService.getUnreadCount())
            .thenReturn(ApiResponse("success", data = NotificationCountDto(3)))

        val viewModel = NotificationsViewModel(apiService)
        viewModel.loadNotifications()
        viewModel.loadUnreadCount()

        assertEquals(notifications, viewModel.notifications.value?.getOrNull())
        assertEquals(3, viewModel.unreadCount.value?.getOrNull())
    }

    @Test
    fun publishesNotificationServerError() = runTest {
        whenever(apiService.getNotifications())
            .thenReturn(ApiResponse(status = "error", message = "Acces refuse"))

        val viewModel = NotificationsViewModel(apiService)
        viewModel.loadNotifications()

        assertTrue(viewModel.notifications.value?.isFailure == true)
        assertEquals("Acces refuse", viewModel.notifications.value?.exceptionOrNull()?.message)
    }
}

