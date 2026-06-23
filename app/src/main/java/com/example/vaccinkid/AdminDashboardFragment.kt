package com.example.vaccinkid

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.example.vaccinkid.model.DashboardStatsDto
import com.example.vaccinkid.network.ApiClient
import com.example.vaccinkid.network.TokenManager
import com.github.mikephil.charting.charts.BarChart
import com.github.mikephil.charting.data.BarData
import com.github.mikephil.charting.data.BarDataSet
import com.github.mikephil.charting.data.BarEntry
import com.google.android.material.card.MaterialCardView
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

class AdminDashboardFragment : Fragment(R.layout.fragment_admin_dashboard) {

    private lateinit var refreshView: SwipeRefreshLayout
    private lateinit var barChart: BarChart

    private lateinit var tvAdminName: TextView
    private lateinit var tvAdminPeriod: TextView
    private lateinit var tvLastUpdated: TextView
    private lateinit var totalVaccinesView: TextView
    private lateinit var centresCountView: TextView
    private lateinit var staffCountView: TextView
    private lateinit var sessionsCountView: TextView
    private lateinit var activityContainer: LinearLayout
    private lateinit var alertBanner: LinearLayout
    private lateinit var alertBannerText: TextView

    private lateinit var cvKpiCentres: MaterialCardView
    private lateinit var cvKpiStaff: MaterialCardView
    private lateinit var cvKpiSessions: MaterialCardView
    private lateinit var cvQuickAlertesStock: MaterialCardView
    private lateinit var cvQuickRetards: MaterialCardView
    private lateinit var cvQuickRdv: MaterialCardView
    private lateinit var cvQuickSearch: MaterialCardView

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        bindViews(view)
        setupChart()
        setupQuickActions()
        loadDashboard()
    }

    private fun bindViews(view: View) {
        refreshView        = view.findViewById(R.id.adminRefresh)
        barChart           = view.findViewById(R.id.barChartSummary)
        tvAdminName        = view.findViewById(R.id.tvAdminName)
        tvAdminPeriod      = view.findViewById(R.id.tvAdminPeriod)
        tvLastUpdated      = view.findViewById(R.id.tvLastUpdated)
        totalVaccinesView  = view.findViewById(R.id.tvTotalVaccines)
        centresCountView   = view.findViewById(R.id.tvKpiCentres)
        staffCountView     = view.findViewById(R.id.tvKpiStaff)
        sessionsCountView  = view.findViewById(R.id.tvKpiSessions)
        activityContainer  = view.findViewById(R.id.llAdminActivities)
        alertBanner        = view.findViewById(R.id.llAlertBanner)
        alertBannerText    = view.findViewById(R.id.tvAlertBannerText)
        cvKpiCentres       = view.findViewById(R.id.cvKpiCentres)
        cvKpiStaff         = view.findViewById(R.id.cvKpiStaff)
        cvKpiSessions      = view.findViewById(R.id.cvKpiSessions)
        cvQuickAlertesStock = view.findViewById(R.id.cvQuickAlertesStock)
        cvQuickRetards     = view.findViewById(R.id.cvQuickRetards)
        cvQuickRdv         = view.findViewById(R.id.cvQuickRdv)
        cvQuickSearch      = view.findViewById(R.id.cvQuickSearch)

        refreshView.setOnRefreshListener { loadDashboard() }
        view.findViewById<View>(R.id.btnAdminLogout).setOnClickListener { confirmLogout() }

        // Période dynamique
        val cal = Calendar.getInstance()
        val months = listOf("Janvier","Février","Mars","Avril","Mai","Juin",
                            "Juillet","Août","Septembre","Octobre","Novembre","Décembre")
        tvAdminPeriod.text = "${months[cal.get(Calendar.MONTH)]} ${cal.get(Calendar.YEAR)}"

        // Placeholders en tirets pendant le chargement
        totalVaccinesView.text = "—"
        centresCountView.text  = "—"
        staffCountView.text    = "—"
        sessionsCountView.text = "—"
    }

    private fun setupChart() {
        barChart.description.isEnabled = false
        barChart.legend.isEnabled      = false
        barChart.xAxis.isEnabled       = false
        barChart.axisLeft.isEnabled    = false
        barChart.axisRight.isEnabled   = false
        barChart.setTouchEnabled(false)
    }

    private fun setupQuickActions() {
        cvQuickAlertesStock.setOnClickListener {
            (activity as? AdminActivity)?.naviguerVers(AdminAlertesFragment())
        }
        cvQuickRetards.setOnClickListener {
            (activity as? AdminActivity)?.naviguerVers(AdminDelayAlertsFragment())
        }
        cvQuickRdv.setOnClickListener {
            (activity as? AdminActivity)?.naviguerVers(AdminRendezVousFragment())
        }
        cvQuickSearch.setOnClickListener {
            (activity as? AdminActivity)?.naviguerVers(AdminSearchFragment())
        }
        cvKpiCentres.setOnClickListener {
            (activity as? AdminActivity)?.naviguerVers(AdminSearchFragment())
        }
        cvKpiStaff.setOnClickListener {
            (activity as? AdminActivity)?.naviguerVers(GestionPersonnelFragment())
        }
        cvKpiSessions.setOnClickListener {
            (activity as? AdminActivity)?.naviguerVers(GestionSessionsFragment())
        }
        alertBanner.setOnClickListener {
            (activity as? AdminActivity)?.naviguerVers(AdminAlertesFragment())
        }
    }

    // ── Data loading ─────────────────────────────────────────────────────────

    private fun loadDashboard() {
        refreshView.isRefreshing = true
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val (statsResponse, meResponse) = coroutineScope {
                    val s = async { ApiClient.apiService.getDashboardStats() }
                    val m = async { runCatching { ApiClient.apiService.getMe() }.getOrNull() }
                    s.await() to m.await()
                }

                // Admin name
                val user = meResponse?.data?.user
                val displayName = listOfNotNull(user?.prenom, user?.nom).joinToString(" ")
                    .ifBlank { "Administrateur" }
                val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
                val greeting = when {
                    hour < 12 -> "Bonjour"
                    hour < 18 -> "Bon après-midi"
                    else      -> "Bonsoir"
                }
                tvAdminName.text = "$greeting, $displayName"

                // Stats
                val stats = statsResponse.data
                if (statsResponse.status == "success" && stats != null) {
                    totalVaccinesView.text = stats.totalVaccinations?.toString() ?: "0"
                    centresCountView.text  = stats.centresActifs?.toString()    ?: "0"
                    staffCountView.text    = stats.totalPersonnel?.toString()   ?: "0"
                    sessionsCountView.text = stats.sessionsAVenir?.toString()   ?: "0"
                    updateChart(stats)
                    renderStats(stats)
                    updateAlertBanner(stats)
                }

                // Timestamp
                tvLastUpdated.text = "Mis à jour à ${SimpleDateFormat("HH:mm", Locale.FRANCE).format(Date())}"

            } catch (e: Exception) {
                totalVaccinesView.text = "—"
                centresCountView.text  = "—"
                staffCountView.text    = "—"
                sessionsCountView.text = "—"
                com.google.android.material.snackbar.Snackbar
                    .make(requireView(), e.message ?: "Tableau de bord indisponible",
                          com.google.android.material.snackbar.Snackbar.LENGTH_LONG)
                    .show()
            } finally {
                refreshView.isRefreshing = false
            }
        }
    }

    // ── Chart ─────────────────────────────────────────────────────────────────

    private fun updateChart(stats: DashboardStatsDto) {
        val values = listOf(
            stats.rdvEnAttente ?: 0,
            stats.rdvConfirmes ?: 0,
            stats.rdvPresents  ?: 0,
            stats.rdvAbsents   ?: 0
        )
        if (values.all { it == 0 }) { barChart.visibility = View.GONE; return }
        barChart.visibility = View.VISIBLE
        val colors = listOf(
            Color.parseColor("#F59E0B"),  // En attente — amber
            Color.parseColor("#60A5FA"),  // Confirmés — bleu clair
            Color.parseColor("#34D399"),  // Présents — vert
            Color.parseColor("#F87171"),  // Absents — rouge clair
        )
        val entries = values.mapIndexed { i, v -> BarEntry(i.toFloat(), v.toFloat()) }
        val set = BarDataSet(entries, "").apply {
            this.colors = colors
            setDrawValues(false)
        }
        barChart.data = BarData(set).apply { barWidth = 0.55f }
        barChart.invalidate()
    }

    // ── Alert banner ──────────────────────────────────────────────────────────

    private fun updateAlertBanner(stats: DashboardStatsDto) {
        val stockAlerts = stats.alertesStock ?: 0
        if (stockAlerts > 0) {
            alertBanner.visibility = View.VISIBLE
            alertBannerText.text = "$stockAlerts alerte(s) de stock critique — Voir détail →"
        } else {
            alertBanner.visibility = View.GONE
        }
    }

    // ── Stats du jour ─────────────────────────────────────────────────────────

    private fun renderStats(stats: DashboardStatsDto) {
        activityContainer.removeAllViews()
        val inflater = LayoutInflater.from(requireContext())

        val rdvRows = listOfNotNull(
            stats.rdvPresents?.takeIf { it > 0 }?.let { "Patients présents aujourd'hui"    to it.toString() },
            stats.rdvConfirmes?.takeIf { it > 0 }?.let { "RDV confirmés en attente"         to it.toString() },
            stats.rdvEnAttente?.takeIf { it > 0 }?.let { "RDV en attente de confirmation"   to it.toString() },
            stats.rdvAbsents?.takeIf { it > 0 }?.let  { "Absences enregistrées"             to it.toString() },
        )

        val globalRows = listOf(
            "Total bébés suivis"      to (stats.totalBebes?.toString() ?: "0"),
            "Total parents inscrits"  to (stats.totalParents?.toString() ?: "0"),
            "Vaccinations effectuées" to (stats.totalVaccinations?.toString() ?: "0"),
        )

        if (rdvRows.isEmpty()) {
            // Empty state — no sessions today
            val empty = inflater.inflate(R.layout.item_dashboard_stat_row, activityContainer, false)
            empty.findViewById<TextView>(R.id.tvStatRowLabel).text = "Aucune session en cours aujourd'hui"
            empty.findViewById<TextView>(R.id.tvStatRowValue).text = ""
            activityContainer.addView(empty)
        } else {
            rdvRows.forEach { (label, value) ->
                val row = inflater.inflate(R.layout.item_dashboard_stat_row, activityContainer, false)
                row.findViewById<TextView>(R.id.tvStatRowLabel).text = label
                row.findViewById<TextView>(R.id.tvStatRowValue).text = value
                activityContainer.addView(row)
            }
        }

        globalRows.forEach { (label, value) ->
            val row = inflater.inflate(R.layout.item_dashboard_stat_row, activityContainer, false)
            row.findViewById<TextView>(R.id.tvStatRowLabel).text = label
            row.findViewById<TextView>(R.id.tvStatRowValue).text = value
            activityContainer.addView(row)
        }
    }

    // ── Logout ────────────────────────────────────────────────────────────────

    private fun confirmLogout() {
        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Déconnexion")
            .setMessage("Voulez-vous fermer la session administrateur ?")
            .setNegativeButton("Annuler", null)
            .setPositiveButton("Déconnexion") { _, _ -> doLogout() }
            .show()
    }

    private fun doLogout() {
        viewLifecycleOwner.lifecycleScope.launch {
            val refreshToken = TokenManager.getRefreshToken()
            try { ApiClient.apiService.logout(mapOf("refreshToken" to refreshToken)) } catch (_: Exception) {}
            finally {
                TokenManager.clearTokens()
                startActivity(Intent(requireContext(), AdminLoginActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                })
            }
        }
    }
}
