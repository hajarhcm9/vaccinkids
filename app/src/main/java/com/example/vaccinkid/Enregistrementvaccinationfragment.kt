package com.example.vaccinkid

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.Fragment
import com.google.android.material.chip.Chip
import com.google.android.material.chip.ChipGroup
import com.google.android.material.textfield.TextInputEditText

class EnregistrementVaccinationFragment : Fragment() {

    // ─── Données mock (à remplacer par appels API) ───────────────────
    private val vaccinsDisponibles = listOf(
        "BCG (Tuberculose)",
        "Hépatite B (HB)",
        "Polio Oral",
        "Pneumocoque",
        "Rotavirus",
        "DTC-Hib-HB (Pentavalent)",
        "Polio Injectable (VPI)",
        "RR (Rougeole-Rubéole)",
        "DTC"
    )

    private val reactionsStandard = listOf(
        "Fièvre légère",
        "Rougeur au site d'injection",
        "Gonflement local",
        "Pleurs prolongés",
        "Somnolence",
        "Perte d'appétit"
    )

    // ─── Vues ────────────────────────────────────────────────────────
    private lateinit var spinnerVaccin: Spinner
    private lateinit var etNumerLot: TextInputEditText
    private lateinit var etFabricant: TextInputEditText
    private lateinit var etPoids: TextInputEditText
    private lateinit var etTaille: TextInputEditText
    private lateinit var chipGroupReactions: ChipGroup
    private lateinit var etReactionLibre: TextInputEditText
    private lateinit var btnValider: Button
    private lateinit var tvNomBebe: TextView

    // Bébé actuellement en cours (passé via arguments ou QR scan)
    private var nomBebe: String = "Mohammed A."  // mock
    private var idBebe: String = "BEBE_001"       // mock

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val view = inflater.inflate(R.layout.fragment_enregistrement_vaccination, container, false)
        initViews(view)
        setupVaccinSpinner()
        setupReactionChips()
        setupBoutonValider()
        return view
    }

    // ─── Initialisation des vues ──────────────────────────────────────
    private fun initViews(view: View) {
        tvNomBebe = view.findViewById(R.id.tvNomBebe)
        spinnerVaccin = view.findViewById(R.id.spinnerVaccin)
        etNumerLot = view.findViewById(R.id.etNumerLot)
        etFabricant = view.findViewById(R.id.etFabricant)
        etPoids = view.findViewById(R.id.etPoids)
        chipGroupReactions = view.findViewById(R.id.chipGroupReactions)
        etReactionLibre = view.findViewById(R.id.etReactionLibre)
        btnValider = view.findViewById(R.id.btnValiderVaccination)

        // Récupérer nom bébé depuis les arguments (passé depuis ScanQR ou liste RDV)
        arguments?.let {
            nomBebe = it.getString("nomBebe", "Mohammed A.")
            idBebe = it.getString("idBebe", "BEBE_001")
        }
        tvNomBebe.text = "Bébé : $nomBebe"
    }

    // ─── Spinner vaccins ──────────────────────────────────────────────
    private fun setupVaccinSpinner() {
        val adapter = ArrayAdapter(
            requireContext(),
            android.R.layout.simple_spinner_item,
            vaccinsDisponibles
        )
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        spinnerVaccin.adapter = adapter
    }

    // ─── Chips réactions standardisées ───────────────────────────────
    private fun setupReactionChips() {
        reactionsStandard.forEach { reaction ->
            val chip = Chip(requireContext()).apply {
                text = reaction
                isCheckable = true
                setChipBackgroundColorResource(R.color.chip_background_selector)
            }
            chipGroupReactions.addView(chip)
        }
    }

    // ─── Bouton Valider ───────────────────────────────────────────────
    private fun setupBoutonValider() {
        btnValider.setOnClickListener {
            if (validerFormulaire()) {
                afficherConfirmation()
            }
        }
    }

    // ─── Validation du formulaire ─────────────────────────────────────
    private fun validerFormulaire(): Boolean {
        val numerLot = etNumerLot.text.toString().trim()
        val fabricant = etFabricant.text.toString().trim()
        val poids = etPoids.text.toString().trim()
        val taille = etTaille.text.toString().trim()

        if (numerLot.isEmpty()) {
            etNumerLot.error = "Numéro de lot obligatoire"
            etNumerLot.requestFocus()
            return false
        }
        if (fabricant.isEmpty()) {
            etFabricant.error = "Fabricant obligatoire"
            etFabricant.requestFocus()
            return false
        }
        if (poids.isEmpty()) {
            etPoids.error = "Poids obligatoire"
            etPoids.requestFocus()
            return false
        }
        if (taille.isEmpty()) {
            etTaille.error = "Taille obligatoire"
            etTaille.requestFocus()
            return false
        }
        return true
    }

    // ─── Dialog de confirmation avant soumission ──────────────────────
    private fun afficherConfirmation() {
        val vaccin = spinnerVaccin.selectedItem.toString()
        val lot = etNumerLot.text.toString().trim()
        val fabricant = etFabricant.text.toString().trim()
        val poids = etPoids.text.toString().trim()
        val taille = etTaille.text.toString().trim()

        // Récupérer les réactions cochées
        val reactionsCochees = mutableListOf<String>()
        for (i in 0 until chipGroupReactions.childCount) {
            val chip = chipGroupReactions.getChildAt(i) as? Chip
            if (chip?.isChecked == true) reactionsCochees.add(chip.text.toString())
        }
        val reactionLibre = etReactionLibre.text.toString().trim()
        if (reactionLibre.isNotEmpty()) reactionsCochees.add(reactionLibre)

        val resume = """
            Bébé       : $nomBebe
            Vaccin     : $vaccin
            N° Lot     : $lot
            Fabricant  : $fabricant
            Poids      : $poids kg
            Taille     : $taille cm
            Réactions  : ${if (reactionsCochees.isEmpty()) "Aucune" else reactionsCochees.joinToString(", ")}
        """.trimIndent()

        AlertDialog.Builder(requireContext())
            .setTitle("Confirmer l'enregistrement")
            .setMessage(resume)
            .setPositiveButton("Confirmer") { _, _ ->
                soumettreVaccination(vaccin, lot, fabricant, poids, taille, reactionsCochees)
            }
            .setNegativeButton("Modifier", null)
            .show()
    }

    // ─── Soumission (appel API ici) ───────────────────────────────────
    private fun soumettreVaccination(
        vaccin: String,
        lot: String,
        fabricant: String,
        poids: String,
        taille: String,
        reactions: List<String>
    ) {
        // TODO : Remplacer par un appel Retrofit/API réel
        // Exemple :
        // val body = VaccinationRequest(idBebe, vaccin, lot, fabricant, poids.toFloat(), taille.toFloat(), reactions)
        // viewModel.enregistrerVaccination(body)

        Toast.makeText(
            requireContext(),
            "✅ Vaccination enregistrée pour $nomBebe",
            Toast.LENGTH_LONG
        ).show()

        // Retourner au dashboard
        parentFragmentManager.popBackStack()
    }

    // ─── Factory pour créer le fragment avec les données bébé ─────────
    companion object {
        fun newInstance(nomBebe: String, idBebe: String): EnregistrementVaccinationFragment {
            val fragment = EnregistrementVaccinationFragment()
            fragment.arguments = Bundle().apply {
                putString("nomBebe", nomBebe)
                putString("idBebe", idBebe)
            }
            return fragment
        }
    }
}