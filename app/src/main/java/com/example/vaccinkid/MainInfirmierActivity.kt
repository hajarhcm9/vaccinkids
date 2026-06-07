package com.example.vaccinkid

import android.content.Intent
import android.os.Bundle
import android.view.WindowManager
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.example.vaccinkid.network.ApiClient
import com.example.vaccinkid.network.TokenManager
import com.google.android.material.bottomnavigation.BottomNavigationView
import kotlinx.coroutines.launch

class MainInfirmierActivity : AppCompatActivity() {

    private lateinit var bottomNav: BottomNavigationView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        )
        setContentView(R.layout.activity_main_infirmier)

        bottomNav = findViewById(R.id.bottomNav)
        validateSession()

        // Fragment par défaut : Dashboard
        if (savedInstanceState == null) {
            loadFragment(DashboardFragment())
        }

        bottomNav.setOnItemSelectedListener { item ->
            when (item.itemId) {
                R.id.nav_dashboard -> {
                    loadFragment(DashboardFragment())
                    true
                }
                R.id.nav_rdv -> {
                    loadFragment(RdvFragment())
                    true
                }
                R.id.nav_scan -> {
                    loadFragment(ScanQrFragment())
                    true
                }
                R.id.nav_queue -> {
                    loadFragment(QueueFragment())
                    true
                }
                else -> false
            }
        }
    }

    // ✅ Méthode publique pour naviguer depuis n'importe quel fragment
    fun naviguerVers(fragment: androidx.fragment.app.Fragment) {
        loadFragment(fragment)
    }

    private fun loadFragment(fragment: androidx.fragment.app.Fragment) {
        supportFragmentManager.beginTransaction()
            .replace(R.id.fragmentContainer, fragment)
            .addToBackStack(null)
            .commit()
    }

    private fun validateSession() {
        lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.getMe()
                val user = response.data?.user
                if (response.status != "success" || user?.role != "infirmier" || user.centreId == null) {
                    throw Exception(response.message ?: "Compte infirmier sans centre autorise.")
                }
            } catch (error: Exception) {
                TokenManager.clearTokens()
                Toast.makeText(
                    this@MainInfirmierActivity,
                    "Connexion requise : ${error.message ?: "session invalide"}",
                    Toast.LENGTH_LONG
                ).show()
                val intent = Intent(this@MainInfirmierActivity, LoginInfirmierActivity::class.java)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                startActivity(intent)
                finish()
            }
        }
    }
}
