package com.example.vaccinkid.network

sealed class NetworkResult<out T> {
    data class Success<T>(val data: T) : NetworkResult<T>()
    data class Error(val message: String, val code: Int? = null) : NetworkResult<Nothing>()
    data class Offline<T>(val cachedData: T) : NetworkResult<T>()
}
