package com.example.vaccinkid

import android.app.AlertDialog
import android.os.Bundle
import android.os.CountDownTimer
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.fragment.app.Fragment

class GestionPresencesFragment : Fragment() {

    data class RendezVous(
        val id: String,
        val nomBebe: String,
        val nomParent: String,
        val vaccin: String,
        val creneau: String,
        var statut: StatutPresence = StatutPresence.EN_ATTENTE
    )

    enum class StatutPresence { EN_ATTENTE, PRESENT, ABSENT }

    private val rendezVousDuJour = mutableListOf(
        RendezVous("RDV001", "Mohammed A.", "Ahmed A.", "Pentavalent", "09:00"),
        RendezVous("RDV002", "Fatima Z.", "Khadija Z.", "BCG", "09:15"),
        RendezVous("RDV003", "Youssef B.", "Hassan B.", "Polio Oral", "09:30"),
        RendezVous("RDV004", "Aisha M.", "Rachid M.", "RR", "09:45"),
        RendezVous("RDV005", "Omar K.", "Laila K.", "Pentavalent", "10:00")
    )

    private lateinit var listViewRdv: ListView
    private lateinit var tvDelaiGrace: TextView
    private lateinit var tvCompteurPresents: TextView
    private var countDownTimer: CountDownTimer? = null
    private val DELAI_GRACE_MS = 15 * 60 * 1000L

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val view = inflater.inflate(R.layout.fragment_gestion_presences, container, false)
        listViewRdv = view.findViewById(R.id.listViewRdv)
        tvDelaiGrace = view.findViewById(R.id.tvDelaiGrace)
        tvCompteurPresents = view.findViewById(R.id.tvCompteurPresents)
        afficherRdvDuJour()
        demarrerChronometre()
        return view
    }

    override fun onDestroyView() {
        super.onDestroyView()
        countDownTimer?.cancel()
    }

    private fun afficherRdvDuJour() {
        afficherCompteur()

        val adapter = object : ArrayAdapter<RendezVous>(
            requireContext(),
            R.layout.item_rdv_presence,
            rendezVousDuJour
        ) {
            override fun getView(position: Int, convertView: View?, parent: ViewGroup): View {
                val itemView = convertView ?: LayoutInflater.from(context)
                    .inflate(R.layout.item_rdv_presence, parent, false)
                val rdv = rendezVousDuJour[position]

                itemView.findViewById<TextView>(R.id.tvNomBebeRdv).text = rdv.nomBebe
                itemView.findViewById<TextView>(R.id.tvVaccinRdv).text = "${rdv.vaccin} — ${rdv.creneau}"
                itemView.findViewById<TextView>(R.id.tvParentRdv).text = "Parent : ${rdv.nomParent}"

                val tvStatut = itemView.findViewById<TextView>(R.id.tvStatutRdv)
                val btnPresent = itemView.findViewById<Button>(R.id.btnMarquerPresent)
                val btnAbsent = itemView.findViewById<Button>(R.id.btnMarquerAbsent)
                val btnEnregistrer = itemView.findViewById<Button>(R.id.btnEnregistrerVaccin)

                when (rdv.statut) {
                    StatutPresence.EN_ATTENTE -> {
                        tvStatut.text = "⏳ En attente"
                        tvStatut.setTextColor(resources.getColor(android.R.color.holo_orange_dark, null))
                        btnPresent.isEnabled = true
                        btnAbsent.isEnabled = true
                        btnEnregistrer.visibility = View.GONE
                    }
                    StatutPresence.PRESENT -> {
                        tvStatut.text = "✅ Présent"
                        tvStatut.setTextColor(resources.getColor(android.R.color.holo_green_dark, null))
                        btnPresent.isEnabled = false
                        btnAbsent.isEnabled = false
                        btnEnregistrer.visibility = View.VISIBLE
                    }
                    StatutPresence.ABSENT -> {
                        tvStatut.text = "❌ Absent"
                        tvStatut.setTextColor(resources.getColor(android.R.color.holo_red_dark, null))
                        btnPresent.isEnabled = false
                        btnAbsent.isEnabled = false
                        btnEnregistrer.visibility = View.GONE
                    }
                }

                btnPresent.setOnClickListener {
                    rdv.statut = StatutPresence.PRESENT
                    notifyDataSetChanged()
                    afficherCompteur()
                    Toast.makeText(context, "${rdv.nomBebe} marqué présent", Toast.LENGTH_SHORT).show()
                }

                // ✅ NOUVEAU — Dialog rose pêche
                btnAbsent.setOnClickListener {
                    afficherDialogAbsence(rdv, this)
                }

                btnEnregistrer.setOnClickListener {
                    val fragment = EnregistrementVaccinationFragment.newInstance(
                        nomBebe = rdv.nomBebe,
                        idBebe = rdv.id
                    )
                    parentFragmentManager.beginTransaction()
                        .replace(R.id.fragmentContainer, fragment)
                        .addToBackStack(null)
                        .commit()
                }

                return itemView
            }
        }
        listViewRdv.adapter = adapter
    }

    // ✅ NOUVEAU — Dialog absence design rose pêche
    private fun afficherDialogAbsence(rdv: RendezVous, adapter: ArrayAdapter<*>) {
        val dialogView = LayoutInflater.from(requireContext())
            .inflate(R.layout.dialog_confirmer_absence, null)

        dialogView.findViewById<TextView>(R.id.tvNomPatientAbsence).text =
            "Marquer ${rdv.nomBebe} comme absent ?"

        val dialog = AlertDialog.Builder(requireContext())
            .setView(dialogView)
            .create()

        // Fond transparent pour afficher le design rose
        dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)

        dialogView.findViewById<Button>(R.id.btnAnnulerAbsence).setOnClickListener {
            dialog.dismiss()
        }

        dialogView.findViewById<Button>(R.id.btnConfirmerAbsence).setOnClickListener {
            rdv.statut = StatutPresence.ABSENT
            adapter.notifyDataSetChanged()
            afficherCompteur()
            Toast.makeText(
                context,
                "❌ ${rdv.nomBebe} marqué absent. Notification envoyée.",
                Toast.LENGTH_LONG
            ).show()
            dialog.dismiss()
        }

        dialog.show()
    }

    private fun afficherCompteur() {
        val presents = rendezVousDuJour.count { it.statut == StatutPresence.PRESENT }
        tvCompteurPresents.text = "Présents : $presents / ${rendezVousDuJour.size}"
    }

    private fun demarrerChronometre() {
        countDownTimer?.cancel()
        countDownTimer = object : CountDownTimer(DELAI_GRACE_MS, 1000) {
            override fun onTick(millisUntilFinished: Long) {
                val minutes = millisUntilFinished / 60000
                val secondes = (millisUntilFinished % 60000) / 1000
                tvDelaiGrace.text = "⏱ Délai de grâce : %02d:%02d".format(minutes, secondes)
                if (minutes == 2L && secondes == 0L) {
                    Toast.makeText(
                        requireContext(),
                        "⚠️ 2 minutes restantes avant marquage absent automatique !",
                        Toast.LENGTH_LONG
                    ).show()
                }
            }

            override fun onFinish() {
                tvDelaiGrace.text = "⏱ Délai de grâce écoulé"
                var nbAbsentsAuto = 0
                rendezVousDuJour.forEach { rdv ->
                    if (rdv.statut == StatutPresence.EN_ATTENTE) {
                        rdv.statut = StatutPresence.ABSENT
                        nbAbsentsAuto++
                    }
                }
                if (nbAbsentsAuto > 0) {
                    Toast.makeText(
                        requireContext(),
                        "❌ $nbAbsentsAuto patient(s) marqué(s) absent(s) automatiquement",
                        Toast.LENGTH_LONG
                    ).show()
                    afficherRdvDuJour()
                }
            }
        }.start()
    }
}