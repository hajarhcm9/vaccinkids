package com.example.vaccinkid

import android.os.Bundle
import android.view.WindowManager
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.setPadding
import androidx.lifecycle.lifecycleScope
import com.example.vaccinkid.network.ApiClient
import kotlinx.coroutines.launch

class StatsAdminActivity : AppCompatActivity() {
    private lateinit var content: LinearLayout
    private lateinit var messageView: TextView
    private lateinit var centreInput: EditText

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE)
        content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(24)
        }
        setContentView(ScrollView(this).apply { addView(content) })
        content.addView(TextView(this).apply {
            text = "Statistiques admin"
            textSize = 24f
            setTypeface(typeface, android.graphics.Typeface.BOLD)
        })
        messageView = TextView(this).apply { setPadding(0, 8, 0, 8) }
        content.addView(messageView)
        centreInput = EditText(this).apply {
            hint = "Centre ID optionnel"
            inputType = android.text.InputType.TYPE_CLASS_NUMBER
        }
        content.addView(centreInput)
        content.addView(Button(this).apply {
            text = "Rafraichir"
            setOnClickListener { loadStats() }
        })
        loadStats()
    }

    private fun loadStats() {
        messageView.text = "Chargement..."
        while (content.childCount > 4) content.removeViewAt(4)
        lifecycleScope.launch {
            try {
                val centreId = centreInput.text.toString().trim().toIntOrNull()
                val dashboard = ApiClient.apiService.getStatsDashboard(centreId).data ?: emptyMap()
                val coverage = ApiClient.apiService.getStatsCouverture(centreId).data ?: emptyMap()
                val sessions = ApiClient.apiService.getStatsSessions(centreId).data ?: emptyMap()
                val rdv = ApiClient.apiService.getStatsRendezVous(centreId).data ?: emptyMap()
                val stock = ApiClient.apiService.getStatsStock(centreId).data ?: emptyMap()
                val absences = ApiClient.apiService.getStatsAbsenteisme(centreId).data ?: emptyMap()
                section("Dashboard", dashboard)
                section("Couverture vaccinale", coverage)
                section("Sessions", sessions)
                section("RDV", rdv)
                section("Stock", stock)
                section("Absences", absences)
                messageView.text = ""
            } catch (e: Exception) {
                messageView.text = e.message ?: "Statistiques indisponibles"
            }
        }
    }

    private fun section(title: String, data: Map<String, Any?>) {
        content.addView(TextView(this).apply {
            text = title
            textSize = 18f
            setTypeface(typeface, android.graphics.Typeface.BOLD)
            setPadding(0, 16, 0, 6)
        })
        if (data.isEmpty()) {
            content.addView(TextView(this).apply { text = "Aucune donnee serveur." })
            return
        }
        data.entries.take(40).forEach { (key, value) ->
            content.addView(TextView(this).apply {
                text = "$key : ${formatValue(value)}"
                textSize = 14f
                setPadding(0, 3, 0, 3)
            })
        }
    }

    private fun formatValue(value: Any?): String {
        return when (value) {
            is List<*> -> value.take(8).joinToString("\n") { formatValue(it) }
            is Map<*, *> -> value.entries.take(12).joinToString(" | ") { "${it.key}=${formatValue(it.value)}" }
            null -> "-"
            else -> value.toString()
        }
    }
}
