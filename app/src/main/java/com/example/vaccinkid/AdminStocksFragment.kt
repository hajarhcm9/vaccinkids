package com.example.vaccinkid

import android.content.res.ColorStateList
import android.graphics.Color
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.example.vaccinkid.model.StockDto
import com.example.vaccinkid.model.UpsertStockRequest
import com.example.vaccinkid.network.ApiClient
import com.google.android.material.button.MaterialButton
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.progressindicator.LinearProgressIndicator
import com.google.android.material.textfield.TextInputEditText
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
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
        messageView   = view.findViewById(R.id.tvStocksMessage)
        tvTotal       = view.findViewById(R.id.tvStockTotal)
        tvFaibles     = view.findViewById(R.id.tvStockFaibles)
        tvPerimes     = view.findViewById(R.id.tvStockPerimes)

        alertAdapter = StockAdminAdapter(onAdjust = { showAdjustDialog(it) })
        okAdapter    = StockAdminAdapter(onAdjust = { showAdjustDialog(it) })

        view.findViewById<RecyclerView>(R.id.rvStocksAlert).apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = alertAdapter
        }
        view.findViewById<RecyclerView>(R.id.rvStocksOk).apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = okAdapter
        }

        refreshLayout.setColorSchemeColors(ContextCompat.getColor(requireContext(), R.color.stormy_teal))
        refreshLayout.setOnRefreshListener { loadStocks() }
        loadStocks()
    }

    private fun showAdjustDialog(stock: StockDto) {
        val nom = stock.vaccinNom ?: stock.nom ?: "Vaccin #${stock.id}"
        val dialogView = LayoutInflater.from(requireContext())
            .inflate(R.layout.dialog_edit_stock, null)

        val tvTitle      = dialogView.findViewById<TextView>(R.id.tvStockDialogTitle)
        val qteInput     = dialogView.findViewById<TextInputEditText>(R.id.editEtQuantite)
        val seuilInput   = dialogView.findViewById<TextInputEditText>(R.id.editEtSeuil)
        val expInput     = dialogView.findViewById<TextInputEditText>(R.id.editEtExpiration)
        val motifInput   = dialogView.findViewById<TextInputEditText>(R.id.editEtMotif)
        val btnCancel    = dialogView.findViewById<MaterialButton>(R.id.btnStockCancel)
        val btnSave      = dialogView.findViewById<MaterialButton>(R.id.btnStockSave)

        tvTitle.text = nom
        qteInput.setText((stock.quantiteDisponible ?: 0).toString())
        seuilInput.setText((stock.seuilAlerte ?: 0).toString())
        expInput.setText(stock.dateExpiration ?: "")

        val dialog = MaterialAlertDialogBuilder(requireContext())
            .setView(dialogView)
            .create()
        dialog.show()
        dialog.window?.apply {
            setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
            setBackgroundDrawableResource(android.R.color.transparent)
        }

        btnCancel.setOnClickListener { dialog.dismiss() }

        btnSave.setOnClickListener {
            val qte   = qteInput.text?.toString()?.toIntOrNull()
            val seuil = seuilInput.text?.toString()?.toIntOrNull()
            val exp   = expInput.text?.toString()?.trim()?.ifBlank { null }
            val motif = motifInput.text?.toString()?.trim()?.ifBlank { null }

            if (qte == null) {
                Toast.makeText(requireContext(), "Quantité invalide", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            dialog.dismiss()
            saveStockAdjustment(stock, qte, seuil, exp, motif)
        }
    }

    private fun saveStockAdjustment(
        stock: StockDto, qte: Int, seuil: Int?,
        dateExpiration: String?, motif: String?
    ) {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                if (stock.id != 0) {
                    val r = ApiClient.apiService.updateStock(
                        stock.id,
                        com.example.vaccinkid.model.UpdateStockRequest(
                            quantiteDisponible = qte,
                            seuilAlerte        = seuil,
                            dateExpiration     = dateExpiration,
                            motif              = motif
                        )
                    )
                    if (r.status != "success") throw Exception(r.message ?: "Refusé")
                } else {
                    val vaccinId = stock.vaccinId ?: return@launch
                    val centreId = stock.centreId ?: return@launch
                    val r = ApiClient.apiService.upsertStock(
                        UpsertStockRequest(
                            vaccinId           = vaccinId,
                            centreId           = centreId,
                            quantiteDisponible = qte,
                            seuilAlerte        = seuil ?: 0,
                            motif              = motif
                        )
                    )
                    if (r.status != "success") throw Exception(r.message ?: "Refusé")
                }
                Toast.makeText(requireContext(), "Stock mis à jour ✓", Toast.LENGTH_SHORT).show()
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
                val refsResp = ApiClient.apiService.getAdminReferences()
                val centres  = refsResp.data?.centres.orEmpty()

                val allStocks = coroutineScope {
                    centres.map { centre ->
                        async {
                            try {
                                ApiClient.apiService.getStock(centre.id).data.orEmpty()
                                    .map { it.copy(centreNom = centre.nom ?: "Centre #${centre.id}") }
                            } catch (_: Exception) { emptyList() }
                        }
                    }.awaitAll().flatten()
                }

                val alertStocks = allStocks.filter { s ->
                    val q = s.quantiteDisponible ?: 99
                    val seuil = s.seuilAlerte ?: 0
                    seuil > 0 && q <= seuil
                }
                val okStocks = allStocks.filter { s ->
                    val q = s.quantiteDisponible ?: 99
                    val seuil = s.seuilAlerte ?: 0
                    seuil == 0 || q > seuil
                }

                alertAdapter.submit(alertStocks)
                okAdapter.submit(okStocks)

                val today = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(java.util.Date())
                val perimesStocks = allStocks.filter { s ->
                    s.dateExpiration != null && s.dateExpiration < today && (s.quantiteDisponible ?: 0) > 0
                }

                tvTotal.text   = allStocks.sumOf { it.quantiteDisponible ?: 0 }.toString()
                tvFaibles.text = alertStocks.size.toString()
                tvPerimes.text = perimesStocks.size.toString()

                messageView.visibility = if (alertStocks.isEmpty() && okStocks.isEmpty())
                    View.VISIBLE else View.GONE
                if (alertStocks.isEmpty() && okStocks.isEmpty())
                    messageView.text = "Aucun stock disponible pour vos centres."

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

    fun submit(next: List<StockDto>) {
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
        VH(LayoutInflater.from(parent.context).inflate(R.layout.item_admin_stock, parent, false), onAdjust)
    override fun onBindViewHolder(h: VH, pos: Int) = h.bind(items[pos])

    class VH(v: View, private val onAdjust: (StockDto) -> Unit) : RecyclerView.ViewHolder(v) {
        private val iconBg   = v.findViewById<FrameLayout>(R.id.fvStockIconBg)
        private val iconImg  = v.findViewById<ImageView>(R.id.ivStockIcon)
        private val tvNom    = v.findViewById<TextView>(R.id.tvStockVaccinNom)
        private val tvCentre = v.findViewById<TextView>(R.id.tvStockCentre)
        private val pb       = v.findViewById<LinearProgressIndicator>(R.id.pbStockLevel)
        private val tvQte    = v.findViewById<TextView>(R.id.tvStockQteInfo)
        private val tvBadge  = v.findViewById<TextView>(R.id.tvStockBadge)

        fun bind(s: StockDto) {
            val ctx   = itemView.context
            val qte   = s.quantiteDisponible ?: 0
            val seuil = s.seuilAlerte ?: 0
            val nom   = s.vaccinNom ?: s.nom ?: "Vaccin #${s.id}"

            val isCritique = seuil > 0 && qte <= seuil / 2
            val isFaible   = seuil > 0 && qte <= seuil && !isCritique

            tvNom.text    = nom
            tvCentre.text = s.centreNom ?: "Centre non défini"
            tvQte.text    = "$qte doses · seuil : $seuil"

            val pct = if (seuil > 0) ((qte.toFloat() / (seuil * 2)) * 100).toInt().coerceIn(0, 100) else 80

            when {
                isCritique -> {
                    iconBg.setBackgroundResource(R.drawable.bg_stock_icon_alert)
                    iconImg.setColorFilter(Color.parseColor("#EF4444"))
                    pb.setIndicatorColor(Color.parseColor("#EF4444"))
                    pb.trackColor = Color.parseColor("#FEE2E2")
                    pb.setProgress(pct, false)
                    tvBadge.text = "Critique"
                    tvBadge.setBackgroundResource(R.drawable.bg_badge_error)
                    tvBadge.setTextColor(Color.parseColor("#991B1B"))
                }
                isFaible -> {
                    iconBg.setBackgroundResource(R.drawable.bg_stock_icon_warning)
                    iconImg.setColorFilter(Color.parseColor("#D97706"))
                    pb.setIndicatorColor(Color.parseColor("#F59E0B"))
                    pb.trackColor = Color.parseColor("#FEF3C7")
                    pb.setProgress(pct, false)
                    tvBadge.text = "Faible"
                    tvBadge.setBackgroundResource(R.drawable.bg_badge_warning)
                    tvBadge.setTextColor(Color.parseColor("#92400E"))
                }
                else -> {
                    iconBg.setBackgroundResource(R.drawable.bg_stock_icon_ok)
                    iconImg.setColorFilter(Color.parseColor("#22C55E"))
                    pb.setIndicatorColor(Color.parseColor("#10B981"))
                    pb.trackColor = Color.parseColor("#D1FAE5")
                    pb.setProgress(pct, false)
                    tvBadge.text = "Disponible"
                    tvBadge.setBackgroundResource(R.drawable.bg_badge_success)
                    tvBadge.setTextColor(Color.parseColor("#065F46"))
                }
            }

            itemView.setOnClickListener { onAdjust(s) }
        }
    }
}
