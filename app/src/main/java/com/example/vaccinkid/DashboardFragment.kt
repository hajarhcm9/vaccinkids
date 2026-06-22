package com.example.vaccinkid

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.example.vaccinkid.network.ApiClient
import com.example.vaccinkid.network.TokenManager
import com.example.vaccinkid.viewmodel.DashboardViewModel
import com.example.vaccinkid.viewmodel.InfirmierAuthViewModel
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class DashboardFragment : Fragment(R.layout.fragment_dashboard) {
    private lateinit var dashboardViewModel: DashboardViewModel
    private lateinit var authViewModel: InfirmierAuthViewModel
    private lateinit var refreshView: SwipeRefreshLayout
    
    private lateinit var nurseNameView: TextView
    private lateinit var centerNameView: TextView
    private lateinit var dateView: TextView
    private lateinit var sessionsCountView: TextView
    
    private lateinit var rdvKpiView: TextView
    private lateinit var vaccinesKpiView: TextView
    private lateinit var waitingKpiView: TextView
    private lateinit var absentsKpiView: TextView
    
    private lateinit var nextRdvTime: TextView
    private lateinit var nextRdvPatient: TextView
    private lateinit var nextRdvAge: TextView
    private lateinit var nextRdvType: TextView
    
    private lateinit var messageView: TextView
    private var statsLoading = false
    private var sessionsLoading = false

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        bindViews(view)
        bindActions(view)

        dashboardViewModel = ViewModelProvider(this)[DashboardViewModel::class.java]
        authViewModel = ViewModelProvider(this)[InfirmierAuthViewModel::class.java]
        
        loadProfileData()
        observeDashboard()
        refreshDashboard()
    }

    private fun bindViews(view: View) {
        refreshView = view.findViewById(R.id.dashboardRefresh)
        
        nurseNameView = view.findViewById(R.id.tvDashboardNurseName)
        centerNameView = view.findViewById(R.id.tvDashboardCenterName)
        dateView = view.findViewById(R.id.tvDashboardDate)
        sessionsCountView = view.findViewById(R.id.tvDashboardSessionsCount)
        
        rdvKpiView = view.findViewById(R.id.tvKpiRdv)
        vaccinesKpiView = view.findViewById(R.id.tvKpiVaccines)
        waitingKpiView = view.findViewById(R.id.tvKpiWaiting)
        absentsKpiView = view.findViewById(R.id.tvKpiAbsents)
        
        nextRdvTime = view.findViewById(R.id.tvNextRdvTime)
        nextRdvPatient = view.findViewById(R.id.tvNextRdvPatient)
        nextRdvAge = view.findViewById(R.id.tvNextRdvAge)
        nextRdvType = view.findViewById(R.id.tvNextRdvType)
        
        messageView = view.findViewById(R.id.dashboardMessage)
        
        dateView.text = SimpleDateFormat("dd MMMM yyyy", Locale.FRENCH).format(Date())
    }

    private fun bindActions(view: View) {
        refreshView.setColorSchemeResources(R.color.brand_teal, R.color.brand_coral, R.color.brand_blue)
        refreshView.setOnRefreshListener(::refreshDashboard)
        
        view.findViewById<View>(R.id.btnDashboardNotifications).setOnClickListener {
            (activity as? MainInfirmierActivity)?.naviguerVers(StaffNotificationsFragment())
        }
        
        view.findViewById<View>(R.id.dashboardOpenScan).setOnClickListener { selectNav(R.id.nav_scan) }
        view.findViewById<View>(R.id.tvVoirTout).setOnClickListener { selectNav(R.id.nav_rdv) }
        view.findViewById<View>(R.id.cvNextRdv).setOnClickListener { selectNav(R.id.nav_rdv) }
    }

    private fun loadProfileData() {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.getMe()
                val user = response.data?.user
                val prenom = user?.prenom?.let { "$it " } ?: ""
                nurseNameView.text = "Bonjour, $prenom${user?.nom ?: "infirmier"}"
                centerNameView.text = user?.centreNom ?: "Centre de santé"
            } catch (_: Exception) {}
        }
    }

    private fun observeDashboard() {
        dashboardViewModel.isLoading.observe(viewLifecycleOwner) {
            statsLoading = it
            updateRefreshState()
        }
        dashboardViewModel.stats.observe(viewLifecycleOwner) { result ->
            result.fold(
                onSuccess = { stats ->
                    rdvKpiView.text = (stats.rdvConfirmes ?: 0).toString()
                    vaccinesKpiView.text = (stats.rdvPresents ?: 0).toString()
                    absentsKpiView.text = (stats.rdvAbsents ?: 0).toString()
                    waitingKpiView.text = (stats.rdvEnAttente ?: 0).toString()
                },
                onFailure = {
                    rdvKpiView.text = "-"
                    vaccinesKpiView.text = "-"
                    absentsKpiView.text = "-"
                    waitingKpiView.text = "-"
                    messageView.text = it.message ?: "Erreur stats"
                }
            )
        }
    }

    private fun refreshDashboard() {
        dashboardViewModel.loadStats()
        loadTodaySessions()
    }

    private fun loadTodaySessions() {
        sessionsLoading = true
        updateRefreshState()
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.getTodaySessions()
                if (response.status == "success") {
                    val sessions = response.data.orEmpty()
                    sessionsCountView.text = sessions.size.toString()
                    val firstActive = sessions.firstOrNull { it.statut?.uppercase() in listOf("CONFIRMEE", "EN_COURS") }
                        ?: sessions.firstOrNull()
                    if (firstActive != null) {
                        loadNextRdv(firstActive.id)
                    }
                }
            } catch (e: Exception) {
                sessionsCountView.text = "0"
            } finally {
                sessionsLoading = false
                updateRefreshState()
            }
        }
    }

    private fun loadNextRdv(sessionId: Int) {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.getSessionRendezVous(sessionId)
                if (response.status == "success") {
                    val upcoming = response.data.orEmpty()
                        .filter { it.statut?.uppercase() in listOf("EN_ATTENTE", "CONFIRME") }
                        .firstOrNull()
                    if (upcoming != null) {
                        nextRdvTime.text = upcoming.heureDebut?.take(5) ?: "--:--"
                        nextRdvPatient.text = listOfNotNull(upcoming.bebePrenom, upcoming.bebeNom)
                            .joinToString(" ").ifBlank { "Bébé #${upcoming.bebeId}" }
                        nextRdvAge.text = calculateAge(upcoming.bebeDateNaissance)
                        nextRdvType.text = upcoming.vaccinNom ?: "Vaccin"
                    }
                }
            } catch (_: Exception) {}
        }
    }

    private fun calculateAge(dateNaissance: String?): String {
        if (dateNaissance.isNullOrBlank()) return "Âge inconnu"
        return try {
            val dob = java.text.SimpleDateFormat("yyyy-MM-dd", Locale.FRENCH).parse(dateNaissance)
                ?: return "Âge inconnu"
            val totalMonths = ((Date().time - dob.time) / (1000L * 60 * 60 * 24 * 30.44)).toInt()
            val years = totalMonths / 12
            val months = totalMonths % 12
            if (years > 0) "$years an${if (years > 1) "s" else ""} $months mois" else "$totalMonths mois"
        } catch (_: Exception) { "Âge inconnu" }
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
