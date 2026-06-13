package com.example.vaccinkid

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.example.vaccinkid.network.ApiClient
import com.example.vaccinkid.network.TokenManager
import kotlinx.coroutines.launch

class AdminActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        protectSensitiveContent()
        setContentView(R.layout.activity_admin)
        validateSession()

        if (savedInstanceState == null) {
            supportFragmentManager.beginTransaction()
                .replace(R.id.fragmentContainerAdmin, AdminDashboardFragment())
                .commit()
        }
    }

    fun naviguerVers(fragment: androidx.fragment.app.Fragment) {
        supportFragmentManager.beginTransaction()
            .replace(R.id.fragmentContainerAdmin, fragment)
            .addToBackStack(null)
            .commit()
    }

    private fun validateSession() {
        lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.getMe()
                val user = response.data?.user
                if (response.status != "success" || user?.role != "admin") {
                    throw Exception(response.message ?: "Compte administrateur requis.")
                }
            } catch (error: Exception) {
                TokenManager.clearTokens()
                Toast.makeText(
                    this@AdminActivity,
                    "Connexion requise : ${error.message ?: "session invalide"}",
                    Toast.LENGTH_LONG
                ).show()
                startActivity(Intent(this@AdminActivity, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                })
                finish()
            }
        }
    }
}
