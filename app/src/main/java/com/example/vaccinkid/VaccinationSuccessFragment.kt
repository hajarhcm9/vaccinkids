package com.example.vaccinkid

import android.os.Bundle
import android.view.View
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.fragment.app.FragmentManager
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class VaccinationSuccessFragment : Fragment(R.layout.fragment_vaccination_success) {

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val nomBebe = arguments?.getString(ARG_NOM_BEBE) ?: "Patient"
        val vaccinLabel = arguments?.getString(ARG_VACCIN_LABEL) ?: "—"

        view.findViewById<TextView>(R.id.tvSuccessPatient).text = nomBebe
        view.findViewById<TextView>(R.id.tvSuccessVaccin).text = vaccinLabel
        view.findViewById<TextView>(R.id.tvSuccessDate).text =
            SimpleDateFormat("dd/MM/yyyy à HH:mm", Locale.FRENCH).format(Date())

        view.findViewById<View>(R.id.btnSuccessDashboard).setOnClickListener {
            parentFragmentManager.popBackStack(null, FragmentManager.POP_BACK_STACK_INCLUSIVE)
        }

        view.findViewById<View>(R.id.btnSuccessScan).setOnClickListener {
            parentFragmentManager.popBackStack(null, FragmentManager.POP_BACK_STACK_INCLUSIVE)
            (activity as? MainInfirmierActivity)?.naviguerVers(ScanQrFragment())
        }
    }

    companion object {
        private const val ARG_NOM_BEBE = "nomBebe"
        private const val ARG_VACCIN_LABEL = "vaccinLabel"

        fun newInstance(nomBebe: String, vaccinLabel: String): VaccinationSuccessFragment =
            VaccinationSuccessFragment().apply {
                arguments = Bundle().apply {
                    putString(ARG_NOM_BEBE, nomBebe)
                    putString(ARG_VACCIN_LABEL, vaccinLabel)
                }
            }
    }
}
