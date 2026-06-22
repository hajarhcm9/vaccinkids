package com.example.vaccinkid

import android.os.Bundle
import android.view.View
import android.widget.ProgressBar
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.example.vaccinkid.network.ApiClient
import kotlinx.coroutines.async
import kotlinx.coroutines.launch

class StatistiquesSessionFragment : Fragment(R.layout.fragment_statistiques_session) {

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val sessionId = requireArguments().getInt(ARG_SESSION_ID, 0)
        val sessionLabel = requireArguments().getString(ARG_SESSION_LABEL, "Session")

        view.findViewById<TextView>(R.id.tvStatsSessionLabel).text = sessionLabel

        view.findViewById<View>(R.id.btnBackStats).setOnClickListener {
            parentFragmentManager.popBackStack()
        }

        view.findViewById<View>(R.id.btnStatsRefresh).setOnClickListener {
            loadStats(view, sessionId)
        }

        loadStats(view, sessionId)
    }

    private fun loadStats(view: View, sessionId: Int) {
        val pb = view.findViewById<View>(R.id.pbStats)
        val tvMessage = view.findViewById<TextView>(R.id.tvStatsMessage)

        pb.visibility = View.VISIBLE
        tvMessage.text = "Chargement..."

        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val rdvDeferred = async { ApiClient.apiService.getSessionRendezVous(sessionId) }
                val flaconDeferred = async { ApiClient.apiService.getSessionFlacons(sessionId) }
                val vaccinDeferred = async { ApiClient.apiService.getSessionVaccinations(sessionId) }

                val rdvResponse = rdvDeferred.await()
                val flaconResponse = flaconDeferred.await()
                val vaccinResponse = vaccinDeferred.await()

                val rdvs = if (rdvResponse.status == "success") rdvResponse.data.orEmpty() else emptyList()
                val flacons = if (flaconResponse.status == "success") flaconResponse.data.orEmpty() else emptyList()
                val vaccinations = if (vaccinResponse.status == "success") vaccinResponse.data.orEmpty() else emptyList()

                val total = rdvs.size
                val presents = rdvs.count { it.statut?.uppercase() == "PRESENT" }
                val absents = rdvs.count { it.statut?.uppercase() == "ABSENT" }
                val attente = rdvs.count { it.statut?.uppercase() in listOf("EN_ATTENTE", "CONFIRME") }
                val vaccines = vaccinations.size

                val taux = (if (total > 0) (vaccines * 100) / total else 0).coerceIn(0, 100)

                view.findViewById<TextView>(R.id.tvStatsTaux).text = taux.toString()
                view.findViewById<ProgressBar>(R.id.pbStatsTaux).progress = taux
                view.findViewById<TextView>(R.id.tvStatsTotalRdv).text = "$total RDV au total"
                view.findViewById<TextView>(R.id.tvStatsPresents).text = presents.toString()
                view.findViewById<TextView>(R.id.tvStatsVaccines).text = vaccines.toString()
                view.findViewById<TextView>(R.id.tvStatsAbsents).text = absents.toString()
                view.findViewById<TextView>(R.id.tvStatsAttente).text = attente.toString()

                val openFlacons = flacons.count { it.dateFermeture == null }
                val dosesUtilisees = flacons.sumOf { it.dosesUtilisees ?: 0 }
                val dosesGaspillees = flacons.sumOf { it.dosesGaspillees ?: 0 }
                val dosesRestantes = flacons.sumOf { it.dosesRestantes ?: 0 }

                view.findViewById<TextView>(R.id.tvStatsFlaconCount).text = openFlacons.toString()
                view.findViewById<TextView>(R.id.tvStatsDosesUtilisees).text = dosesUtilisees.toString()
                view.findViewById<TextView>(R.id.tvStatsDosesGaspillees).text = dosesGaspillees.toString()
                view.findViewById<TextView>(R.id.tvStatsDosesRestantes).text = dosesRestantes.toString()

                tvMessage.text = if (total == 0 && flacons.isEmpty()) "Aucune activité enregistrée." else ""
            } catch (e: Exception) {
                tvMessage.text = "Erreur : ${e.message}"
            } finally {
                pb.visibility = View.GONE
            }
        }
    }

    companion object {
        private const val ARG_SESSION_ID = "sessionId"
        private const val ARG_SESSION_LABEL = "sessionLabel"

        fun newInstance(sessionId: Int, sessionLabel: String): StatistiquesSessionFragment =
            StatistiquesSessionFragment().apply {
                arguments = Bundle().apply {
                    putInt(ARG_SESSION_ID, sessionId)
                    putString(ARG_SESSION_LABEL, sessionLabel)
                }
            }
    }
}
