package com.example.vaccinkid.network

import okhttp3.Interceptor
import okhttp3.Response

class AuthInterceptor : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        val builder = originalRequest.newBuilder()
            .header("Accept", "application/json")

        TokenManager.getAccessToken()?.let { token ->
            builder.header("Authorization", "Bearer $token")
        }

        return chain.proceed(builder.build())
    }
}
