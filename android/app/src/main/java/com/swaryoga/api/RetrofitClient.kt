package com.swaryoga.api

import android.content.Context
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.converter.scalars.ScalarsConverterFactory
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import com.swaryoga.BuildConfig
import java.util.concurrent.TimeUnit

/**
 * Retrofit client for API communication
 *
 * Features:
 * - Automatic token injection via interceptor
 * - Logging (debug builds only)
 * - Timeout configuration
 * - Connection pooling
 */
object RetrofitClient {

    private var retrofit: Retrofit? = null
    private lateinit var tokenManager: TokenManager

    /**
     * Initialize Retrofit client (call this in Application.onCreate)
     */
    fun initialize(context: Context) {
        tokenManager = TokenManager(context)
        retrofit = createRetrofit()
    }

    /**
     * Get Retrofit instance
     */
    fun getInstance(): Retrofit {
        return retrofit ?: throw IllegalStateException(
            "RetrofitClient not initialized. Call RetrofitClient.initialize(context) first"
        )
    }

    /**
     * Get API service
     */
    fun <T> getService(serviceClass: Class<T>): T {
        return getInstance().create(serviceClass)
    }

    /**
     * Create OkHttpClient with interceptors and configuration
     */
    private fun createOkHttpClient(): OkHttpClient {
        val clientBuilder = OkHttpClient.Builder()
            .connectTimeout(ApiConfig.Request.CONNECT_TIMEOUT, TimeUnit.SECONDS)
            .readTimeout(ApiConfig.Request.READ_TIMEOUT, TimeUnit.SECONDS)
            .writeTimeout(ApiConfig.Request.WRITE_TIMEOUT, TimeUnit.SECONDS)
            .addInterceptor(AuthInterceptor(tokenManager))

        // Add logging interceptor for debug builds
        if (BuildConfig.DEBUG) {
            val loggingInterceptor = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }
            clientBuilder.addInterceptor(loggingInterceptor)
        }

        return clientBuilder.build()
    }

    /**
     * Create Gson instance with custom configuration
     */
    private fun createGson(): Gson {
        return GsonBuilder()
            .setLenient()
            .create()
    }

    /**
     * Create Retrofit instance
     */
    private fun createRetrofit(): Retrofit {
        return Retrofit.Builder()
            .baseUrl(ApiConfig.API_BASE_URL)
            .client(createOkHttpClient())
            .addConverterFactory(ScalarsConverterFactory.create())
            .addConverterFactory(GsonConverterFactory.create(createGson()))
            .build()
    }

    /**
     * Reset client (used when token changes or on logout)
     */
    fun reset(context: Context) {
        retrofit = null
        initialize(context)
    }
}
