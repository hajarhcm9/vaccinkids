package com.example.vaccinkid

import android.app.AlertDialog
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.Spinner
import android.widget.TextView
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.core.view.setPadding
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.vaccinkid.model.AdminPersonnelDto
import com.example.vaccinkid.model.AdminPersonnelRequest
import com.example.vaccinkid.model.AdminCentreDto
import com.example.vaccinkid.model.AdminRefCentreDto
import com.example.vaccinkid.network.ApiClient
import kotlinx.coroutines.launch

class GestionPersonnelFragment : Fragment() {
    private lateinit var messageView: TextView
    private lateinit var totalView: TextView
    private lateinit var adapter: PersonnelAdapter
    private var centres: List<AdminRefCentreDto> = emptyList()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        adapter = PersonnelAdapter(
            onEdit = { showForm(it) },
            onToggle = { togglePersonnel(it) }
        )
        return LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(20)
            addView(TextView(requireContext()).apply {
                text = "Gestion personnel"
                textSize = 24f
                setTextColor(StaffUi.INK)
                setTypeface(typeface, android.graphics.Typeface.BOLD)
            })
            addView(TextView(requireContext()).apply {
                text = "Comptes, roles et affectations aux centres"
                StaffUi.styleSubtitle(this)
                setPadding(0, 0, 0, 8)
            })
            totalView = TextView(requireContext())
            addView(totalView)
            messageView = TextView(requireContext()).apply { setPadding(0, 8, 0, 8) }
            addView(messageView)
            val actions = LinearLayout(requireContext()).apply { orientation = LinearLayout.HORIZONTAL }
            actions.addView(Button(requireContext()).apply {
                text = "Ajouter personnel"
                tag = "accent-rose"
                setOnClickListener { showForm(null) }
            }, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
            actions.addView(Button(requireContext()).apply {
                text = "Rafraichir"
                setOnClickListener { loadPersonnel() }
            }, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
            addView(actions)
            addView(RecyclerView(requireContext()).apply {
                layoutManager = LinearLayoutManager(requireContext())
                adapter = this@GestionPersonnelFragment.adapter
            }, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))
        }
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        StaffUi.decorateScreen(view)
        loadPersonnel()
        loadCentres()
    }

    private fun loadPersonnel() {
        messageView.text = "Chargement..."
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.getAdminPersonnel()
                val data = response.data
                if (response.status != "success" || data == null) throw Exception(response.message ?: "Personnel indisponible")
                adapter.submit(data.personnel)
                totalView.text = "Personnel: ${data.personnel.count { it.estActif == true }} actif(s) / ${data.total}"
                messageView.text = ""
            } catch (e: Exception) {
                adapter.submit(emptyList())
                messageView.text = e.message ?: "Erreur reseau"
            }
        }
    }

    private fun showForm(item: AdminPersonnelDto?) {
        val availableCentres = centres.filter { it.id == item?.centreId || true }
        if (availableCentres.isEmpty()) {
            messageView.text = "Aucun centre actif disponible."
            loadCentres()
            return
        }
        val root = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(24)
        }
        val cin = edit("CIN").also { it.setText(item?.cin ?: "") }
        val nom = edit("Nom").also { it.setText(item?.nom ?: "") }
        val prenom = edit("Prenom").also { it.setText(item?.prenom ?: "") }
        val centre = Spinner(requireContext()).apply {
            adapter = ArrayAdapter(
                requireContext(),
                android.R.layout.simple_spinner_dropdown_item,
                availableCentres.map { it.nom ?: "Centre #${it.id}" }
            )
            setSelection(availableCentres.indexOfFirst { it.id == item?.centreId }.coerceAtLeast(0))
        }
        val password = edit("Mot de passe ${if (item == null) "" else "(laisser vide si inchange)"}")
        val role = Spinner(requireContext()).apply {
            adapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_dropdown_item, listOf("infirmier", "admin"))
            setSelection(if (item?.role == "admin") 1 else 0)
        }
        listOf(cin, nom, prenom, centre, role, password).forEach { root.addView(it) }

        AlertDialog.Builder(requireContext())
            .setTitle(if (item == null) "Ajouter personnel" else "Modifier personnel")
            .setView(root)
            .setNegativeButton("Annuler", null)
            .setPositiveButton("Valider") { _, _ ->
                val request = AdminPersonnelRequest(
                    cin = cin.text.toString().trim().takeIf { item == null },
                    nom = nom.text.toString().trim(),
                    prenom = prenom.text.toString().trim(),
                    role = role.selectedItem.toString(),
                    centreId = availableCentres.getOrNull(centre.selectedItemPosition)?.id,
                    motDePasse = password.text.toString().trim().ifBlank { null }
                )
                savePersonnel(item?.id, request)
            }
            .show()
    }

    private fun savePersonnel(id: Int?, request: AdminPersonnelRequest) {
        if (request.nom.isNullOrBlank() || request.prenom.isNullOrBlank() || request.centreId == null) {
            messageView.text = "Nom, prenom et centre sont obligatoires."
            return
        }
        if (id == null && (request.cin.isNullOrBlank() || request.motDePasse.isNullOrBlank())) {
            messageView.text = "CIN et mot de passe sont obligatoires a la creation."
            return
        }
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = if (id == null) {
                    ApiClient.apiService.createAdminPersonnel(request)
                } else {
                    ApiClient.apiService.updateAdminPersonnel(id, request.copy(cin = null))
                }
                if (response.status != "success") throw Exception(response.message ?: "Enregistrement refuse")
                Toast.makeText(requireContext(), "Confirme par le serveur", Toast.LENGTH_SHORT).show()
                loadPersonnel()
            } catch (e: Exception) {
                messageView.text = e.message ?: "Erreur reseau"
            }
        }
    }

    private fun togglePersonnel(item: AdminPersonnelDto) {
        AlertDialog.Builder(requireContext())
            .setTitle(if (item.estActif == true) "Desactiver" else "Reactiver")
            .setMessage("${item.prenom ?: ""} ${item.nom ?: ""}")
            .setNegativeButton("Annuler", null)
            .setPositiveButton("Confirmer") { _, _ ->
                viewLifecycleOwner.lifecycleScope.launch {
                    try {
                        val response = if (item.estActif == true) {
                            ApiClient.apiService.deactivateAdminPersonnel(item.id)
                        } else {
                            ApiClient.apiService.reactivateAdminPersonnel(item.id)
                        }
                        if (response.status != "success") throw Exception(response.message ?: "Action refusee")
                        loadPersonnel()
                    } catch (e: Exception) {
                        messageView.text = e.message ?: "Erreur reseau"
                    }
                }
            }
            .show()
    }

    private fun edit(hintText: String): EditText = EditText(requireContext()).apply { hint = hintText }

    private fun loadCentres() {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.getAdminReferences()
                if (response.status != "success") throw Exception(response.message ?: "Centres indisponibles")
                centres = response.data?.centres.orEmpty()
            } catch (e: Exception) {
                messageView.text = e.message ?: "Impossible de charger les centres."
            }
        }
    }
}

private class PersonnelAdapter(
    private val onEdit: (AdminPersonnelDto) -> Unit,
    private val onToggle: (AdminPersonnelDto) -> Unit
) : RecyclerView.Adapter<PersonnelAdapter.ViewHolder>() {
    private var items: List<AdminPersonnelDto> = emptyList()
    fun submit(next: List<AdminPersonnelDto>) {
        items = next
        notifyDataSetChanged()
    }
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        return ViewHolder(LinearLayout(parent.context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(16)
        }, onEdit, onToggle)
    }
    override fun getItemCount() = items.size
    override fun onBindViewHolder(holder: ViewHolder, position: Int) = holder.bind(items[position])

    class ViewHolder(
        private val root: LinearLayout,
        private val onEdit: (AdminPersonnelDto) -> Unit,
        private val onToggle: (AdminPersonnelDto) -> Unit
    ) : RecyclerView.ViewHolder(root) {
        fun bind(item: AdminPersonnelDto) {
            root.removeAllViews()
            StaffUi.styleCard(root, if (item.estActif == true) StaffUi.PRIMARY else StaffUi.BORDER)
            root.addView(TextView(root.context).apply {
                text = "${item.prenom ?: ""} ${item.nom ?: ""}"
                textSize = 16f
                setTextColor(StaffUi.INK)
                setTypeface(typeface, android.graphics.Typeface.BOLD)
            })
            root.addView(TextView(root.context).apply {
                text = "${item.role ?: "-"} | ${if (item.estActif == true) "Actif" else "Inactif"}"
                StaffUi.statusPill(this, if (item.estActif == true) "ACTIF" else "INACTIF")
            })
            root.addView(TextView(root.context).apply {
                text = "CIN ${item.cin ?: "-"} | Centre ${item.centreNom ?: item.centreId ?: "-"}"
                setTextColor(StaffUi.MUTED)
            })
            val row = LinearLayout(root.context).apply { orientation = LinearLayout.HORIZONTAL }
            row.addView(Button(root.context).apply {
                text = "Modifier"
                setOnClickListener { onEdit(item) }
            }, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
            row.addView(Button(root.context).apply {
                text = if (item.estActif == true) "Desactiver" else "Reactiver"
                setOnClickListener { onToggle(item) }
            }, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
            root.addView(row)
            StaffUi.decorateTree(root)
        }
    }
}
