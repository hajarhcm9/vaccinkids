package com.example.vaccinkid

import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.example.vaccinkid.model.BebeDto
import com.example.vaccinkid.model.RendezVousDto
import com.example.vaccinkid.model.VaccinationHistoryDto
import com.example.vaccinkid.network.ApiClient
import com.google.android.material.textfield.TextInputEditText
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class RechercheManuelleFragment : Fragment(R.layout.fragment_recherche_manuelle) {

    private val secureQrPattern = Regex("^VK1\\.[a-f0-9]{64}$")

    private lateinit var etCode: TextInputEditText
    private lateinit var btnValider: View
    private lateinit var pbLoading: View
    private lateinit var tvMessage: TextView
    private lateinit var cvResult: View
    private lateinit var tvResultName: TextView
    private lateinit var tvResultAge: TextView
    private lateinit var btnOuvrir: View

    private var foundBebe: BebeDto? = null
    private var foundRdvs: List<RendezVousDto> = emptyList()
    private var foundHist: List<VaccinationHistoryDto> = emptyList()

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        etCode = view.findViewById(R.id.etRechercheCode)
        btnValider = view.findViewById(R.id.btnRechercheValider)
        pbLoading = view.findViewById(R.id.pbRecherche)
        tvMessage = view.findViewById(R.id.tvRechercheMessage)
        cvResult = view.findViewById(R.id.cvRechercheResult)
        tvResultName = view.findViewById(R.id.tvRechercheResultName)
        tvResultAge = view.findViewById(R.id.tvRechercheResultAge)
        btnOuvrir = view.findViewById(R.id.btnRechercheOuvrir)

        view.findViewById<View>(R.id.btnBackRecherche).setOnClickListener {
            parentFragmentManager.popBackStack()
        }

        btnValider.setOnClickListener {
            val input = etCode.text?.toString()?.trim().orEmpty()
            if (input.isBlank()) {
                tvMessage.text = "Veuillez saisir un code."
                tvMessage.setTextColor(requireContext().getColor(R.color.error))
                return@setOnClickListener
            }
            rechercherCarnet(input)
        }

        btnOuvrir.setOnClickListener {
            val bebe = foundBebe ?: return@setOnClickListener
            (activity as? MainInfirmierActivity)?.naviguerVers(
                EnfantProfilFragment.newInstance(bebe, foundRdvs, foundHist)
            )
        }
    }

    private fun rechercherCarnet(rawInput: String) {
        val code = extractCode(rawInput)
        if (!secureQrPattern.matches(code)) {
            tvMessage.text = "Code invalide. Format attendu : VK1.abc123..."
            tvMessage.setTextColor(requireContext().getColor(R.color.error))
            cvResult.visibility = View.GONE
            return
        }

        setLoading(true)
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.getBebeByQr(code)
                val bebe = response.data?.bebe
                if (response.status == "success" && bebe != null) {
                    foundBebe = bebe
                    foundRdvs = response.data?.eligibleAppointments.orEmpty()
                    foundHist = response.data?.lastVaccinations.orEmpty()
                    showResult(bebe)
                } else {
                    tvMessage.text = response.message ?: "Carnet introuvable."
                    tvMessage.setTextColor(requireContext().getColor(R.color.error))
                    cvResult.visibility = View.GONE
                }
            } catch (e: Exception) {
                tvMessage.text = "Erreur réseau : ${e.message}"
                tvMessage.setTextColor(requireContext().getColor(R.color.error))
                cvResult.visibility = View.GONE
            } finally {
                setLoading(false)
            }
        }
    }

    private fun showResult(bebe: BebeDto) {
        val fullName = listOfNotNull(bebe.prenom, bebe.nom).joinToString(" ").ifBlank { "Bébé #${bebe.id}" }
        tvResultName.text = fullName
        tvResultAge.text = calculateAge(bebe.dateNaissance)
        tvMessage.text = "Carnet trouvé"
        tvMessage.setTextColor(requireContext().getColor(R.color.success))
        cvResult.visibility = View.VISIBLE
    }

    private fun extractCode(raw: String): String {
        val trimmed = raw.trim()
        if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return trimmed
        return try {
            val uri = Uri.parse(trimmed)
            uri.getQueryParameter("code") ?: uri.getQueryParameter("qr") ?: uri.lastPathSegment ?: trimmed
        } catch (_: Exception) { trimmed }
    }

    private fun calculateAge(dateNaissance: String?): String {
        if (dateNaissance.isNullOrBlank()) return "Âge inconnu"
        return try {
            val dob = SimpleDateFormat("yyyy-MM-dd", Locale.FRENCH).parse(dateNaissance) ?: return "Âge inconnu"
            val totalMonths = ((Date().time - dob.time) / (1000L * 60 * 60 * 24 * 30.44)).toInt()
            val years = totalMonths / 12
            val months = totalMonths % 12
            if (years > 0) "$years an${if (years > 1) "s" else ""}, $months mois" else "$totalMonths mois"
        } catch (_: Exception) { "Âge inconnu" }
    }

    private fun setLoading(loading: Boolean) {
        pbLoading.visibility = if (loading) View.VISIBLE else View.GONE
        btnValider.isEnabled = !loading
        if (loading) {
            tvMessage.text = "Recherche en cours..."
            tvMessage.setTextColor(requireContext().getColor(R.color.text_secondary))
        }
    }
}
