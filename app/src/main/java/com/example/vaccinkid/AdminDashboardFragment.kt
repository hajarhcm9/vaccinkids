package com.example.vaccinkid

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.example.vaccinkid.network.ApiClient
import com.example.vaccinkid.viewmodel.InfirmierAuthViewModel
import com.github.mikephil.charting.charts.BarChart
import com.github.mikephil.charting.components.XAxis
import com.github.mikephil.charting.data.BarData
import com.github.mikephil.charting.data.BarDataSet
import com.github.mikephil.charting.data.BarEntry
import com.google.android.material.card.MaterialCardView
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class AdminDashboardFragment : Fragment(R.layout.fragment_admin_dashboard) {

    private lateinit var authViewModel: InfirmierAuthViewModel

    // Header
    private lateinit var tvAdminAvatarInitials: TextView
    private lateinit var tvAdminGreeting: TextView
    private lateinit var tvAdminName: TextView
    private lateinit var tvNotifBadge: TextView
    private lateinit var btnAdminLogout: View

    // Hero
    private lateinit var tvTotalVaccines: TextView
    private lateinit var tvAdminPeriod: TextView
    private lateinit var tvAdminDateBadge: TextView
    private lateinit var barChartSummary: BarChart
    private lateinit var heroCard: MaterialCardView

    // KPI Row 1
    private lateinit var cvKpiSessions: MaterialCardView
    private lateinit var tvKpiSessions: TextView
    private lateinit var cvKpiCentres: MaterialCardView
    private lateinit var tvKpiCentres: TextView
    private lateinit var cvKpiStaff: MaterialCardView
    private lateinit var tvKpiStaff: TextView

    // KPI Row 2
    private lateinit var cvKpiVaccinations: MaterialCardView
    private lateinit var tvKpiVaccinations: TextView
    private lateinit var cvKpiAlertes: MaterialCardView
    private lateinit var tvKpiAlertes: TextView
    private lateinit var cvKpiBebes: MaterialCardView
    private lateinit var tvKpiBebes: TextView

    // Alert banner
    private lateinit var llAlertBanner: MaterialCardView
    private lateinit var tvAlertBannerText: TextView

    // Activity
    private lateinit var llActivitySessions: LinearLayout
    private lateinit var tvActivitySessionsDetail: TextView
    private lateinit var llActivityRdv: LinearLayout
    private lateinit var tvActivityRdvDetail: TextView
    private lateinit var llActivityPresents: LinearLayout
    private lateinit var tvActivityPresentsDetail: TextView
    private lateinit var llActivityAlertes: LinearLayout
    private lateinit var tvActivityAlertesDetail: TextView
    private lateinit var dividerActivity3: View

    private lateinit var tvLastUpdated: TextView
    private lateinit var adminRefresh: SwipeRefreshLayout

    // KPI cards list for staggered animation
    private val kpiCards get() = listOf(cvKpiSessions, cvKpiCentres, cvKpiStaff,
        cvKpiVaccinations, cvKpiAlertes, cvKpiBebes)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        authViewModel = ViewModelProvider(this)[InfirmierAuthViewModel::class.java]

        bindViews(view)
        setupClickListeners()
        setupPeriod()
        setupChart()
        loadData()

        adminRefresh.setOnRefreshListener { loadData() }
    }

    private fun bindViews(view: View) {
        tvAdminAvatarInitials   = view.findViewById(R.id.tvAdminAvatarInitials)
        tvAdminGreeting         = view.findViewById(R.id.tvAdminGreeting)
        tvAdminName             = view.findViewById(R.id.tvAdminName)
        tvNotifBadge            = view.findViewById(R.id.tvNotifBadge)
        btnAdminLogout          = view.findViewById(R.id.btnAdminLogout)
        tvTotalVaccines         = view.findViewById(R.id.tvTotalVaccines)
        tvAdminPeriod           = view.findViewById(R.id.tvAdminPeriod)
        tvAdminDateBadge        = view.findViewById(R.id.tvAdminDateBadge)
        barChartSummary         = view.findViewById(R.id.barChartSummary)
        heroCard                = view.findViewById(R.id.heroCard)
        cvKpiSessions           = view.findViewById(R.id.cvKpiSessions)
        tvKpiSessions           = view.findViewById(R.id.tvKpiSessions)
        cvKpiCentres            = view.findViewById(R.id.cvKpiCentres)
        tvKpiCentres            = view.findViewById(R.id.tvKpiCentres)
        cvKpiStaff              = view.findViewById(R.id.cvKpiStaff)
        tvKpiStaff              = view.findViewById(R.id.tvKpiStaff)
        cvKpiVaccinations       = view.findViewById(R.id.cvKpiVaccinations)
        tvKpiVaccinations       = view.findViewById(R.id.tvKpiVaccinations)
        cvKpiAlertes            = view.findViewById(R.id.cvKpiAlertes)
        tvKpiAlertes            = view.findViewById(R.id.tvKpiAlertes)
        cvKpiBebes              = view.findViewById(R.id.cvKpiBebes)
        tvKpiBebes              = view.findViewById(R.id.tvKpiBebes)
        llAlertBanner           = view.findViewById(R.id.llAlertBanner)
        tvAlertBannerText       = view.findViewById(R.id.tvAlertBannerText)
        llActivitySessions      = view.findViewById(R.id.llActivitySessions)
        tvActivitySessionsDetail= view.findViewById(R.id.tvActivitySessionsDetail)
        llActivityRdv           = view.findViewById(R.id.llActivityRdv)
        tvActivityRdvDetail     = view.findViewById(R.id.tvActivityRdvDetail)
        llActivityPresents      = view.findViewById(R.id.llActivityPresents)
        tvActivityPresentsDetail= view.findViewById(R.id.tvActivityPresentsDetail)
        llActivityAlertes       = view.findViewById(R.id.llActivityAlertes)
        tvActivityAlertesDetail = view.findViewById(R.id.tvActivityAlertesDetail)
        dividerActivity3        = view.findViewById(R.id.dividerActivity3)
        tvLastUpdated           = view.findViewById(R.id.tvLastUpdated)
        adminRefresh            = view.findViewById(R.id.adminRefresh)

        // Initial hidden state for entrance animation
        heroCard.alpha = 0f
        heroCard.scaleY = 0.92f
        kpiCards.forEach { it.alpha = 0f; it.translationY = 24f }
    }

    private fun setupClickListeners() {
        val admin = requireActivity() as AdminActivity

        btnAdminLogout.setOnClickListener { showLogoutDialog() }

        cvKpiSessions.setOnClickListener    { admin.naviguerVers(GestionSessionsFragment()) }
        cvKpiCentres.setOnClickListener     { admin.naviguerVers(AdminSearchFragment()) }
        cvKpiStaff.setOnClickListener       { admin.naviguerVers(GestionPersonnelFragment()) }
        cvKpiVaccinations.setOnClickListener { admin.naviguerVers(AdminRendezVousFragment()) }
        cvKpiAlertes.setOnClickListener     { admin.naviguerVers(AdminAlertesFragment()) }
        cvKpiBebes.setOnClickListener       { admin.naviguerVers(AdminRendezVousFragment()) }
        llAlertBanner.setOnClickListener    { admin.naviguerVers(AdminAlertesFragment()) }

        llActivitySessions.setOnClickListener { admin.naviguerVers(GestionSessionsFragment()) }
        llActivityRdv.setOnClickListener      { admin.naviguerVers(AdminRendezVousFragment()) }
        llActivityPresents.setOnClickListener { admin.naviguerVers(AdminRendezVousFragment()) }
        llActivityAlertes.setOnClickListener  { admin.naviguerVers(AdminAlertesFragment()) }

        view?.findViewById<View>(R.id.tvViewAll)?.setOnClickListener {
            admin.naviguerVers(AdminRendezVousFragment())
        }
        view?.findViewById<View>(R.id.llViewSelector)?.setOnClickListener { /* label only */ }
    }

    private fun setupPeriod() {
        val month = SimpleDateFormat("MMMM yyyy", Locale.FRENCH).format(Date())
            .replaceFirstChar { it.uppercase() }
        tvAdminPeriod.text = month
        tvAdminDateBadge.text = month
        tvAdminGreeting.text = greetingForHour()
    }

    private fun setupChart() {
        barChartSummary.apply {
            description.isEnabled = false
            legend.isEnabled = false
            setTouchEnabled(false)
            setDrawGridBackground(false)
            setDrawBorders(false)
            setBackgroundColor(Color.TRANSPARENT)

            xAxis.apply {
                setDrawGridLines(false)
                setDrawLabels(false)
                setDrawAxisLine(false)
                position = XAxis.XAxisPosition.BOTTOM
            }
            axisLeft.apply {
                setDrawGridLines(false)
                setDrawLabels(false)
                setDrawAxisLine(false)
            }
            axisRight.isEnabled = false
        }
    }

    private fun loadData() {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                // Load profile
                val meResp = ApiClient.apiService.getMe()
                val user = meResp.data?.user
                if (user != null) {
                    val fullName = listOfNotNull(user.prenom, user.nom)
                        .joinToString(" ").ifBlank { "Administrateur" }
                    tvAdminName.text = fullName
                    tvAdminAvatarInitials.text = buildInitials(user.prenom ?: "", user.nom ?: "")
                }
            } catch (_: Exception) {}

            try {
                // Load dashboard stats
                val statsResp = ApiClient.apiService.getDashboardStats()
                val stats = statsResp.data ?: return@launch

                // Hero big number
                tvTotalVaccines.text = formatCount(stats.totalVaccinations ?: 0)

                // KPI Row 1
                tvKpiSessions.text  = formatCount(stats.sessionsAVenir ?: 0)
                tvKpiCentres.text   = formatCount(stats.centresActifs ?: 0)
                tvKpiStaff.text     = formatCount(stats.totalPersonnel ?: 0)

                // KPI Row 2
                tvKpiVaccinations.text = formatCount(stats.totalVaccinations ?: 0)
                val alertes = stats.alertesStock ?: 0
                tvKpiAlertes.text   = formatCount(alertes)
                tvKpiBebes.text     = formatCount(stats.totalBebes ?: 0)

                // Notification badge
                if (alertes > 0) {
                    tvNotifBadge.text = if (alertes > 9) "9+" else alertes.toString()
                    tvNotifBadge.visibility = View.VISIBLE
                } else {
                    tvNotifBadge.visibility = View.GONE
                }

                // Alert banner
                if (alertes > 0) {
                    tvAlertBannerText.text =
                        "$alertes alerte${if (alertes > 1) "s" else ""} stock critique${if (alertes > 1) "s" else ""} — Appuyez pour voir"
                    llAlertBanner.visibility = View.VISIBLE
                } else {
                    llAlertBanner.visibility = View.GONE
                }

                // Activity section
                val sessions  = stats.sessionsAVenir ?: 0
                val confirmes = stats.rdvConfirmes ?: 0
                val presents  = stats.rdvPresents ?: 0

                tvActivitySessionsDetail.text =
                    "$sessions session${if (sessions != 1) "s" else ""} programmée${if (sessions != 1) "s" else ""}"
                tvActivityRdvDetail.text =
                    "$confirmes RDV confirmé${if (confirmes != 1) "s" else ""}"
                tvActivityPresentsDetail.text =
                    "$presents patient${if (presents != 1) "s" else ""} présent${if (presents != 1) "s" else ""} aujourd'hui"

                if (alertes > 0) {
                    tvActivityAlertesDetail.text =
                        "$alertes produit${if (alertes > 1) "s" else ""} en rupture imminente"
                    llActivityAlertes.visibility = View.VISIBLE
                    dividerActivity3.visibility  = View.VISIBLE
                } else {
                    llActivityAlertes.visibility = View.GONE
                    dividerActivity3.visibility  = View.GONE
                }

                // Bar chart: rdv breakdown
                updateChart(
                    enAttente  = stats.rdvEnAttente  ?: 0,
                    confirmes  = confirmes,
                    presents   = presents,
                    absents    = stats.rdvAbsents    ?: 0
                )

                // Timestamp
                val heure = SimpleDateFormat("HH:mm", Locale.FRENCH).format(Date())
                tvLastUpdated.text = "Mis à jour à $heure"

                // Run entrance animations
                runEntranceAnimations()

            } catch (_: Exception) {
                tvLastUpdated.text = "Erreur de chargement"
            } finally {
                if (::adminRefresh.isInitialized) adminRefresh.isRefreshing = false
            }
        }
    }

    private fun updateChart(enAttente: Int, confirmes: Int, presents: Int, absents: Int) {
        val entries = listOf(enAttente, confirmes, presents, absents)
            .mapIndexed { i, v -> BarEntry(i.toFloat(), v.toFloat()) }

        val dataSet = BarDataSet(entries, "").apply {
            color = Color.parseColor("#B3FFFFFF")
            setDrawValues(false)
        }

        barChartSummary.data = BarData(dataSet).apply { barWidth = 0.5f }
        barChartSummary.animateY(900)

        // Fade in chart after data loaded
        barChartSummary.animate().alpha(0.75f).setDuration(600).setStartDelay(400).start()
    }

    private fun runEntranceAnimations() {
        // Hero fade + scale
        heroCard.animate()
            .alpha(1f)
            .scaleY(1f)
            .setDuration(450)
            .setStartDelay(80)
            .start()

        // KPI cards cascade
        kpiCards.forEachIndexed { index, card ->
            card.animate()
                .alpha(1f)
                .translationY(0f)
                .setDuration(350)
                .setStartDelay((120 + index * 80).toLong())
                .start()
        }
    }

    private fun showLogoutDialog() {
        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Se déconnecter ?")
            .setMessage("Vous serez redirigé vers l'écran de connexion.")
            .setNegativeButton("Annuler", null)
            .setPositiveButton("Se déconnecter") { _, _ ->
                authViewModel.logout {
                    startActivity(
                        Intent(requireContext(), AdminLoginActivity::class.java).apply {
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                        }
                    )
                }
            }
            .show()
    }

    private fun buildInitials(prenom: String, nom: String): String {
        val p = prenom.firstOrNull()?.uppercaseChar()
        val n = nom.firstOrNull()?.uppercaseChar()
        return listOfNotNull(p, n).joinToString("").ifBlank { "AD" }
    }

    private fun formatCount(n: Int): String = when {
        n >= 1_000_000 -> "${n / 1_000_000}M"
        n >= 1_000     -> "${n / 1_000},${(n % 1_000) / 100}k"
        else           -> n.toString()
    }

    private fun greetingForHour(): String {
        val hour = java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY)
        return when {
            hour < 12 -> "Bonjour,"
            hour < 18 -> "Bon après-midi,"
            else      -> "Bonsoir,"
        }
    }
}
