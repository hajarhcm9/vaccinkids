package com.example.vaccinkid

import android.app.AlertDialog
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.vaccinkid.model.StockDto
import com.example.vaccinkid.model.UpdateStockRequest
import com.example.vaccinkid.model.UpsertStockRequest
import com.example.vaccinkid.network.ApiClient
import com.example.vaccinkid.viewmodel.StockViewModel
import kotlinx.coroutines.launch

class GestionStocksActivity : AppCompatActivity() {
    private lateinit var viewModel: StockViewModel
    private lateinit var adapter: StockAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_gestion_stocks)
        viewModel = ViewModelProvider(this)[StockViewModel::class.java]

        adapter = StockAdapter(onEdit = { showEditDialog(it) })
        findViewById<RecyclerView>(R.id.recyclerViewStocks).apply {
            layoutManager = LinearLayoutManager(this@GestionStocksActivity)
            adapter = this@GestionStocksActivity.adapter
        }

        findViewById<Button>(R.id.btnAjouterEntreeStock).apply {
            text = "Upsert stock"
            setOnClickListener { showUpsertDialog() }
        }

        viewModel.stock.observe(this) { result ->
            result.fold(
                onSuccess = { adapter.submitList(it) },
                onFailure = {
                    Toast.makeText(this, it.message ?: "Stock indisponible", Toast.LENGTH_LONG).show()
                    adapter.submitList(emptyList())
                }
            )
        }
        viewModel.loadStock()
    }

    private fun showUpsertDialog() {
        val root = formRoot()
        val centre = edit("Centre ID").also { it.setText("1") }
        val vaccin = edit("Vaccin ID")
        val quantite = edit("Quantite")
        val seuil = edit("Seuil alerte")
        val motif = edit("Motif")
        listOf(centre, vaccin, quantite, seuil, motif).forEach { root.addView(it) }
        AlertDialog.Builder(this)
            .setTitle("Upsert stock")
            .setView(root)
            .setNegativeButton("Annuler", null)
            .setPositiveButton("Valider") { _, _ ->
                lifecycleScope.launch {
                    try {
                        val response = ApiClient.apiService.upsertStock(
                            UpsertStockRequest(
                                centre.text.toString().toInt(),
                                vaccin.text.toString().toInt(),
                                quantite.text.toString().toInt(),
                                seuil.text.toString().toIntOrNull(),
                                motif.text.toString().ifBlank { null }
                            )
                        )
                        if (response.status != "success") throw Exception(response.message ?: "Stock refuse")
                        viewModel.loadStock(centre.text.toString().toInt())
                    } catch (e: Exception) {
                        Toast.makeText(this@GestionStocksActivity, e.message ?: "Erreur", Toast.LENGTH_LONG).show()
                    }
                }
            }
            .show()
    }

    private fun showEditDialog(stock: StockDto) {
        val root = formRoot()
        val quantite = edit("Quantite").also { it.setText((stock.quantiteDisponible ?: 0).toString()) }
        val seuil = edit("Seuil alerte").also { it.setText((stock.seuilAlerte ?: 0).toString()) }
        val motif = edit("Motif")
        listOf(quantite, seuil, motif).forEach { root.addView(it) }
        AlertDialog.Builder(this)
            .setTitle(stock.vaccinNom ?: stock.nom ?: "Stock #${stock.id}")
            .setView(root)
            .setNegativeButton("Annuler", null)
            .setPositiveButton("Valider") { _, _ ->
                lifecycleScope.launch {
                    try {
                        val response = ApiClient.apiService.updateStock(
                            stock.id,
                            UpdateStockRequest(
                                quantite.text.toString().toIntOrNull(),
                                seuil.text.toString().toIntOrNull(),
                                motif.text.toString().ifBlank { null }
                            )
                        )
                        if (response.status != "success") throw Exception(response.message ?: "Stock refuse")
                        viewModel.loadStock(stock.centreId)
                    } catch (e: Exception) {
                        Toast.makeText(this@GestionStocksActivity, e.message ?: "Erreur", Toast.LENGTH_LONG).show()
                    }
                }
            }
            .show()
    }

    private fun formRoot(): LinearLayout {
        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(24, 24, 24, 24)
        }
    }

    private fun edit(hintText: String): EditText = EditText(this).apply { hint = hintText }
}

class StockAdapter(
    private val onEdit: (StockDto) -> Unit
) : RecyclerView.Adapter<StockAdapter.StockViewHolder>() {
    private var stocks: List<StockDto> = emptyList()

    class StockViewHolder(view: android.view.View) : RecyclerView.ViewHolder(view) {
        val tvNom: TextView = view.findViewById(R.id.tvNomVaccinStock)
        val tvQte: TextView = view.findViewById(R.id.tvQuantiteStock)
        val tvAlerte: TextView = view.findViewById(R.id.tvAlerteStock)
    }

    override fun onCreateViewHolder(parent: android.view.ViewGroup, viewType: Int): StockViewHolder {
        val view = android.view.LayoutInflater.from(parent.context).inflate(R.layout.item_stock, parent, false)
        return StockViewHolder(view)
    }

    override fun onBindViewHolder(holder: StockViewHolder, position: Int) {
        val stock = stocks[position]
        val quantite = stock.quantiteDisponible ?: 0
        val seuil = stock.seuilAlerte ?: 0
        holder.tvNom.text = stock.vaccinNom ?: stock.nom ?: "Vaccin #${stock.vaccinId ?: stock.id}"
        holder.tvQte.text = "Restant : $quantite flacons | seuil $seuil"
        holder.tvAlerte.visibility = if (seuil > 0 && quantite <= seuil) android.view.View.VISIBLE else android.view.View.GONE
        holder.itemView.setOnClickListener { onEdit(stock) }
    }

    override fun getItemCount() = stocks.size

    fun submitList(items: List<StockDto>) {
        stocks = items
        notifyDataSetChanged()
    }
}
