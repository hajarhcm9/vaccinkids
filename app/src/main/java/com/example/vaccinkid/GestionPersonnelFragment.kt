package com.example.vaccinkid

import android.content.res.ColorStateList
import android.graphics.Color
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.core.content.ContextCompat
import androidx.core.widget.addTextChangedListener
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.vaccinkid.model.AdminPersonnelDto
import com.example.vaccinkid.model.AdminPersonnelRequest
import com.example.vaccinkid.model.AdminRefCentreDto
import com.example.vaccinkid.network.ApiClient
import com.example.vaccinkid.network.TokenManager
import com.google.android.material.button.MaterialButton
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.progressindicator.LinearProgressIndicator
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch

class GestionPersonnelFragment : Fragment(R.layout.fragment_gestion_personnel) {

    private lateinit var adapter: PersonnelXmlAdapter
    private lateinit var messageView: TextView
    private lateinit var progressBar: LinearProgressIndicator
    private lateinit var tvPersonnelTotal: TextView
    private lateinit var tvHeroInfirmiers: TextView
    private lateinit var tvHeroAdmins: TextView
    private lateinit var tvHeroInactifs: TextView
    private lateinit var tabTous: TextView
    private lateinit var tabInfirmiers: TextView
    private lateinit var tabAdmins: TextView
    private lateinit var tabInactifs: TextView

    private var allItems: List<AdminPersonnelDto> = emptyList()
    private var centres: List<AdminRefCentreDto> = emptyList()
    private var activeTab = "TOUS"
    private var searchQuery = ""

    private val debounceHandler = Handler(Looper.getMainLooper())
    private val filterRunnable = Runnable { applyFilter() }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        bindViews(view)
        loadData()
    }

    override fun onDestroyView() {
        debounceHandler.removeCallbacks(filterRunnable)
        super.onDestroyView()
    }

    private fun bindViews(view: View) {
        messageView       = view.findViewById(R.id.tvPersonnelMessage)
        progressBar       = view.findViewById(R.id.personnelProgress)
        tvPersonnelTotal  = view.findViewById(R.id.tvPersonnelTotal)
        tvHeroInfirmiers  = view.findViewById(R.id.tvHeroInfirmiers)
        tvHeroAdmins      = view.findViewById(R.id.tvHeroAdmins)
        tvHeroInactifs    = view.findViewById(R.id.tvHeroInactifs)
        tabTous           = view.findViewById(R.id.tabPersonnelTous)
        tabInfirmiers     = view.findViewById(R.id.tabPersonnelInfirmiers)
        tabAdmins         = view.findViewById(R.id.tabPersonnelAdmins)
        tabInactifs       = view.findViewById(R.id.tabPersonnelInactifs)

        adapter = PersonnelXmlAdapter(
            onEdit   = { showForm(it) },
            onToggle = { togglePersonnel(it) }
        )
        val rv = view.findViewById<RecyclerView>(R.id.rvPersonnel)
        rv.layoutManager = LinearLayoutManager(requireContext())
        rv.adapter = adapter

        val tabs    = listOf(tabTous, tabInfirmiers, tabAdmins, tabInactifs)
        val tabKeys = listOf("TOUS", "INFIRMIER", "ADMIN", "INACTIFS")

        fun selectTab(idx: Int) {
            activeTab = tabKeys[idx]
            tabs.forEachIndexed { i, tv ->
                if (i == idx) {
                    tv.setBackgroundResource(R.drawable.bg_pill_lavender_active)
                    tv.setTextColor(requireContext().getColor(R.color.white))
                    tv.setTypeface(null, android.graphics.Typeface.BOLD)
                } else {
                    tv.setBackgroundResource(R.drawable.bg_pill_outline_lavender)
                    tv.setTextColor(requireContext().getColor(R.color.brand_lavender))
                    tv.setTypeface(null, android.graphics.Typeface.NORMAL)
                }
            }
            applyFilter()
        }

        tabs.forEachIndexed { i, tv -> tv.setOnClickListener { selectTab(i) } }
        selectTab(0)

        view.findViewById<TextInputEditText>(R.id.etPersonnelSearch).addTextChangedListener {
            searchQuery = it?.toString().orEmpty()
            debounceHandler.removeCallbacks(filterRunnable)
            debounceHandler.postDelayed(filterRunnable, 200)
        }

        view.findViewById<View>(R.id.fabAddPersonnel).setOnClickListener { showForm(null) }
    }

    // ── Filter ────────────────────────────────────────────────────────────────

    private fun applyFilter() {
        val q = searchQuery.lowercase()
        val filtered = allItems.filter { p ->
            val matchSearch = q.isBlank() ||
                p.nom?.lowercase()?.contains(q) == true ||
                p.prenom?.lowercase()?.contains(q) == true ||
                p.centreNom?.lowercase()?.contains(q) == true ||
                p.cin?.lowercase()?.contains(q) == true
            val matchTab = when (activeTab) {
                "INFIRMIER" -> p.role?.lowercase() == "infirmier"
                "ADMIN"     -> p.role?.lowercase() == "admin"
                "INACTIFS"  -> p.estActif != true
                else        -> true
            }
            matchSearch && matchTab
        }
        adapter.submit(filtered)
        messageView.visibility = if (filtered.isEmpty() && allItems.isNotEmpty()) {
            messageView.text = if (q.isNotBlank()) "Aucun résultat pour « $q »"
                               else "Aucun membre dans cette catégorie"
            View.VISIBLE
        } else View.GONE
    }

    private fun updateHeroChips() {
        val infirmiers = allItems.count { it.role?.lowercase() == "infirmier" }
        val admins     = allItems.count { it.role?.lowercase() == "admin" }
        val inactifs   = allItems.count { it.estActif != true }

        tvPersonnelTotal.text = "${allItems.size} membres"
        tvPersonnelTotal.visibility = if (allItems.isNotEmpty()) View.VISIBLE else View.GONE

        tvHeroInfirmiers.text = "$infirmiers Infirmier${if (infirmiers > 1) "s" else ""}"
        tvHeroAdmins.text     = "$admins Admin${if (admins > 1) "s" else ""}"

        if (inactifs > 0) {
            tvHeroInactifs.text = "$inactifs inactif${if (inactifs > 1) "s" else ""} ⚠"
            tvHeroInactifs.visibility = View.VISIBLE
        } else {
            tvHeroInactifs.visibility = View.GONE
        }

        tabTous.text       = "Tous (${allItems.size})"
        tabInfirmiers.text = "Infirmiers ($infirmiers)"
        tabAdmins.text     = "Admins ($admins)"
        tabInactifs.text   = if (inactifs > 0) "Inactifs ($inactifs ⚠)" else "Inactifs"
    }

    // ── Data loading ──────────────────────────────────────────────────────────

    private fun loadData() {
        progressBar.visibility = View.VISIBLE
        messageView.visibility = View.GONE
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val (personnelResp, refsResp) = coroutineScope {
                    val p = async { ApiClient.apiService.getAdminPersonnel() }
                    val r = async { runCatching { ApiClient.apiService.getAdminReferences() }.getOrNull() }
                    p.await() to r.await()
                }

                if (personnelResp.status != "success" || personnelResp.data == null) {
                    throw Exception(personnelResp.message ?: "Erreur chargement personnel")
                }

                allItems = personnelResp.data.personnel
                centres  = refsResp?.data?.centres.orEmpty()

                if (allItems.isEmpty()) {
                    messageView.text = "Aucun membre du personnel enregistré"
                    messageView.visibility = View.VISIBLE
                }
                updateHeroChips()
                applyFilter()
            } catch (e: Exception) {
                messageView.text = e.message ?: "Erreur réseau"
                messageView.visibility = View.VISIBLE
            } finally {
                progressBar.visibility = View.GONE
            }
        }
    }

    // ── Form (create / edit) ──────────────────────────────────────────────────

    private fun showForm(item: AdminPersonnelDto?) {
        val isNew  = item == null
        val isSelf = item?.id != null && item.id == TokenManager.getUserId()

        val dialogView = LayoutInflater.from(requireContext()).inflate(R.layout.dialog_add_personnel, null)

        val layoutCin   = dialogView.findViewById<View>(R.id.layoutCin)
        val tilCin      = dialogView.findViewById<TextInputLayout>(R.id.tilCin)
        val tilNom      = dialogView.findViewById<TextInputLayout>(R.id.tilNom)
        val tilPrenom   = dialogView.findViewById<TextInputLayout>(R.id.tilPrenom)
        val tilPwd      = dialogView.findViewById<TextInputLayout>(R.id.tilPassword)
        val etCin       = dialogView.findViewById<TextInputEditText>(R.id.etCin)
        val etNom       = dialogView.findViewById<TextInputEditText>(R.id.etNom)
        val etPrenom    = dialogView.findViewById<TextInputEditText>(R.id.etPrenom)
        val etPwd       = dialogView.findViewById<TextInputEditText>(R.id.etPassword)
        val roleSpinner   = dialogView.findViewById<Spinner>(R.id.spinnerRole)
        val centreSpinner = dialogView.findViewById<Spinner>(R.id.spinnerCentre)
        val tvPwdHint   = dialogView.findViewById<TextView>(R.id.tvPasswordHint)

        layoutCin.visibility = if (isNew) View.VISIBLE else View.GONE
        tvPwdHint.visibility = if (isNew) View.GONE else View.VISIBLE

        if (!isNew) {
            etNom.setText(item?.nom ?: "")
            etPrenom.setText(item?.prenom ?: "")
        }

        val roles = listOf("infirmier", "admin")
        roleSpinner.adapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_dropdown_item, roles)
        roleSpinner.setSelection(if (item?.role == "admin") 1 else 0)
        roleSpinner.isEnabled = !isSelf

        centreSpinner.adapter = ArrayAdapter(
            requireContext(),
            android.R.layout.simple_spinner_dropdown_item,
            if (centres.isEmpty()) listOf("Aucun centre disponible")
            else centres.map { it.nom ?: "Centre #${it.id}" }
        )
        val centreIdx = centres.indexOfFirst { it.id == item?.centreId }
        centreSpinner.setSelection(if (centreIdx >= 0) centreIdx else 0)

        val dialog = MaterialAlertDialogBuilder(requireContext())
            .setTitle(if (isNew) "Ajouter un membre du personnel" else "Modifier le profil")
            .setView(dialogView)
            .setNegativeButton("Annuler", null)
            .setPositiveButton(if (isNew) "Créer le compte" else "Enregistrer") { _, _ -> }
            .show()

        dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
            tilCin.error    = null
            tilNom.error    = null
            tilPrenom.error = null
            tilPwd.error    = null

            val cinVal    = etCin.text?.toString()?.trim() ?: ""
            val nomVal    = etNom.text?.toString()?.trim() ?: ""
            val prenomVal = etPrenom.text?.toString()?.trim() ?: ""
            val pwdVal    = etPwd.text?.toString()?.trim() ?: ""

            var valid = true
            if (isNew && cinVal.isNotBlank() && !cinVal.matches(Regex("^[A-Z]{1,2}[0-9]{5,6}$"))) {
                tilCin.error = "Format invalide (ex: A123456 ou BE12345)"; valid = false
            }
            if (nomVal.length < 2) { tilNom.error = "Min. 2 caractères"; valid = false }
            if (prenomVal.length < 2) { tilPrenom.error = "Min. 2 caractères"; valid = false }
            if (isNew && pwdVal.length < 6) { tilPwd.error = "Min. 6 caractères requis"; valid = false }
            if (!valid) return@setOnClickListener

            dialog.dismiss()
            savePersonnel(
                item?.id,
                AdminPersonnelRequest(
                    cin        = if (isNew) cinVal.ifBlank { null } else null,
                    nom        = nomVal,
                    prenom     = prenomVal,
                    role       = roles[roleSpinner.selectedItemPosition],
                    centreId   = centres.getOrNull(centreSpinner.selectedItemPosition)?.id,
                    motDePasse = pwdVal.ifBlank { null }
                )
            )
        }
    }

    private fun savePersonnel(id: Int?, request: AdminPersonnelRequest) {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val r = if (id == null) ApiClient.apiService.createAdminPersonnel(request)
                        else ApiClient.apiService.updateAdminPersonnel(id, request)
                if (r.status != "success") throw Exception(r.message ?: "Refusé")
                Toast.makeText(requireContext(),
                    if (id == null) "Compte créé" else "Profil mis à jour",
                    Toast.LENGTH_SHORT).show()
                loadData()
            } catch (e: Exception) {
                Toast.makeText(requireContext(), e.message ?: "Erreur réseau", Toast.LENGTH_SHORT).show()
            }
        }
    }

    // ── Toggle actif / inactif ────────────────────────────────────────────────

    private fun togglePersonnel(item: AdminPersonnelDto) {
        if (item.id == TokenManager.getUserId()) {
            MaterialAlertDialogBuilder(requireContext())
                .setTitle("Action impossible")
                .setMessage("Vous ne pouvez pas désactiver votre propre compte administrateur.")
                .setPositiveButton("OK", null)
                .show()
            return
        }

        val fullName = "${item.prenom ?: ""} ${item.nom ?: ""}".trim()
        val isActive = item.estActif == true

        MaterialAlertDialogBuilder(requireContext())
            .setTitle(if (isActive) "Désactiver le compte" else "Réactiver le compte")
            .setMessage(
                if (isActive)
                    "Désactiver le compte de $fullName ?\n\nIl ne pourra plus se connecter jusqu'à réactivation."
                else
                    "Réactiver le compte de $fullName ?\n\nIl pourra à nouveau se connecter."
            )
            .setNegativeButton("Annuler", null)
            .setPositiveButton(if (isActive) "Désactiver" else "Réactiver") { _, _ ->
                viewLifecycleOwner.lifecycleScope.launch {
                    try {
                        val r = if (isActive) ApiClient.apiService.deactivateAdminPersonnel(item.id)
                                else ApiClient.apiService.reactivateAdminPersonnel(item.id)
                        if (r.status != "success") throw Exception(r.message ?: "Refusé")

                        allItems = allItems.map {
                            if (it.id == item.id) it.copy(estActif = !isActive) else it
                        }
                        updateHeroChips()
                        applyFilter()
                        Toast.makeText(requireContext(),
                            if (isActive) "Compte désactivé" else "Compte réactivé",
                            Toast.LENGTH_SHORT).show()
                    } catch (e: Exception) {
                        Toast.makeText(requireContext(), e.message ?: "Erreur réseau", Toast.LENGTH_SHORT).show()
                    }
                }
            }
            .show()
    }
}

// ── Adapter ───────────────────────────────────────────────────────────────────

private class PersonnelXmlAdapter(
    private val onEdit:   (AdminPersonnelDto) -> Unit,
    private val onToggle: (AdminPersonnelDto) -> Unit
) : RecyclerView.Adapter<PersonnelXmlAdapter.VH>() {

    private var items: List<AdminPersonnelDto> = emptyList()

    fun submit(next: List<AdminPersonnelDto>) {
        val diff = DiffUtil.calculateDiff(object : DiffUtil.Callback() {
            override fun getOldListSize() = items.size
            override fun getNewListSize() = next.size
            override fun areItemsTheSame(oldPos: Int, newPos: Int) =
                items[oldPos].id == next[newPos].id
            override fun areContentsTheSame(oldPos: Int, newPos: Int) =
                items[oldPos] == next[newPos]
        })
        items = next
        diff.dispatchUpdatesTo(this)
    }

    override fun getItemCount() = items.size

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH =
        VH(
            LayoutInflater.from(parent.context).inflate(R.layout.item_admin_personnel, parent, false),
            onEdit, onToggle
        )

    override fun onBindViewHolder(holder: VH, position: Int) = holder.bind(items[position])

    class VH(
        v: View,
        private val onEdit:   (AdminPersonnelDto) -> Unit,
        private val onToggle: (AdminPersonnelDto) -> Unit
    ) : RecyclerView.ViewHolder(v) {

        private val vStatusBar    = v.findViewById<View>(R.id.vPersonnelStatusBar)
        private val flAvatar      = v.findViewById<FrameLayout>(R.id.flPersonnelAvatar)
        private val tvInitials    = v.findViewById<TextView>(R.id.tvPersonnelInitials)
        private val tvNom         = v.findViewById<TextView>(R.id.tvPersonnelNom)
        private val tvRoleCentre  = v.findViewById<TextView>(R.id.tvPersonnelRoleCentre)
        private val tvStatus      = v.findViewById<TextView>(R.id.tvPersonnelStatus)
        private val llCin         = v.findViewById<LinearLayout>(R.id.llPersonnelCin)
        private val tvCin         = v.findViewById<TextView>(R.id.tvPersonnelCin)
        private val btnEdit       = v.findViewById<MaterialButton>(R.id.btnEditPersonnel)
        private val btnToggle     = v.findViewById<MaterialButton>(R.id.btnTogglePersonnel)

        fun bind(p: AdminPersonnelDto) {
            val ctx = itemView.context
            val fullName = "${p.prenom ?: ""} ${p.nom ?: ""}".trim().ifBlank { "Inconnu" }
            val initials = listOfNotNull(p.prenom?.firstOrNull(), p.nom?.firstOrNull())
                .joinToString("").uppercase().ifBlank { "?" }
            val isAdmin  = p.role?.lowercase() == "admin"
            val isActive = p.estActif == true

            tvNom.text       = fullName
            tvInitials.text  = initials
            tvRoleCentre.text = "${p.role?.replaceFirstChar { it.uppercase() } ?: "—"} · ${p.centreNom ?: "Aucun centre"}"

            // Role-colored avatar
            if (isAdmin) {
                flAvatar.setBackgroundResource(R.drawable.bg_kpi_icon_lavender)
                tvInitials.setTextColor(Color.parseColor("#5B21B6"))
            } else {
                flAvatar.setBackgroundResource(R.drawable.bg_kpi_icon_green)
                tvInitials.setTextColor(ContextCompat.getColor(ctx, R.color.brand_teal))
            }

            // CIN chip
            if (!p.cin.isNullOrBlank()) {
                tvCin.text = "CIN: ${p.cin}"
                llCin.visibility = View.VISIBLE
            } else {
                llCin.visibility = View.GONE
            }

            // Status
            if (isActive) {
                vStatusBar.setBackgroundColor(ContextCompat.getColor(ctx, R.color.success))
                tvStatus.text = "Actif"
                tvStatus.setBackgroundResource(R.drawable.bg_badge_success)
                tvStatus.setTextColor(ContextCompat.getColor(ctx, R.color.success_dark))
                btnToggle.text = "Désactiver"
                btnToggle.setTextColor(ContextCompat.getColor(ctx, R.color.error))
                btnToggle.strokeColor = ColorStateList.valueOf(ContextCompat.getColor(ctx, R.color.error))
            } else {
                vStatusBar.setBackgroundColor(ContextCompat.getColor(ctx, R.color.error))
                tvStatus.text = "Inactif"
                tvStatus.setBackgroundResource(R.drawable.bg_badge_error)
                tvStatus.setTextColor(ContextCompat.getColor(ctx, R.color.error))
                btnToggle.text = "Réactiver"
                btnToggle.setTextColor(ContextCompat.getColor(ctx, R.color.success))
                btnToggle.strokeColor = ColorStateList.valueOf(ContextCompat.getColor(ctx, R.color.success))
            }

            // Edit button always lavender
            btnEdit.setTextColor(ContextCompat.getColor(ctx, R.color.brand_lavender))
            btnEdit.strokeColor = ColorStateList.valueOf(ContextCompat.getColor(ctx, R.color.brand_lavender))

            itemView.setOnClickListener { onEdit(p) }
            btnEdit.setOnClickListener { onEdit(p) }
            btnToggle.setOnClickListener { onToggle(p) }
        }
    }
}
