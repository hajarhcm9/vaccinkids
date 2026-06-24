package com.example.vaccinkid

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.example.vaccinkid.model.SessionDto
import com.example.vaccinkid.viewmodel.DashboardViewModel
import com.google.android.material.card.MaterialCardView
import com.google.android.material.progressindicator.LinearProgressIndicator
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

class DashboardFragment : Fragment(R.layout.fragment_dashboard) {

    private lateinit var dashboardViewModel: DashboardViewModel
    private lateinit var refreshView: SwipeRefreshLayout

    private lateinit var nurseNameView: TextView
    private lateinit var centerNameView: TextView
    private lateinit var dateView: TextView
    private lateinit var sessionTimeView: TextView
    private lateinit var sessionsCountView: TextView
    private lateinit var progressRdv: LinearProgressIndicator
    private lateinit var tvProgressLabel: TextView
    private lateinit var tvAvatarInitials: TextView
    private lateinit var tvNotifBadge: TextView

    private lateinit var rdvKpiView: TextView
    private lateinit var vaccinesKpiView: TextView
    private lateinit var waitingKpiView: TextView
    private lateinit var absentsKpiView: TextView

    private lateinit var cvKpiRdv: MaterialCardView
    private lateinit var cvKpiVaccines: MaterialCardView
    private lateinit var cvKpiWaiting: MaterialCardView
    private lateinit var cvKpiAbsents: MaterialCardView

    private lateinit var cvNextRdv: MaterialCardView
    private lateinit var llNextRdvEmpty: View
    private lateinit var tvNextRdvInitials: TextView
    private lateinit var nextRdvTime: TextView
    private lateinit var nextRdvPatient: TextView
    private lateinit var nextRdvAge: TextView
    private lateinit var nextRdvType: TextView
    private lateinit var tvNextRdvQueue: TextView

    private lateinit var bannerStockAlert: View
    private lateinit var tvStockAlertText: TextView
    private lateinit var messageView: TextView

    private var statsLoading = false
    private var sessionsLoading = false

    private val refreshHandler = Handler(Looper.getMainLooper())
    private val refreshRunnable = object : Runnable {
        override fun run() {
            if (isAdded && !isDetached) {
                refreshDashboard()
                refreshHandler.postDelayed(this, 30_000L)
            }
        }
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        bindViews(view)
        bindActions(view)

        dashboardViewModel = ViewModelProvider(this)[DashboardViewModel::class.java]

        observeDashboard()
        refreshDashboard()
    }

    override fun onResume() {
        super.onResume()
        refreshHandler.postDelayed(refreshRunnable, 30_000L)
    }

    override fun onPause() {
        super.onPause()
        refreshHandler.removeCallbacks(refreshRunnable)
    }

    private fun bindViews(view: View) {
        refreshView       = view.findViewById(R.id.dashboardRefresh)
        nurseNameView     = view.findViewById(R.id.tvDashboardNurseName)
        centerNameView    = view.findViewById(R.id.tvDashboardCenterName)
        dateView          = view.findViewById(R.id.tvDashboardDate)
        sessionTimeView   = view.findViewById(R.id.tvSessionTime)
        sessionsCountView = view.findViewById(R.id.tvDashboardSessionsCount)
        progressRdv       = view.findViewById(R.id.progressRdv)
        tvProgressLabel   = view.findViewById(R.id.tvProgressLabel)
        tvAvatarInitials  = view.findViewById(R.id.tvDashboardAvatarInitials)
        tvNotifBadge      = view.findViewById(R.id.tvNotifBadge)

        rdvKpiView      = view.findViewById(R.id.tvKpiRdv)
        vaccinesKpiView = view.findViewById(R.id.tvKpiVaccines)
        waitingKpiView  = view.findViewById(R.id.tvKpiWaiting)
        absentsKpiView  = view.findViewById(R.id.tvKpiAbsents)

        cvKpiRdv      = view.findViewById(R.id.cvKpiRdv)
        cvKpiVaccines = view.findViewById(R.id.cvKpiVaccines)
        cvKpiWaiting  = view.findViewById(R.id.cvKpiWaiting)
        cvKpiAbsents  = view.findViewById(R.id.cvKpiAbsents)

        cvNextRdv         = view.findViewById(R.id.cvNextRdv)
        llNextRdvEmpty    = view.findViewById(R.id.llNextRdvEmpty)
        tvNextRdvInitials = view.findViewById(R.id.tvNextRdvInitials)
        nextRdvTime       = view.findViewById(R.id.tvNextRdvTime)
        nextRdvPatient    = view.findViewById(R.id.tvNextRdvPatient)
        nextRdvAge        = view.findViewById(R.id.tvNextRdvAge)
        nextRdvType       = view.findViewById(R.id.tvNextRdvType)
        tvNextRdvQueue    = view.findViewById(R.id.tvNextRdvQueue)

        bannerStockAlert = view.findViewById(R.id.bannerStockAlert)
        tvStockAlertText = view.findViewById(R.id.tvStockAlertText)
        messageView      = view.findViewById(R.id.dashboardMessage)

        val dayFormat = SimpleDateFormat("EEEE dd MMMM", Locale.FRENCH)
        dateView.text = dayFormat.format(Date()).replaceFirstChar { it.uppercaseChar() }
        nurseNameView.text = dynamicGreeting()
    }

    private fun bindActions(view: View) {
        refreshView.setColorSchemeResources(R.color.brand_teal, R.color.brand_coral, R.color.brand_blue)
        refreshView.setOnRefreshListener(::refreshDashboard)

        view.findViewById<View>(R.id.btnDashboardNotifications).setOnClickListener {
            (activity as? MainInfirmierActivity)?.naviguerVers(StaffNotificationsFragment())
        }

        view.findViewById<View>(R.id.dashboardOpenScan).setOnClickListener { selectNav(R.id.nav_scan) }
        view.findViewById<View>(R.id.btnQueueDashboard).setOnClickListener { selectNav(R.id.nav_queue) }
        view.findViewById<View>(R.id.tvVoirTout).setOnClickListener { selectNav(R.id.nav_rdv) }
        cvNextRdv.setOnClickListener { selectNav(R.id.nav_rdv) }

        cvKpiRdv.setOnClickListener { selectNav(R.id.nav_rdv) }
        cvKpiVaccines.setOnClickListener { selectNav(R.id.nav_rdv) }
        cvKpiWaiting.setOnClickListener { selectNav(R.id.nav_queue) }
        cvKpiAbsents.setOnClickListener { selectNav(R.id.nav_rdv) }

        bannerStockAlert.setOnClickListener {
            startActivity(Intent(requireContext(), GestionStocksActivity::class.java))
        }
    }

    private fun observeDashboard() {
        dashboardViewModel.isLoading.observe(viewLifecycleOwner) {
            statsLoading = it
            updateRefreshState()
        }

        dashboardViewModel.user.observe(viewLifecycleOwner) { user ->
            if (user != null) {
                val greeting  = dynamicGreeting()
                val firstName = user.prenom?.replaceFirstChar { it.uppercaseChar() } ?: ""
                nurseNameView.text  = if (firstName.isNotBlank()) "$greeting $firstName !" else greeting
                centerNameView.text = user.centreNom ?: "Centre de santé"

                tvAvatarInitials.text = buildString {
                    user.prenom?.firstOrNull()?.uppercaseChar()?.let { append(it) }
                    user.nom?.firstOrNull()?.uppercaseChar()?.let { append(it) }
                }.ifBlank { "?" }
            }
        }

        dashboardViewModel.stats.observe(viewLifecycleOwner) { result ->
            result.fold(
                onSuccess = { stats ->
                    messageView.visibility = View.GONE

                    val confirmes = stats.rdvConfirmes ?: 0
                    val presents  = stats.rdvPresents  ?: 0
                    val absents   = stats.rdvAbsents   ?: 0
                    val enAttente = stats.rdvEnAttente ?: 0

                    rdvKpiView.text      = confirmes.toString()
                    vaccinesKpiView.text = presents.toString()
                    absentsKpiView.text  = absents.toString()
                    waitingKpiView.text  = enAttente.toString()

                    val total = confirmes + presents + absents
                    if (total > 0) {
                        val pct = (presents * 100) / total
                        progressRdv.setProgressCompat(pct, true)
                        tvProgressLabel.text = "$presents / $total vaccinés"
                    } else {
                        progressRdv.setProgressCompat(0, false)
                        tvProgressLabel.text = "Aucun RDV aujourd'hui"
                    }

                    val alertes = stats.alertesStock ?: 0
                    if (alertes > 0) {
                        tvStockAlertText.text = if (alertes == 1)
                            "1 alerte de stock critique"
                        else
                            "$alertes alertes de stock critique"
                        bannerStockAlert.visibility = View.VISIBLE
                    } else {
                        bannerStockAlert.visibility = View.GONE
                    }
                },
                onFailure = { error ->
                    rdvKpiView.text      = "-"
                    vaccinesKpiView.text = "-"
                    absentsKpiView.text  = "-"
                    waitingKpiView.text  = "-"
                    messageView.text       = error.message ?: "Erreur de chargement"
                    messageView.visibility = View.VISIBLE
                }
            )
        }
    }

    private fun refreshDashboard() {
        dashboardViewModel.loadAll()
        loadTodaySessions()
    }

    private fun loadTodaySessions() {
        sessionsLoading = true
        updateRefreshState()
        lifecycleScope.launch {
            try {
                val response = com.example.vaccinkid.network.ApiClient.apiService.getTodaySessions()
                if (response.status == "success") {
                    val sessions = response.data.orEmpty()
                    val active = sessions.filter {
                        it.statut?.uppercase() in listOf("CONFIRMEE", "EN_COURS")
                    }
                    sessionsCountView.text = active.size.toString()

                    val current = active.firstOrNull { it.statut?.uppercase() == "EN_COURS" }
                        ?: active.firstOrNull()
                        ?: sessions.firstOrNull { it.statut?.uppercase() == "CONFIRMEE" }

                    if (current != null) {
                        showSessionTime(current)
                        loadNextRdv(current.id)
                    } else {
                        sessionsCountView.text = "0"
                        showNextRdvEmpty()
                    }
                }
            } catch (_: Exception) {
                sessionsCountView.text = "0"
                showNextRdvEmpty()
            } finally {
                sessionsLoading = false
                updateRefreshState()
            }
        }
    }

    private fun showSessionTime(session: SessionDto) {
        val start = session.heureDebut?.take(5)
        val end   = session.heureFin?.take(5)
        if (start != null && end != null) {
            sessionTimeView.text       = "$start – $end"
            sessionTimeView.visibility = View.VISIBLE
        }
    }

    private fun loadNextRdv(sessionId: Int) {
        lifecycleScope.launch {
            try {
                val response = com.example.vaccinkid.network.ApiClient.apiService.getSessionRendezVous(sessionId)
                if (response.status == "success") {
                    val upcoming = response.data.orEmpty()
                        .filter { it.statut?.uppercase() in listOf("EN_ATTENTE", "CONFIRME", "CONFIRMEE") }
                        .minByOrNull { it.heureDebut ?: "99:99" }

                    if (upcoming != null) {
                        val patientName = listOfNotNull(upcoming.bebePrenom, upcoming.bebeNom)
                            .joinToString(" ").ifBlank { "Bébé #${upcoming.bebeId}" }

                        nextRdvPatient.text = patientName
                        nextRdvAge.text     = calculateAge(upcoming.bebeDateNaissance)
                        nextRdvTime.text    = upcoming.heureDebut?.take(5) ?: "--:--"
                        nextRdvType.text    = upcoming.vaccinNom ?: "Vaccin"
                        tvNextRdvQueue.text = upcoming.numeroQueue?.let { "#$it" } ?: "#–"

                        val parts = patientName.trim().split(" ")
                        tvNextRdvInitials.text = buildString {
                            parts.getOrNull(0)?.firstOrNull()?.uppercaseChar()?.let { append(it) }
                            parts.getOrNull(1)?.firstOrNull()?.uppercaseChar()?.let { append(it) }
                        }.ifBlank { "?" }

                        cvNextRdv.visibility      = View.VISIBLE
                        llNextRdvEmpty.visibility = View.GONE
                    } else {
                        showNextRdvEmpty()
                    }
                } else {
                    showNextRdvEmpty()
                }
            } catch (_: Exception) {
                showNextRdvEmpty()
            }
        }
    }

    private fun showNextRdvEmpty() {
        cvNextRdv.visibility      = View.GONE
        llNextRdvEmpty.visibility = View.VISIBLE
    }

    private fun calculateAge(dateNaissance: String?): String {
        if (dateNaissance.isNullOrBlank()) return "Âge inconnu"
        return try {
            val sdf   = SimpleDateFormat("yyyy-MM-dd", Locale.FRENCH)
            val dob   = sdf.parse(dateNaissance) ?: return "Âge inconnu"
            val cal   = Calendar.getInstance()
            val today = cal.clone() as Calendar
            cal.time  = dob
            var years  = today.get(Calendar.YEAR)  - cal.get(Calendar.YEAR)
            var months = today.get(Calendar.MONTH) - cal.get(Calendar.MONTH)
            if (months < 0) { years--; months += 12 }
            when {
                years > 0  -> "$years an${if (years > 1) "s" else ""} $months mois"
                months > 0 -> "$months mois"
                else       -> "Nouveau-né"
            }
        } catch (_: Exception) { "Âge inconnu" }
    }

    private fun dynamicGreeting(): String {
        val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
        return when {
            hour < 12 -> "Bon matin,"
            hour < 18 -> "Bon après-midi,"
            else      -> "Bonsoir,"
        }
    }

    private fun updateRefreshState() {
        refreshView.isRefreshing = statsLoading || sessionsLoading
    }

    private fun selectNav(itemId: Int) {
        (activity as? MainInfirmierActivity)
            ?.findViewById<com.google.android.material.bottomnavigation.BottomNavigationView>(R.id.bottomNav)
            ?.selectedItemId = itemId
    }
}
