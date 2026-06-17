package com.example.vaccinkid

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.example.vaccinkid.network.ApiClient
import com.example.vaccinkid.network.TokenManager
import com.google.android.material.bottomnavigation.BottomNavigationView
import kotlinx.coroutines.launch

class AdminActivity : AppCompatActivity() {

    private lateinit var bottomNav: BottomNavigationView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        protectSensitiveContent()
        setContentView(R.layout.activity_admin)
        validateSession()

        bottomNav = findViewById(R.id.adminBottomNav)
        bottomNav.setOnItemSelectedListener { item ->
            when (item.itemId) {
                R.id.nav_admin_dashboard  -> { selectRoot(AdminDashboardFragment()); true }
                R.id.nav_admin_personnel  -> { selectRoot(GestionPersonnelFragment()); true }
                R.id.nav_admin_sessions   -> { selectRoot(GestionSessionsFragment()); true }
                R.id.nav_admin_stocks     -> { selectRoot(AdminStocksFragment()); true }
                R.id.nav_admin_more       -> { selectRoot(AdminMoreFragment()); true }
                else -> false
            }
        }

        if (savedInstanceState == null) {
            bottomNav.selectedItemId = R.id.nav_admin_dashboard
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                val fm = supportFragmentManager
                if (fm.backStackEntryCount > 0) {
                    fm.popBackStack()
                } else if (bottomNav.selectedItemId != R.id.nav_admin_dashboard) {
                    bottomNav.selectedItemId = R.id.nav_admin_dashboard
                } else {
                    moveTaskToBack(true)
                }
            }
        })
    }

    private fun selectRoot(fragment: Fragment) {
        supportFragmentManager.popBackStack(null, androidx.fragment.app.FragmentManager.POP_BACK_STACK_INCLUSIVE)
        supportFragmentManager.beginTransaction()
            .replace(R.id.fragmentContainerAdmin, fragment)
            .commit()
    }

    fun naviguerVers(fragment: Fragment) {
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
                val role = user?.role?.lowercase()
                if (response.status == "success" && role == "admin") return@launch
                if (response.status != "success") {
                    TokenManager.clearTokens()
                    Toast.makeText(
                        this@AdminActivity,
                        "Connexion requise : ${response.message ?: "session invalide"}",
                        Toast.LENGTH_LONG
                    ).show()
                    startActivity(Intent(this@AdminActivity, AdminLoginActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                    })
                    finish()
                }
            } catch (_: Exception) {
                // Erreur réseau — ne pas déconnecter
            }
        }
    }
}
