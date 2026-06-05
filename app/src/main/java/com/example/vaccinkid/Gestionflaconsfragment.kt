package com.example.vaccinkid

import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import androidx.fragment.app.Fragment

class GestionFlaconsFragment : Fragment() {
    override fun onCreateView(
        inflater: android.view.LayoutInflater,
        container: android.view.ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        return LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(32, 32, 32, 32)
            addView(TextView(requireContext()).apply {
                text = "Gestion des flacons indisponible"
                textSize = 20f
                gravity = Gravity.CENTER
            })
            addView(TextView(requireContext()).apply {
                text = "Cette fonction est retiree du pilote tant que l'ouverture, l'utilisation et le gaspillage ne sont pas confirmes par le serveur."
                textSize = 15f
                gravity = Gravity.CENTER
                setPadding(0, 16, 0, 0)
            })
        }
    }
}
