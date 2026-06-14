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
import com.example.vaccinkid.model.VaccinDto
import com.example.vaccinkid.model.VaccinRequest
import com.example.vaccinkid.network.ApiClient
import kotlinx.coroutines.launch

class GestionVaccinsFragment : Fragment() {
    private lateinit var messageView: TextView
    private lateinit var adapter: VaccinAdapter

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        adapter = VaccinAdapter(onEdit = { showForm(it) }, onDeactivate = { deactivate(it) })
        return LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(20)
            addView(TextView(requireContext()).apply {
                text = "Gestion vaccins"
                textSize = 22f
                setTypeface(typeface, android.graphics.Typeface.BOLD)
            })
            messageView = TextView(requireContext()).apply { setPadding(0, 8, 0, 8) }
            addView(messageView)
            addView(Button(requireContext()).apply {
                text = "Ajouter vaccin"
                setOnClickListener { showForm(null) }
            })
            addView(Button(requireContext()).apply {
                text = "Rafraichir"
                setOnClickListener { loadVaccins() }
            })
            addView(RecyclerView(requireContext()).apply {
                layoutManager = LinearLayoutManager(requireContext())
                adapter = this@GestionVaccinsFragment.adapter
            }, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))
        }
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        StaffUi.decorateScreen(view)
        loadVaccins()
    }

    private fun loadVaccins() {
        messageView.text = "Chargement..."
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.getVaccins(all = true)
                val data = response.data
                if (response.status != "success" || data == null) throw Exception(response.message ?: "Vaccins indisponibles")
                adapter.submit(data)
                messageView.text = "${data.size} vaccin(s)"
            } catch (e: Exception) {
                adapter.submit(emptyList())
                messageView.text = e.message ?: "Erreur reseau"
            }
        }
    }

    private fun showForm(item: VaccinDto?) {
        val root = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(24)
        }
        val nom = edit("Nom").also { it.setText(item?.nom ?: "") }
        val doses = edit("Doses par flacon").also { it.setText(item?.dosesParFlacon?.toString() ?: "") }
        val age = edit("Age cible semaines").also { it.setText(item?.ageCibleSemaines?.toString() ?: "") }
        val maladies = edit("Maladies ciblees").also { it.setText(item?.maladiesCiblees ?: "") }
        listOf(nom, doses, age, maladies).forEach { root.addView(it) }

        AlertDialog.Builder(requireContext())
            .setTitle(if (item == null) "Ajouter vaccin" else "Modifier vaccin")
            .setView(root)
            .setNegativeButton("Annuler", null)
            .setPositiveButton("Valider") { _, _ ->
                val request = VaccinRequest(
                    nom = nom.text.toString().trim(),
                    dosesParFlacon = doses.text.toString().trim().toIntOrNull(),
                    ageCibleSemaines = age.text.toString().trim().toIntOrNull(),
                    maladiesCiblees = maladies.text.toString().trim()
                )
                saveVaccin(item?.id, request)
            }
            .show()
    }

    private fun saveVaccin(id: Int?, request: VaccinRequest) {
        if (request.nom.isNullOrBlank() || request.dosesParFlacon == null || request.ageCibleSemaines == null || request.maladiesCiblees.isNullOrBlank()) {
            messageView.text = "Nom, doses, age et maladies sont obligatoires."
            return
        }
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = if (id == null) ApiClient.apiService.createVaccin(request)
                else ApiClient.apiService.updateVaccin(id, request)
                if (response.status != "success") throw Exception(response.message ?: "Enregistrement refuse")
                Toast.makeText(requireContext(), "Confirme par le serveur", Toast.LENGTH_SHORT).show()
                loadVaccins()
            } catch (e: Exception) {
                messageView.text = e.message ?: "Erreur reseau"
            }
        }
    }

    private fun deactivate(item: VaccinDto) {
        AlertDialog.Builder(requireContext())
            .setTitle("Desactiver vaccin")
            .setMessage(item.nom ?: "Vaccin #${item.id}")
            .setNegativeButton("Annuler", null)
            .setPositiveButton("Confirmer") { _, _ ->
                viewLifecycleOwner.lifecycleScope.launch {
                    try {
                        val response = ApiClient.apiService.deactivateVaccin(item.id)
                        if (response.status != "success") throw Exception(response.message ?: "Desactivation refusee")
                        loadVaccins()
                    } catch (e: Exception) {
                        messageView.text = e.message ?: "Erreur reseau"
                    }
                }
            }
            .show()
    }

    private fun edit(hintText: String): EditText = EditText(requireContext()).apply { hint = hintText }
}

private class VaccinAdapter(
    private val onEdit: (VaccinDto) -> Unit,
    private val onDeactivate: (VaccinDto) -> Unit
) : RecyclerView.Adapter<VaccinAdapter.ViewHolder>() {
    private var items: List<VaccinDto> = emptyList()
    fun submit(next: List<VaccinDto>) {
        items = next
        notifyDataSetChanged()
    }
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        return ViewHolder(LinearLayout(parent.context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(16)
        }, onEdit, onDeactivate)
    }
    override fun getItemCount() = items.size
    override fun onBindViewHolder(holder: ViewHolder, position: Int) = holder.bind(items[position])

    class ViewHolder(
        private val root: LinearLayout,
        private val onEdit: (VaccinDto) -> Unit,
        private val onDeactivate: (VaccinDto) -> Unit
    ) : RecyclerView.ViewHolder(root) {
        fun bind(item: VaccinDto) {
            root.removeAllViews()
            StaffUi.styleCard(root, if (item.estActif == false) StaffUi.BORDER else StaffUi.PRIMARY)
            root.addView(TextView(root.context).apply {
                text = "${item.nom ?: "Vaccin #${item.id}"} - ${if (item.estActif == false) "Inactif" else "Actif"}"
                textSize = 16f
                setTypeface(typeface, android.graphics.Typeface.BOLD)
            })
            root.addView(TextView(root.context).apply {
                text = "Doses/flacon ${item.dosesParFlacon ?: "-"} | Age ${item.ageCibleSemaines ?: "-"} sem."
            })
            root.addView(TextView(root.context).apply { text = item.maladiesCiblees ?: "-" })
            val row = LinearLayout(root.context).apply { orientation = LinearLayout.HORIZONTAL }
            row.addView(Button(root.context).apply {
                text = "Modifier"
                setOnClickListener { onEdit(item) }
            }, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
            if (item.estActif != false) {
                row.addView(Button(root.context).apply {
                    text = "Desactiver"
                    setOnClickListener { onDeactivate(item) }
                }, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
            }
            root.addView(row)
            StaffUi.decorateTree(root)
        }
    }
}
