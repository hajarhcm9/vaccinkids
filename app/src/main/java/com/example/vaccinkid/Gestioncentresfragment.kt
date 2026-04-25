package com.example.vaccinkid

import android.app.AlertDialog
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.fragment.app.Fragment

class GestionCentresFragment : Fragment() {

    private val centres = CentresOujdaData.tousLesCentres.toMutableList()
    private lateinit var listViewCentres: ListView
    private lateinit var tvTotalActifs: TextView

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val view = inflater.inflate(R.layout.fragment_gestion_centres, container, false)
        listViewCentres = view.findViewById(R.id.listViewCentres)
        tvTotalActifs = view.findViewById(R.id.tvTotalActifs)
        afficherCentres()
        return view
    }

    private fun afficherCentres() {
        val actifs = centres.count { it.estActif }
        tvTotalActifs.text = "Centres actifs : $actifs / ${centres.size}"

        val adapter = object : ArrayAdapter<CentreVaccination>(
            requireContext(),
            R.layout.item_centre,
            centres
        ) {
            override fun getView(position: Int, convertView: View?, parent: ViewGroup): View {
                val itemView = convertView ?: LayoutInflater.from(context)
                    .inflate(R.layout.item_centre, parent, false)
                val centre = centres[position]

                itemView.findViewById<TextView>(R.id.tvNomCentre).text = centre.nom
                itemView.findViewById<TextView>(R.id.tvAdresseCentre).text = centre.adresse
                itemView.findViewById<TextView>(R.id.tvTelCentre).text = "📞 ${centre.telephone}"

                val tvStatut = itemView.findViewById<TextView>(R.id.tvStatutCentre)
                val cardView = itemView.findViewById<androidx.cardview.widget.CardView>(R.id.cardCentre)
                val btnDetail = itemView.findViewById<Button>(R.id.btnDetailCentre)

                if (centre.estActif) {
                    tvStatut.text = "✅ Actif"
                    tvStatut.setTextColor(resources.getColor(android.R.color.holo_green_dark, null))
                    cardView.alpha = 1.0f
                    btnDetail.visibility = View.VISIBLE
                } else {
                    tvStatut.text = "🔒 Inactif"
                    tvStatut.setTextColor(resources.getColor(android.R.color.darker_gray, null))
                    cardView.alpha = 0.6f
                    btnDetail.visibility = View.GONE
                }

                // Détail centre actif uniquement
                btnDetail.setOnClickListener {
                    afficherDetailCentre(centre)
                }

                // Long press → activer/désactiver (admin)
                itemView.setOnLongClickListener {
                    afficherDialogActivation(centre, position)
                    true
                }

                return itemView
            }
        }
        listViewCentres.adapter = adapter
    }

    // ─── Dialog détail centre actif ────────────────────────────────────────
    private fun afficherDetailCentre(centre: CentreVaccination) {
        val dialogView = LayoutInflater.from(requireContext())
            .inflate(R.layout.dialog_detail_centre, null)

        dialogView.findViewById<TextView>(R.id.tvDetailNom).text = centre.nom
        dialogView.findViewById<TextView>(R.id.tvDetailAdresse).text = centre.adresse
        dialogView.findViewById<TextView>(R.id.tvDetailTel).text = centre.telephone
        dialogView.findViewById<TextView>(R.id.tvDetailCoords).text =
            "GPS: ${centre.coordGpsLat}, ${centre.coordGpsLng}"

        // Jours vaccination
        val joursText = centre.joursVaccination.entries.joinToString("\n") { (jour, vaccins) ->
            "$jour : ${vaccins.joinToString(", ")}"
        }
        dialogView.findViewById<TextView>(R.id.tvDetailJours).text =
            if (joursText.isNotEmpty()) joursText else "Non configuré"

        val dialog = AlertDialog.Builder(requireContext())
            .setView(dialogView)
            .create()
        dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)

        dialogView.findViewById<Button>(R.id.btnFermerDetail).setOnClickListener {
            dialog.dismiss()
        }

        dialog.show()
    }

    // ─── Dialog activation/désactivation (admin) ───────────────────────────
    private fun afficherDialogActivation(centre: CentreVaccination, position: Int) {
        val dialogView = LayoutInflater.from(requireContext())
            .inflate(R.layout.dialog_activation_centre, null)

        val tvMessage = dialogView.findViewById<TextView>(R.id.tvMessageActivation)
        val btnConfirmer = dialogView.findViewById<Button>(R.id.btnConfirmerActivation)
        val tvTitre = dialogView.findViewById<TextView>(R.id.tvTitreActivation)

        if (centre.estActif) {
            tvTitre.text = "Désactiver le centre"
            tvMessage.text = "Voulez-vous désactiver ${centre.nom} ?\nLes infirmiers ne pourront plus y accéder."
            btnConfirmer.text = "Désactiver"
        } else {
            tvTitre.text = "Activer le centre"
            tvMessage.text = "Voulez-vous activer ${centre.nom} ?\nLes infirmiers pourront accéder à ce centre."
            btnConfirmer.text = "Activer"
        }

        val dialog = AlertDialog.Builder(requireContext())
            .setView(dialogView)
            .create()
        dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)

        dialogView.findViewById<Button>(R.id.btnAnnulerActivation).setOnClickListener {
            dialog.dismiss()
        }

        btnConfirmer.setOnClickListener {
            // TODO : appel API pour mettre à jour est_actif
            val nouveauStatut = !centre.estActif
            centres[position] = centre.copy(estActif = nouveauStatut)
            afficherCentres()
            val msg = if (nouveauStatut) "✅ ${centre.nom} activé" else "🔒 ${centre.nom} désactivé"
            Toast.makeText(requireContext(), msg, Toast.LENGTH_LONG).show()
            dialog.dismiss()
        }

        dialog.show()
    }
}