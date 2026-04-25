package com.example.vaccinkid

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

        view.findViewById<CardView>(R.id.cardGestionCentres).setOnClickListener {
            (activity as? AdminActivity)?.naviguerVers(GestionCentresFragment())
        }
        view.findViewById<CardView>(R.id.cardGestionPersonnel).setOnClickListener {
            (activity as? AdminActivity)?.naviguerVers(GestionPersonnelFragment())
        }
        view.findViewById<CardView>(R.id.cardJoursDedies).setOnClickListener {
            (activity as? AdminActivity)?.naviguerVers(ConfigJoursDediesFragment())
        }

        return view
    }
}