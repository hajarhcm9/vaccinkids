package com.example.vaccinkid

import android.app.Activity
import android.view.WindowManager

fun Activity.protectSensitiveContent() {
    if (BuildConfig.DEBUG) {
        window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
    } else {
        window.setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        )
    }
}
