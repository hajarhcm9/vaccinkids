package com.example.vaccinkid

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.bottomnavigation.BottomNavigationView

class MainInfirmierActivity : AppCompatActivity() {

    private lateinit var bottomNav: BottomNavigationView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main_infirmier)

        bottomNav = findViewById(R.id.bottomNav)

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
}
