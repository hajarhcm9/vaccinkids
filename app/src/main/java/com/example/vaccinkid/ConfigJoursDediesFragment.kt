package com.example.vaccinkid

import android.app.AlertDialog
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.fragment.app.Fragment
import com.google.android.material.chip.Chip
import com.google.android.material.chip.ChipGroup

class ConfigJoursDediesFragment : Fragment() {

    private val jours = listOf("Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi")
    private val tousLesVaccins = listOf("BCG", "Hépatite B", "Pentavalent", "Polio Oral", "Pneumocoque", "Rotavirus", "VPI", "RR", "DTC")
    private val configJours = mutableMapOf(
        "Lundi" to mutableListOf("BCG", "Hépatite B"),
        "Mardi" to mutableListOf("Pentavalent", "Polio Oral"),
        "Mercredi" to mutableListOf("Pneumocoque", "Rotavirus"),
        "Jeudi" to mutableListOf("VPI", "RR"),
        "Vendredi" to mutableListOf("DTC")
    )

    private lateinit var listViewJours: ListView

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View? {
        val view = inflater.inflate(R.layout.fragment_config_jours_dedies, container, false)
        listViewJours = view.findViewById(R.id.listveiwadmin)
        afficherConfig()
        return view
    }

    private fun afficherConfig() {
        val adapter = object : ArrayAdapter<String>(requireContext(), R.layout.item_jour_dedie, jours) {
            override fun getView(position: Int, convertView: View?, parent: ViewGroup): View {
                val itemView = convertView ?: LayoutInflater.from(context).inflate(R.layout.item_jour_dedie, parent, false)
                val jour = jours[position]
                val vaccinsJour = configJours[jour] ?: mutableListOf()
                itemView.findViewById<TextView>(R.id.tvJour).text = jour
                val chipGroup = itemView.findViewById<ChipGroup>(R.id.chipGroupVaccinsJour)
                chipGroup.removeAllViews()
                vaccinsJour.forEach { vaccin ->
                    val chip = Chip(requireContext()).apply {
                        text = vaccin
                        isCloseIconVisible = true
                        setOnCloseIconClickListener { configJours[jour]?.remove(vaccin); notifyDataSetChanged() }
                    }
                    chipGroup.addView(chip)
                }
                itemView.findViewById<Button>(R.id.btnModifierJour).setOnClickListener { afficherDialog(jour, vaccinsJour) }
                return itemView
            }
        }
        listViewJours.adapter = adapter
    }

    private fun afficherDialog(jour: String, vaccinsActuels: MutableList<String>) {
        val dialogView = LayoutInflater.from(requireContext()).inflate(R.layout.dialog_assigner_vaccins_jour, null)
        dialogView.findViewById<TextView>(R.id.tvTitreAssignation).text = "Vaccins — $jour"
        val container = dialogView.findViewById<LinearLayout>(R.id.layoutCheckboxVaccins)
        container.removeAllViews()
        val checkboxes = tousLesVaccins.map { vaccin ->
            CheckBox(requireContext()).apply {
                text = vaccin; isChecked = vaccinsActuels.contains(vaccin)
                setTextColor(resources.getColor(android.R.color.white, null))
                buttonTintList = resources.getColorStateList(android.R.color.white, null)
                textSize = 14f; setPadding(0, 8, 0, 8)
            }.also { container.addView(it) }
        }
        val dialog = AlertDialog.Builder(requireContext()).setView(dialogView).create()
        dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)
        dialogView.findViewById<Button>(R.id.btnAnnulerAssignation).setOnClickListener { dialog.dismiss() }
        dialogView.findViewById<Button>(R.id.btnValiderAssignation).setOnClickListener {
            configJours[jour] = tousLesVaccins.filterIndexed { i, _ -> checkboxes[i].isChecked }.toMutableList()
            afficherConfig()
            Toast.makeText(requireContext(), "✅ $jour mis à jour", Toast.LENGTH_SHORT).show()
            dialog.dismiss()
        }
        dialog.show()
    }
}
