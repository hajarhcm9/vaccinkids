package com.example.vaccinkid.network

import com.example.vaccinkid.model.ApiResponse
import com.example.vaccinkid.model.AuthResponse
import com.example.vaccinkid.model.RefreshRequest
import okhttp3.Authenticator
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route
import retrofit2.Call
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.POST

class TokenAuthenticator : Authenticator {
    override fun authenticate(route: Route?, response: Response): Request? {
        if (responseCount(response) >= 2) return null

        val refreshToken = TokenManager.getRefreshToken() ?: return null
        val authResponse = refreshAccessToken(refreshToken) ?: run {
            TokenManager.clearTokens()
            return null
        }
        val tokens = authResponse.tokens
        val accessToken = tokens?.accessToken ?: authResponse.accessToken ?: return null
        val newRefreshToken = tokens?.refreshToken ?: authResponse.refreshToken ?: refreshToken
        TokenManager.saveTokens(accessToken, newRefreshToken)

        return response.request.newBuilder()
            .header("Authorization", "Bearer $accessToken")
            .build()
    }

    private fun refreshAccessToken(refreshToken: String): AuthResponse? {
        return try {
            val retrofit = Retrofit.Builder()
                .baseUrl(ApiClient.BASE_URL)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
            val service = retrofit.create(RefreshService::class.java)
            val response = service.refreshToken(RefreshRequest(refreshToken)).execute()
            if (response.isSuccessful) response.body()?.data else null
        } catch (_: Exception) {
            null
        }
    }

    private fun responseCount(response: Response): Int {
        var count = 1
        var prior = response.priorResponse
        while (prior != null) {
            count++
            prior = prior.priorResponse
        }
        return count
    }

    private interface RefreshService {
        @POST("auth/refresh")
        fun refreshToken(@Body request: RefreshRequest): Call<ApiResponse<AuthResponse>>
    }
}
