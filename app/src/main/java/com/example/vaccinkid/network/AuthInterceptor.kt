package com.example.vaccinkid.network

import okhttp3.Interceptor
import okhttp3.Response
import java.util.UUID

class AuthInterceptor : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        val method = originalRequest.method.uppercase()
        val builder = originalRequest.newBuilder()
            .header("Accept", "application/json")
            .header("X-Request-ID", "staff-${UUID.randomUUID()}")

        if (method in listOf("POST", "PUT", "PATCH", "DELETE")) {
            builder.header(
                "X-Idempotency-Key",
                originalRequest.header("X-Idempotency-Key") ?: "staff-${UUID.randomUUID()}"
            )
        }

        TokenManager.getAccessToken()?.let { token ->
            builder.header("Authorization", "Bearer $token")
        }

        return chain.proceed(builder.build())
    }
}
