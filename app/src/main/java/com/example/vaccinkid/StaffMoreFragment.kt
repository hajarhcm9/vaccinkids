package com.example.vaccinkid

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
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
                view.findViewById<TextView>(R.id.moreUserRole).text = "Infirmier(ère)"
                view.findViewById<TextView>(R.id.moreUserCentre).text =
                    user.centreId?.let { "Centre affecté #$it" } ?: "Aucun centre affecté"
                messageView.text = ""
            } catch (error: Exception) {
                messageView.text = error.message ?: "Profil indisponible"
            }
        }
    }

    private fun confirmLogout() {
        AlertDialog.Builder(requireContext())
            .setTitle("Déconnexion")
            .setMessage("Voulez-vous vraiment vous déconnecter ?")
            .setPositiveButton("Se déconnecter") { _, _ ->
                authViewModel.logout {
                    startActivity(Intent(requireContext(), LoginInfirmierActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                    })
                }
            }
            .setNegativeButton("Annuler", null)
            .show()
    }
}
