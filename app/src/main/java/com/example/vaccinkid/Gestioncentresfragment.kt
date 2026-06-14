package com.example.vaccinkid

import android.app.AlertDialog
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.core.view.setPadding
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.vaccinkid.model.AdminCentreDto
import com.example.vaccinkid.model.AdminCentreRequest
import com.example.vaccinkid.network.ApiClient
import kotlinx.coroutines.launch

class GestionCentresFragment : Fragment() {
    private lateinit var messageView: TextView
    private lateinit var totalView: TextView
    private lateinit var adapter: CentreAdapter

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        adapter = CentreAdapter(onEdit = { showForm(it) }, onToggle = { toggleCentre(it) })
        return LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(20)
            addView(TextView(requireContext()).apply {
                text = "Gestion centres"
                textSize = 22f
                setTypeface(typeface, android.graphics.Typeface.BOLD)
            })
            totalView = TextView(requireContext())
            addView(totalView)
            messageView = TextView(requireContext()).apply { setPadding(0, 8, 0, 8) }
            addView(messageView)
            addView(Button(requireContext()).apply {
                text = "Ajouter centre"
                setOnClickListener { showForm(null) }
            })
            addView(Button(requireContext()).apply {
                text = "Rafraichir"
                setOnClickListener { loadCentres() }
            })
            addView(RecyclerView(requireContext()).apply {
                layoutManager = LinearLayoutManager(requireContext())
                adapter = this@GestionCentresFragment.adapter
            }, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))
        }
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        StaffUi.decorateScreen(view)
        loadCentres()
    }

    private fun loadCentres() {
        messageView.text = "Chargement..."
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.getAdminCentres()
                val data = response.data
                if (response.status != "success" || data == null) throw Exception(response.message ?: "Centres indisponibles")
                adapter.submit(data.centres)
                totalView.text = "Centres: ${data.centres.count { it.estActif == true }} actif(s) / ${data.total}"
                messageView.text = ""
            } catch (e: Exception) {
                adapter.submit(emptyList())
                messageView.text = e.message ?: "Erreur reseau"
            }
        }
    }

    private fun showForm(item: AdminCentreDto?) {
        val root = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(24)
        }
        val nom = edit("Nom").also { it.setText(item?.nom ?: "") }
        val adresse = edit("Adresse").also { it.setText(item?.adresse ?: "") }
        val telephone = edit("Telephone").also { it.setText(item?.telephone ?: "") }
        val gpsLat = edit("GPS lat").also { it.setText(item?.gpsLat?.toString() ?: "") }
        val gpsLng = edit("GPS lng").also { it.setText(item?.gpsLng?.toString() ?: "") }
        listOf(nom, adresse, telephone, gpsLat, gpsLng).forEach { root.addView(it) }

        AlertDialog.Builder(requireContext())
            .setTitle(if (item == null) "Ajouter centre" else "Modifier centre")
            .setView(root)
            .setNegativeButton("Annuler", null)
            .setPositiveButton("Valider") { _, _ ->
                saveCentre(
                    item?.id,
                    AdminCentreRequest(
                        nom = nom.text.toString().trim(),
                        adresse = adresse.text.toString().trim(),
                        telephone = telephone.text.toString().trim(),
                        gpsLat = gpsLat.text.toString().trim().toDoubleOrNull(),
                        gpsLng = gpsLng.text.toString().trim().toDoubleOrNull()
                    )
                )
            }
            .show()
    }

    private fun saveCentre(id: Int?, request: AdminCentreRequest) {
        if (request.nom.isNullOrBlank() || request.adresse.isNullOrBlank() || request.telephone.isNullOrBlank()) {
            messageView.text = "Nom, adresse et telephone sont obligatoires."
            return
        }
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = if (id == null) {
                    ApiClient.apiService.createAdminCentre(request)
                } else {
                    ApiClient.apiService.updateAdminCentre(id, request)
                }
                if (response.status != "success") throw Exception(response.message ?: "Enregistrement refuse")
                Toast.makeText(requireContext(), "Confirme par le serveur", Toast.LENGTH_SHORT).show()
                loadCentres()
            } catch (e: Exception) {
                messageView.text = e.message ?: "Erreur reseau"
            }
        }
    }

    private fun toggleCentre(item: AdminCentreDto) {
        AlertDialog.Builder(requireContext())
            .setTitle(if (item.estActif == true) "Desactiver le centre" else "Reactiver le centre")
            .setMessage("${item.nom ?: "Centre"} - sessions: ${item.nbSessions ?: 0}")
            .setNegativeButton("Annuler", null)
            .setPositiveButton("Confirmer") { _, _ ->
                viewLifecycleOwner.lifecycleScope.launch {
                    try {
                        val response = if (item.estActif == true) {
                            ApiClient.apiService.deactivateAdminCentre(item.id)
                        } else {
                            ApiClient.apiService.reactivateAdminCentre(item.id)
                        }
                        if (response.status != "success") throw Exception(response.message ?: "Action refusee")
                        loadCentres()
                    } catch (e: Exception) {
                        messageView.text = e.message ?: "Erreur reseau"
                    }
                }
            }
            .show()
    }

    private fun edit(hintText: String): EditText = EditText(requireContext()).apply { hint = hintText }
}

private class CentreAdapter(
    private val onEdit: (AdminCentreDto) -> Unit,
    private val onToggle: (AdminCentreDto) -> Unit
) : RecyclerView.Adapter<CentreAdapter.ViewHolder>() {
    private var items: List<AdminCentreDto> = emptyList()
    fun submit(next: List<AdminCentreDto>) {
        items = next
        notifyDataSetChanged()
    }
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        return ViewHolder(LinearLayout(parent.context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(16)
        }, onEdit, onToggle)
    }
    override fun getItemCount() = items.size
    override fun onBindViewHolder(holder: ViewHolder, position: Int) = holder.bind(items[position])

    class ViewHolder(
        private val root: LinearLayout,
        private val onEdit: (AdminCentreDto) -> Unit,
        private val onToggle: (AdminCentreDto) -> Unit
    ) : RecyclerView.ViewHolder(root) {
        fun bind(item: AdminCentreDto) {
            root.removeAllViews()
            StaffUi.styleCard(root, if (item.estActif == true) StaffUi.PRIMARY else StaffUi.BORDER)
            root.addView(TextView(root.context).apply {
                text = "${item.nom ?: "Centre #${item.id}"} - ${if (item.estActif == true) "Actif" else "Inactif"}"
                textSize = 16f
                setTypeface(typeface, android.graphics.Typeface.BOLD)
            })
            root.addView(TextView(root.context).apply {
                text = "${item.adresse ?: "-"} | Tel ${item.telephone ?: "-"}"
            })
            root.addView(TextView(root.context).apply {
                text = "Personnel ${item.nbPersonnel ?: 0} | Sessions ${item.nbSessions ?: 0} | Alertes ${item.alertesStock ?: 0}"
            })
            val row = LinearLayout(root.context).apply { orientation = LinearLayout.HORIZONTAL }
            row.addView(Button(root.context).apply {
                text = "Modifier"
                setOnClickListener { onEdit(item) }
            }, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
            row.addView(Button(root.context).apply {
                text = if (item.estActif == true) "Desactiver" else "Reactiver"
                setOnClickListener { onToggle(item) }
            }, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
            root.addView(row)
            StaffUi.decorateTree(root)
        }
    }
}
