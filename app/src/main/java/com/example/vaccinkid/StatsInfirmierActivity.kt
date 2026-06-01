package com.example.vaccinkid

import android.os.Bundle
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class StatsInfirmierActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_stats_infirmier)

        val tvVaccinationsJour = findViewById<TextView>(R.id.tvVaccinationsJour)
        val tvRdvSemaine = findViewById<TextView>(R.id.tvRdvSemaine)
        val tvAbsencesJour = findViewById<TextView>(R.id.tvAbsencesJour)

        // Pour l'instant, on met des données fictives (hardcodées)
        tvVaccinationsJour.text = "12"
        tvRdvSemaine.text = "45"
        tvAbsencesJour.text = "2"
    }
}