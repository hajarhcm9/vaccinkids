package com.example.vaccinkid

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.cardview.widget.CardView
import androidx.fragment.app.Fragment

class AdminDashboardFragment : Fragment() {

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val view = inflater.inflate(R.layout.fragment_admin_dashboard, container, false)

        view.findViewById<CardView>(R.id.cardGestionCentres).visibility = View.GONE
        view.findViewById<CardView>(R.id.cardGestionPersonnel).visibility = View.GONE
        view.findViewById<CardView>(R.id.cardJoursDedies).visibility = View.GONE
        view.findViewById<CardView>(R.id.cardExports).setOnClickListener {
            startActivity(Intent(requireContext(), ExportsAdminActivity::class.java))
        }

        return view
    }
}
