package com.example.vaccinkid

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import androidx.appcompat.app.AppCompatActivity

class WelcomeActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_welcome)

        findViewById<Button>(R.id.btnInfirmier).setOnClickListener {
            startActivity(Intent(this, LoginInfirmierActivity::class.java))
        }

        findViewById<Button>(R.id.btnAdmin).setOnClickListener {
            startActivity(Intent(this, MainActivity::class.java))
        }

        // Acces rapide au diagnostic uniquement en debug.
        if (BuildConfig.DEBUG) {
            findViewById<Button>(R.id.btnInfirmier).setOnLongClickListener {
                startActivity(Intent(this, ApiDiagnosticsActivity::class.java))
                true
            }
        }
    }
}
