package com.swaryoga.api

import android.content.Context
import android.content.SharedPreferences
import com.auth0.android.jwt.JWT
import com.google.gson.Gson
import java.util.Date

/**
 * Manages JWT tokens and user session data
 *
 * Handles:
 * - Token storage and retrieval
 * - Token expiry validation
 * - User data caching
 * - Session management
 */
class TokenManager(private val context: Context) {

    private val preferences: SharedPreferences = context.getSharedPreferences(
        ApiConfig.Token.PREFERENCE_NAME,
        Context.MODE_PRIVATE
    )
    private val gson = Gson()

    /**
     * Save JWT token to secure storage
     */
    fun saveToken(token: String) {
        try {
            preferences.edit().apply {
                putString(ApiConfig.Token.TOKEN_KEY, token)
                
                // Extract and save token expiry
                val jwt = JWT(token)
                val expiresAt = jwt.expiresAt
                if (expiresAt != null) {
                    putLong(ApiConfig.Token.TOKEN_EXPIRY_KEY, expiresAt.time)
                }
                
                apply()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    /**
     * Retrieve JWT token from storage
     */
    fun getToken(): String? {
        val token = preferences.getString(ApiConfig.Token.TOKEN_KEY, null)
        
        // Check if token is still valid
        return if (token != null && isTokenValid(token)) {
            token
        } else {
            // Token expired, clear it
            clearToken()
            null
        }
    }

    /**
     * Check if token is valid and not expired
     */
    fun isTokenValid(token: String? = null): Boolean {
        val actualToken = token ?: preferences.getString(ApiConfig.Token.TOKEN_KEY, null) ?: return false
        
        return try {
            val jwt = JWT(actualToken)
            val expiresAt = jwt.expiresAt ?: return false
            
            // Add buffer for expiry check
            val bufferTime = ApiConfig.Token.EXPIRY_BUFFER_MINUTES * 60 * 1000
            Date(System.currentTimeMillis() + bufferTime).before(expiresAt)
        } catch (e: Exception) {
            false
        }
    }

    /**
     * Get token expiry time
     */
    fun getTokenExpiry(): Long? {
        return if (preferences.contains(ApiConfig.Token.TOKEN_EXPIRY_KEY)) {
            preferences.getLong(ApiConfig.Token.TOKEN_EXPIRY_KEY, -1L).takeIf { it > 0 }
        } else {
            null
        }
    }

    /**
     * Save user data (name, email, userId, etc.)
     */
    fun saveUser(userJson: String) {
        preferences.edit().putString(ApiConfig.Token.USER_KEY, userJson).apply()
    }

    /**
     * Get stored user data
     */
    fun getUser(): String? {
        return preferences.getString(ApiConfig.Token.USER_KEY, null)
    }

    /**
     * Get user ID from stored token
     */
    fun getUserId(): String? {
        return try {
            val token = preferences.getString(ApiConfig.Token.TOKEN_KEY, null) ?: return null
            val jwt = JWT(token)
            jwt.getClaim("userId").asString()
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Clear token and user data (logout)
     */
    fun clearToken() {
        preferences.edit().apply {
            remove(ApiConfig.Token.TOKEN_KEY)
            remove(ApiConfig.Token.USER_KEY)
            remove(ApiConfig.Token.TOKEN_EXPIRY_KEY)
            apply()
        }
    }

    /**
     * Check if user is logged in
     */
    fun isLoggedIn(): Boolean {
        return getToken() != null
    }

    /**
     * Get authorization header for API requests
     */
    fun getAuthorizationHeader(): String? {
        return getToken()?.let { ApiConfig.getAuthorizationHeader(it) }
    }

    /**
     * Get Bearer token for WebView injection
     */
    fun getBearerToken(): String? {
        return getToken()?.let { "Bearer $it" }
    }

    /**
     * Delete all stored preferences (used during app reset)
     */
    fun clearAll() {
        preferences.edit().clear().apply()
    }
}
