package com.example.vaccinkid.sync

import android.content.Context
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.example.vaccinkid.network.ApiClient
import com.example.vaccinkid.network.TokenManager
import java.util.concurrent.TimeUnit

class SyncWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {
    override suspend fun doWork(): Result {
        if (!TokenManager.isLoggedIn()) return Result.success()

        return try {
            val lastSync = getLastSyncTimestamp()
            val pullResult = ApiClient.apiService.pullChanges(lastSync)
            if (pullResult.status == "success") {
                pullResult.data?.timestamp?.let { saveLastSyncTimestamp(it) }
            }
            Result.success()
        } catch (_: Exception) {
            if (runAttemptCount < 3) Result.retry() else Result.failure()
        }
    }

    private fun getLastSyncTimestamp(): String {
        val prefs = applicationContext.getSharedPreferences("sync_prefs", Context.MODE_PRIVATE)
        return prefs.getString("last_sync", "2024-01-01T00:00:00Z") ?: "2024-01-01T00:00:00Z"
    }

    private fun saveLastSyncTimestamp(timestamp: String) {
        val prefs = applicationContext.getSharedPreferences("sync_prefs", Context.MODE_PRIVATE)
        prefs.edit().putString("last_sync", timestamp).apply()
    }

    companion object {
        fun schedule(context: Context) {
            val request = PeriodicWorkRequestBuilder<SyncWorker>(15, TimeUnit.MINUTES)
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .build()
                )
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                "vaccinkids_sync",
                ExistingPeriodicWorkPolicy.KEEP,
                request
            )
        }
    }
}
