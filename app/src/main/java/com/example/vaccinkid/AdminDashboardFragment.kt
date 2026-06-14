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
            setPadding(dp(16))
        }
        scroll.addView(root)

        val header = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = android.view.Gravity.CENTER_VERTICAL
            setPadding(dp(18), dp(18), dp(10), dp(18))
            background = GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                intArrayOf(StaffUi.LAVENDER, StaffUi.PRIMARY)
            ).apply { cornerRadius = dp(8).toFloat() }
        }
        header.addView(LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            addView(TextView(requireContext()).apply {
                text = "Administration"
                textSize = 25f
                tag = "keep-color"
                setTextColor(Color.WHITE)
                setTypeface(typeface, android.graphics.Typeface.BOLD)
            })
            addView(TextView(requireContext()).apply {
                text = "Pilotage du reseau VacciniKids"
                textSize = 14f
                setTextColor(0xFFFFE4E6.toInt())
            })
        }, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        header.addView(ImageButton(requireContext()).apply {
            contentDescription = "Deconnexion"
            setImageResource(android.R.drawable.ic_lock_power_off)
            setBackgroundColor(Color.TRANSPARENT)
            imageTintList = android.content.res.ColorStateList.valueOf(Color.WHITE)
            setOnClickListener { confirmLogout() }
        }, LinearLayout.LayoutParams(dp(48), dp(48)))
        root.addView(header)

        messageView = TextView(requireContext()).apply {
            setPadding(0, dp(10), 0, dp(4))
            setTextColor(StaffUi.CORAL)
        }
        root.addView(messageView)

        root.addView(sectionTitle("Vue d'ensemble"))
        kpiContainer = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
        }
        root.addView(kpiContainer)

        root.addView(sectionTitle("Gestion et supervision"))
        root.addView(actionRow(
            navButton("Personnel", GestionPersonnelFragment(), "accent-primary"),
            navButton("Centres", GestionCentresFragment(), "accent-tertiary")
        ))
        root.addView(actionRow(
            navButton("Vaccins", GestionVaccinsFragment(), "accent-primary"),
            navButton("Sessions", GestionSessionsFragment(), "accent-primary")
        ))
        root.addView(actionRow(
            actionButton("Stock", "accent-secondary") { startActivity(Intent(requireContext(), GestionStocksActivity::class.java)) },
            actionButton("Statistiques", "accent-tertiary") { startActivity(Intent(requireContext(), StatsAdminActivity::class.java)) }
        ))
        root.addView(actionRow(
            actionButton("Exports", "accent-coral") { startActivity(Intent(requireContext(), ExportsAdminActivity::class.java)) },
            actionButton("Audit log", "accent-amber") { (activity as? AdminActivity)?.naviguerVers(AdminAuditLogFragment()) }
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
            Triple("Centres actifs", stats.centresActifs, StaffUi.LAVENDER),
            Triple("Personnel", stats.totalPersonnel, StaffUi.PRIMARY),
            Triple("Parents", stats.totalParents, StaffUi.PRIMARY),
            Triple("Bebes", stats.totalBebes, StaffUi.CORAL),
            Triple("Sessions a venir", stats.sessionsAVenir, StaffUi.BLUE),
            Triple("RDV confirmes", stats.rdvConfirmes, StaffUi.PRIMARY),
            Triple("RDV en attente", stats.rdvEnAttente, 0xFFD97706.toInt()),
            Triple("Vaccinations", stats.totalVaccinations, StaffUi.LAVENDER),
            Triple("Alertes stock", stats.alertesStock, StaffUi.DANGER)
        )
        values.chunked(3).forEach { rowValues ->
            val row = LinearLayout(requireContext()).apply {
                orientation = LinearLayout.HORIZONTAL
                setPadding(0, 0, 0, dp(8))
            }
            rowValues.forEach { (label, value, accent) ->
                row.addView(kpiBlock(label, value ?: 0, accent), weighted())
            }
            repeat(3 - rowValues.size) {
                row.addView(View(requireContext()), weighted())
            }
            kpiContainer.addView(row)
        }
    }

    private fun kpiBlock(label: String, value: Int, accent: Int): View =
        LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(10))
            background = GradientDrawable().apply {
                setColor(if (label == "Alertes stock" && value > 0) StaffUi.SOFT_CORAL else StaffUi.SURFACE)
                cornerRadius = dp(8).toFloat()
                setStroke(dp(2), accent)
            }
            addView(TextView(requireContext()).apply {
                text = value.toString()
                textSize = 22f
                tag = "keep-color"
                setTextColor(accent)
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

    private fun actionButton(label: String, accentTag: String? = null, action: () -> Unit): Button =
        Button(requireContext()).apply {
            text = label
            tag = accentTag
            setOnClickListener { action() }
        }

    private fun navButton(label: String, fragment: Fragment, accentTag: String): Button {
        return actionButton(label, accentTag) { (activity as? AdminActivity)?.naviguerVers(fragment) }
    }

    private fun sectionTitle(label: String): TextView =
        TextView(requireContext()).apply {
            text = label
            textSize = 18f
            setTextColor(StaffUi.INK)
            setTypeface(typeface, android.graphics.Typeface.BOLD)
            setPadding(0, dp(20), 0, dp(8))
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
