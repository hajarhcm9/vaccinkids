package com.example.vaccinkid

import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import androidx.fragment.app.Fragment

class EnregistrementVaccinationFragment : Fragment() {
    override fun onCreateView(
        inflater: android.view.LayoutInflater,
        container: android.view.ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        val nomBebe = arguments?.getString("nomBebe") ?: "Patient"
        return LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(32, 32, 32, 32)
            addView(TextView(requireContext()).apply {
                text = "Enregistrement vaccination indisponible"
                textSize = 20f
                gravity = Gravity.CENTER
            })
            addView(TextView(requireContext()).apply {
                text = "L'acte clinique pour $nomBebe doit etre lance depuis un rendez-vous confirme et valide par le serveur."
                textSize = 15f
                gravity = Gravity.CENTER
                setPadding(0, 16, 0, 0)
            })
        }
    }

    companion object {
        fun newInstance(nomBebe: String, idBebe: String): EnregistrementVaccinationFragment {
            return EnregistrementVaccinationFragment().apply {
                arguments = Bundle().apply {
                    putString("nomBebe", nomBebe)
                    putString("idBebe", idBebe)
                }
            }
        }
    }
}
