package com.example.vaccinkid

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import com.example.vaccinkid.network.ApiClient
import com.example.vaccinkid.viewmodel.InfirmierAuthViewModel
import kotlinx.coroutines.launch

class AdminMoreFragment : Fragment(R.layout.fragment_admin_more) {

    private lateinit var authViewModel: InfirmierAuthViewModel

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
            showLogoutSheet()
        }

        loadProfile(view)
    }

    private fun loadProfile(view: View) {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.getMe()
                val user = response.data?.user ?: return@launch
                val fullName = listOfNotNull(user.prenom, user.nom).joinToString(" ").ifBlank { "Admin #${user.id}" }
                view.findViewById<TextView>(R.id.tvAdminMoreName).text = fullName
                view.findViewById<TextView>(R.id.tvAdminMoreRole).text = when (user.role.uppercase()) {
                    "ADMIN" -> "Administrateur principal"
                    else -> user.role
                }
                val initials = listOfNotNull(user.prenom?.firstOrNull(), user.nom?.firstOrNull())
                    .joinToString("").uppercase().ifBlank { "AD" }
                view.findViewById<TextView>(R.id.tvAdminMoreInitials).text = initials
            } catch (_: Exception) {}
        }
    }

    private fun showLogoutSheet() {
        val sheet = com.google.android.material.bottomsheet.BottomSheetDialog(requireContext())
        val root = android.widget.LinearLayout(requireContext()).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setPadding(56, 40, 56, 48)
        }
        root.addView(android.widget.TextView(requireContext()).apply {
            text = "👋"
            textSize = 36f
            gravity = android.view.Gravity.CENTER
        })
        root.addView(android.widget.TextView(requireContext()).apply {
            text = "Se déconnecter ?"
            textSize = 20f
            setTypeface(null, android.graphics.Typeface.BOLD)
            setTextColor(requireContext().getColor(R.color.text_primary))
            gravity = android.view.Gravity.CENTER
            setPadding(0, 16, 0, 8)
        })
        root.addView(android.widget.TextView(requireContext()).apply {
            text = "Vous serez redirigé vers l'écran de connexion."
            textSize = 14f
            setTextColor(requireContext().getColor(R.color.text_secondary))
            gravity = android.view.Gravity.CENTER
            setPadding(0, 0, 0, 32)
        })
        val btnConfirm = com.google.android.material.button.MaterialButton(requireContext()).apply {
            text = "Se déconnecter"
            backgroundTintList = android.content.res.ColorStateList.valueOf(requireContext().getColor(R.color.error))
            setTextColor(requireContext().getColor(R.color.white))
            textSize = 15f
            layoutParams = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT, 140
            ).also { it.bottomMargin = 16 }
            setOnClickListener {
                sheet.dismiss()
                authViewModel.logout {
                    startActivity(Intent(requireContext(), AdminLoginActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                    })
                }
            }
        }
        val btnCancel = com.google.android.material.button.MaterialButton(
            requireContext(), null, com.google.android.material.R.attr.materialButtonOutlinedStyle
        ).apply {
            text = "Annuler"
            setTextColor(requireContext().getColor(R.color.text_primary))
            textSize = 15f
            layoutParams = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT, 140
            )
            setOnClickListener { sheet.dismiss() }
        }
        listOf(btnConfirm, btnCancel).forEach { root.addView(it) }
        sheet.setContentView(root)
        sheet.show()
    }
}
