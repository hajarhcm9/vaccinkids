package com.example.vaccinkid

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.core.view.setPadding
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.example.vaccinkid.model.DashboardStatsDto
import com.example.vaccinkid.network.ApiClient
import kotlinx.coroutines.launch

class AdminDashboardFragment : Fragment() {
    private lateinit var kpiContainer: LinearLayout
    private lateinit var messageView: TextView

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        val scroll = ScrollView(requireContext()).apply { setBackgroundColor(0xFFFFF8F0.toInt()) }
        val root = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(20)
        }
        scroll.addView(root)

        root.addView(TextView(requireContext()).apply {
            text = "Dashboard admin"
            textSize = 24f
            setTypeface(typeface, android.graphics.Typeface.BOLD)
        })

        messageView = TextView(requireContext()).apply { setPadding(0, 8, 0, 8) }
        root.addView(messageView)

        kpiContainer = LinearLayout(requireContext()).apply { orientation = LinearLayout.VERTICAL }
        root.addView(kpiContainer)

        root.addView(Button(requireContext()).apply {
            text = "Rafraichir"
            setOnClickListener { loadDashboard() }
        })
        root.addView(navButton("Personnel", GestionPersonnelFragment()))
        root.addView(navButton("Centres", GestionCentresFragment()))
        root.addView(navButton("Vaccins", GestionVaccinsFragment()))
        root.addView(navButton("Sessions", GestionSessionsFragment()))
        root.addView(Button(requireContext()).apply {
            text = "Stock"
            setOnClickListener { startActivity(Intent(requireContext(), GestionStocksActivity::class.java)) }
        })
        root.addView(Button(requireContext()).apply {
            text = "Statistiques"
            setOnClickListener { startActivity(Intent(requireContext(), StatsAdminActivity::class.java)) }
        })
        root.addView(Button(requireContext()).apply {
            text = "Exports"
            setOnClickListener { startActivity(Intent(requireContext(), ExportsAdminActivity::class.java)) }
        })
        root.addView(Button(requireContext()).apply {
            text = "Audit log"
            setOnClickListener { (activity as? AdminActivity)?.naviguerVers(AdminAuditLogFragment()) }
        })

        loadDashboard()
        return scroll
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
        listOf(
            "Centres actifs" to stats.centresActifs,
            "Personnel" to stats.totalPersonnel,
            "Parents" to stats.totalParents,
            "Bebes" to stats.totalBebes,
            "Sessions a venir" to stats.sessionsAVenir,
            "RDV confirmes" to stats.rdvConfirmes,
            "RDV en attente" to stats.rdvEnAttente,
            "Vaccinations" to stats.totalVaccinations,
            "Alertes stock" to stats.alertesStock
        ).forEach { (label, value) ->
            kpiContainer.addView(TextView(requireContext()).apply {
                text = "$label : ${value ?: 0}"
                textSize = 16f
                setPadding(0, 6, 0, 6)
            })
        }
    }

    private fun navButton(label: String, fragment: Fragment): Button {
        return Button(requireContext()).apply {
            text = label
            setOnClickListener { (activity as? AdminActivity)?.naviguerVers(fragment) }
        }
    }
}
