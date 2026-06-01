package com.example.vaccinkid

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity

class AdminActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_admin)

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
}