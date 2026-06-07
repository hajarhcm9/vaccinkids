package com.example.vaccinkid

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.core.view.setPadding
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import com.example.vaccinkid.model.FlaconDto
import com.example.vaccinkid.viewmodel.VaccinationViewModel

class EnregistrementVaccinationFragment : Fragment() {
    private lateinit var viewModel: VaccinationViewModel
    private lateinit var messageView: TextView
    private lateinit var flaconSpinner: Spinner
    private lateinit var submitButton: Button
    private lateinit var poidsInput: EditText
    private lateinit var tailleInput: EditText
    private lateinit var reactionsInput: EditText

    private var flacons: List<FlaconDto> = emptyList()
    private var submitted = false

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        viewModel = ViewModelProvider(this)[VaccinationViewModel::class.java]
        return LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(24)

            addView(TextView(requireContext()).apply {
                text = "Enregistrer vaccination"
                textSize = 22f
            })

            addView(TextView(requireContext()).apply {
                text = arguments?.getString(ARG_NOM_BEBE) ?: "Patient"
                textSize = 16f
                setPadding(0, 8, 0, 16)
            })

            flaconSpinner = Spinner(requireContext())
            addView(flaconSpinner)

            poidsInput = numberInput("Poids (kg)")
            addView(poidsInput)

            tailleInput = numberInput("Taille (cm)")
            addView(tailleInput)

            reactionsInput = EditText(requireContext()).apply {
                hint = "Reactions observees"
                minLines = 2
            }
            addView(reactionsInput)

            submitButton = Button(requireContext()).apply {
                text = "Enregistrer"
                setOnClickListener { submitVaccination() }
            }
            addView(submitButton)

            messageView = TextView(requireContext()).apply {
                setPadding(0, 12, 0, 0)
            }
            addView(messageView)
        }
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        observeViewModel()
        val sessionId = requireArguments().getInt(ARG_SESSION_ID, 0)
        val rdvId = requireArguments().getInt(ARG_RDV_ID, 0)
        if (rdvId <= 0 || sessionId <= 0) {
            submitButton.isEnabled = false
            messageView.text = "Vaccination autorisee uniquement depuis un RDV confirme de session."
            return
        }
        messageView.text = "Chargement des flacons de la session..."
        viewModel.loadSessionFlacons(sessionId)
    }

    private fun observeViewModel() {
        viewModel.flacons.observe(viewLifecycleOwner) { result ->
            result.fold(
                onSuccess = { loaded ->
                    flacons = loaded.filter { (it.dosesRestantes ?: 0) > 0 }
                    updateFlaconSpinner()
                    submitButton.isEnabled = flacons.isNotEmpty() && !submitted
                    messageView.text = if (flacons.isEmpty()) {
                        "Aucun flacon actif avec dose restante pour cette session."
                    } else {
                        "${flacons.size} flacon(s) disponible(s)."
                    }
                },
                onFailure = {
                    submitButton.isEnabled = false
                    messageView.text = it.message ?: "Impossible de charger les flacons."
                }
            )
        }

        viewModel.isLoading.observe(viewLifecycleOwner) { loading ->
            submitButton.isEnabled = !loading && !submitted && flacons.isNotEmpty()
            submitButton.text = if (loading) "Enregistrement..." else "Enregistrer"
        }

        viewModel.vaccinationResult.observe(viewLifecycleOwner) { result ->
            result.fold(
                onSuccess = {
                    submitted = true
                    submitButton.isEnabled = false
                    Toast.makeText(requireContext(), "Vaccination enregistree", Toast.LENGTH_LONG).show()
                    parentFragmentManager.popBackStack()
                },
                onFailure = {
                    submitted = false
                    submitButton.isEnabled = flacons.isNotEmpty()
                    messageView.text = it.message ?: "Enregistrement refuse par le serveur."
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
        if (rdvId <= 0) {
            messageView.text = "RDV invalide."
            return
        }
        val selectedFlacon = flacons.getOrNull(flaconSpinner.selectedItemPosition)
        if (selectedFlacon == null) {
            messageView.text = "Selectionnez un flacon actif."
            return
        }

        val poids = poidsInput.text.toString().trim().toDoubleOrNull()
        val taille = tailleInput.text.toString().trim().toDoubleOrNull()
        if (poids == null || poids <= 0.0 || taille == null || taille <= 0.0) {
            messageView.text = "Poids et taille sont obligatoires et doivent etre positifs."
            return
        }

        submitted = true
        submitButton.isEnabled = false
        viewModel.recordVaccination(
            rdvId,
            selectedFlacon.id,
            poids,
            taille,
            reactionsInput.text.toString().trim().ifBlank { null }
        )
    }

    private fun numberInput(hintText: String): EditText {
        return EditText(requireContext()).apply {
            hint = hintText
            inputType = android.text.InputType.TYPE_CLASS_NUMBER or
                android.text.InputType.TYPE_NUMBER_FLAG_DECIMAL
        }
    }

    companion object {
        private const val ARG_NOM_BEBE = "nomBebe"
        private const val ARG_ID_BEBE = "idBebe"
        private const val ARG_RDV_ID = "rdvId"
        private const val ARG_SESSION_ID = "sessionId"

        fun newInstance(nomBebe: String, idBebe: String): EnregistrementVaccinationFragment {
            return newInstance(nomBebe, idBebe, 0, 0)
        }

        fun newInstance(
            nomBebe: String,
            idBebe: String,
            rdvId: Int,
            sessionId: Int
        ): EnregistrementVaccinationFragment {
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
