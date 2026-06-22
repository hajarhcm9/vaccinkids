package com.example.vaccinkid

import android.os.Bundle
import android.view.View
import android.widget.ArrayAdapter
import android.widget.EditText
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import com.example.vaccinkid.model.FlaconDto
import com.example.vaccinkid.viewmodel.VaccinationViewModel
import com.google.android.material.button.MaterialButton

class EnregistrementVaccinationFragment : Fragment(R.layout.fragment_enregistrement_vaccination) {
    private lateinit var viewModel: VaccinationViewModel
    private lateinit var messageView: TextView
    private lateinit var flaconSpinner: Spinner
    private lateinit var etPoids: EditText
    private lateinit var etTaille: EditText
    private lateinit var etReactions: EditText
    private lateinit var submitButton: MaterialButton
    
    private var flacons: List<FlaconDto> = emptyList()
    private var submitted = false

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        viewModel = ViewModelProvider(this)[VaccinationViewModel::class.java]
        
        bindViews(view)
        observeViewModel()
        
        val sessionId = requireArguments().getInt(ARG_SESSION_ID, 0)
        val rdvId = requireArguments().getInt(ARG_RDV_ID, 0)
        
        if (rdvId <= 0 || sessionId <= 0) {
            submitButton.isEnabled = false
            messageView.text = "Action restreinte aux RDV de session."
            return
        }
        
        viewModel.loadSessionFlacons(sessionId)
    }

    private fun bindViews(view: View) {
        messageView = view.findViewById(R.id.regMessage)
        flaconSpinner = view.findViewById(R.id.spinnerVaccin)
        etPoids = view.findViewById(R.id.etPoids)
        etTaille = view.findViewById(R.id.etTaille)
        etReactions = view.findViewById(R.id.etReactions)
        submitButton = view.findViewById(R.id.btnNextReg)
        
        view.findViewById<TextView>(R.id.tvRegPatientName).text = arguments?.getString(ARG_NOM_BEBE)
        
        submitButton.setOnClickListener { submitVaccination() }
        view.findViewById<View>(R.id.btnBackEnregistrement).setOnClickListener {
            parentFragmentManager.popBackStack()
        }
    }

    private fun observeViewModel() {
        viewModel.flacons.observe(viewLifecycleOwner) { result ->
            result.fold(
                onSuccess = { loaded ->
                    flacons = loaded.filter { (it.dosesRestantes ?: 0) > 0 }
                    updateFlaconSpinner()
                    submitButton.isEnabled = flacons.isNotEmpty() && !submitted
                },
                onFailure = {
                    submitButton.isEnabled = false
                    messageView.text = it.message ?: "Impossible de charger les vaccins."
                }
            )
        }

        viewModel.isLoading.observe(viewLifecycleOwner) { loading ->
            submitButton.isEnabled = !loading && !submitted && flacons.isNotEmpty()
            submitButton.text = if (loading) "Enregistrement..." else "Enregistrer la vaccination"
        }

        viewModel.vaccinationResult.observe(viewLifecycleOwner) { result ->
            result.fold(
                onSuccess = {
                    submitted = true
                    submitButton.isEnabled = false
                    val nomBebe = arguments?.getString(ARG_NOM_BEBE) ?: "Patient"
                    val selectedFlacon = flacons.getOrNull(flaconSpinner.selectedItemPosition)
                    val flaconLabel = if (selectedFlacon != null) {
                        "${selectedFlacon.numeroLot ?: "lot ${selectedFlacon.id}"} - ${selectedFlacon.fabricant ?: ""}"
                    } else "—"
                    (activity as? MainInfirmierActivity)?.naviguerVers(
                        VaccinationSuccessFragment.newInstance(nomBebe, flaconLabel)
                    )
                },
                onFailure = {
                    submitted = false
                    submitButton.isEnabled = flacons.isNotEmpty()
                    messageView.text = it.message ?: "Erreur d'enregistrement."
                }
            )
        }
    }

    private fun updateFlaconSpinner() {
        val labels = flacons.map {
            val lot = it.numeroLot ?: "lot ${it.id}"
            "$lot - restant ${it.dosesRestantes ?: 0}"
        }
        flaconSpinner.adapter = ArrayAdapter(
            requireContext(),
            android.R.layout.simple_spinner_dropdown_item,
            labels
        )
    }

    private fun submitVaccination() {
        val rdvId = requireArguments().getInt(ARG_RDV_ID, 0)
        val selectedFlacon = flacons.getOrNull(flaconSpinner.selectedItemPosition) ?: return

        val poidsRaw = etPoids.text.toString().trim()
        val tailleRaw = etTaille.text.toString().trim()
        val poids = poidsRaw.toDoubleOrNull()
        val taille = tailleRaw.toDoubleOrNull()

        if (poidsRaw.isNotEmpty() && (poids == null || poids < 0.5 || poids > 100)) {
            messageView.text = "Poids invalide. Entrez une valeur entre 0.5 et 100 kg."
            return
        }
        if (tailleRaw.isNotEmpty() && (taille == null || taille < 20 || taille > 220)) {
            messageView.text = "Taille invalide. Entrez une valeur entre 20 et 220 cm."
            return
        }

        submitted = true
        submitButton.isEnabled = false
        viewModel.recordVaccination(
            rdvId,
            selectedFlacon.id,
            poids,
            taille,
            etReactions.text.toString().ifBlank { null }
        )
    }

    companion object {
        private const val ARG_NOM_BEBE = "nomBebe"
        private const val ARG_ID_BEBE = "idBebe"
        private const val ARG_RDV_ID = "rdvId"
        private const val ARG_SESSION_ID = "sessionId"

        fun newInstance(nomBebe: String, idBebe: String, rdvId: Int, sessionId: Int): EnregistrementVaccinationFragment {
            return EnregistrementVaccinationFragment().apply {
                arguments = Bundle().apply {
                    putString(ARG_NOM_BEBE, nomBebe)
                    putString(ARG_ID_BEBE, idBebe)
                    putInt(ARG_RDV_ID, rdvId)
                    putInt(ARG_SESSION_ID, sessionId)
                }
            }
        }
    }
}
