package com.example.vaccinkid.network

import android.content.ClipboardManager
import android.content.Context
import androidx.core.content.getSystemService
import com.example.vaccinkid.BuildConfig

object ApiDiagnostics {
    val apiBaseUrl: String
        get() = BuildConfig.API_BASE_URL

    val variantLabel: String
        get() = BuildConfig.BUILD_TYPE

    fun copyToClipboard(context: Context, text: String) {
        val clipboard = context.getSystemService<ClipboardManager>()
        clipboard?.setPrimaryClip(android.content.ClipData.newPlainText("api", text))
    }
}
