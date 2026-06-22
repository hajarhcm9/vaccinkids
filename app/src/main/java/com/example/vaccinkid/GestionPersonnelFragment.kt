package com.example.vaccinkid

import android.graphics.Color
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.ProgressBar
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.core.widget.addTextChangedListener
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.vaccinkid.model.AdminPersonnelDto
import com.example.vaccinkid.model.AdminPersonnelRequest
import com.example.vaccinkid.model.AdminRefCentreDto
import com.example.vaccinkid.network.ApiClient
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.textfield.TextInputEditText
import kotlinx.coroutines.launch

class GestionPersonnelFragment : Fragment(R.layout.fragment_gestion_personnel) {

    private lateinit var adapter: PersonnelXmlAdapter
    private lateinit var messageView: TextView
    private lateinit var progressBar: ProgressBar
    private var allItems: List<AdminPersonnelDto> = emptyList()
    private var centres: List<AdminRefCentreDto> = emptyList()
    private var activeTab = "TOUS"
    private var searchQuery = ""

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        messageView = view.findViewById(R.id.tvPersonnelMessage)
        progressBar = view.findViewById(R.id.personnelProgress)

        adapter = PersonnelXmlAdapter(
            onEdit = { showForm(it) },
            onToggle = { togglePersonnel(it) }
        )
        val rv = view.findViewById<RecyclerView>(R.id.rvPersonnel)
        rv.layoutManager = LinearLayoutManager(requireContext())
        rv.adapter = adapter

        // Tabs
        val tabs = listOf(
            view.findViewById<TextView>(R.id.tabPersonnelTous),
            view.findViewById<TextView>(R.id.tabPersonnelInfirmiers),
            view.findViewById<TextView>(R.id.tabPersonnelAdmins),
            view.findViewById<TextView>(R.id.tabPersonnelInactifs)
        )
        val tabKeys = listOf("TOUS", "INFIRMIER", "ADMIN", "INACTIFS")

        fun selectTab(idx: Int) {
            activeTab = tabKeys[idx]
            tabs.forEachIndexed { i, tv ->
                if (i == idx) {
                    tv.setBackgroundResource(R.drawable.bg_btn_teal_pill)
                    tv.setTextColor(requireContext().getColor(R.color.white))
                    tv.setTypeface(null, android.graphics.Typeface.BOLD)
                } else {
                    tv.setBackgroundResource(R.drawable.bg_chip_inactive)
                    tv.setTextColor(requireContext().getColor(R.color.text_secondary))
                    tv.setTypeface(null, android.graphics.Typeface.NORMAL)
                }
                tv.isClickable = true
                tv.isFocusable = true
            }
            applyFilter()
        }

        tabs.forEachIndexed { i, tv -> tv.setOnClickListener { selectTab(i) } }

        // Search
        view.findViewById<com.google.android.material.textfield.TextInputEditText>(R.id.etPersonnelSearch)
            .addTextChangedListener { searchQuery = it?.toString().orEmpty(); applyFilter() }

        // FAB
        view.findViewById<View>(R.id.fabAddPersonnel).setOnClickListener { showForm(null) }

        loadPersonnel()
        loadCentres()
    }

    private fun applyFilter() {
        val filtered = allItems.filter { p ->
            val matchSearch = searchQuery.isBlank() ||
                (p.nom?.lowercase()?.contains(searchQuery.lowercase()) == true) ||
                (p.prenom?.lowercase()?.contains(searchQuery.lowercase()) == true) ||
                (p.centreNom?.lowercase()?.contains(searchQuery.lowercase()) == true)
            val matchTab = when (activeTab) {
                "INFIRMIER" -> p.role?.lowercase() == "infirmier"
                "ADMIN" -> p.role?.lowercase() == "admin"
                "INACTIFS" -> p.estActif != true
                else -> true
            }
            matchSearch && matchTab
        }
        adapter.submit(filtered)
        messageView.text = if (filtered.isEmpty() && allItems.isNotEmpty()) "Aucun résultat" else ""
        messageView.visibility = if (filtered.isEmpty() && allItems.isNotEmpty()) View.VISIBLE else View.GONE
    }

    private fun loadPersonnel() {
        progressBar.visibility = View.VISIBLE
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.getAdminPersonnel()
                val data = response.data
                if (response.status != "success" || data == null) throw Exception(response.message)
                allItems = data.personnel
                applyFilter()
            } catch (e: Exception) {
                messageView.text = e.message ?: "Erreur réseau"
                messageView.visibility = View.VISIBLE
            } finally {
                progressBar.visibility = View.GONE
            }
        }
    }

    private fun showForm(item: AdminPersonnelDto?) {
        val isNew = item == null
        val dialogView = LayoutInflater.from(requireContext())
            .inflate(R.layout.dialog_add_personnel, null)

        val layoutCin = dialogView.findViewById<View>(R.id.layoutCin)
        val etCin = dialogView.findViewById<TextInputEditText>(R.id.etCin)
        val etNom = dialogView.findViewById<TextInputEditText>(R.id.etNom)
        val etPrenom = dialogView.findViewById<TextInputEditText>(R.id.etPrenom)
        val etPwd = dialogView.findViewById<TextInputEditText>(R.id.etPassword)
        val roleSpinner = dialogView.findViewById<Spinner>(R.id.spinnerRole)
        val centreSpinner = dialogView.findViewById<Spinner>(R.id.spinnerCentre)
        val tvPwdHint = dialogView.findViewById<TextView>(R.id.tvPasswordHint)

        layoutCin.visibility = if (isNew) View.VISIBLE else View.GONE
        tvPwdHint.visibility = if (isNew) View.GONE else View.VISIBLE

        if (!isNew) {
            etCin.setText(item?.cin ?: "")
            etNom.setText(item?.nom ?: "")
            etPrenom.setText(item?.prenom ?: "")
        }

        roleSpinner.adapter = ArrayAdapter(
            requireContext(),
            android.R.layout.simple_spinner_dropdown_item,
            listOf("infirmier", "admin")
        )
        roleSpinner.setSelection(if (item?.role == "admin") 1 else 0)

        centreSpinner.adapter = ArrayAdapter(
            requireContext(),
            android.R.layout.simple_spinner_dropdown_item,
            if (centres.isEmpty()) listOf("Chargement…")
            else centres.map { it.nom ?: "Centre #${it.id}" }
        )
        val centreIdx = centres.indexOfFirst { it.id == item?.centreId }
        centreSpinner.setSelection(if (centreIdx >= 0) centreIdx else 0)

        MaterialAlertDialogBuilder(requireContext())
            .setTitle(if (isNew) "Ajouter un membre du personnel" else "Modifier le profil")
            .setView(dialogView)
            .setNegativeButton("Annuler", null)
            .setPositiveButton(if (isNew) "Créer le compte" else "Enregistrer") { _, _ ->
                val nomVal = etNom.text?.toString()?.trim() ?: ""
                val prenomVal = etPrenom.text?.toString()?.trim() ?: ""
                val pwdVal = etPwd.text?.toString()?.trim() ?: ""
                if (nomVal.length < 2 || prenomVal.length < 2) {
                    Toast.makeText(requireContext(), "Nom et prénom requis (min. 2 caractères)", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                if (isNew && pwdVal.length < 6) {
                    Toast.makeText(requireContext(), "Mot de passe requis (min. 6 caractères)", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                savePersonnel(
                    item?.id,
                    AdminPersonnelRequest(
                        cin = if (isNew) etCin.text?.toString()?.trim()?.ifBlank { null } else null,
                        nom = nomVal,
                        prenom = prenomVal,
                        role = roleSpinner.selectedItem.toString(),
                        centreId = centres.getOrNull(centreSpinner.selectedItemPosition)?.id,
                        motDePasse = etPwd.text?.toString()?.trim()?.ifBlank { null }
                    )
                )
            }
            .show()
    }

    private fun savePersonnel(id: Int?, request: AdminPersonnelRequest) {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val r = if (id == null) ApiClient.apiService.createAdminPersonnel(request)
                else ApiClient.apiService.updateAdminPersonnel(id, request.copy(cin = null))
                if (r.status != "success") throw Exception(r.message ?: "Refusé")
                Toast.makeText(requireContext(), "Enregistré", Toast.LENGTH_SHORT).show()
                loadPersonnel()
            } catch (e: Exception) {
                Toast.makeText(requireContext(), e.message ?: "Erreur réseau", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun togglePersonnel(item: AdminPersonnelDto) {
        MaterialAlertDialogBuilder(requireContext())
            .setTitle(if (item.estActif == true) "Désactiver le compte" else "Réactiver le compte")
            .setMessage("${item.prenom ?: ""} ${item.nom ?: ""} — êtes-vous sûr ?")
            .setNegativeButton("Annuler", null)
            .setPositiveButton("Confirmer") { _, _ ->
                viewLifecycleOwner.lifecycleScope.launch {
                    try {
                        val r = if (item.estActif == true)
                            ApiClient.apiService.deactivateAdminPersonnel(item.id)
                        else ApiClient.apiService.reactivateAdminPersonnel(item.id)
                        if (r.status != "success") throw Exception(r.message ?: "Refusé")
                        loadPersonnel()
                    } catch (e: Exception) {
                        Toast.makeText(requireContext(), e.message ?: "Erreur réseau", Toast.LENGTH_SHORT).show()
                    }
                }
            }
            .show()
    }

    private fun loadCentres() {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val r = ApiClient.apiService.getAdminReferences()
                if (r.status == "success") centres = r.data?.centres.orEmpty()
            } catch (_: Exception) {}
        }
    }
}

private class PersonnelXmlAdapter(
    private val onEdit: (AdminPersonnelDto) -> Unit,
    private val onToggle: (AdminPersonnelDto) -> Unit
) : RecyclerView.Adapter<PersonnelXmlAdapter.VH>() {
    private var items: List<AdminPersonnelDto> = emptyList()
    fun submit(next: List<AdminPersonnelDto>) { items = next; notifyDataSetChanged() }
    override fun getItemCount() = items.size
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH =
        VH(android.view.LayoutInflater.from(parent.context).inflate(R.layout.item_admin_personnel, parent, false), onEdit, onToggle)
    override fun onBindViewHolder(holder: VH, position: Int) = holder.bind(items[position])

    class VH(v: View, val onEdit: (AdminPersonnelDto) -> Unit, val onToggle: (AdminPersonnelDto) -> Unit) : RecyclerView.ViewHolder(v) {
        private val tvInitials = v.findViewById<TextView>(R.id.tvPersonnelInitials)
        private val tvNom = v.findViewById<TextView>(R.id.tvPersonnelNom)
        private val tvRoleCentre = v.findViewById<TextView>(R.id.tvPersonnelRoleCentre)
        private val tvStatus = v.findViewById<TextView>(R.id.tvPersonnelStatus)

        fun bind(p: AdminPersonnelDto) {
            val fullName = "${p.prenom ?: ""} ${p.nom ?: ""}".trim().ifBlank { "Inconnu" }
            val initials = listOfNotNull(p.prenom?.firstOrNull(), p.nom?.firstOrNull())
                .joinToString("").uppercase().ifBlank { "?" }
            tvInitials.text = initials
            tvNom.text = fullName
            tvRoleCentre.text = "${p.role?.replaceFirstChar { it.uppercase() } ?: "-"} — ${p.centreNom ?: "Aucun centre"}"

            if (p.estActif == true) {
                tvStatus.text = "Actif"
                tvStatus.setBackgroundResource(R.drawable.bg_badge_success)
                tvStatus.setTextColor(Color.parseColor("#065F46"))
            } else {
                tvStatus.text = "Inactif"
                tvStatus.setBackgroundResource(R.drawable.bg_badge_error)
                tvStatus.setTextColor(Color.parseColor("#991B1B"))
            }

            itemView.setOnClickListener { onEdit(p) }
            itemView.setOnLongClickListener { onToggle(p); true }
        }
    }
}
