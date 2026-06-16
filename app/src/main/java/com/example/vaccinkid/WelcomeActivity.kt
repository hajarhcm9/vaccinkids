package com.example.vaccinkid

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import androidx.appcompat.app.AppCompatActivity

class WelcomeActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_welcome)

        findViewById<Button>(R.id.btnCommencer).setOnClickListener {
            // Par defaut, on va vers l'ecran de login (qui permet de choisir entre infirmier et admin)
            startActivity(Intent(this, LoginInfirmierActivity::class.java))
        }

        // Acces rapide au diagnostic uniquement en debug.
        if (BuildConfig.DEBUG) {
            findViewById<Button>(R.id.btnCommencer).setOnLongClickListener {
                startActivity(Intent(this, ApiDiagnosticsActivity::class.java))
                true
            }
        }
    }
}
