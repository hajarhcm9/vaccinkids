package com.example.vaccinkid

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.widget.ArrayAdapter
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.vaccinkid.model.AdminRefCentreDto
import com.example.vaccinkid.model.AdminRefVaccinDto
import com.example.vaccinkid.model.StockDto
import com.example.vaccinkid.model.StockMovementDto
import com.example.vaccinkid.model.UpdateStockRequest
import com.example.vaccinkid.model.UpsertStockRequest
import com.example.vaccinkid.network.ApiClient
import com.example.vaccinkid.network.TokenManager
import com.example.vaccinkid.viewmodel.StockViewModel
import com.google.android.material.button.MaterialButton
import com.google.android.material.card.MaterialCardView
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.textfield.TextInputEditText
import kotlinx.coroutines.launch

class GestionStocksActivity : AppCompatActivity() {
    private lateinit var viewModel: StockViewModel
    private lateinit var adapter: StockAdapter
    private lateinit var movementAdapter: StockMovementAdapter
    private lateinit var centreInput: Spinner
    private lateinit var btnLoad: MaterialButton
    private lateinit var btnUpsert: MaterialButton
    private lateinit var cardMovements: MaterialCardView

    private var centres: List<AdminRefCentreDto> = emptyList()
    private var vaccins: List<AdminRefVaccinDto> = emptyList()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        protectSensitiveContent()
        setContentView(R.layout.activity_gestion_stocks)
        viewModel = ViewModelProvider(this)[StockViewModel::class.java]

        // Bind views
        centreInput = findViewById(R.id.inputCentreStock)
        btnLoad = findViewById(R.id.btnChargerStock)
        btnUpsert = findViewById(R.id.btnAjouterEntreeStock)
        cardMovements = findViewById(R.id.cardMovements)

        val isAdmin = TokenManager.getUserRole() == "admin"
        btnUpsert.visibility = if (isAdmin) View.VISIBLE else View.GONE

        // Stock list
        adapter = StockAdapter(onEdit = {
            if (isAdmin) showEditDialog(it) else showStockDetail(it)
        })
        findViewById<RecyclerView>(R.id.recyclerViewStocks).apply {
            layoutManager = LinearLayoutManager(this@GestionStocksActivity)
            adapter = this@GestionStocksActivity.adapter
        }

        // Movement list
        movementAdapter = StockMovementAdapter()
        findViewById<RecyclerView>(R.id.recyclerViewStockMovements).apply {
            layoutManager = LinearLayoutManager(this@GestionStocksActivity)
            adapter = movementAdapter
        }

        btnLoad.setOnClickListener { loadForSelectedCentre() }
        btnUpsert.setOnClickListener { showUpsertDialog() }

        viewModel.stock.observe(this) { result ->
            result.fold(
                onSuccess = { adapter.submitList(it) },
                onFailure = {
                    Toast.makeText(this, it.message ?: "Stock indisponible", Toast.LENGTH_LONG).show()
                    adapter.submitList(emptyList())
                }
            )
        }
        loadReferences()
    }

    private fun selectedCentreId(): Int? = centres.getOrNull(centreInput.selectedItemPosition)?.id

    private fun loadForSelectedCentre() {
        val centreId = selectedCentreId()
        if (centreId == null) {
            Toast.makeText(this, "Sélectionnez un centre", Toast.LENGTH_LONG).show()
            return
        }
        viewModel.loadStock(centreId)
        // movements now accessible to both infirmier and admin (backend fix applied)
        loadMovements(centreId)
    }

    private fun loadMovements(centreId: Int) {
        lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.getStockMovements(centreId = centreId)
                val data = response.data
                if (response.status != "success" || data == null) {
                    throw Exception(response.message ?: "Historique indisponible")
                }
                movementAdapter.submitList(data)
                cardMovements.visibility = if (data.isEmpty()) View.GONE else View.VISIBLE
            } catch (e: Exception) {
                movementAdapter.submitList(emptyList())
                cardMovements.visibility = View.GONE
            }
        }
    }

    private fun showUpsertDialog() {
        if (TokenManager.getUserRole() != "admin") return
        if (centres.isEmpty() || vaccins.isEmpty()) {
            Toast.makeText(this, "Références non chargées", Toast.LENGTH_LONG).show()
            return
        }
        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_upsert_stock, null)

        val centreSpinner = dialogView.findViewById<Spinner>(R.id.dialogCentreSpinner)
        val vaccinSpinner = dialogView.findViewById<Spinner>(R.id.dialogVaccinSpinner)
        val etQuantite = dialogView.findViewById<TextInputEditText>(R.id.dialogEtQuantite)
        val etSeuil = dialogView.findViewById<TextInputEditText>(R.id.dialogEtSeuil)
        val etMotif = dialogView.findViewById<TextInputEditText>(R.id.dialogEtMotif)

        centreSpinner.adapter = ArrayAdapter(this,
            android.R.layout.simple_spinner_dropdown_item,
            centres.map { it.nom ?: "Centre #${it.id}" })
        centreSpinner.setSelection(centreInput.selectedItemPosition.coerceAtLeast(0))

        vaccinSpinner.adapter = ArrayAdapter(this,
            android.R.layout.simple_spinner_dropdown_item,
            vaccins.map { it.nom ?: "Vaccin #${it.id}" })

        MaterialAlertDialogBuilder(this)
            .setTitle("Enregistrer / modifier stock")
            .setView(dialogView)
            .setNegativeButton("Annuler", null)
            .setPositiveButton("Valider") { _, _ ->
                val qteStr = etQuantite.text?.toString()?.trim()
                val qte = qteStr?.toIntOrNull()
                if (qte == null) {
                    Toast.makeText(this, "Quantité invalide", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                lifecycleScope.launch {
                    try {
                        val response = ApiClient.apiService.upsertStock(
                            UpsertStockRequest(
                                centres[centreSpinner.selectedItemPosition].id,
                                vaccins[vaccinSpinner.selectedItemPosition].id,
                                qte,
                                etSeuil.text?.toString()?.toIntOrNull(),
                                etMotif.text?.toString()?.ifBlank { null }
                            )
                        )
                        if (response.status != "success") throw Exception(response.message ?: "Refusé")
                        centreInput.setSelection(centreSpinner.selectedItemPosition)
                        loadForSelectedCentre()
                        Toast.makeText(this@GestionStocksActivity, "Stock enregistré", Toast.LENGTH_SHORT).show()
                    } catch (e: Exception) {
                        Toast.makeText(this@GestionStocksActivity, e.message ?: "Erreur", Toast.LENGTH_LONG).show()
                    }
                }
            }
            .show()
    }

    private fun showStockDetail(stock: StockDto) {
        val qte = stock.quantiteDisponible ?: 0
        val seuil = stock.seuilAlerte ?: 0
        val nom = stock.vaccinNom ?: stock.nom ?: "Vaccin #${stock.id}"
        val statut = when {
            seuil > 0 && qte == 0 -> "Rupture de stock"
            seuil > 0 && qte <= seuil -> "Stock faible — alerte active"
            else -> "Stock suffisant"
        }
        MaterialAlertDialogBuilder(this)
            .setTitle(nom)
            .setMessage("Quantité disponible : $qte flacons\nSeuil d'alerte : $seuil flacons\nÉtat : $statut")
            .setPositiveButton("Fermer", null)
            .show()
    }

    private fun showEditDialog(stock: StockDto) {
        if (TokenManager.getUserRole() != "admin") return
        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_edit_stock, null)

        val etQuantite = dialogView.findViewById<TextInputEditText>(R.id.editEtQuantite)
        val etSeuil = dialogView.findViewById<TextInputEditText>(R.id.editEtSeuil)
        val etMotif = dialogView.findViewById<TextInputEditText>(R.id.editEtMotif)

        etQuantite.setText((stock.quantiteDisponible ?: 0).toString())
        etSeuil.setText((stock.seuilAlerte ?: 0).toString())

        val title = stock.vaccinNom ?: stock.nom ?: "Stock #${stock.id}"
        MaterialAlertDialogBuilder(this)
            .setTitle("Modifier — $title")
            .setView(dialogView)
            .setNegativeButton("Annuler", null)
            .setPositiveButton("Valider") { _, _ ->
                lifecycleScope.launch {
                    try {
                        val response = ApiClient.apiService.updateStock(
                            stock.id,
                            UpdateStockRequest(
                                etQuantite.text?.toString()?.toIntOrNull(),
                                etSeuil.text?.toString()?.toIntOrNull(),
                                etMotif.text?.toString()?.ifBlank { null }
                            )
                        )
                        if (response.status != "success") throw Exception(response.message ?: "Refusé")
                        stock.centreId?.let { cid ->
                            centreInput.setSelection(centres.indexOfFirst { it.id == cid }.coerceAtLeast(0))
                            loadForSelectedCentre()
                        }
                        Toast.makeText(this@GestionStocksActivity, "Stock mis à jour", Toast.LENGTH_SHORT).show()
                    } catch (e: Exception) {
                        Toast.makeText(this@GestionStocksActivity, e.message ?: "Erreur", Toast.LENGTH_LONG).show()
                    }
                }
            }
            .show()
    }

    private fun loadReferences() {
        lifecycleScope.launch {
            try {
                if (TokenManager.getUserRole() != "admin") {
                    val centreId = TokenManager.getCentreId()
                    if (centreId == null) {
                        // Fetch from profile if not cached
                        val me = ApiClient.apiService.getMe()
                        val fetchedId = me.data?.user?.centreId
                        if (fetchedId == null) {
                            Toast.makeText(this@GestionStocksActivity,
                                "Aucun centre affecté à votre compte", Toast.LENGTH_LONG).show()
                            return@launch
                        }
                        TokenManager.saveCentreId(fetchedId)
                        setupInfirmierCentre(fetchedId)
                    } else {
                        setupInfirmierCentre(centreId)
                    }
                    return@launch
                }
                val refsResponse = ApiClient.apiService.getAdminReferences()
                if (refsResponse.status != "success") throw Exception("Références indisponibles")
                centres = refsResponse.data?.centres.orEmpty()
                vaccins = refsResponse.data?.vaccins.orEmpty()
                centreInput.adapter = ArrayAdapter(
                    this@GestionStocksActivity,
                    android.R.layout.simple_spinner_dropdown_item,
                    centres.map { it.nom ?: "Centre #${it.id}" }
                )
                val assignedCentre = TokenManager.getCentreId()
                centreInput.setSelection(centres.indexOfFirst { it.id == assignedCentre }.coerceAtLeast(0))
                loadForSelectedCentre()
            } catch (e: Exception) {
                Toast.makeText(this@GestionStocksActivity, e.message ?: "Références indisponibles", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun setupInfirmierCentre(centreId: Int) {
        // Try to get the real centre name from references
        lifecycleScope.launch {
            var centreName = "Mon centre"
            try {
                val me = ApiClient.apiService.getMe()
                // Best-effort name from cached data
                centreName = "Centre #$centreId"
            } catch (_: Exception) {}

            centres = listOf(AdminRefCentreDto(id = centreId, nom = centreName))
            centreInput.adapter = ArrayAdapter(
                this@GestionStocksActivity,
                android.R.layout.simple_spinner_dropdown_item,
                listOf(centreName)
            )
            loadForSelectedCentre()
        }
    }
}

class StockMovementAdapter : RecyclerView.Adapter<StockMovementAdapter.ViewHolder>() {
    private var items: List<StockMovementDto> = emptyList()

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val tvType: TextView = view.findViewById(R.id.tvMovementType)
        val tvVaccin: TextView = view.findViewById(R.id.tvMovementVaccin)
        val tvQte: TextView = view.findViewById(R.id.tvMovementQte)
        val tvDate: TextView = view.findViewById(R.id.tvMovementDate)
        val tvMotif: TextView = view.findViewById(R.id.tvMovementMotif)
    }

    override fun onCreateViewHolder(parent: android.view.ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_stock_movement, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val item = items[position]
        holder.tvType.text = item.type ?: "MOUVEMENT"
        holder.tvVaccin.text = item.vaccinNom ?: "Vaccin #${item.vaccinId ?: "-"}"
        holder.tvQte.text = "${item.quantiteAvant ?: "?"} → ${item.quantiteApres ?: "?"} flacons"
        holder.tvDate.text = item.createdAt?.take(10) ?: ""
        holder.tvMotif.text = item.motif?.ifBlank { null } ?: ""
        holder.tvMotif.visibility = if (item.motif.isNullOrBlank()) View.GONE else View.VISIBLE
    }

    override fun getItemCount() = items.size

    fun submitList(next: List<StockMovementDto>) {
        items = next
        notifyDataSetChanged()
    }
}

class StockAdapter(
    private val onEdit: (StockDto) -> Unit
) : RecyclerView.Adapter<StockAdapter.StockViewHolder>() {
    private var stocks: List<StockDto> = emptyList()

    class StockViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val tvNom: TextView = view.findViewById(R.id.tvNomVaccinStock)
        val tvQte: TextView = view.findViewById(R.id.tvQuantiteStock)
        val tvAlerte: TextView = view.findViewById(R.id.tvAlerteStock)
        val progress: android.widget.ProgressBar = view.findViewById(R.id.progressStock)
    }

    override fun onCreateViewHolder(parent: android.view.ViewGroup, viewType: Int): StockViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_stock, parent, false)
        return StockViewHolder(view)
    }

    override fun onBindViewHolder(holder: StockViewHolder, position: Int) {
        val stock = stocks[position]
        val quantite = stock.quantiteDisponible ?: 0
        val seuil = stock.seuilAlerte ?: 0
        holder.tvNom.text = stock.vaccinNom ?: stock.nom ?: "Vaccin #${stock.vaccinId ?: stock.id}"
        holder.tvQte.text = "$quantite flacons  ·  seuil $seuil"
        holder.tvAlerte.visibility = if (seuil > 0 && quantite <= seuil) View.VISIBLE else View.GONE
        holder.progress.progress = when {
            seuil <= 0 -> 100
            quantite <= 0 -> 0
            else -> ((quantite.toFloat() / (seuil * 3).coerceAtLeast(1)) * 100).toInt().coerceIn(5, 100)
        }
        holder.itemView.setOnClickListener { onEdit(stock) }
    }

    override fun getItemCount() = stocks.size

    fun submitList(items: List<StockDto>) {
        stocks = items
        notifyDataSetChanged()
    }
}
