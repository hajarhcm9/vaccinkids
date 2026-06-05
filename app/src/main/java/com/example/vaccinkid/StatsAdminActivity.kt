package com.example.vaccinkid

import android.os.Bundle
import android.view.Gravity
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class StatsAdminActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(
            LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                gravity = Gravity.CENTER
                setPadding(32, 32, 32, 32)
                addView(TextView(this@StatsAdminActivity).apply {
                    text = "Statistiques admin indisponibles"
                    textSize = 20f
                    gravity = Gravity.CENTER
                })
                addView(TextView(this@StatsAdminActivity).apply {
                    text = "Cette vue est retiree du pilote tant que les graphiques ne sont pas alimentes par le serveur."
                    textSize = 15f
                    gravity = Gravity.CENTER
                    setPadding(0, 16, 0, 0)
                })
            }
        )
    }
}
