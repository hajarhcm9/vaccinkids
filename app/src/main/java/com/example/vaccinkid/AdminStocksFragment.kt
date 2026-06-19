package com.example.vaccinkid

import android.graphics.Color
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
import com.example.vaccinkid.model.StockDto
import com.example.vaccinkid.model.UpsertStockRequest
import com.example.vaccinkid.network.ApiClient
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.textfield.TextInputEditText
import kotlinx.coroutines.launch

class AdminStocksFragment : Fragment(R.layout.fragment_gestion_stocks_admin) {

    private lateinit var refreshLayout: SwipeRefreshLayout
    private lateinit var alertAdapter: StockAdminAdapter
    private lateinit var okAdapter: StockAdminAdapter
    private lateinit var messageView: TextView
    private lateinit var tvTotal: TextView
    private lateinit var tvFaibles: TextView
    private lateinit var tvPerimes: TextView

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        refreshLayout = view.findViewById(R.id.stocksAdminRefresh)
        messageView = view.findViewById(R.id.tvStocksMessage)
        tvTotal = view.findViewById(R.id.tvStockTotal)
        tvFaibles = view.findViewById(R.id.tvStockFaibles)
        tvPerimes = view.findViewById(R.id.tvStockPerimes)

        alertAdapter = StockAdminAdapter(onAdjust = { showAdjustDialog(it) })
        okAdapter = StockAdminAdapter(onAdjust = { showAdjustDialog(it) })

        val rvAlert = view.findViewById<RecyclerView>(R.id.rvStocksAlert)
        rvAlert.layoutManager = LinearLayoutManager(requireContext())
        rvAlert.adapter = alertAdapter

        val rvOk = view.findViewById<RecyclerView>(R.id.rvStocksOk)
        rvOk.layoutManager = LinearLayoutManager(requireContext())
        rvOk.adapter = okAdapter

        refreshLayout.setOnRefreshListener { loadStocks() }
        loadStocks()
    }

    private fun showAdjustDialog(stock: StockDto) {
        val nom = stock.vaccinNom ?: stock.nom ?: "Vaccin #${stock.id}"
        val dialogView = LayoutInflater.from(requireContext()).inflate(R.layout.dialog_edit_stock, null)
        val qteInput = dialogView.findViewById<TextInputEditText>(R.id.editEtQuantite)
        val seuilInput = dialogView.findViewById<TextInputEditText>(R.id.editEtSeuil)
        val motifInput = dialogView.findViewById<TextInputEditText>(R.id.editEtMotif)
        qteInput.setText((stock.quantiteDisponible ?: 0).toString())
        seuilInput.setText((stock.seuilAlerte ?: 0).toString())

        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Ajuster le stock — $nom")
            .setView(dialogView)
            .setNegativeButton("Annuler", null)
            .setPositiveButton("Enregistrer") { _, _ ->
                val qte = qteInput.text.toString().toIntOrNull()
                val seuil = seuilInput.text.toString().toIntOrNull()
                val motif = motifInput.text.toString().trim().ifBlank { null }
                if (qte == null) { Toast.makeText(requireContext(), "Quantité invalide", Toast.LENGTH_SHORT).show(); return@setPositiveButton }
                saveStockAdjustment(stock, qte, seuil, motif)
            }
            .show()
    }

    private fun saveStockAdjustment(stock: StockDto, qte: Int, seuil: Int?, motif: String?) {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                if (stock.id != 0) {
                    val r = ApiClient.apiService.updateStock(stock.id,
                        com.example.vaccinkid.model.UpdateStockRequest(
                            quantiteDisponible = qte,
                            seuilAlerte = seuil,
                            motif = motif
                        ))
                    if (r.status != "success") throw Exception(r.message ?: "Refusé")
                } else {
                    val vaccinId = stock.vaccinId ?: return@launch
                    val centreId = stock.centreId ?: return@launch
                    val r = ApiClient.apiService.upsertStock(UpsertStockRequest(
                        vaccinId = vaccinId, centreId = centreId,
                        quantiteDisponible = qte, seuilAlerte = seuil ?: 0, motif = motif
                    ))
                    if (r.status != "success") throw Exception(r.message ?: "Refusé")
                }
                Toast.makeText(requireContext(), "Stock mis à jour", Toast.LENGTH_SHORT).show()
                loadStocks()
            } catch (e: Exception) {
                Toast.makeText(requireContext(), e.message ?: "Erreur réseau", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun loadStocks() {
        refreshLayout.isRefreshing = true
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                // Load all centres then fetch stock per centre
                val refsResp = ApiClient.apiService.getAdminReferences()
                val centres = refsResp.data?.centres.orEmpty()

                val allStocks = mutableListOf<com.example.vaccinkid.model.StockDto>()
                for (centre in centres) {
                    try {
                        val r = ApiClient.apiService.getStock(centre.id)
                        val items = r.data.orEmpty().map { it.copy(centreNom = centre.nom ?: "Centre #${centre.id}") }
                        allStocks.addAll(items)
                    } catch (_: Exception) {}
                }

                val alertStocks = allStocks.filter { s ->
                    val q = s.quantiteDisponible ?: 99; val seuil = s.seuilAlerte ?: 0
                    seuil > 0 && q <= seuil
                }
                val okStocks = allStocks.filter { s ->
                    val q = s.quantiteDisponible ?: 99; val seuil = s.seuilAlerte ?: 0
                    seuil == 0 || q > seuil
                }

                alertAdapter.submit(alertStocks)
                okAdapter.submit(okStocks)

                tvTotal.text = allStocks.sumOf { it.quantiteDisponible ?: 0 }.toString()
                tvFaibles.text = alertStocks.size.toString()
                tvPerimes.text = "0"
                messageView.visibility = View.GONE
            } catch (e: Exception) {
                messageView.text = e.message ?: "Erreur réseau"
                messageView.visibility = View.VISIBLE
            } finally {
                refreshLayout.isRefreshing = false
            }
        }
    }
}

private class StockAdminAdapter(
    private val onAdjust: (StockDto) -> Unit
) : RecyclerView.Adapter<StockAdminAdapter.VH>() {
    private var items: List<StockDto> = emptyList()

    fun submit(next: List<StockDto>) { items = next; notifyDataSetChanged() }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH =
        VH(android.view.LayoutInflater.from(parent.context).inflate(R.layout.item_admin_stock, parent, false), onAdjust)

    override fun getItemCount() = items.size
    override fun onBindViewHolder(holder: VH, position: Int) = holder.bind(items[position])

    class VH(v: View, private val onAdjust: (StockDto) -> Unit) : RecyclerView.ViewHolder(v) {
        private val severityBar = v.findViewById<View>(R.id.viewStockSeverityBar)
        private val tvNom = v.findViewById<TextView>(R.id.tvStockVaccinNom)
        private val tvCentre = v.findViewById<TextView>(R.id.tvStockCentre)
        private val pb = v.findViewById<ProgressBar>(R.id.pbStockLevel)
        private val tvQte = v.findViewById<TextView>(R.id.tvStockQteInfo)
        private val tvBadge = v.findViewById<TextView>(R.id.tvStockBadge)

        fun bind(s: StockDto) {
            val qte = s.quantiteDisponible ?: 0
            val seuil = s.seuilAlerte ?: 0
            val nom = s.vaccinNom ?: s.nom ?: "Vaccin #${s.id}"
            val isCritique = seuil > 0 && qte <= seuil / 2
            val isFaible = seuil > 0 && qte <= seuil && !isCritique

            tvNom.text = nom
            tvCentre.text = s.centreNom ?: "Tous les centres"
            tvQte.text = "$qte doses disponibles — seuil : $seuil"

            val pct = if (seuil > 0) ((qte.toFloat() / (seuil * 2)) * 100).toInt().coerceIn(0, 100) else 80
            pb.progress = pct

            when {
                isCritique -> {
                    severityBar.setBackgroundColor(Color.parseColor("#EF4444"))
                    pb.progressTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#EF4444"))
                    tvBadge.text = "Critique"
                    tvBadge.setBackgroundResource(R.drawable.bg_badge_error)
                    tvBadge.setTextColor(Color.parseColor("#991B1B"))
                }
                isFaible -> {
                    severityBar.setBackgroundColor(Color.parseColor("#F59E0B"))
                    pb.progressTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#F59E0B"))
                    tvBadge.text = "Faible"
                    tvBadge.setBackgroundResource(R.drawable.bg_badge_warning)
                    tvBadge.setTextColor(Color.parseColor("#92400E"))
                }
                else -> {
                    severityBar.setBackgroundColor(Color.parseColor("#10B981"))
                    pb.progressTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#10B981"))
                    tvBadge.text = "OK"
                    tvBadge.setBackgroundResource(R.drawable.bg_badge_success)
                    tvBadge.setTextColor(Color.parseColor("#065F46"))
                }
            }

            itemView.setOnClickListener { onAdjust(s) }
        }
    }
}
