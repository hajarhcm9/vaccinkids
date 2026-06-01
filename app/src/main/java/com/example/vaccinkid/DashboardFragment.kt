package com.example.vaccinkid

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.ImageButton
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.cardview.widget.CardView
import androidx.fragment.app.Fragment
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class DashboardFragment : Fragment() {

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_dashboard, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        // Date du jour
        val tvDate = view.findViewById<TextView>(R.id.tvDateDashboard)
        val sdf = SimpleDateFormat("EEEE dd MMMM yyyy", Locale.FRENCH)
        tvDate.text = sdf.format(Date()).replaceFirstChar { it.uppercase() }

        // Stats mockées
        view.findViewById<TextView>(R.id.tvStatRdv).text     = "12"
        view.findViewById<TextView>(R.id.tvStatVaccines).text = "8"
        view.findViewById<TextView>(R.id.tvStatAttente).text  = "4"

        // Alerte session
        view.findViewById<CardView>(R.id.cardAlertSessionDash).setOnClickListener {
            // Naviguer vers RDV
            (activity as? MainInfirmierActivity)?.let {
                it.findViewById<com.google.android.material.bottomnavigation.BottomNavigationView>(
                    R.id.bottomNav
                )?.selectedItemId = R.id.nav_rdv
            }
        }

        // Bouton gérer session 1
        view.findViewById<Button>(R.id.btnGererSession1).setOnClickListener {
            (activity as? MainInfirmierActivity)?.let {
                it.findViewById<com.google.android.material.bottomnavigation.BottomNavigationView>(
                    R.id.bottomNav
                )?.selectedItemId = R.id.nav_rdv
            }
        }

        // Bouton gérer session 2
        view.findViewById<Button>(R.id.btnGererSession2).setOnClickListener {
            (activity as? MainInfirmierActivity)?.let {
                it.findViewById<com.google.android.material.bottomnavigation.BottomNavigationView>(
                    R.id.bottomNav
                )?.selectedItemId = R.id.nav_rdv
            }
        }

        // Bouton déconnexion
        view.findViewById<ImageButton>(R.id.btnLogoutDashboard).setOnClickListener {
            AlertDialog.Builder(requireContext())
                .setTitle("Déconnexion")
                .setMessage("Voulez-vous vraiment vous déconnecter ?")
                .setPositiveButton("Oui") { _, _ ->
                    val intent = Intent(requireContext(), LoginInfirmierActivity::class.java)
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
                    startActivity(intent)
                }
                .setNegativeButton("Annuler", null)
                .show()
        }
    }
}