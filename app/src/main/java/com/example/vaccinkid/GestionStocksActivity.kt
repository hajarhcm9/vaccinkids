package com.example.vaccinkid

import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView

class GestionStocksActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_gestion_stocks)

        val recyclerView = findViewById<RecyclerView>(R.id.recyclerViewStocks)
        recyclerView.layoutManager = LinearLayoutManager(this)

        // Données fictives
        val stocks = listOf(
            Stock("BCG", 12, false),
            Stock("Pentavalent", 3, true), // Stock bas
            Stock("Polio Oral", 25, false)
        )

        val adapter = StockAdapter(stocks)
        recyclerView.adapter = adapter

        findViewById<Button>(R.id.btnAjouterEntreeStock).setOnClickListener {
            Toast.makeText(this, "Ouvrir formulaire d'entrée stock", Toast.LENGTH_SHORT).show()
        }
    }
}

// Modèle de données
data class Stock(val nomVaccin: String, val quantite: Int, val estStockBas: Boolean)

// Adapter pour la RecyclerView
class StockAdapter(private val stocks: List<Stock>) : RecyclerView.Adapter<StockAdapter.StockViewHolder>() {

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
}