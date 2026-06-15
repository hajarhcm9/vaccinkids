package com.example.vaccinkid

import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageButton
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.core.view.setPadding
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import com.example.vaccinkid.model.DashboardStatsDto
import com.example.vaccinkid.network.ApiClient
import com.example.vaccinkid.viewmodel.InfirmierAuthViewModel
import kotlinx.coroutines.launch

class AdminDashboardFragment : Fragment() {
    private lateinit var kpiContainer: LinearLayout
    private lateinit var messageView: TextView
    private lateinit var authViewModel: InfirmierAuthViewModel

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        val scroll = ScrollView(requireContext()).apply { setBackgroundColor(StaffUi.BACKGROUND) }
        val root = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(20)
        }
        scroll.addView(root)

        val header = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = android.view.Gravity.CENTER_VERTICAL
            setPadding(0, 4, 0, 12)
        }
        header.addView(LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            addView(TextView(requireContext()).apply {
                text = "Administration"
                textSize = 26f
                setTextColor(StaffUi.INK)
                setTypeface(typeface, android.graphics.Typeface.BOLD)
            })
            addView(TextView(requireContext()).apply {
                text = "Pilotage VacciniKids"
                textSize = 14f
                setTextColor(StaffUi.MUTED)
            })
        }, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        header.addView(ImageButton(requireContext()).apply {
            contentDescription = "Deconnexion"
            setImageResource(android.R.drawable.ic_lock_power_off)
            setBackgroundColor(Color.TRANSPARENT)
            setOnClickListener { confirmLogout() }
        }, LinearLayout.LayoutParams(dp(48), dp(48)))
        root.addView(header)

        messageView = TextView(requireContext()).apply {
            setPadding(0, 4, 0, 8)
            setTextColor(StaffUi.CORAL)
        }
        root.addView(messageView)

        kpiContainer = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
        }
        root.addView(kpiContainer)

        root.addView(TextView(requireContext()).apply {
            text = "Gestion"
            textSize = 18f
            setTextColor(StaffUi.INK)
            setTypeface(typeface, android.graphics.Typeface.BOLD)
            setPadding(0, 18, 0, 6)
        })
        root.addView(actionRow(
            navButton("Personnel", GestionPersonnelFragment()),
            navButton("Centres", GestionCentresFragment())
        ))
        root.addView(actionRow(
            navButton("Vaccins", GestionVaccinsFragment()),
            navButton("Sessions", GestionSessionsFragment())
        ))
        root.addView(actionRow(
            actionButton("Stock") { startActivity(Intent(requireContext(), GestionStocksActivity::class.java)) },
            actionButton("Statistiques") { startActivity(Intent(requireContext(), StatsAdminActivity::class.java)) }
        ))
        root.addView(actionRow(
            actionButton("Exports") { startActivity(Intent(requireContext(), ExportsAdminActivity::class.java)) },
            actionButton("Audit log") { (activity as? AdminActivity)?.naviguerVers(AdminAuditLogFragment()) }
        ))
        root.addView(actionButton("Rafraichir les indicateurs") { loadDashboard() })

        return scroll
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        StaffUi.decorateScreen(view)
        authViewModel = ViewModelProvider(this)[InfirmierAuthViewModel::class.java]
        loadDashboard()
    }

    private fun loadDashboard() {
        messageView.text = "Chargement..."
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.getDashboardStats()
                val stats = response.data
                if (response.status != "success" || stats == null) {
                    throw Exception(response.message ?: "Dashboard indisponible")
                }
                renderStats(stats)
                messageView.text = ""
            } catch (e: Exception) {
                kpiContainer.removeAllViews()
                messageView.text = e.message ?: "Erreur reseau"
            }
        }
    }

    private fun renderStats(stats: DashboardStatsDto) {
        kpiContainer.removeAllViews()
        val values = listOf(
            "Centres actifs" to stats.centresActifs,
            "Personnel" to stats.totalPersonnel,
            "Parents" to stats.totalParents,
            "Bebes" to stats.totalBebes,
            "Sessions a venir" to stats.sessionsAVenir,
            "RDV confirmes" to stats.rdvConfirmes,
            "RDV en attente" to stats.rdvEnAttente,
            "Vaccinations" to stats.totalVaccinations,
            "Alertes stock" to stats.alertesStock
        )
        values.chunked(3).forEach { rowValues ->
            val row = LinearLayout(requireContext()).apply {
                orientation = LinearLayout.HORIZONTAL
                setPadding(0, 0, 0, dp(8))
            }
            rowValues.forEach { (label, value) ->
                row.addView(kpiBlock(label, value ?: 0), weighted())
            }
            repeat(3 - rowValues.size) {
                row.addView(View(requireContext()), weighted())
            }
            kpiContainer.addView(row)
        }
    }

    private fun kpiBlock(label: String, value: Int): View =
        LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(10))
            background = GradientDrawable().apply {
                setColor(if (label == "Alertes stock" && value > 0) StaffUi.SOFT_CORAL else StaffUi.SURFACE)
                cornerRadius = dp(6).toFloat()
                setStroke(dp(1), StaffUi.BORDER)
            }
            addView(TextView(requireContext()).apply {
                text = value.toString()
                textSize = 22f
                setTextColor(if (label == "Alertes stock" && value > 0) StaffUi.DANGER else StaffUi.PRIMARY_DARK)
                setTypeface(typeface, android.graphics.Typeface.BOLD)
            })
            addView(TextView(requireContext()).apply {
                text = label
                textSize = 11f
                setTextColor(StaffUi.MUTED)
            })
        }

    private fun actionRow(first: Button, second: Button): View =
        LinearLayout(requireContext()).apply {
            orientation = LinearLayout.HORIZONTAL
            addView(first, weighted())
            addView(second, weighted())
        }

    private fun actionButton(label: String, action: () -> Unit): Button =
        Button(requireContext()).apply {
            text = label
            setOnClickListener { action() }
        }

    private fun navButton(label: String, fragment: Fragment): Button {
        return actionButton(label) { (activity as? AdminActivity)?.naviguerVers(fragment) }
    }

    private fun confirmLogout() {
        AlertDialog.Builder(requireContext())
            .setTitle("Deconnexion")
            .setMessage("Voulez-vous fermer la session administrateur ?")
            .setNegativeButton("Annuler", null)
            .setPositiveButton("Deconnexion") { _, _ ->
                authViewModel.logout {
                    startActivity(Intent(requireContext(), MainActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                    })
                }
            }
            .show()
    }

    private fun weighted() = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
        .apply { marginEnd = dp(6) }

    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()
}
