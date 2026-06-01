package com.example.vaccinkid

import android.app.AlertDialog
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.fragment.app.Fragment
import com.google.android.material.progressindicator.LinearProgressIndicator

class GestionFlaconsFragment : Fragment() {

    data class Flacon(
        val id: String,
        val vaccin: String,
        val numerLot: String,
        val dosesTotales: Int,
        var dosesUtilisees: Int,
        var dosesGaspillees: Int,
        val seuilOuverture: Int = 5
    ) {
        val dosesRestantes get() = dosesTotales - dosesUtilisees - dosesGaspillees
        val pourcentageUtilisation get() = (dosesUtilisees * 100) / dosesTotales
        val estVide get() = dosesRestantes <= 0
    }

    private val flaconsOuverts = mutableListOf(
        Flacon("F001", "Pentavalent (DTC-Hib-HB)", "LOT-2025-A", 10, 6, 0),
        Flacon("F002", "Polio Oral", "LOT-2025-B", 20, 14, 1),
        Flacon("F003", "BCG", "LOT-2025-C", 10, 3, 0)
    )

    private val vaccinsDisponibles = listOf(
        "BCG (Tuberculose)" to 10,
        "Hépatite B" to 10,
        "Polio Oral" to 20,
        "Pneumocoque" to 4,
        "Rotavirus" to 1,
        "Pentavalent" to 10,
        "VPI" to 5,
        "RR" to 10,
        "DTC" to 10
    )

    private lateinit var listViewFlacons: ListView
    private lateinit var btnOuvrirFlacon: Button
    private lateinit var tvAucunFlacon: TextView

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val view = inflater.inflate(R.layout.fragment_gestion_flacons, container, false)
        listViewFlacons = view.findViewById(R.id.listViewFlacons)
        btnOuvrirFlacon = view.findViewById(R.id.btnOuvrirFlacon)
        tvAucunFlacon = view.findViewById(R.id.tvAucunFlacon)
        afficherFlacons()
        setupBoutonOuvrirFlacon()
        return view
    }

    private fun afficherFlacons() {
        if (flaconsOuverts.isEmpty()) {
            tvAucunFlacon.visibility = View.VISIBLE
            listViewFlacons.visibility = View.GONE
            return
        }
        tvAucunFlacon.visibility = View.GONE
        listViewFlacons.visibility = View.VISIBLE

        val adapter = object : ArrayAdapter<Flacon>(
            requireContext(),
            R.layout.item_flacon,
            flaconsOuverts
        ) {
            override fun getView(position: Int, convertView: View?, parent: ViewGroup): View {
                val itemView = convertView ?: LayoutInflater.from(context)
                    .inflate(R.layout.item_flacon, parent, false)
                val flacon = flaconsOuverts[position]

                itemView.findViewById<TextView>(R.id.tvVaccinFlacon).text = flacon.vaccin
                itemView.findViewById<TextView>(R.id.tvLotFlacon).text = "Lot : ${flacon.numerLot}"
                itemView.findViewById<TextView>(R.id.tvDosesInfo).text =
                    "Utilisées : ${flacon.dosesUtilisees} | Restantes : ${flacon.dosesRestantes} | Gaspillées : ${flacon.dosesGaspillees}"

                val progressBar = itemView.findViewById<LinearProgressIndicator>(R.id.progressDoses)
                progressBar.max = flacon.dosesTotales
                progressBar.progress = flacon.dosesUtilisees

                val indicateurGaspillage = itemView.findViewById<TextView>(R.id.tvIndicateurGaspillage)
                when {
                    flacon.dosesGaspillees == 0 -> {
                        indicateurGaspillage.text = "✅ Aucun gaspillage"
                        indicateurGaspillage.setTextColor(resources.getColor(android.R.color.holo_green_dark, null))
                    }
                    flacon.dosesGaspillees <= 2 -> {
                        indicateurGaspillage.text = "⚠️ ${flacon.dosesGaspillees} dose(s) gaspillée(s)"
                        indicateurGaspillage.setTextColor(resources.getColor(android.R.color.holo_orange_dark, null))
                    }
                    else -> {
                        indicateurGaspillage.text = "🔴 ${flacon.dosesGaspillees} doses gaspillées !"
                        indicateurGaspillage.setTextColor(resources.getColor(android.R.color.holo_red_dark, null))
                    }
                }

                itemView.findViewById<Button>(R.id.btnMarquerDose).setOnClickListener {
                    if (flacon.dosesRestantes > 0) {
                        flacon.dosesUtilisees++
                        notifyDataSetChanged()
                        Toast.makeText(context, "Dose enregistrée pour ${flacon.vaccin}", Toast.LENGTH_SHORT).show()
                    } else {
                        Toast.makeText(context, "Flacon vide !", Toast.LENGTH_SHORT).show()
                    }
                }

                itemView.findViewById<Button>(R.id.btnMarquerGaspillage).setOnClickListener {
                    if (flacon.dosesRestantes > 0) {
                        flacon.dosesGaspillees++
                        notifyDataSetChanged()
                        Toast.makeText(context, "Gaspillage enregistré", Toast.LENGTH_SHORT).show()
                    } else {
                        Toast.makeText(context, "Flacon vide !", Toast.LENGTH_SHORT).show()
                    }
                }

                return itemView
            }
        }
        listViewFlacons.adapter = adapter
    }

    private fun setupBoutonOuvrirFlacon() {
        btnOuvrirFlacon.setOnClickListener {
            afficherDialogOuvertureFlacon(forcee = false)
        }
    }

    // ✅ NOUVEAU — Dialog ouverture flacon design rose pêche
    private fun afficherDialogOuvertureFlacon(forcee: Boolean) {
        val dialogView = LayoutInflater.from(requireContext())
            .inflate(R.layout.dialog_ouvrir_flacon, null)

        val spinnerVaccin = dialogView.findViewById<Spinner>(R.id.spinnerVaccinFlacon)
        val etLot = dialogView.findViewById<EditText>(R.id.etLotFlacon)
        val etJustification = dialogView.findViewById<EditText>(R.id.etJustificationFlacon)
        val layoutJustification = dialogView.findViewById<View>(R.id.layoutJustification)
        val layoutAvertissement = dialogView.findViewById<View>(R.id.layoutAvertissementFlacon)
        val tvBadge = dialogView.findViewById<TextView>(R.id.tvBadgeScenario)
        val tvTitre = dialogView.findViewById<TextView>(R.id.tvTitreFlacon)

        val nomVaccins = vaccinsDisponibles.map { it.first }
        spinnerVaccin.adapter = ArrayAdapter(
            requireContext(),
            android.R.layout.simple_spinner_dropdown_item,
            nomVaccins
        )

        if (forcee) {
            tvBadge.visibility = View.VISIBLE
            layoutAvertissement.visibility = View.VISIBLE
            layoutJustification.visibility = View.VISIBLE
            tvTitre.text = "Ouvrir flacon (forcé)"
        } else {
            tvBadge.visibility = View.GONE
            layoutAvertissement.visibility = View.GONE
            layoutJustification.visibility = View.GONE
            tvTitre.text = "Ouvrir un nouveau flacon"
        }

        val dialog = AlertDialog.Builder(requireContext())
            .setView(dialogView)
            .create()

        // ✅ Fond transparent pour afficher le design rose
        dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)

        dialogView.findViewById<Button>(R.id.btnAnnulerFlacon).setOnClickListener {
            dialog.dismiss()
        }

        dialogView.findViewById<Button>(R.id.btnOuvrirFlacon).setOnClickListener {
            val lot = etLot.text.toString().trim()
            val vaccin = spinnerVaccin.selectedItem.toString()
            val justification = etJustification.text.toString().trim()

            if (lot.isEmpty()) {
                etLot.error = "Numéro de lot obligatoire"
                return@setOnClickListener
            }
            if (forcee && justification.isEmpty()) {
                etJustification.error = "Justification obligatoire"
                return@setOnClickListener
            }

            // Vérifier le seuil si ouverture normale
            if (!forcee) {
                val enfantsInscrits = 3 // mock — remplacer par API
                val seuilMin = 5
                if (enfantsInscrits < seuilMin) {
                    // ✅ NOUVEAU — Dialog seuil non atteint design rose
                    dialog.dismiss()
                    afficherDialogSeuilNonAtteint(enfantsInscrits, seuilMin)
                    return@setOnClickListener
                }
            }

            val dosesTotales = vaccinsDisponibles.find { it.first == vaccin }?.second ?: 10
            val nouveauFlacon = Flacon(
                id = "F${System.currentTimeMillis()}",
                vaccin = vaccin,
                numerLot = lot,
                dosesTotales = dosesTotales,
                dosesUtilisees = 0,
                dosesGaspillees = 0
            )
            flaconsOuverts.add(nouveauFlacon)
            afficherFlacons()

            val message = if (forcee) "Flacon ouvert (forcé) — justification enregistrée"
            else "✅ Flacon $vaccin ouvert avec succès"
            Toast.makeText(requireContext(), message, Toast.LENGTH_LONG).show()
            dialog.dismiss()
        }

        dialog.show()
    }

    // ✅ NOUVEAU — Dialog seuil non atteint design rose pêche
    private fun afficherDialogSeuilNonAtteint(enfantsInscrits: Int, seuilMin: Int) {
        val dialogView = LayoutInflater.from(requireContext())
            .inflate(R.layout.dialog_seuil_non_atteint, null)

        dialogView.findViewById<TextView>(R.id.tvMessageSeuil).text =
            "Il n'y a que $enfantsInscrits enfant(s) inscrits.\nLe minimum requis est $seuilMin."

        val dialog = AlertDialog.Builder(requireContext())
            .setView(dialogView)
            .create()

        dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)

        dialogView.findViewById<Button>(R.id.btnAnnulerSeuil).setOnClickListener {
            dialog.dismiss()
        }

        dialogView.findViewById<Button>(R.id.btnForcerOuverture).setOnClickListener {
            dialog.dismiss()
            afficherDialogOuvertureFlacon(forcee = true)
        }

        dialog.show()
    }
}

private val GestionFlaconsFragment.Flacon.dosesGaspillage: Int
    get() = this.dosesGaspillees