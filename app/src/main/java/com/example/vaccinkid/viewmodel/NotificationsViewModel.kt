package com.example.vaccinkid.viewmodel

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.vaccinkid.model.NotificationDto
import com.example.vaccinkid.network.ApiClient
import kotlinx.coroutines.launch

class NotificationsViewModel : ViewModel() {
    private val _notifications = MutableLiveData<Result<List<NotificationDto>>>()
    val notifications: LiveData<Result<List<NotificationDto>>> = _notifications

    private val _unreadCount = MutableLiveData<Result<Int>>()
    val unreadCount: LiveData<Result<Int>> = _unreadCount

    fun loadNotifications() {
        viewModelScope.launch {
            try {
                val response = ApiClient.apiService.getNotifications()
                val data = response.data
                _notifications.value = if (response.status == "success" && data != null) {
                    Result.success(data)
                } else {
                    Result.failure(Exception(response.message ?: "Notifications indisponibles"))
                }
            } catch (e: Exception) {
                _notifications.value = Result.failure(e)
            }
        }
    }

    fun loadUnreadCount() {
        viewModelScope.launch {
            try {
                val response = ApiClient.apiService.getUnreadCount()
                _unreadCount.value = if (response.status == "success" && response.data != null) {
                    Result.success(response.data.count)
                } else {
                    Result.failure(Exception(response.message ?: "Compteur indisponible"))
                }
            } catch (e: Exception) {
                _unreadCount.value = Result.failure(e)
            }
        }
    }

    fun markAsRead(id: Int) {
        viewModelScope.launch {
            try {
                ApiClient.apiService.markNotificationRead(id)
                loadNotifications()
                loadUnreadCount()
            } catch (_: Exception) {
            }
        }
    }

    fun markAllRead() {
        viewModelScope.launch {
            try {
                ApiClient.apiService.markAllNotificationsRead()
                loadNotifications()
                loadUnreadCount()
            } catch (_: Exception) {
            }
        }
    }
}
