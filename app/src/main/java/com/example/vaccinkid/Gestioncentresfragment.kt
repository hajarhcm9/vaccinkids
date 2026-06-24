package com.example.vaccinkid

import android.content.res.ColorStateList
import android.graphics.Color
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import android.widget.Toast
import androidx.core.content.ContextCompat
import androidx.core.widget.addTextChangedListener
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.vaccinkid.model.AdminCentreDto
import com.example.vaccinkid.model.AdminCentreRequest
import com.example.vaccinkid.network.ApiClient
import com.google.android.material.button.MaterialButton
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.progressindicator.LinearProgressIndicator
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import kotlinx.coroutines.launch

class GestionCentresFragment : Fragment(R.layout.fragment_gestion_centres) {

    private lateinit var adapter: CentresAdapter
    private lateinit var messageView: TextView
    private lateinit var resumeView: TextView
    private lateinit var progressBar: LinearProgressIndicator
    private lateinit var tvHeroTotal: TextView
    private lateinit var tvHeroActifs: TextView
    private lateinit var tvHeroInactifs: TextView

    private var allItems: List<AdminCentreDto> = emptyList()

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        messageView   = view.findViewById(R.id.tvCentresMessage)
        resumeView    = view.findViewById(R.id.tvCentresResume)
        progressBar   = view.findViewById(R.id.centresProgress)
        tvHeroTotal   = view.findViewById(R.id.tvHeroTotal)
        tvHeroActifs  = view.findViewById(R.id.tvHeroActifs)
        tvHeroInactifs= view.findViewById(R.id.tvHeroInactifs)

        adapter = CentresAdapter(
            onEdit   = { showForm(it) },
            onToggle = { toggleCentre(it) }
        )
        view.findViewById<RecyclerView>(R.id.rvCentres).apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = this@GestionCentresFragment.adapter
        }

        view.findViewById<View>(R.id.fabAddCentre).setOnClickListener { showForm(null) }

        // Search filter
        view.findViewById<TextInputEditText>(R.id.etCentresSearch)
            .addTextChangedListener { applyFilter(it?.toString() ?: "") }

        loadCentres()
    }

    private fun loadCentres() {
        progressBar.visibility = View.VISIBLE
        messageView.visibility = View.GONE
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.getAdminCentres()
                val data = response.data
                if (response.status != "success" || data == null) throw Exception(response.message)
                allItems = data.centres
                applyFilter(view?.findViewById<TextInputEditText>(R.id.etCentresSearch)
                    ?.text?.toString() ?: "")
                updateHeroChips()
            } catch (e: Exception) {
                messageView.text = e.message ?: "Erreur réseau"
                messageView.visibility = View.VISIBLE
            } finally {
                progressBar.visibility = View.GONE
            }
        }
    }

    private fun applyFilter(query: String) {
        val filtered = if (query.isBlank()) allItems
        else allItems.filter {
            (it.nom ?: "").contains(query, ignoreCase = true) ||
            (it.adresse ?: "").contains(query, ignoreCase = true)
        }
        adapter.submit(filtered)
        if (filtered.isEmpty() && query.isNotBlank()) {
            messageView.text = "Aucun centre trouvé pour « $query »"
            messageView.visibility = View.VISIBLE
        } else {
            messageView.visibility = View.GONE
        }
    }

    private fun updateHeroChips() {
        val total   = allItems.size
        val actifs  = allItems.count { it.estActif == true }
        val inactifs= total - actifs

        resumeView.text = "$actifs actif${if (actifs != 1) "s" else ""} · $total centres"

        tvHeroTotal.text = "$total centres"
        tvHeroTotal.visibility = if (total > 0) View.VISIBLE else View.GONE

        tvHeroActifs.text = "$actifs Actif${if (actifs != 1) "s" else ""}"

        if (inactifs > 0) {
            tvHeroInactifs.text = "$inactifs Inactif${if (inactifs != 1) "s" else ""} ⚠"
            tvHeroInactifs.visibility = View.VISIBLE
        } else {
            tvHeroInactifs.visibility = View.GONE
        }
    }

    private fun showForm(item: AdminCentreDto?) {
        val dialogView = LayoutInflater.from(requireContext())
            .inflate(R.layout.dialog_create_centre, null)

        val tvTitle   = dialogView.findViewById<TextView>(R.id.tvCentreFormTitle)
        val tilNom    = dialogView.findViewById<TextInputLayout>(R.id.tilCentreNom)
        val tilAdresse= dialogView.findViewById<TextInputLayout>(R.id.tilCentreAdresse)
        val tilTel    = dialogView.findViewById<TextInputLayout>(R.id.tilCentreTelephone)
        val etNom     = dialogView.findViewById<TextInputEditText>(R.id.etCentreNom)
        val etAdresse = dialogView.findViewById<TextInputEditText>(R.id.etCentreAdresse)
        val etTel     = dialogView.findViewById<TextInputEditText>(R.id.etCentreTelephone)
        val etLat     = dialogView.findViewById<TextInputEditText>(R.id.etCentreGpsLat)
        val etLng     = dialogView.findViewById<TextInputEditText>(R.id.etCentreGpsLng)
        val btnSave   = dialogView.findViewById<MaterialButton>(R.id.btnCentreSave)
        val btnCancel = dialogView.findViewById<MaterialButton>(R.id.btnCentreCancel)

        tvTitle.text = if (item == null) "Nouveau centre" else "Modifier le centre"
        btnSave.text = if (item == null) "Créer le centre" else "Enregistrer"

        etNom.setText(item?.nom ?: "")
        etAdresse.setText(item?.adresse ?: "")
        etTel.setText(item?.telephone ?: "")
        etLat.setText(item?.gpsLat?.toString() ?: "")
        etLng.setText(item?.gpsLng?.toString() ?: "")

        val dialog = MaterialAlertDialogBuilder(requireContext())
            .setView(dialogView)
            .create()
        dialog.show()
        dialog.window?.apply {
            setLayout(android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                      android.view.ViewGroup.LayoutParams.WRAP_CONTENT)
            setBackgroundDrawableResource(android.R.color.transparent)
        }

        btnCancel.setOnClickListener { dialog.dismiss() }

        btnSave.setOnClickListener {
            tilNom.error    = null
            tilAdresse.error= null
            tilTel.error    = null

            val nomVal    = etNom.text?.toString()?.trim() ?: ""
            val adresseVal= etAdresse.text?.toString()?.trim() ?: ""
            val telVal    = etTel.text?.toString()?.trim() ?: ""

            var valid = true
            if (nomVal.length < 2)     { tilNom.error     = "Min. 2 caractères"; valid = false }
            if (adresseVal.isBlank())  { tilAdresse.error = "Adresse requise";    valid = false }
            if (telVal.isBlank())      { tilTel.error     = "Téléphone requis";   valid = false }
            if (!valid) return@setOnClickListener

            dialog.dismiss()
            saveCentre(item?.id, AdminCentreRequest(
                nom       = nomVal,
                adresse   = adresseVal,
                telephone = telVal,
                gpsLat    = etLat.text?.toString()?.trim()?.toDoubleOrNull(),
                gpsLng    = etLng.text?.toString()?.trim()?.toDoubleOrNull()
            ))
        }
    }

    private fun saveCentre(id: Int?, request: AdminCentreRequest) {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val r = if (id == null) ApiClient.apiService.createAdminCentre(request)
                        else           ApiClient.apiService.updateAdminCentre(id, request)
                if (r.status != "success") throw Exception(r.message ?: "Refusé")
                Toast.makeText(requireContext(),
                    if (id == null) "Centre créé" else "Centre mis à jour",
                    Toast.LENGTH_SHORT).show()
                loadCentres()
            } catch (e: Exception) {
                Toast.makeText(requireContext(), e.message ?: "Erreur réseau", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun toggleCentre(item: AdminCentreDto) {
        val actif = item.estActif == true
        MaterialAlertDialogBuilder(requireContext())
            .setTitle(if (actif) "Désactiver le centre" else "Réactiver le centre")
            .setMessage("${item.nom ?: "Centre #${item.id}"}\n\n${
                if (actif) "Ce centre ne sera plus visible pour les parents."
                else "Ce centre sera à nouveau accessible."}")
            .setNegativeButton("Annuler", null)
            .setPositiveButton(if (actif) "Désactiver" else "Réactiver") { _, _ ->
                viewLifecycleOwner.lifecycleScope.launch {
                    try {
                        val r = if (actif) ApiClient.apiService.deactivateAdminCentre(item.id)
                                else       ApiClient.apiService.reactivateAdminCentre(item.id)
                        if (r.status != "success") throw Exception(r.message)
                        loadCentres()
                    } catch (e: Exception) {
                        Toast.makeText(requireContext(), e.message ?: "Erreur réseau", Toast.LENGTH_SHORT).show()
                    }
                }
            }
            .show()
    }
}

private class CentresAdapter(
    private val onEdit:   (AdminCentreDto) -> Unit,
    private val onToggle: (AdminCentreDto) -> Unit
) : RecyclerView.Adapter<CentresAdapter.VH>() {

    private var items: List<AdminCentreDto> = emptyList()

    fun submit(next: List<AdminCentreDto>) {
        val diff = DiffUtil.calculateDiff(object : DiffUtil.Callback() {
            override fun getOldListSize() = items.size
            override fun getNewListSize() = next.size
            override fun areItemsTheSame(o: Int, n: Int) = items[o].id == next[n].id
            override fun areContentsTheSame(o: Int, n: Int) = items[o] == next[n]
        })
        items = next
        diff.dispatchUpdatesTo(this)
    }

    override fun getItemCount() = items.size
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) =
        VH(LayoutInflater.from(parent.context)
            .inflate(R.layout.item_admin_centre, parent, false))

    override fun onBindViewHolder(h: VH, pos: Int) = h.bind(items[pos], onEdit, onToggle)

    class VH(v: View) : RecyclerView.ViewHolder(v) {
        private val statusBar   = v.findViewById<View>(R.id.vCentreStatusBar)
        private val tvNom       = v.findViewById<TextView>(R.id.tvCentreNom)
        private val tvAdresse   = v.findViewById<TextView>(R.id.tvCentreAdresse)
        private val tvBadge     = v.findViewById<TextView>(R.id.tvCentreBadge)
        private val tvPersonnel = v.findViewById<TextView>(R.id.tvCentrePersonnel)
        private val tvSessions  = v.findViewById<TextView>(R.id.tvCentreSessions)
        private val tvAlertes   = v.findViewById<TextView>(R.id.tvCentreAlertes)
        private val btnEdit     = v.findViewById<MaterialButton>(R.id.btnEditCentre)
        private val btnToggle   = v.findViewById<MaterialButton>(R.id.btnToggleCentre)

        fun bind(c: AdminCentreDto, onEdit: (AdminCentreDto) -> Unit, onToggle: (AdminCentreDto) -> Unit) {
            val actif = c.estActif == true
            val ctx   = itemView.context

            tvNom.text     = c.nom ?: "Centre #${c.id}"
            tvAdresse.text = buildString {
                append(c.adresse ?: "")
                if (!c.telephone.isNullOrBlank()) append(" · ${c.telephone}")
            }

            val personnel = c.nbPersonnel ?: 0
            val sessions  = c.nbSessions ?: 0
            val alertes   = c.alertesStock ?: 0

            tvPersonnel.text = "$personnel personnel"
            tvSessions.text  = "$sessions sessions"

            if (alertes > 0) {
                tvAlertes.text = "$alertes alertes"
                tvAlertes.visibility = View.VISIBLE
            } else {
                tvAlertes.visibility = View.GONE
            }

            // Status badge
            if (actif) {
                tvBadge.text = "Actif"
                tvBadge.setBackgroundResource(R.drawable.bg_badge_success)
                tvBadge.setTextColor(ContextCompat.getColor(ctx, R.color.success_dark))
                statusBar.setBackgroundColor(ContextCompat.getColor(ctx, R.color.success))
            } else {
                tvBadge.text = "Inactif"
                tvBadge.setBackgroundResource(R.drawable.bg_badge_error)
                tvBadge.setTextColor(Color.parseColor("#991B1B"))
                statusBar.setBackgroundColor(ContextCompat.getColor(ctx, R.color.error))
            }

            // Edit button (teal)
            btnEdit.setTextColor(ContextCompat.getColor(ctx, R.color.stormy_teal))
            btnEdit.strokeColor = ColorStateList.valueOf(ContextCompat.getColor(ctx, R.color.stormy_teal))
            btnEdit.setOnClickListener { onEdit(c) }

            // Toggle button (red=désactiver, green=réactiver)
            if (actif) {
                btnToggle.text = "Désactiver"
                btnToggle.setTextColor(ContextCompat.getColor(ctx, R.color.error))
                btnToggle.strokeColor = ColorStateList.valueOf(ContextCompat.getColor(ctx, R.color.error))
            } else {
                btnToggle.text = "Réactiver"
                btnToggle.setTextColor(ContextCompat.getColor(ctx, R.color.success_dark))
                btnToggle.strokeColor = ColorStateList.valueOf(ContextCompat.getColor(ctx, R.color.success))
            }
            btnToggle.setOnClickListener { onToggle(c) }
        }
    }
}
