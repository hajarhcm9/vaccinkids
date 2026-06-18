package com.example.vaccinkid.network

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.example.vaccinkid.model.UserDto

object TokenManager : StaffSessionStore {
    private const val PREFS_NAME = "vaccinkids_secure_prefs"
    private const val KEY_ACCESS_TOKEN = "access_token"
    private const val KEY_REFRESH_TOKEN = "refresh_token"
    private const val KEY_USER_ID = "user_id"
    private const val KEY_USER_ROLE = "user_role"
    private const val KEY_CENTRE_ID = "centre_id"

    private lateinit var prefs: SharedPreferences
    private lateinit var appContext: Context

    fun init(context: Context) {
        if (::prefs.isInitialized) return
        appContext = context.applicationContext
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        prefs = EncryptedSharedPreferences.create(
            context,
            PREFS_NAME,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    override fun saveSession(accessToken: String, refreshToken: String, user: UserDto?) {
        prefs.edit()
            .putString(KEY_ACCESS_TOKEN, accessToken)
            .putString(KEY_REFRESH_TOKEN, refreshToken)
            .putInt(KEY_USER_ID, user?.id ?: 0)
            .putString(KEY_USER_ROLE, user?.role)
            .putInt(KEY_CENTRE_ID, user?.centreId ?: 0)
            .apply()
    }

    fun saveTokens(accessToken: String, refreshToken: String) {
        prefs.edit()
            .putString(KEY_ACCESS_TOKEN, accessToken)
            .putString(KEY_REFRESH_TOKEN, refreshToken)
            .apply()
    }

    fun getAccessToken(): String? = prefs.getString(KEY_ACCESS_TOKEN, null)
    override fun getRefreshToken(): String? = prefs.getString(KEY_REFRESH_TOKEN, null)
    fun getUserRole(): String? = prefs.getString(KEY_USER_ROLE, null)
    fun getCentreId(): Int? = prefs.getInt(KEY_CENTRE_ID, 0).takeIf { it > 0 }
    fun saveCentreId(centreId: Int) { prefs.edit().putInt(KEY_CENTRE_ID, centreId).apply() }
    fun isLoggedIn(): Boolean = getAccessToken() != null

    override fun clearTokens() {
        prefs.edit().clear().apply()
        if (::appContext.isInitialized) {
            appContext.getSharedPreferences("sync_prefs", Context.MODE_PRIVATE).edit().clear().apply()
            appContext.deleteDatabase("vaccinkids_cache")
        }
    }
}
