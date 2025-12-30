package com.swaryoga.api

import com.swaryoga.BuildConfig

/**
 * API Configuration for Swar Yoga Android App
 *
 * Centralizes all API endpoint configurations and constants
 */
object ApiConfig {

    // Base URLs
    val API_BASE_URL = BuildConfig.API_BASE_URL
    val BASE_URL = API_BASE_URL.replace("/api", "")

    // API Endpoints - Public (No Auth)
    object Public {
        const val WORKSHOPS_LIST = "/workshops/list"
        const val WORKSHOPS_SCHEDULES = "/workshops/schedules"
        const val WORKSHOPS_AVAILABILITY = "/workshops/availability"
        const val PANCHANG_CALCULATE = "/panchang-calculate"
        const val PAYMENTS_PAYU_INITIATE = "/payments/payu/initiate"
        const val PAYMENTS_PAYU_CALLBACK = "/payments/payu/callback"
        const val OFFERS = "/offers"
        const val SOCIAL_MEDIA_POSTS = "/social-media/posts"
    }

    // API Endpoints - Protected (Requires JWT)
    object Protected {
        // Auth
        const val AUTH_REGISTER = "/auth/register"
        const val AUTH_LOGIN = "/auth/login"
        const val AUTH_ME = "/auth/me"
        const val AUTH_PROFILE = "/auth/profile"
        const val AUTH_LOGOUT = "/auth/logout"

        // Workshops
        const val WORKSHOPS_REGISTRATIONS = "/workshops/registrations"
        const val WORKSHOPS_REGISTRATIONS_BY_ID = "/workshops/registrations/{id}"

        // Orders
        const val ORDERS = "/orders"
        const val ORDERS_BY_ID = "/orders/{id}"

        // Life Planner
        const val LIFE_PLANNER_TASKS = "/life-planner/tasks"
        const val LIFE_PLANNER_TASKS_BY_ID = "/life-planner/tasks/{id}"

        // Accounting
        const val ACCOUNTING_ACCOUNTS = "/accounting/accounts"
        const val ACCOUNTING_TRANSACTIONS = "/accounting/transactions"
        const val ACCOUNTING_BUDGET = "/accounting/budget"
        const val ACCOUNTING_INVESTMENTS = "/accounting/investments"

        // CRM (Admin Only)
        const val CRM_LEADS = "/admin/crm/leads"
        const val CRM_LEADS_BY_ID = "/admin/crm/leads/{id}"
        const val CRM_MESSAGES = "/admin/crm/messages"
        const val CRM_TEMPLATES = "/admin/crm/templates"
    }

    // Request Headers
    object Headers {
        const val CONTENT_TYPE = "Content-Type"
        const val APPLICATION_JSON = "application/json"
        const val AUTHORIZATION = "Authorization"
        const val ACCEPT = "Accept"
        const val USER_AGENT = "User-Agent"
    }

    // Response Codes
    object ResponseCode {
        const val SUCCESS = 200
        const val CREATED = 201
        const val BAD_REQUEST = 400
        const val UNAUTHORIZED = 401
        const val FORBIDDEN = 403
        const val NOT_FOUND = 404
        const val CONFLICT = 409
        const val RATE_LIMITED = 429
        const val SERVER_ERROR = 500
    }

    // Token Configuration
    object Token {
        const val PREFERENCE_NAME = "swar_yoga_prefs"
        const val TOKEN_KEY = "jwt_token"
        const val USER_KEY = "user_data"
        const val TOKEN_EXPIRY_KEY = "token_expiry"
        const val EXPIRY_BUFFER_MINUTES = 5 // Refresh token 5 minutes before expiry
    }

    // Request Configuration
    object Request {
        const val CONNECT_TIMEOUT = 30L // seconds
        const val READ_TIMEOUT = 30L // seconds
        const val WRITE_TIMEOUT = 30L // seconds
        const val REQUEST_RETRY_COUNT = 3
        const val REQUEST_RETRY_DELAY = 1000L // ms
    }

    // Payment Configuration
    object Payment {
        const val CURRENCY_INR = "INR"
        const val CURRENCY_USD = "USD"
        const val CURRENCY_NPR = "NPR"
    }

    // Language Support
    object Language {
        const val ENGLISH = "en"
        const val HINDI = "hi"
        const val MARATHI = "mr"
    }

    /**
     * Validate API response structure
     */
    fun isValidResponse(json: Any?): Boolean {
        return json is Map<*, *> && json.containsKey("success")
    }

    /**
     * Get token with Bearer prefix
     */
    fun getAuthorizationHeader(token: String): String {
        return "Bearer $token"
    }
}
