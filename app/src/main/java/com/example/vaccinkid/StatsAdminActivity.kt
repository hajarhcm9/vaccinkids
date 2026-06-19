package com.example.vaccinkid

import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.ArrayAdapter
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.Spinner
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.example.vaccinkid.model.AdminRefCentreDto
import com.example.vaccinkid.model.ApiResponse
import com.example.vaccinkid.network.ApiClient
import com.google.android.material.button.MaterialButton
import com.google.android.material.card.MaterialCardView
import kotlinx.coroutines.launch

class StatsAdminActivity : AppCompatActivity() {

    private lateinit var spinnerCentre: Spinner
    private lateinit var btnRefresh: MaterialButton
    private lateinit var statsProgress: ProgressBar
    private lateinit var tvMessage: TextView
    private lateinit var statsContainer: LinearLayout

    private var centres: List<AdminRefCentreDto> = emptyList()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        protectSensitiveContent()
        setContentView(R.layout.activity_stats_admin)

        spinnerCentre = findViewById(R.id.spinnerStatsCentre)
        btnRefresh = findViewById(R.id.btnStatsRefresh)
        statsProgress = findViewById(R.id.statsProgress)
        tvMessage = findViewById(R.id.tvStatsMessage)
        statsContainer = findViewById(R.id.statsContainer)

        btnRefresh.setOnClickListener { loadStats() }
        loadCentres()
    }

    private fun loadStats() {
        statsContainer.removeAllViews()
        tvMessage.text = "Chargement des statistiques…"
        tvMessage.visibility = View.VISIBLE
        statsProgress.visibility = View.VISIBLE
        lifecycleScope.launch {
            try {
                val centreId = centres.getOrNull(spinnerCentre.selectedItemPosition - 1)?.id
                val dashboard = requireStats(ApiClient.apiService.getStatsDashboard(centreId), "Dashboard")
                val coverage = requireStats(ApiClient.apiService.getStatsCouverture(centreId), "Couverture")
                val sessions = requireStats(ApiClient.apiService.getStatsSessions(centreId), "Sessions")
                val rdv = requireStats(ApiClient.apiService.getStatsRendezVous(centreId), "Rendez-vous")
                val stock = requireStats(ApiClient.apiService.getStatsStock(centreId), "Stock")
                val absences = requireStats(ApiClient.apiService.getStatsAbsenteisme(centreId), "Absences")

                addSection("Dashboard", dashboard, "#1A9099")
                addSection("Couverture vaccinale", coverage, "#10B981")
                addSection("Sessions", sessions, "#3B82F6")
                addSection("Rendez-vous", rdv, "#8B5CF6")
                addSection("Stock", stock, "#F59E0B")
                addSection("Absentéisme", absences, "#EF4444")

                tvMessage.visibility = View.GONE
            } catch (e: Exception) {
                tvMessage.text = e.message ?: "Statistiques indisponibles"
                tvMessage.visibility = View.VISIBLE
            } finally {
                statsProgress.visibility = View.GONE
            }
        }
    }

    private fun requireStats(response: ApiResponse<Map<String, Any?>>, label: String): Map<String, Any?> {
        if (response.status != "success" || response.data == null) {
            throw IllegalStateException(response.message ?: "$label indisponible")
        }
        return response.data
    }

    private fun addSection(title: String, data: Map<String, Any?>, accentHex: String) {
        val card = MaterialCardView(this).apply {
            radius = dpToPx(16).toFloat()
            cardElevation = 3f
            setCardBackgroundColor(Color.WHITE)
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            lp.bottomMargin = dpToPx(14)
            layoutParams = lp
        }

        val inner = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
        }

        // Accent bar
        inner.addView(View(this).apply {
            setBackgroundColor(Color.parseColor(accentHex))
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dpToPx(4))
        })

        // Section header
        inner.addView(TextView(this).apply {
            text = title.uppercase()
            textSize = 10f
            setTypeface(null, android.graphics.Typeface.BOLD)
            setTextColor(Color.parseColor(accentHex))
            letterSpacing = 0.05f
            setPadding(dpToPx(16), dpToPx(12), dpToPx(16), dpToPx(8))
        })

        // Key-value rows
        val rowContainer = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dpToPx(16), 0, dpToPx(16), dpToPx(14))
        }

        if (data.isEmpty()) {
            rowContainer.addView(TextView(this).apply {
                text = "Aucune donnée disponible"
                textSize = 13f
                setTextColor(Color.parseColor("#6B7280"))
                setPadding(0, dpToPx(4), 0, dpToPx(4))
            })
        } else {
            data.entries.take(40).forEach { (key, value) ->
                val row = LinearLayout(this).apply {
                    orientation = LinearLayout.HORIZONTAL
                    setPadding(0, dpToPx(5), 0, dpToPx(5))
                }
                row.addView(TextView(this).apply {
                    text = key.replace("_", " ").replaceFirstChar { it.uppercase() }
                    textSize = 13f
                    setTextColor(Color.parseColor("#6B7280"))
                    layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                })
                row.addView(TextView(this).apply {
                    text = formatValue(value)
                    textSize = 13f
                    setTypeface(null, android.graphics.Typeface.BOLD)
                    setTextColor(Color.parseColor("#111827"))
                    maxLines = 3
                })
                // Separator
                val sep = View(this).apply {
                    setBackgroundColor(Color.parseColor("#F3F4F6"))
                    layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dpToPx(1))
                }
                rowContainer.addView(row)
                rowContainer.addView(sep)
            }
        }

        inner.addView(rowContainer)
        card.addView(inner)
        statsContainer.addView(card)
    }

    private fun formatValue(value: Any?): String = when (value) {
        is List<*> -> if (value.isEmpty()) "—" else value.take(5).joinToString(", ") { formatValue(it) }
        is Map<*, *> -> value.entries.take(8).joinToString("\n") { "${it.key}: ${formatValue(it.value)}" }
        null -> "—"
        else -> value.toString()
    }

    private fun dpToPx(dp: Int): Int = (dp * resources.displayMetrics.density).toInt()

    private fun loadCentres() {
        statsProgress.visibility = View.VISIBLE
        tvMessage.text = "Chargement…"
        tvMessage.visibility = View.VISIBLE
        lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.getAdminReferences()
                if (response.status != "success") throw Exception(response.message ?: "Références indisponibles")
                centres = response.data?.centres.orEmpty()
                spinnerCentre.adapter = ArrayAdapter(
                    this@StatsAdminActivity,
                    android.R.layout.simple_spinner_dropdown_item,
                    listOf("Tous les centres") + centres.map { it.nom ?: "Centre #${it.id}" }
                )
                loadStats()
            } catch (e: Exception) {
                tvMessage.text = e.message ?: "Références indisponibles"
                tvMessage.visibility = View.VISIBLE
                statsProgress.visibility = View.GONE
            }
        }
    }
}
