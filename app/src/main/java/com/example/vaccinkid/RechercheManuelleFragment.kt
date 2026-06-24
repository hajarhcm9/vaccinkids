package com.example.vaccinkid

import android.content.res.ColorStateList
import android.net.Uri
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.view.animation.AnimationUtils
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.core.content.getSystemService
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.example.vaccinkid.model.BebeDto
import com.example.vaccinkid.model.RendezVousDto
import com.example.vaccinkid.model.VaccinationHistoryDto
import com.example.vaccinkid.network.ApiClient
import com.google.android.material.button.MaterialButton
import com.google.android.material.textfield.TextInputEditText
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class RechercheManuelleFragment : Fragment(R.layout.fragment_recherche_manuelle) {

    private val secureQrPattern = Regex("^VK1\\.[a-f0-9]{64}$")

    private lateinit var etCode:             TextInputEditText
    private lateinit var btnValider:         MaterialButton
    private lateinit var pbLoading:          View
    private lateinit var llError:            LinearLayout
    private lateinit var tvMessage:          TextView
    private lateinit var cvResult:           View
    private lateinit var flAvatar:           FrameLayout
    private lateinit var tvInitials:         TextView
    private lateinit var tvResultName:       TextView
    private lateinit var tvResultAge:        TextView
    private lateinit var tvSexBadge:         TextView
    private lateinit var tvRdvBadge:         TextView
    private lateinit var tvVaccinBadge:      TextView
    private lateinit var btnOuvrir:          MaterialButton
    private lateinit var btnNouvelle:        MaterialButton

    private var foundBebe:  BebeDto?                    = null
    private var foundRdvs:  List<RendezVousDto>         = emptyList()
    private var foundHist:  List<VaccinationHistoryDto> = emptyList()
    private var actionInFlight = false

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        bindViews(view)
        bindActions(view)
    }

    private fun bindViews(view: View) {
        etCode        = view.findViewById(R.id.etRechercheCode)
        btnValider    = view.findViewById(R.id.btnRechercheValider)
        pbLoading     = view.findViewById(R.id.pbRecherche)
        llError       = view.findViewById(R.id.llRechercheError)
        tvMessage     = view.findViewById(R.id.tvRechercheMessage)
        cvResult      = view.findViewById(R.id.cvRechercheResult)
        flAvatar      = view.findViewById(R.id.flRechercheAvatar)
        tvInitials    = view.findViewById(R.id.tvRechercheInitials)
        tvResultName  = view.findViewById(R.id.tvRechercheResultName)
        tvResultAge   = view.findViewById(R.id.tvRechercheResultAge)
        tvSexBadge    = view.findViewById(R.id.tvRechercheSex)
        tvRdvBadge    = view.findViewById(R.id.tvRechercheRdvBadge)
        tvVaccinBadge = view.findViewById(R.id.tvRechercheVaccinBadge)
        btnOuvrir     = view.findViewById(R.id.btnRechercheOuvrir)
        btnNouvelle   = view.findViewById(R.id.btnNouvelleRecherche)
    }

    private fun bindActions(view: View) {
        view.findViewById<View>(R.id.btnBackRecherche).setOnClickListener {
            parentFragmentManager.popBackStack()
        }

        btnValider.setOnClickListener { submitSearch() }

        // Keyboard "Search" action triggers search
        etCode.setOnEditorActionListener { _, actionId, event ->
            val isSearch = actionId == EditorInfo.IME_ACTION_SEARCH
            val isEnter  = event?.keyCode == KeyEvent.KEYCODE_ENTER && event.action == KeyEvent.ACTION_DOWN
            if (isSearch || isEnter) { submitSearch(); true } else false
        }

        btnOuvrir.setOnClickListener {
            val bebe = foundBebe ?: return@setOnClickListener
            (activity as? MainInfirmierActivity)?.naviguerVers(
                EnfantProfilFragment.newInstance(bebe, foundRdvs, foundHist)
            )
        }

        btnNouvelle.setOnClickListener {
            etCode.text?.clear()
            cvResult.visibility = View.GONE
            llError.visibility  = View.GONE
            foundBebe           = null
            foundRdvs           = emptyList()
            foundHist           = emptyList()
            etCode.requestFocus()
            requireContext().getSystemService<InputMethodManager>()
                ?.showSoftInput(etCode, InputMethodManager.SHOW_IMPLICIT)
        }
    }

    private fun submitSearch() {
        if (actionInFlight) return
        val input = etCode.text?.toString()?.trim().orEmpty()
        if (input.isBlank()) {
            showError("Veuillez saisir un code.")
            return
        }
        rechercherCarnet(input)
    }

    private fun rechercherCarnet(rawInput: String) {
        val code = extractCode(rawInput)
        if (!secureQrPattern.matches(code)) {
            val len = code.length
            val hint = when {
                len < 69 -> "Code trop court (${len} car. sur 69 attendus)"
                len > 69 -> "Code trop long (${len} car. sur 69 attendus)"
                else     -> "Format invalide — doit commencer par VK1. suivi de 64 caractères hex"
            }
            showError(hint)
            cvResult.visibility = View.GONE
            return
        }

        hideKeyboard()
        setLoading(true)
        cvResult.visibility = View.GONE
        llError.visibility  = View.GONE

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
                    showError(response.message ?: "Carnet introuvable.")
                }
            } catch (e: Exception) {
                showError("Erreur réseau : ${e.message}")
            } finally {
                setLoading(false)
            }
        }
    }

    private fun showResult(bebe: BebeDto) {
        val fullName = listOfNotNull(bebe.prenom, bebe.nom).joinToString(" ").ifBlank { "Bébé #${bebe.id}" }

        // Name + age
        tvResultName.text = fullName
        tvResultAge.text  = calculateAge(bebe.dateNaissance)

        // Avatar initials
        val parts = fullName.trim().split(" ")
        tvInitials.text = buildString {
            parts.getOrNull(0)?.firstOrNull()?.uppercaseChar()?.let { append(it) }
            parts.getOrNull(1)?.firstOrNull()?.uppercaseChar()?.let { append(it) }
        }.ifBlank { "?" }

        // Avatar color + sex badge by sex
        val isFemale = bebe.sexe?.lowercase()?.trim() in listOf("f", "fille", "feminin", "féminin", "female")
        if (isFemale) {
            flAvatar.backgroundTintList = ColorStateList.valueOf(
                ContextCompat.getColor(requireContext(), R.color.brand_coral)
            )
            tvSexBadge.text = "Fille"
            tvSexBadge.setTextColor(ContextCompat.getColor(requireContext(), R.color.brand_coral))
            tvSexBadge.setBackgroundResource(R.drawable.bg_badge_error)
        } else {
            flAvatar.backgroundTintList = ColorStateList.valueOf(
                ContextCompat.getColor(requireContext(), R.color.info)
            )
            tvSexBadge.text = "Garçon"
            tvSexBadge.setTextColor(ContextCompat.getColor(requireContext(), R.color.info_dark))
            tvSexBadge.setBackgroundResource(R.drawable.bg_badge_info)
        }
        tvSexBadge.visibility = if (!bebe.sexe.isNullOrBlank()) View.VISIBLE else View.GONE

        // RDV chip
        val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.FRENCH).format(Date())
        val todayRdvs = foundRdvs.filter { it.dateSession?.startsWith(todayStr) == true }
        if (todayRdvs.isNotEmpty()) {
            tvRdvBadge.text = "📅 ${todayRdvs.size} RDV aujourd'hui"
            tvRdvBadge.visibility = View.VISIBLE
        } else {
            tvRdvBadge.visibility = View.GONE
        }

        // Vaccin chip — first upcoming vaccin
        val nextVaccin = foundRdvs.firstOrNull { !it.vaccinNom.isNullOrBlank() }?.vaccinNom
            ?: foundHist.firstOrNull { !it.vaccinNom.isNullOrBlank() }?.vaccinNom
        if (nextVaccin != null) {
            tvVaccinBadge.text = "💉 $nextVaccin"
            tvVaccinBadge.visibility = View.VISIBLE
        } else {
            tvVaccinBadge.visibility = View.GONE
        }

        // Show with slide-up animation
        cvResult.visibility = View.VISIBLE
        cvResult.startAnimation(AnimationUtils.loadAnimation(requireContext(), android.R.anim.slide_in_left))
    }

    private fun showError(message: String) {
        tvMessage.text      = message
        llError.visibility  = View.VISIBLE
        cvResult.visibility = View.GONE
    }

    private fun setLoading(loading: Boolean) {
        actionInFlight       = loading
        pbLoading.visibility = if (loading) View.VISIBLE else View.GONE
        btnValider.isEnabled = !loading
        btnValider.alpha     = if (loading) 0.6f else 1.0f
    }

    private fun hideKeyboard() {
        requireContext().getSystemService<InputMethodManager>()
            ?.hideSoftInputFromWindow(etCode.windowToken, 0)
    }

    private fun extractCode(raw: String): String {
        val trimmed = raw.trim().trimEnd('/')
        if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return trimmed
        return try {
            val uri = Uri.parse(trimmed)
            uri.getQueryParameter("code")
                ?: uri.getQueryParameter("qr")
                ?: uri.lastPathSegment?.trimEnd('/')
                ?: trimmed
        } catch (_: Exception) { trimmed }
    }

    private fun calculateAge(dateNaissance: String?): String {
        if (dateNaissance.isNullOrBlank()) return "Âge inconnu"
        return try {
            val dob = SimpleDateFormat("yyyy-MM-dd", Locale.FRENCH).parse(dateNaissance)
                ?: return "Âge inconnu"
            val totalMonths = ((Date().time - dob.time) / (1000L * 60 * 60 * 24 * 30.44)).toInt()
            val years  = totalMonths / 12
            val months = totalMonths % 12
            if (years > 0) "$years an${if (years > 1) "s" else ""}, $months mois" else "$totalMonths mois"
        } catch (_: Exception) { "Âge inconnu" }
    }
}
