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
                else -> false
            }
        }
    }

    private fun loadFragment(fragment: androidx.fragment.app.Fragment) {
        supportFragmentManager.beginTransaction()
            .replace(R.id.fragmentContainer, fragment)
            .commit()
    }
}