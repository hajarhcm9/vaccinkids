package com.example.vaccinkid

import android.content.Intent
import android.os.Bundle
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
        protectSensitiveContent()
        setContentView(R.layout.activity_main_infirmier)

        bottomNav = findViewById(R.id.bottomNav)
        validateSession()

        // Fragment par défaut : Dashboard
        if (savedInstanceState == null) {
            selectRootFragment(DashboardFragment(), "dashboard")
        }

        bottomNav.setOnItemSelectedListener { item ->
            when (item.itemId) {
                R.id.nav_dashboard -> {
                    selectRootFragment(DashboardFragment(), "dashboard")
                    true
                }
                R.id.nav_rdv -> {
                    selectRootFragment(RdvFragment(), "rdv")
                    true
                }
                R.id.nav_scan -> {
                    selectRootFragment(ScanQrFragment(), "scan")
                    true
                }
                R.id.nav_queue -> {
                    selectRootFragment(QueueFragment(), "queue")
                    true
                }
                R.id.nav_more -> {
                    selectRootFragment(StaffMoreFragment(), "more")
                    true
                }
                else -> false
            }
        }
    }

    // ✅ Méthode publique pour naviguer depuis n'importe quel fragment
    fun naviguerVers(fragment: androidx.fragment.app.Fragment) {
        supportFragmentManager.beginTransaction()
            .replace(R.id.fragmentContainer, fragment)
            .addToBackStack(fragment::class.java.simpleName)
            .commit()
    }

    private fun selectRootFragment(fragment: androidx.fragment.app.Fragment, tag: String) {
        if (supportFragmentManager.findFragmentByTag(tag)?.isVisible == true) return
        supportFragmentManager.popBackStackImmediate(
            null,
            androidx.fragment.app.FragmentManager.POP_BACK_STACK_INCLUSIVE
        )
        supportFragmentManager.beginTransaction()
            .replace(R.id.fragmentContainer, fragment, tag)
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
