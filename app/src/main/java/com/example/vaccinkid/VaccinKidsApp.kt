package com.example.vaccinkid

import android.app.Application
import com.example.vaccinkid.network.TokenManager

class VaccinKidsApp : Application() {
    override fun onCreate() {
        super.onCreate()
        TokenManager.init(this)
    }
}
