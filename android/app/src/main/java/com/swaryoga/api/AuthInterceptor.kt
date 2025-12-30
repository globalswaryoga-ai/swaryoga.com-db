package com.swaryoga.api

import okhttp3.Interceptor
import okhttp3.Response

/**
 * OkHttp Interceptor for adding JWT token to API requests
 *
 * Automatically adds Authorization header with Bearer token
 */
class AuthInterceptor(private val tokenManager: TokenManager) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        var request = chain.request()

        // Add Authorization header if token exists
        val authHeader = tokenManager.getAuthorizationHeader()
        if (authHeader != null) {
            request = request.newBuilder()
                .addHeader(ApiConfig.Headers.AUTHORIZATION, authHeader)
                .addHeader(ApiConfig.Headers.ACCEPT, ApiConfig.Headers.APPLICATION_JSON)
                .build()
        }

        return chain.proceed(request)
    }
}
