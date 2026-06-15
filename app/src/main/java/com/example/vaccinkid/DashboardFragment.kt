package com.example.vaccinkid

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.core.view.setPadding
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.example.vaccinkid.model.SessionDto
import com.example.vaccinkid.network.ApiClient
import com.example.vaccinkid.network.TokenManager
import com.example.vaccinkid.viewmodel.DashboardViewModel
import com.example.vaccinkid.viewmodel.InfirmierAuthViewModel
import com.google.android.material.card.MaterialCardView
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class DashboardFragment : Fragment(R.layout.fragment_dashboard) {
    private lateinit var dashboardViewModel: DashboardViewModel
    private lateinit var authViewModel: InfirmierAuthViewModel
    private lateinit var refreshView: SwipeRefreshLayout
    private lateinit var rdvCountView: TextView
    private lateinit var presentCountView: TextView
    private lateinit var absentCountView: TextView
    private lateinit var waitingCountView: TextView
    private lateinit var alertView: TextView
    private lateinit var sessionsContainer: LinearLayout
    private lateinit var messageView: TextView
    private var statsLoading = false
    private var sessionsLoading = false

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        bindViews(view)
        bindActions(view)

        dashboardViewModel = ViewModelProvider(this)[DashboardViewModel::class.java]
        authViewModel = ViewModelProvider(this)[InfirmierAuthViewModel::class.java]
        observeDashboard()
        refreshDashboard()
    }

    private fun bindViews(view: View) {
        refreshView = view.findViewById(R.id.dashboardRefresh)
        rdvCountView = view.findViewById(R.id.dashboardConfirmedCount)
        presentCountView = view.findViewById(R.id.dashboardPresentCount)
        absentCountView = view.findViewById(R.id.dashboardAbsentCount)
        waitingCountView = view.findViewById(R.id.dashboardWaitingCount)
        alertView = view.findViewById(R.id.dashboardStockAlert)
        sessionsContainer = view.findViewById(R.id.dashboardSessions)
        messageView = view.findViewById(R.id.dashboardMessage)
        view.findViewById<TextView>(R.id.dashboardDate).text =
            SimpleDateFormat("EEEE dd MMMM yyyy", Locale.FRENCH)
                .format(Date())
                .replaceFirstChar { it.uppercase() }
    }

    private fun bindActions(view: View) {
        refreshView.setColorSchemeResources(R.color.staff_primary, R.color.brand_coral, R.color.brand_blue)
        refreshView.setOnRefreshListener(::refreshDashboard)
        view.findViewById<View>(R.id.dashboardNotifications).setOnClickListener {
            (activity as? MainInfirmierActivity)?.naviguerVers(StaffNotificationsFragment())
        }
        view.findViewById<View>(R.id.dashboardLogout).setOnClickListener { confirmLogout() }
        view.findViewById<View>(R.id.dashboardOpenRdv).setOnClickListener { selectNav(R.id.nav_rdv) }
        view.findViewById<View>(R.id.dashboardOpenQueue).setOnClickListener { selectNav(R.id.nav_queue) }
        view.findViewById<View>(R.id.dashboardOpenScan).setOnClickListener { selectNav(R.id.nav_scan) }
    }

    private fun observeDashboard() {
        dashboardViewModel.isLoading.observe(viewLifecycleOwner) {
            statsLoading = it
            updateRefreshState()
        }
        dashboardViewModel.stats.observe(viewLifecycleOwner) { result ->
            result.fold(
                onSuccess = { stats ->
                    rdvCountView.text = (stats.rdvConfirmes ?: 0).toString()
                    presentCountView.text = (stats.rdvPresents ?: 0).toString()
                    absentCountView.text = (stats.rdvAbsents ?: 0).toString()
                    waitingCountView.text = (stats.rdvEnAttente ?: 0).toString()
                    val stockAlerts = stats.alertesStock ?: 0
                    alertView.text = if (stockAlerts > 0) {
                        "Alertes stock : $stockAlerts vaccin(s) sous seuil"
                    } else {
                        "Stock maitrise : aucune alerte declaree"
                    }
                    renderAlertState(stockAlerts > 0)
                },
                onFailure = {
                    rdvCountView.text = "-"
                    presentCountView.text = "-"
                    absentCountView.text = "-"
                    waitingCountView.text = "-"
                    alertView.text = it.message ?: "Statistiques indisponibles."
                    renderAlertState(true)
                }
            )
        }
    }

    private fun refreshDashboard() {
        dashboardViewModel.loadStats()
        loadTodaySessions()
        loadStockAlerts()
    }

    private fun loadTodaySessions() {
        sessionsLoading = true
        updateRefreshState()
        messageView.text = "Chargement des sessions..."
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.getTodaySessions()
                if (response.status != "success") throw Exception(response.message ?: "Sessions indisponibles")
                renderSessions(response.data ?: emptyList())
                messageView.text = ""
            } catch (e: Exception) {
                sessionsContainer.removeAllViews()
                messageView.text = e.message ?: "Erreur reseau"
            } finally {
                sessionsLoading = false
                updateRefreshState()
            }
        }
    }

    private fun loadStockAlerts() {
        val centreId = TokenManager.getCentreId() ?: return
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.getStock(centreId)
                val alerts = response.data.orEmpty().filter {
                    (it.quantiteDisponible ?: Int.MAX_VALUE) <= (it.seuilAlerte ?: -1)
                }
                if (response.status == "success" && alerts.isNotEmpty()) {
                    alertView.text = "Alertes stock : ${alerts.joinToString { it.vaccinNom ?: it.nom ?: "vaccin" }}"
                    renderAlertState(true)
                }
            } catch (_: Exception) {
                // Dashboard stats remains the fallback source for the stock alert state.
            }
        }
    }

    private fun renderSessions(sessions: List<SessionDto>) {
        sessionsContainer.removeAllViews()
        if (sessions.isEmpty()) {
            sessionsContainer.addView(TextView(requireContext()).apply {
                text = "Aucune session affectee aujourd'hui."
                setTextColor(StaffUi.MUTED)
                setPadding(StaffUi.dp(context, 14))
                background = StaffUi.rounded(StaffUi.SURFACE, StaffUi.BORDER, 7)
            })
            return
        }
        sessions.forEach { session ->
            sessionsContainer.addView(
                MaterialCardView(requireContext()).apply {
                    setCardBackgroundColor(StaffUi.SURFACE)
                    strokeColor = StaffUi.BORDER
                    strokeWidth = StaffUi.dp(context, 1)
                    radius = StaffUi.dp(context, 8).toFloat()
                    cardElevation = 0f
                    addView(LinearLayout(context).apply {
                        orientation = LinearLayout.VERTICAL
                        setPadding(
                            StaffUi.dp(context, 16),
                            StaffUi.dp(context, 14),
                            StaffUi.dp(context, 16),
                            StaffUi.dp(context, 14)
                        )
                        addView(TextView(context).apply {
                            text = session.vaccinNom ?: "Vaccin #${session.vaccinId ?: "?"}"
                            textSize = 16f
                            setTextColor(StaffUi.INK)
                            setTypeface(typeface, android.graphics.Typeface.BOLD)
                        })
                        addView(TextView(context).apply {
                            text = session.label()
                            textSize = 13f
                            setTextColor(StaffUi.MUTED)
                        })
                    })
                },
                LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                ).apply { bottomMargin = StaffUi.dp(requireContext(), 10) }
            )
        }
    }

    private fun renderAlertState(hasAlert: Boolean) {
        alertView.setTextColor(if (hasAlert) StaffUi.DANGER else StaffUi.SUCCESS_DARK)
        alertView.background = StaffUi.rounded(
            if (hasAlert) StaffUi.SOFT_CORAL else StaffUi.SOFT_TEAL,
            if (hasAlert) StaffUi.SOFT_CORAL else StaffUi.SOFT_TEAL,
            7
        )
    }

    private fun updateRefreshState() {
        refreshView.isRefreshing = statsLoading || sessionsLoading
    }

    private fun selectNav(itemId: Int) {
        (activity as? MainInfirmierActivity)
            ?.findViewById<com.google.android.material.bottomnavigation.BottomNavigationView>(R.id.bottomNav)
            ?.selectedItemId = itemId
    }

    private fun confirmLogout() {
        AlertDialog.Builder(requireContext())
            .setTitle("Deconnexion")
            .setMessage("Voulez-vous vraiment vous deconnecter ?")
            .setPositiveButton("Oui") { _, _ ->
                authViewModel.logout {
                    val intent = Intent(requireContext(), LoginInfirmierActivity::class.java)
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
                    startActivity(intent)
                }
            }
            .setNegativeButton("Annuler", null)
            .show()
    }

    private fun SessionDto.label(): String {
        val hour = heureDebut ?: "--:--"
        val status = statut ?: "statut inconnu"
        val count = inscrits?.let { " - $it inscrit(s)" } ?: ""
        return "$hour - $status$count"
    }
}
