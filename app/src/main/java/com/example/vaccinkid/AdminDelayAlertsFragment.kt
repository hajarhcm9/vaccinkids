package com.example.vaccinkid

import android.graphics.Color
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.example.vaccinkid.model.DelayDashboardDto
import com.example.vaccinkid.network.ApiClient
import kotlinx.coroutines.launch

class AdminDelayAlertsFragment : Fragment() {
    private lateinit var root: LinearLayout
    private lateinit var statsRow: LinearLayout
    private lateinit var topList: LinearLayout
    private lateinit var centreList: LinearLayout
    private lateinit var statusView: TextView

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        root = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(requireContext().getColor(R.color.bg_screen))
        }

        root.addView(LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(56, 56, 56, 24)
            addView(TextView(requireContext()).apply {
                text = "Retards de vaccination"
                textSize = 24f
                setTextColor(requireContext().getColor(R.color.text_primary))
                setTypeface(null, android.graphics.Typeface.BOLD)
            })
            addView(TextView(requireContext()).apply {
                text = "Enfants en retard de plus de 7 jours"
                textSize = 13f
                setTextColor(requireContext().getColor(R.color.text_secondary))
                setPadding(0, 4, 0, 0)
            })
        })

        statsRow = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(44, 0, 44, 28)
        }
        root.addView(statsRow)

        val sendBtn = com.google.android.material.button.MaterialButton(requireContext()).apply {
            text = "Envoyer alertes aux parents"
            backgroundTintList = android.content.res.ColorStateList.valueOf(
                Color.parseColor("#F59E0B")
            )
            setTextColor(requireContext().getColor(R.color.white))
            textSize = 14f
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT
            ).also { it.setMargins(44, 0, 44, 28) }
            setOnClickListener { sendAlerts() }
        }
        root.addView(sendBtn)

        statusView = TextView(requireContext()).apply {
            setPadding(56, 0, 56, 8)
            setTextColor(requireContext().getColor(R.color.text_secondary))
        }
        root.addView(statusView)

        root.addView(sectionTitle("Top vaccins en retard"))
        topList = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(44, 0, 44, 0)
        }
        root.addView(topList)

        root.addView(sectionTitle("Par centre"))
        centreList = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(44, 0, 44, 60)
        }
        root.addView(centreList)

        return androidx.core.widget.NestedScrollView(requireContext()).apply {
            addView(root)
        }
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        loadDashboard()
    }

    private fun loadDashboard() {
        statusView.text = "Chargement..."
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val resp = ApiClient.apiService.getDelayDashboard()
                if (resp.status != "success") throw Exception(resp.message ?: "Erreur")
                val data = resp.data ?: throw Exception("Données vides")
                renderStats(data)
                renderTopVaccins(data)
                renderByCentre(data)
                statusView.text = ""
            } catch (e: Exception) {
                statusView.text = e.message ?: "Erreur réseau"
            }
        }
    }

    private fun renderStats(data: DelayDashboardDto) {
        statsRow.removeAllViews()
        fun statCard(label: String, value: String, color: Int) {
            statsRow.addView(LinearLayout(requireContext()).apply {
                orientation = LinearLayout.VERTICAL
                setBackgroundResource(R.drawable.bg_card_rounded)
                setPadding(24, 20, 24, 20)
                gravity = android.view.Gravity.CENTER
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                    .also { it.marginEnd = 12 }
                addView(TextView(requireContext()).apply {
                    text = value; textSize = 28f
                    setTypeface(null, android.graphics.Typeface.BOLD)
                    setTextColor(color)
                    gravity = android.view.Gravity.CENTER
                })
                addView(TextView(requireContext()).apply {
                    text = label; textSize = 11f
                    setTextColor(requireContext().getColor(R.color.text_secondary))
                    gravity = android.view.Gravity.CENTER
                })
            })
        }
        statCard("Total retards", (data.totalDelayed ?: 0).toString(), Color.parseColor("#F59E0B"))
        statCard("Urgents (>30j)", (data.urgentCount ?: 0).toString(), Color.parseColor("#EF4444"))
    }

    private fun renderTopVaccins(data: DelayDashboardDto) {
        topList.removeAllViews()
        val list = data.topVaccines.orEmpty()
        if (list.isEmpty()) {
            topList.addView(emptyText("Aucun retard détecté"))
            return
        }
        list.forEach { v ->
            topList.addView(LinearLayout(requireContext()).apply {
                orientation = LinearLayout.HORIZONTAL
                setBackgroundResource(R.drawable.bg_card_rounded)
                setPadding(24, 18, 24, 18)
                gravity = android.view.Gravity.CENTER_VERTICAL
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT
                ).also { it.bottomMargin = 12 }
                addView(LinearLayout(requireContext()).apply {
                    orientation = LinearLayout.VERTICAL
                    layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                    addView(TextView(requireContext()).apply {
                        text = v.vaccinNom ?: "Vaccin #${v.vaccinId}"
                        textSize = 14f
                        setTypeface(null, android.graphics.Typeface.BOLD)
                        setTextColor(requireContext().getColor(R.color.text_primary))
                    })
                    addView(TextView(requireContext()).apply {
                        text = "Âge cible : ${v.ageCibleSemaines ?: "-"} sem. · Moy. ${v.avgJoursRetard ?: "-"}j de retard"
                        textSize = 12f
                        setTextColor(requireContext().getColor(R.color.text_secondary))
                    })
                })
                addView(TextView(requireContext()).apply {
                    text = "${v.nbEnfantsRetard ?: 0}\nenfants"
                    textSize = 13f
                    gravity = android.view.Gravity.CENTER
                    setTypeface(null, android.graphics.Typeface.BOLD)
                    setTextColor(Color.parseColor("#EF4444"))
                })
            })
        }
    }

    private fun renderByCentre(data: DelayDashboardDto) {
        centreList.removeAllViews()
        val list = data.byCentre.orEmpty()
        if (list.isEmpty()) {
            centreList.addView(emptyText("Aucune donnée par centre"))
            return
        }
        list.forEach { c ->
            centreList.addView(LinearLayout(requireContext()).apply {
                orientation = LinearLayout.HORIZONTAL
                setBackgroundResource(R.drawable.bg_card_rounded)
                setPadding(24, 18, 24, 18)
                gravity = android.view.Gravity.CENTER_VERTICAL
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT
                ).also { it.bottomMargin = 12 }
                addView(TextView(requireContext()).apply {
                    text = c.centreNom ?: "Centre #${c.centreId}"
                    textSize = 14f
                    setTextColor(requireContext().getColor(R.color.text_primary))
                    layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                })
                addView(TextView(requireContext()).apply {
                    text = "${c.nbEnfantsRetard ?: 0} enfants"
                    textSize = 13f
                    setTypeface(null, android.graphics.Typeface.BOLD)
                    setTextColor(Color.parseColor("#F59E0B"))
                })
            })
        }
    }

    private fun sendAlerts() {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                statusView.text = "Envoi des alertes..."
                val r = ApiClient.apiService.sendDelayAlerts(emptyMap())
                if (r.status != "success") throw Exception(r.message ?: "Echec")
                Toast.makeText(requireContext(), "Alertes envoyées aux parents", Toast.LENGTH_LONG).show()
                statusView.text = ""
            } catch (e: Exception) {
                statusView.text = "Erreur : ${e.message}"
            }
        }
    }

    private fun sectionTitle(text: String) = TextView(requireContext()).apply {
        this.text = text
        textSize = 16f
        setTypeface(null, android.graphics.Typeface.BOLD)
        setTextColor(requireContext().getColor(R.color.text_primary))
        setPadding(44, 20, 44, 12)
    }

    private fun emptyText(text: String) = TextView(requireContext()).apply {
        this.text = text; textSize = 13f
        setTextColor(requireContext().getColor(R.color.text_secondary))
        setPadding(0, 8, 0, 8)
    }
}
