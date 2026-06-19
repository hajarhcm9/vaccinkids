package com.example.vaccinkid

import android.graphics.Color
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.vaccinkid.model.VaccinDto
import com.example.vaccinkid.model.VaccinRequest
import com.example.vaccinkid.network.ApiClient
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.textfield.TextInputEditText
import kotlinx.coroutines.launch

class GestionVaccinsFragment : Fragment(R.layout.fragment_gestion_vaccins) {

    private lateinit var adapter: VaccinXmlAdapter
    private lateinit var messageView: TextView
    private lateinit var progressBar: ProgressBar
    private var allVaccins: List<VaccinDto> = emptyList()
    private var showAll = false

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        messageView = view.findViewById(R.id.tvVaccinsMessage)
        progressBar = view.findViewById(R.id.vaccinsProgress)

        adapter = VaccinXmlAdapter(
            onEdit = { showForm(it) },
            onDeactivate = { deactivate(it) },
            onReactivate = { reactivate(it) }
        )
        view.findViewById<RecyclerView>(R.id.rvVaccins).apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = this@GestionVaccinsFragment.adapter
        }

        val tabActifs = view.findViewById<TextView>(R.id.tabVaccinsActifs)
        val tabTous = view.findViewById<TextView>(R.id.tabVaccinsTous)

        fun selectTab(all: Boolean) {
            showAll = all
            if (all) {
                tabTous.setBackgroundResource(R.drawable.bg_btn_teal_pill)
                tabTous.setTextColor(requireContext().getColor(R.color.white))
                tabTous.setTypeface(null, android.graphics.Typeface.BOLD)
                tabActifs.background = null
                tabActifs.setTextColor(requireContext().getColor(R.color.text_secondary))
                tabActifs.setTypeface(null, android.graphics.Typeface.NORMAL)
            } else {
                tabActifs.setBackgroundResource(R.drawable.bg_btn_teal_pill)
                tabActifs.setTextColor(requireContext().getColor(R.color.white))
                tabActifs.setTypeface(null, android.graphics.Typeface.BOLD)
                tabTous.background = null
                tabTous.setTextColor(requireContext().getColor(R.color.text_secondary))
                tabTous.setTypeface(null, android.graphics.Typeface.NORMAL)
            }
            applyFilter()
        }

        tabActifs.setOnClickListener { selectTab(false) }
        tabTous.setOnClickListener { selectTab(true) }

        view.findViewById<View>(R.id.fabAddVaccin).setOnClickListener { showForm(null) }

        loadVaccins()
    }

    private fun applyFilter() {
        val filtered = if (showAll) allVaccins else allVaccins.filter { it.estActif != false }
        adapter.submit(filtered)
        messageView.text = "${filtered.size} vaccin(s)"
        messageView.visibility = View.VISIBLE
    }

    private fun loadVaccins() {
        progressBar.visibility = View.VISIBLE
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.getVaccins(all = true)
                val data = response.data
                if (response.status != "success" || data == null) throw Exception(response.message)
                allVaccins = data
                applyFilter()
            } catch (e: Exception) {
                messageView.text = e.message ?: "Erreur réseau"
                messageView.visibility = View.VISIBLE
            } finally {
                progressBar.visibility = View.GONE
            }
        }
    }

    private fun showForm(item: VaccinDto?) {
        val dialogView = LayoutInflater.from(requireContext()).inflate(R.layout.dialog_create_vaccin, null)
        val nomEt = dialogView.findViewById<TextInputEditText>(R.id.etVaccinNom)
        val dosesEt = dialogView.findViewById<TextInputEditText>(R.id.etVaccinDoses)
        val ageEt = dialogView.findViewById<TextInputEditText>(R.id.etVaccinAge)
        val maladiesEt = dialogView.findViewById<TextInputEditText>(R.id.etVaccinMaladies)
        nomEt.setText(item?.nom ?: "")
        dosesEt.setText(item?.dosesParFlacon?.toString() ?: "")
        ageEt.setText(item?.ageCibleSemaines?.toString() ?: "")
        maladiesEt.setText(item?.maladiesCiblees ?: "")

        MaterialAlertDialogBuilder(requireContext())
            .setTitle(if (item == null) "Ajouter vaccin" else "Modifier vaccin")
            .setView(dialogView)
            .setNegativeButton("Annuler", null)
            .setPositiveButton("Valider") { _, _ ->
                saveVaccin(item?.id, VaccinRequest(
                    nom = nomEt.text.toString().trim(),
                    dosesParFlacon = dosesEt.text.toString().trim().toIntOrNull(),
                    ageCibleSemaines = ageEt.text.toString().trim().toIntOrNull(),
                    maladiesCiblees = maladiesEt.text.toString().trim()
                ))
            }
            .show()
    }

    private fun saveVaccin(id: Int?, request: VaccinRequest) {
        if (request.nom.isNullOrBlank()) {
            Toast.makeText(requireContext(), "Le nom est obligatoire", Toast.LENGTH_SHORT).show()
            return
        }
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val r = if (id == null) ApiClient.apiService.createVaccin(request)
                else ApiClient.apiService.updateVaccin(id, request)
                if (r.status != "success") throw Exception(r.message ?: "Refusé")
                Toast.makeText(requireContext(), "Vaccin enregistré", Toast.LENGTH_SHORT).show()
                loadVaccins()
            } catch (e: Exception) {
                Toast.makeText(requireContext(), e.message ?: "Erreur réseau", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun deactivate(item: VaccinDto) {
        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Désactiver vaccin")
            .setMessage(item.nom ?: "Vaccin #${item.id}")
            .setNegativeButton("Annuler", null)
            .setPositiveButton("Confirmer") { _, _ ->
                viewLifecycleOwner.lifecycleScope.launch {
                    try {
                        val r = ApiClient.apiService.deactivateVaccin(item.id)
                        if (r.status != "success") throw Exception(r.message)
                        loadVaccins()
                    } catch (e: Exception) {
                        Toast.makeText(requireContext(), e.message ?: "Erreur réseau", Toast.LENGTH_SHORT).show()
                    }
                }
            }
            .show()
    }

    private fun reactivate(item: VaccinDto) {
        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Réactiver vaccin")
            .setMessage(item.nom ?: "Vaccin #${item.id}")
            .setNegativeButton("Annuler", null)
            .setPositiveButton("Confirmer") { _, _ ->
                viewLifecycleOwner.lifecycleScope.launch {
                    try {
                        val r = ApiClient.apiService.reactivateVaccin(item.id)
                        if (r.status != "success") throw Exception(r.message)
                        loadVaccins()
                    } catch (e: Exception) {
                        Toast.makeText(requireContext(), e.message ?: "Erreur réseau", Toast.LENGTH_SHORT).show()
                    }
                }
            }
            .show()
    }
}

private class VaccinXmlAdapter(
    private val onEdit: (VaccinDto) -> Unit,
    private val onDeactivate: (VaccinDto) -> Unit,
    private val onReactivate: (VaccinDto) -> Unit
) : RecyclerView.Adapter<VaccinXmlAdapter.VH>() {
    private var items: List<VaccinDto> = emptyList()
    fun submit(next: List<VaccinDto>) { items = next; notifyDataSetChanged() }
    override fun getItemCount() = items.size
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH =
        VH(android.view.LayoutInflater.from(parent.context).inflate(R.layout.item_admin_vaccin, parent, false), onEdit, onDeactivate, onReactivate)
    override fun onBindViewHolder(h: VH, pos: Int) = h.bind(items[pos])

    class VH(v: View, val onEdit: (VaccinDto) -> Unit, val onDeactivate: (VaccinDto) -> Unit, val onReactivate: (VaccinDto) -> Unit) : RecyclerView.ViewHolder(v) {
        private val dot = v.findViewById<View>(R.id.viewVaccinStatusDot)
        private val tvNom = v.findViewById<TextView>(R.id.tvVaccinNom)
        private val tvBadge = v.findViewById<TextView>(R.id.tvVaccinBadge)
        private val tvMaladies = v.findViewById<TextView>(R.id.tvVaccinMaladies)
        private val tvDoses = v.findViewById<TextView>(R.id.tvVaccinDoses)
        private val tvAge = v.findViewById<TextView>(R.id.tvVaccinAge)
        private val llActions = v.findViewById<LinearLayout>(R.id.llVaccinActions)

        fun bind(v: VaccinDto) {
            val actif = v.estActif != false
            tvNom.text = v.nom ?: "Vaccin #${v.id}"
            tvMaladies.text = v.maladiesCiblees ?: ""
            tvDoses.text = "${v.dosesParFlacon ?: "-"} doses/flacon"
            tvAge.text = "Âge cible : ${v.ageCibleSemaines ?: "-"} sem."

            if (actif) {
                tvBadge.text = "Actif"
                tvBadge.setBackgroundResource(R.drawable.bg_badge_success)
                tvBadge.setTextColor(Color.parseColor("#065F46"))
                dot.setBackgroundResource(R.drawable.bg_legend_dot_teal)
            } else {
                tvBadge.text = "Inactif"
                tvBadge.setBackgroundResource(R.drawable.bg_badge_error)
                tvBadge.setTextColor(Color.parseColor("#991B1B"))
                dot.setBackgroundResource(R.drawable.bg_legend_dot_gray)
            }

            llActions.removeAllViews()
            fun btn(label: String, color: Int, click: () -> Unit) {
                llActions.addView(Button(itemView.context).apply {
                    text = label
                    setTextColor(Color.WHITE)
                    backgroundTintList = android.content.res.ColorStateList.valueOf(color)
                    textSize = 11f
                    layoutParams = LinearLayout.LayoutParams(0, 72).also { it.weight = 1f; it.marginEnd = 6 }
                    setOnClickListener { click() }
                })
            }
            btn("Modifier", Color.parseColor("#64748B")) { onEdit(v) }
            if (actif) btn("Désactiver", Color.parseColor("#EF4444")) { onDeactivate(v) }
            else btn("Réactiver", Color.parseColor("#10B981")) { onReactivate(v) }
        }
    }
}
