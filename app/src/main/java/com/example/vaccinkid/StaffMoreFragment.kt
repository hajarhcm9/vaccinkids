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

class StaffMoreFragment : Fragment(R.layout.fragment_staff_more) {
    private lateinit var authViewModel: InfirmierAuthViewModel
    private lateinit var messageView: TextView

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        authViewModel = ViewModelProvider(this)[InfirmierAuthViewModel::class.java]
        messageView = view.findViewById(R.id.moreMessage)

        view.findViewById<View>(R.id.moreNotifications).setOnClickListener {
            (activity as? MainInfirmierActivity)?.naviguerVers(StaffNotificationsFragment())
        }
        view.findViewById<View>(R.id.moreStock).setOnClickListener {
            startActivity(Intent(requireContext(), GestionStocksActivity::class.java))
        }
        view.findViewById<View>(R.id.moreLogout).setOnClickListener { confirmLogout() }
        loadProfile(view)
    }

    private fun loadProfile(view: View) {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.getMe()
                val user = response.data?.user
                if (response.status != "success" || user == null) {
                    throw Exception(response.message ?: "Profil indisponible")
                }
                val fullName = listOfNotNull(user.prenom, user.nom).joinToString(" ")
                    .ifBlank { "Personnel #${user.id}" }
                view.findViewById<TextView>(R.id.moreUserName).text = fullName
                view.findViewById<TextView>(R.id.moreUserRole).text = when (user.role.uppercase()) {
                    "INFIRMIER" -> "Infirmier(ère)"
                    "MEDECIN" -> "Médecin"
                    "ADMIN" -> "Administrateur"
                    else -> user.role
                }
                val centreLabel = try {
                    val sessions = ApiClient.apiService.getTodaySessions()
                    sessions.data?.firstOrNull()?.centreNom
                        ?: user.centreId?.let { "Centre #$it" }
                        ?: "Aucun centre affecté"
                } catch (_: Exception) {
                    user.centreId?.let { "Centre #$it" } ?: "Aucun centre affecté"
                }
                view.findViewById<TextView>(R.id.moreUserCentre).text = centreLabel
                messageView.text = ""
            } catch (error: Exception) {
                messageView.text = error.message ?: "Profil indisponible"
            }
        }
    }

    private fun confirmLogout() {
        val sheet = com.google.android.material.bottomsheet.BottomSheetDialog(requireContext())
        val root = android.widget.LinearLayout(requireContext()).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setPadding(56, 40, 56, 48)
        }

        val icon = android.widget.TextView(requireContext()).apply {
            text = "👋"
            textSize = 40f
            gravity = android.view.Gravity.CENTER
        }
        val title = android.widget.TextView(requireContext()).apply {
            text = "Se déconnecter ?"
            textSize = 20f
            setTypeface(null, android.graphics.Typeface.BOLD)
            setTextColor(requireContext().getColor(R.color.text_primary))
            gravity = android.view.Gravity.CENTER
            setPadding(0, 16, 0, 8)
        }
        val subtitle = android.widget.TextView(requireContext()).apply {
            text = "Vous devrez vous reconnecter pour accéder à l'application."
            textSize = 14f
            setTextColor(requireContext().getColor(R.color.text_secondary))
            gravity = android.view.Gravity.CENTER
            setPadding(0, 0, 0, 32)
        }

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
                    startActivity(Intent(requireContext(), LoginInfirmierActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                    })
                }
            }
        }
        val btnCancel = com.google.android.material.button.MaterialButton(
            requireContext(),
            null,
            com.google.android.material.R.attr.materialButtonOutlinedStyle
        ).apply {
            text = "Annuler"
            setTextColor(requireContext().getColor(R.color.text_primary))
            textSize = 15f
            layoutParams = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT, 140
            )
            setOnClickListener { sheet.dismiss() }
        }

        listOf(icon, title, subtitle, btnConfirm, btnCancel).forEach { root.addView(it) }
        sheet.setContentView(root)
        sheet.show()
    }
}
