package com.example.vaccinkid

import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.vaccinkid.model.StockDto
import com.example.vaccinkid.viewmodel.StockViewModel

class GestionStocksActivity : AppCompatActivity() {
    private lateinit var viewModel: StockViewModel
    private lateinit var adapter: StockAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_gestion_stocks)
        viewModel = ViewModelProvider(this)[StockViewModel::class.java]

        val recyclerView = findViewById<RecyclerView>(R.id.recyclerViewStocks)
        recyclerView.layoutManager = LinearLayoutManager(this)
        adapter = StockAdapter(emptyList())
        recyclerView.adapter = adapter

        findViewById<Button>(R.id.btnAjouterEntreeStock).visibility = View.GONE
        viewModel.stock.observe(this) { result ->
            result.fold(
                onSuccess = { adapter.submitList(it.map { stock -> stock.toStock() }) },
                onFailure = {
                    adapter.submitList(
                        listOf(Stock(it.message ?: "Stock indisponible", 0, false))
                    )
                }
            )
        }
        viewModel.loadStock()
    }
}

data class Stock(val nomVaccin: String, val quantite: Int, val estStockBas: Boolean)

private fun StockDto.toStock(): Stock {
    val quantite = quantiteDisponible ?: 0
    val seuil = seuilAlerte ?: 0
    return Stock(vaccinNom ?: nom ?: "Vaccin #${vaccinId ?: id}", quantite, seuil > 0 && quantite <= seuil)
}

class StockAdapter(private var stocks: List<Stock>) : RecyclerView.Adapter<StockAdapter.StockViewHolder>() {

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
        holder.tvNom.text = stock.nomVaccin
        holder.tvQte.text = "Restant : ${stock.quantite} flacons"

        // Gérer l'alerte visuelle
        if (stock.estStockBas) {
            holder.tvAlerte.visibility = android.view.View.VISIBLE
            holder.tvQte.setTextColor(android.graphics.Color.parseColor("#F44336")) // Rouge
        } else {
            holder.tvAlerte.visibility = android.view.View.GONE
            holder.tvQte.setTextColor(android.graphics.Color.parseColor("#FF8A80")) // Rose
        }
    }

    override fun getItemCount() = stocks.size

    fun submitList(items: List<Stock>) {
        stocks = items
        notifyDataSetChanged()
    }
}
