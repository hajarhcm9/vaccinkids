package com.example.vaccinkid

import android.app.Application
import com.example.vaccinkid.network.TokenManager
import com.example.vaccinkid.sync.SyncWorker

class VaccinKidsApp : Application() {
    override fun onCreate() {
        super.onCreate()
        TokenManager.init(this)
        SyncWorker.schedule(this)
    }
}
