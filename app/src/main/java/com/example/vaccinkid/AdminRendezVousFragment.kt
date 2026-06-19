package com.example.vaccinkid

import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.example.vaccinkid.model.RendezVousDto
import com.example.vaccinkid.network.ApiClient
import com.google.android.material.button.MaterialButton
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import kotlinx.coroutines.launch

class AdminRendezVousFragment : Fragment(R.layout.fragment_admin_rdv) {

    private lateinit var adapter: RdvAdminAdapter
    private lateinit var tvMessage: TextView
    private lateinit var refreshLayout: SwipeRefreshLayout
    private lateinit var tabTous: TextView
    private lateinit var tabPresents: TextView
    private lateinit var tabAbsents: TextView
    private lateinit var tabAttente: TextView
    private var allRdv: List<RendezVousDto> = emptyList()
    private var activeFilter = "TOUS"

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        tvMessage = view.findViewById(R.id.tvRdvMessage)
        refreshLayout = view.findViewById(R.id.rdvAdminRefresh)
        tabTous = view.findViewById(R.id.tabRdvTous)
        tabPresents = view.findViewById(R.id.tabRdvPresents)
        tabAbsents = view.findViewById(R.id.tabRdvAbsents)
        tabAttente = view.findViewById(R.id.tabRdvAttente)

        adapter = RdvAdminAdapter(onDelete = { confirmDelete(it) })
        view.findViewById<RecyclerView>(R.id.rvRdvAdmin).apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = this@AdminRendezVousFragment.adapter
        }

        tabTous.setOnClickListener { selectTab("TOUS") }
        tabPresents.setOnClickListener { selectTab("PRESENT") }
        tabAbsents.setOnClickListener { selectTab("ABSENT") }
        tabAttente.setOnClickListener { selectTab("EN_ATTENTE") }

        refreshLayout.setOnRefreshListener { loadRdv() }
        loadRdv()
    }

    private fun selectTab(filter: String) {
        activeFilter = filter
        val tabs = mapOf(
            tabTous to "TOUS",
            tabPresents to "PRESENT",
            tabAbsents to "ABSENT",
            tabAttente to "EN_ATTENTE"
        )
        tabs.forEach { (tv, key) ->
            if (key == filter) {
                tv.setBackgroundResource(R.drawable.bg_btn_teal_pill)
                tv.setTextColor(requireContext().getColor(R.color.white))
            } else {
                tv.setBackgroundResource(R.drawable.bg_chip_inactive)
                tv.setTextColor(requireContext().getColor(R.color.text_secondary))
            }
        }
        applyFilter()
    }

    private fun loadRdv() {
        refreshLayout.isRefreshing = true
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val resp = ApiClient.apiService.getRendezVous()
                if (resp.status != "success") throw Exception(resp.message ?: "Erreur")
                allRdv = resp.data.orEmpty()
                applyFilter()
            } catch (e: Exception) {
                tvMessage.text = e.message ?: "Erreur réseau"
            } finally {
                refreshLayout.isRefreshing = false
            }
        }
    }

    private fun applyFilter() {
        val filtered = if (activeFilter == "TOUS") allRdv
        else allRdv.filter { it.statut?.uppercase() == activeFilter }
        adapter.submit(filtered)
        tvMessage.text = "${filtered.size} RDV"
    }

    private fun confirmDelete(rdv: RendezVousDto) {
        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Supprimer ce RDV ?")
            .setMessage("RDV #${rdv.id} — ${rdv.statut ?: "-"}")
            .setNegativeButton("Annuler", null)
            .setPositiveButton("Supprimer") { _, _ ->
                viewLifecycleOwner.lifecycleScope.launch {
                    try {
                        val r = ApiClient.apiService.deleteRendezVous(rdv.id)
                        if (r.status != "success") throw Exception(r.message)
                        Toast.makeText(requireContext(), "RDV supprimé", Toast.LENGTH_SHORT).show()
                        loadRdv()
                    } catch (e: Exception) {
                        Toast.makeText(requireContext(), e.message ?: "Erreur réseau", Toast.LENGTH_SHORT).show()
                    }
                }
            }
            .show()
    }
}

private class RdvAdminAdapter(
    private val onDelete: (RendezVousDto) -> Unit
) : RecyclerView.Adapter<RdvAdminAdapter.VH>() {
    private var items: List<RendezVousDto> = emptyList()
    fun submit(next: List<RendezVousDto>) { items = next; notifyDataSetChanged() }
    override fun getItemCount() = items.size
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH =
        VH(android.view.LayoutInflater.from(parent.context).inflate(R.layout.item_admin_rdv, parent, false), onDelete)
    override fun onBindViewHolder(h: VH, pos: Int) = h.bind(items[pos])

    class VH(
        v: View,
        private val onDelete: (RendezVousDto) -> Unit
    ) : RecyclerView.ViewHolder(v) {
        private val accentBar: View = v.findViewById(R.id.viewRdvAccent)
        private val tvId: TextView = v.findViewById(R.id.tvRdvId)
        private val tvHeure: TextView = v.findViewById(R.id.tvRdvHeure)
        private val tvStatut: TextView = v.findViewById(R.id.tvRdvStatut)
        private val tvParent: TextView = v.findViewById(R.id.tvRdvParent)
        private val tvVaccin: TextView = v.findViewById(R.id.tvRdvVaccin)
        private val btnDelete: MaterialButton = v.findViewById(R.id.btnRdvDelete)

        fun bind(rdv: RendezVousDto) {
            val statut = rdv.statut?.uppercase() ?: "INCONNU"
            val accentColor = when (statut) {
                "PRESENT" -> "#10B981"
                "ABSENT" -> "#EF4444"
                "EN_ATTENTE" -> "#F59E0B"
                "CONFIRME" -> "#3B82F6"
                else -> "#9CA3AF"
            }
            accentBar.setBackgroundColor(Color.parseColor(accentColor))
            tvStatut.setBackgroundColor(Color.parseColor(accentColor))

            tvId.text = "RDV #${rdv.id}"
            tvHeure.text = rdv.heureDebut?.take(5)?.let { "Heure : $it" } ?: "Heure non définie"
            tvStatut.text = statut.replace("_", " ")

            tvParent.text = listOfNotNull(rdv.parentPrenom, rdv.parentNom)
                .joinToString(" ").let { if (it.isNotBlank()) "Parent : $it" else "" }
            tvVaccin.text = rdv.vaccinNom?.let { "Vaccin : $it" } ?: ""
            tvVaccin.visibility = if (rdv.vaccinNom != null) View.VISIBLE else View.GONE

            btnDelete.setOnClickListener { onDelete(rdv) }
        }
    }
}
