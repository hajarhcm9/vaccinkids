package com.example.vaccinkid

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.example.vaccinkid.model.DelayCentreDto
import com.example.vaccinkid.model.DelayDashboardDto
import com.example.vaccinkid.model.DelayVaccinDto
import com.example.vaccinkid.network.ApiClient
import com.google.android.material.button.MaterialButton
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import kotlinx.coroutines.launch

class AdminDelayAlertsFragment : Fragment(R.layout.fragment_admin_delay_alerts) {

    private lateinit var tvTotalDelayed: TextView
    private lateinit var tvUrgentCount: TextView
    private lateinit var tvStatus: TextView
    private lateinit var btnSendAlerts: MaterialButton
    private lateinit var rvTopVaccins: RecyclerView
    private lateinit var rvByCentre: RecyclerView
    private lateinit var tvNoVaccins: TextView
    private lateinit var tvNoCentres: TextView
    private lateinit var swipeRefresh: SwipeRefreshLayout

    private val vaccinAdapter = DelayVaccinAdapter()
    private val centreAdapter = DelayCentreAdapter()
    private var totalDelayed: Int = 0

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        tvTotalDelayed = view.findViewById(R.id.tvTotalDelayed)
        tvUrgentCount = view.findViewById(R.id.tvUrgentCount)
        tvStatus = view.findViewById(R.id.tvDelayStatus)
        btnSendAlerts = view.findViewById(R.id.btnSendAlerts)
        tvNoVaccins = view.findViewById(R.id.tvNoVaccins)
        tvNoCentres = view.findViewById(R.id.tvNoCentres)
        swipeRefresh = view.findViewById(R.id.delayRefresh)

        rvTopVaccins = view.findViewById(R.id.rvTopVaccins)
        rvTopVaccins.layoutManager = LinearLayoutManager(requireContext())
        rvTopVaccins.adapter = vaccinAdapter
        rvTopVaccins.isNestedScrollingEnabled = false

        rvByCentre = view.findViewById(R.id.rvByCentre)
        rvByCentre.layoutManager = LinearLayoutManager(requireContext())
        rvByCentre.adapter = centreAdapter
        rvByCentre.isNestedScrollingEnabled = false

        btnSendAlerts.setOnClickListener { sendAlerts() }
        swipeRefresh.setOnRefreshListener { loadDashboard() }
        swipeRefresh.setColorSchemeResources(R.color.brand_teal)

        loadDashboard()
    }

    private fun loadDashboard() {
        showStatus("Chargement…")
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val resp = ApiClient.apiService.getDelayDashboard()
                if (resp.status != "success") throw Exception(resp.message ?: "Erreur")
                val data = resp.data ?: throw Exception("Données vides")
                renderStats(data)
                renderTopVaccins(data)
                renderByCentre(data)
                showStatus("")
            } catch (e: Exception) {
                showStatus(e.message ?: "Erreur réseau")
            } finally {
                swipeRefresh.isRefreshing = false
            }
        }
    }

    private fun renderStats(data: DelayDashboardDto) {
        totalDelayed = data.totalDelayed ?: 0
        tvTotalDelayed.text = totalDelayed.toString()
        tvUrgentCount.text = (data.urgentCount ?: 0).toString()
    }

    private fun renderTopVaccins(data: DelayDashboardDto) {
        val list = data.topVaccines.orEmpty()
        vaccinAdapter.submit(list)
        rvTopVaccins.visibility = if (list.isEmpty()) View.GONE else View.VISIBLE
        tvNoVaccins.visibility = if (list.isEmpty()) View.VISIBLE else View.GONE
    }

    private fun renderByCentre(data: DelayDashboardDto) {
        val list = data.byCentre.orEmpty()
        centreAdapter.submit(list)
        rvByCentre.visibility = if (list.isEmpty()) View.GONE else View.VISIBLE
        tvNoCentres.visibility = if (list.isEmpty()) View.VISIBLE else View.GONE
    }

    private fun showStatus(message: String) {
        tvStatus.text = message
        tvStatus.visibility = if (message.isBlank()) View.GONE else View.VISIBLE
    }

    private fun sendAlerts() {
        val total = totalDelayed
        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Envoyer les alertes de retard ?")
            .setMessage("Cette action va notifier $total parents concernés par un retard vaccinal. Cette opération ne peut pas être annulée.")
            .setNegativeButton("Annuler", null)
            .setPositiveButton("Envoyer") { _, _ -> doSendAlerts() }
            .show()
    }

    private fun doSendAlerts() {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                showStatus("Envoi des alertes…")
                btnSendAlerts.isEnabled = false
                val r = ApiClient.apiService.sendDelayAlerts(emptyMap())
                if (r.status != "success") throw Exception(r.message ?: "Échec")
                Toast.makeText(requireContext(), "Alertes envoyées aux parents", Toast.LENGTH_LONG).show()
                showStatus("")
            } catch (e: Exception) {
                showStatus("Erreur : ${e.message}")
            } finally {
                btnSendAlerts.isEnabled = true
            }
        }
    }
}

private class DelayVaccinAdapter : RecyclerView.Adapter<DelayVaccinAdapter.VH>() {
    private var items: List<DelayVaccinDto> = emptyList()
    fun submit(next: List<DelayVaccinDto>) { items = next; notifyDataSetChanged() }
    override fun getItemCount() = items.size
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH =
        VH(LayoutInflater.from(parent.context).inflate(R.layout.item_delay_vaccin, parent, false))
    override fun onBindViewHolder(h: VH, pos: Int) = h.bind(items[pos])

    class VH(v: View) : RecyclerView.ViewHolder(v) {
        private val tvNom: TextView = v.findViewById(R.id.tvDelayVaccinNom)
        private val tvInfo: TextView = v.findViewById(R.id.tvDelayVaccinInfo)
        private val tvCount: TextView = v.findViewById(R.id.tvDelayVaccinCount)
        fun bind(item: DelayVaccinDto) {
            tvNom.text = item.vaccinNom ?: "Vaccin #${item.vaccinId}"
            tvInfo.text = "Âge cible : ${item.ageCibleSemaines ?: "—"} sem. · Moy. ${item.avgJoursRetard ?: "—"}j de retard"
            tvCount.text = (item.nbEnfantsRetard ?: 0).toString()
        }
    }
}

private class DelayCentreAdapter : RecyclerView.Adapter<DelayCentreAdapter.VH>() {
    private var items: List<DelayCentreDto> = emptyList()
    fun submit(next: List<DelayCentreDto>) { items = next; notifyDataSetChanged() }
    override fun getItemCount() = items.size
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH =
        VH(LayoutInflater.from(parent.context).inflate(R.layout.item_delay_centre, parent, false))
    override fun onBindViewHolder(h: VH, pos: Int) = h.bind(items[pos])

    class VH(v: View) : RecyclerView.ViewHolder(v) {
        private val tvNom: TextView = v.findViewById(R.id.tvDelayCentreNom)
        private val tvCount: TextView = v.findViewById(R.id.tvDelayCentreCount)
        fun bind(item: DelayCentreDto) {
            tvNom.text = item.centreNom ?: "Centre #${item.centreId}"
            tvCount.text = "${item.nbEnfantsRetard ?: 0} enfants"
        }
    }
}
