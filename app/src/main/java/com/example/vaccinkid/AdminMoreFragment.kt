package com.example.vaccinkid

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import com.example.vaccinkid.network.ApiClient
import com.example.vaccinkid.viewmodel.InfirmierAuthViewModel
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import kotlinx.coroutines.launch

class AdminMoreFragment : Fragment(R.layout.fragment_admin_more) {

    private lateinit var authViewModel: InfirmierAuthViewModel
    private var profileLoaded = false

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        authViewModel = ViewModelProvider(this)[InfirmierAuthViewModel::class.java]

        val admin = requireActivity() as AdminActivity

        view.findViewById<View>(R.id.menuAdminCentres).setOnClickListener {
            admin.naviguerVers(GestionCentresFragment())
        }
        view.findViewById<View>(R.id.menuAdminVaccins).setOnClickListener {
            admin.naviguerVers(GestionVaccinsFragment())
        }
        view.findViewById<View>(R.id.menuAdminStats).setOnClickListener {
            startActivity(Intent(requireContext(), StatsAdminActivity::class.java))
        }
        view.findViewById<View>(R.id.menuAdminAlertes).setOnClickListener {
            admin.naviguerVers(AdminAlertesFragment())
        }
        view.findViewById<View>(R.id.menuAdminAudit).setOnClickListener {
            admin.naviguerVers(AdminAuditLogFragment())
        }
        view.findViewById<View>(R.id.menuAdminKiosk).setOnClickListener {
            admin.naviguerVers(AdminKioskFragment())
        }
        view.findViewById<View>(R.id.menuAdminRetards).setOnClickListener {
            admin.naviguerVers(AdminDelayAlertsFragment())
        }
        view.findViewById<View>(R.id.menuAdminRdv).setOnClickListener {
            admin.naviguerVers(AdminRendezVousFragment())
        }
        view.findViewById<View>(R.id.menuAdminRecherche).setOnClickListener {
            admin.naviguerVers(AdminSearchFragment())
        }
        view.findViewById<View>(R.id.menuAdminExports).setOnClickListener {
            startActivity(Intent(requireContext(), ExportsAdminActivity::class.java))
        }
        view.findViewById<View>(R.id.btnAdminMoreLogout).setOnClickListener {
            showLogoutDialog()
        }

        if (!profileLoaded) loadProfile(view)
    }

    override fun onResume() {
        super.onResume()
        if (!profileLoaded) view?.let { loadProfile(it) }
    }

    private fun loadProfile(view: View) {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.getMe()
                val user = response.data?.user ?: return@launch

                val fullName = listOfNotNull(user.prenom, user.nom)
                    .joinToString(" ").ifBlank { "Administrateur" }
                val initials = listOfNotNull(user.prenom?.firstOrNull(), user.nom?.firstOrNull())
                    .joinToString("").uppercase().ifBlank { "AD" }
                val roleLabel = when (user.role.uppercase()) {
                    "ADMIN" -> "Administrateur principal"
                    else    -> user.role.replaceFirstChar { it.uppercase() }
                }

                view.findViewById<TextView>(R.id.tvAdminMoreName).text = fullName
                view.findViewById<TextView>(R.id.tvAdminMoreInitials).text = initials
                view.findViewById<TextView>(R.id.tvAdminMoreRole).text = roleLabel

                // Centre info
                val centre = user.centreNom
                view.findViewById<TextView>(R.id.tvAdminMoreCentre).text =
                    if (!centre.isNullOrBlank()) centre else "Centre non affecté"

                // Phone (shown only if available)
                val phone = user.telephone
                val llPhone = view.findViewById<LinearLayout>(R.id.llAdminMorePhone)
                if (!phone.isNullOrBlank()) {
                    view.findViewById<TextView>(R.id.tvAdminMorePhone).text = formatPhone(phone)
                    llPhone.visibility = View.VISIBLE
                } else {
                    llPhone.visibility = View.GONE
                }

                profileLoaded = true
            } catch (_: Exception) {}
        }
    }

    private fun showLogoutDialog() {
        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Se déconnecter ?")
            .setMessage("Vous serez redirigé vers l'écran de connexion.")
            .setNegativeButton("Annuler", null)
            .setPositiveButton("Se déconnecter") { _, _ ->
                profileLoaded = false
                authViewModel.logout {
                    startActivity(Intent(requireContext(), AdminLoginActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                    })
                }
            }
            .show()
    }

    companion object {
        private fun formatPhone(raw: String): String {
            val digits = raw.filter { it.isDigit() }
            return if (digits.length == 10)
                "${digits.substring(0,2)} ${digits.substring(2,4)} ${digits.substring(4,6)} ${digits.substring(6,8)} ${digits.substring(8,10)}"
            else raw
        }
    }
}
