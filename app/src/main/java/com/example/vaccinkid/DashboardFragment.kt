package com.example.vaccinkid

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.ImageButton
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.core.view.setPadding
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import com.example.vaccinkid.model.SessionDto
import com.example.vaccinkid.network.ApiClient
import com.example.vaccinkid.network.TokenManager
import com.example.vaccinkid.viewmodel.DashboardViewModel
import com.example.vaccinkid.viewmodel.InfirmierAuthViewModel
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class DashboardFragment : Fragment() {
    private lateinit var dashboardViewModel: DashboardViewModel
    private lateinit var authViewModel: InfirmierAuthViewModel
    private lateinit var rdvCountView: TextView
    private lateinit var presentCountView: TextView
    private lateinit var absentCountView: TextView
    private lateinit var waitingCountView: TextView
    private lateinit var alertView: TextView
    private lateinit var sessionsContainer: LinearLayout
    private lateinit var messageView: TextView

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        val scroll = ScrollView(requireContext()).apply {
            setBackgroundColor(StaffUi.BACKGROUND)
        }
        val root = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(20)
        }
        scroll.addView(root)

        val header = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.HORIZONTAL
        }
        header.addView(LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            addView(TextView(requireContext()).apply {
                text = "Dashboard infirmier"
                textSize = 24f
                setTextColor(StaffUi.INK)
                setTypeface(typeface, android.graphics.Typeface.BOLD)
            })
            addView(TextView(requireContext()).apply {
                text = SimpleDateFormat("EEEE dd MMMM yyyy", Locale.FRENCH)
                    .format(Date())
                    .replaceFirstChar { it.uppercase() }
                textSize = 14f
                setTextColor(StaffUi.MUTED)
            })
        }, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        header.addView(ImageButton(requireContext()).apply {
            setImageResource(android.R.drawable.ic_lock_power_off)
            setColorFilter(StaffUi.PRIMARY_DARK)
            setBackgroundColor(Color.TRANSPARENT)
            setOnClickListener { confirmLogout() }
        })
        root.addView(header)

        val statsRow = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(0, 18, 0, 14)
        }
        rdvCountView = statBlock("RDV confirmes", statsRow)
        presentCountView = statBlock("Presents", statsRow)
        waitingCountView = statBlock("En attente", statsRow)
        root.addView(statsRow)
        val absenceRow = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.HORIZONTAL
        }
        absentCountView = statBlock("Absents aujourd'hui", absenceRow)
        root.addView(absenceRow)

        alertView = TextView(requireContext()).apply {
            text = "Alertes stock: chargement..."
            textSize = 15f
            setTextColor(StaffUi.DANGER)
            setPadding(14, 12, 14, 12)
            background = StaffUi.rounded(StaffUi.SOFT_CORAL, StaffUi.SOFT_CORAL, 7)
        }
        root.addView(alertView)

        root.addView(Button(requireContext()).apply {
            text = "Rafraichir"
            setOnClickListener { refreshDashboard() }
        })
        root.addView(Button(requireContext()).apply {
            text = "Notifications staff"
            setOnClickListener {
                (activity as? MainInfirmierActivity)?.naviguerVers(StaffNotificationsFragment())
            }
        })

        val navRow = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(0, 8, 0, 8)
        }
        navRow.addView(navButton("RDV", R.id.nav_rdv), LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        navRow.addView(navButton("File", R.id.nav_queue), LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        navRow.addView(Button(requireContext()).apply {
            text = "Scan"
            setOnClickListener { selectNav(R.id.nav_scan) }
        }, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        root.addView(navRow)

        root.addView(TextView(requireContext()).apply {
            text = "Sessions du jour"
            textSize = 18f
            setTextColor(StaffUi.INK)
            setTypeface(typeface, android.graphics.Typeface.BOLD)
            setPadding(0, 12, 0, 8)
        })

        sessionsContainer = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
        }
        root.addView(sessionsContainer)

        messageView = TextView(requireContext()).apply {
            setTextColor(0xFFC8550A.toInt())
            setPadding(0, 12, 0, 0)
        }
        root.addView(messageView)

        return scroll
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        StaffUi.decorateScreen(view)
        dashboardViewModel = ViewModelProvider(this)[DashboardViewModel::class.java]
        authViewModel = ViewModelProvider(this)[InfirmierAuthViewModel::class.java]
        observeStats()
        refreshDashboard()
    }

    private fun observeStats() {
        dashboardViewModel.stats.observe(viewLifecycleOwner) { result ->
            result.fold(
                onSuccess = { stats ->
                    rdvCountView.text = (stats.rdvConfirmes ?: 0).toString()
                    presentCountView.text = (stats.rdvPresents ?: 0).toString()
                    absentCountView.text = (stats.rdvAbsents ?: 0).toString()
                    waitingCountView.text = (stats.rdvEnAttente ?: 0).toString()
                    val stockAlerts = stats.alertesStock ?: 0
                    alertView.text = if (stockAlerts > 0) {
                        "Alertes stock: $stockAlerts vaccin(s) sous seuil"
                    } else {
                        "Alertes stock: aucune alerte declaree"
                    }
                    renderAlertState(stockAlerts > 0)
                },
                onFailure = {
                    rdvCountView.text = "-"
                    presentCountView.text = "-"
                    absentCountView.text = "-"
                    waitingCountView.text = "-"
                    alertView.text = it.message ?: "Statistiques indisponibles."
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
            }
        }
    }

    private fun loadStockAlerts() {
        val centreId = TokenManager.getCentreId() ?: return
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.getStock(centreId)
                val alerts = (response.data ?: emptyList()).filter {
                    (it.quantiteDisponible ?: Int.MAX_VALUE) <= (it.seuilAlerte ?: -1)
                }
                if (response.status == "success" && alerts.isNotEmpty()) {
                    alertView.text = "Alertes stock: ${alerts.joinToString { it.vaccinNom ?: it.nom ?: "vaccin" }}"
                    renderAlertState(true)
                }
            } catch (_: Exception) {
                if (alertView.text.isBlank()) alertView.text = "Alertes stock: erreur reseau"
            }
        }
    }

    private fun renderSessions(sessions: List<SessionDto>) {
        sessionsContainer.removeAllViews()
        if (sessions.isEmpty()) {
            sessionsContainer.addView(TextView(requireContext()).apply {
                text = "Aucune session affectee aujourd'hui."
                setTextColor(StaffUi.MUTED)
                setPadding(14)
                background = StaffUi.rounded(StaffUi.SURFACE, StaffUi.BORDER, 7)
            })
            return
        }
        sessions.forEach { session ->
            sessionsContainer.addView(LinearLayout(requireContext()).apply {
                orientation = LinearLayout.VERTICAL
                StaffUi.styleCard(this, StaffUi.PRIMARY)
                addView(TextView(requireContext()).apply {
                    text = session.vaccinNom ?: "Vaccin #${session.vaccinId ?: "?"}"
                    textSize = 16f
                    setTextColor(StaffUi.INK)
                    setTypeface(typeface, android.graphics.Typeface.BOLD)
                })
                addView(TextView(requireContext()).apply {
                    text = session.label()
                    textSize = 13f
                    setTextColor(StaffUi.MUTED)
                })
            })
        }
    }

    private fun statBlock(label: String, row: LinearLayout): TextView {
        val valueView = TextView(requireContext()).apply {
            text = "..."
            textSize = 24f
            setTextColor(StaffUi.PRIMARY)
            setTypeface(typeface, android.graphics.Typeface.BOLD)
        }
        row.addView(LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(8)
            StaffUi.styleCard(this)
            addView(valueView)
            addView(TextView(requireContext()).apply {
                text = label
                textSize = 12f
                setTextColor(StaffUi.MUTED)
            })
        }, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        return valueView
    }

    private fun renderAlertState(hasAlert: Boolean) {
        alertView.setTextColor(if (hasAlert) StaffUi.DANGER else StaffUi.SUCCESS_DARK)
        alertView.background = StaffUi.rounded(
            if (hasAlert) StaffUi.SOFT_CORAL else StaffUi.SOFT_TEAL,
            if (hasAlert) StaffUi.SOFT_CORAL else StaffUi.SOFT_TEAL,
            7
        )
    }

    private fun navButton(text: String, itemId: Int): Button {
        return Button(requireContext()).apply {
            this.text = text
            setOnClickListener { selectNav(itemId) }
        }
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
        val vaccine = vaccinNom ?: "Vaccin #${vaccinId ?: "?"}"
        val hour = heureDebut ?: "--:--"
        val status = statut ?: "statut inconnu"
        val count = inscrits?.let { " - $it inscrit(s)" } ?: ""
        return "$vaccine - $hour - $status$count"
    }
}
