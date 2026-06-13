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
import com.example.vaccinkid.model.SessionDto
import com.example.vaccinkid.model.SessionRequest
import com.example.vaccinkid.network.ApiClient
import kotlinx.coroutines.launch

class GestionSessionsFragment : Fragment() {
    private lateinit var messageView: TextView
    private lateinit var adapter: AdminSessionAdapter

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        adapter = AdminSessionAdapter(
            onEdit = { showForm(it) },
            onConfirm = { updateStatus(it, "confirm") },
            onStart = { updateStatus(it, "start") },
            onEnd = { updateStatus(it, "end") },
            onCancel = { updateStatus(it, "cancel") }
        )
        return LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(20)
            addView(TextView(requireContext()).apply {
                text = "Sessions planifiees"
                textSize = 22f
                setTypeface(typeface, android.graphics.Typeface.BOLD)
            })
            messageView = TextView(requireContext()).apply { setPadding(0, 8, 0, 8) }
            addView(messageView)
            addView(Button(requireContext()).apply {
                text = "Creer session"
                setOnClickListener { showForm(null) }
            })
            addView(Button(requireContext()).apply {
                text = "Rafraichir"
                setOnClickListener { loadSessions() }
            })
            addView(RecyclerView(requireContext()).apply {
                layoutManager = LinearLayoutManager(requireContext())
                adapter = this@GestionSessionsFragment.adapter
            }, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))
        }
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        loadSessions()
    }

    private fun loadSessions() {
        messageView.text = "Chargement..."
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.getSessions()
                val data = response.data
                if (response.status != "success" || data == null) throw Exception(response.message ?: "Sessions indisponibles")
                adapter.submit(data)
                messageView.text = "${data.size} session(s)"
            } catch (e: Exception) {
                adapter.submit(emptyList())
                messageView.text = e.message ?: "Erreur reseau"
            }
        }
    }

    private fun showForm(item: SessionDto?) {
        val root = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(24)
        }
        val centre = edit("Centre ID").also { it.setText(item?.centreId?.toString() ?: "") }
        val vaccin = edit("Vaccin ID").also { it.setText(item?.vaccinId?.toString() ?: "") }
        val date = edit("Date YYYY-MM-DD").also { it.setText(item?.dateSession?.take(10) ?: "") }
        val debut = edit("Heure debut HH:MM").also { it.setText(item?.heureDebut?.take(5) ?: "") }
        val fin = edit("Heure fin HH:MM").also { it.setText(item?.heureFin?.take(5) ?: "") }
        val capacite = edit("Capacite").also { it.setText(item?.maxInscriptions?.toString() ?: "") }
        listOf(centre, vaccin, date, debut, fin, capacite).forEach { root.addView(it) }

        AlertDialog.Builder(requireContext())
            .setTitle(if (item == null) "Creer session" else "Modifier session")
            .setView(root)
            .setNegativeButton("Annuler", null)
            .setPositiveButton("Valider") { _, _ ->
                val request = SessionRequest(
                    centreId = centre.text.toString().trim().toIntOrNull(),
                    vaccinId = vaccin.text.toString().trim().toIntOrNull(),
                    dateSession = date.text.toString().trim(),
                    heureDebut = debut.text.toString().trim(),
                    heureFin = fin.text.toString().trim(),
                    maxInscriptions = capacite.text.toString().trim().toIntOrNull()
                )
                saveSession(item?.id, request)
            }
            .show()
    }

    private fun saveSession(id: Int?, request: SessionRequest) {
        if (request.centreId == null || request.vaccinId == null || request.dateSession.isNullOrBlank() ||
            request.heureDebut.isNullOrBlank() || request.heureFin.isNullOrBlank() || request.maxInscriptions == null
        ) {
            messageView.text = "Centre, vaccin, date, heures et capacite sont obligatoires."
            return
        }
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = if (id == null) ApiClient.apiService.createSession(request)
                else ApiClient.apiService.updateSession(id, request)
                if (response.status != "success") throw Exception(response.message ?: "Enregistrement refuse")
                Toast.makeText(requireContext(), "Session confirmee par le serveur", Toast.LENGTH_SHORT).show()
                loadSessions()
            } catch (e: Exception) {
                messageView.text = e.message ?: "Erreur reseau"
            }
        }
    }

    private fun updateStatus(item: SessionDto, action: String) {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = when (action) {
                    "confirm" -> ApiClient.apiService.confirmSession(item.id)
                    "start" -> ApiClient.apiService.startSession(item.id)
                    "end" -> ApiClient.apiService.endSession(item.id)
                    else -> ApiClient.apiService.cancelSession(item.id)
                }
                if (response.status != "success") throw Exception(response.message ?: "Action refusee")
                loadSessions()
            } catch (e: Exception) {
                messageView.text = e.message ?: "Erreur reseau"
            }
        }
    }

    private fun edit(hintText: String): EditText = EditText(requireContext()).apply { hint = hintText }
}

private class AdminSessionAdapter(
    private val onEdit: (SessionDto) -> Unit,
    private val onConfirm: (SessionDto) -> Unit,
    private val onStart: (SessionDto) -> Unit,
    private val onEnd: (SessionDto) -> Unit,
    private val onCancel: (SessionDto) -> Unit
) : RecyclerView.Adapter<AdminSessionAdapter.ViewHolder>() {
    private var items: List<SessionDto> = emptyList()
    fun submit(next: List<SessionDto>) {
        items = next
        notifyDataSetChanged()
    }
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        return ViewHolder(LinearLayout(parent.context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(16)
        }, onEdit, onConfirm, onStart, onEnd, onCancel)
    }
    override fun getItemCount() = items.size
    override fun onBindViewHolder(holder: ViewHolder, position: Int) = holder.bind(items[position])

    class ViewHolder(
        private val root: LinearLayout,
        private val onEdit: (SessionDto) -> Unit,
        private val onConfirm: (SessionDto) -> Unit,
        private val onStart: (SessionDto) -> Unit,
        private val onEnd: (SessionDto) -> Unit,
        private val onCancel: (SessionDto) -> Unit
    ) : RecyclerView.ViewHolder(root) {
        fun bind(item: SessionDto) {
            root.removeAllViews()
            root.addView(TextView(root.context).apply {
                text = "${item.dateSession?.take(10) ?: "-"} ${item.heureDebut?.take(5) ?: "-"} - ${item.vaccinNom ?: "Vaccin #${item.vaccinId}"}"
                textSize = 16f
                setTypeface(typeface, android.graphics.Typeface.BOLD)
            })
            root.addView(TextView(root.context).apply {
                text = "${item.centreNom ?: "Centre #${item.centreId}"} | ${item.statut ?: "-"} | ${item.inscrits ?: 0}/${item.maxInscriptions ?: "?"}"
            })
            val row = LinearLayout(root.context).apply { orientation = LinearLayout.HORIZONTAL }
            row.addView(Button(root.context).apply {
                text = "Modifier"
                setOnClickListener { onEdit(item) }
            }, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
            row.addView(Button(root.context).apply {
                text = "Confirmer"
                isEnabled = item.statut == "EN_FORMATION" || item.statut == "PLANIFIEE"
                setOnClickListener { onConfirm(item) }
            }, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
            row.addView(Button(root.context).apply {
                text = "Demarrer"
                isEnabled = item.statut == "CONFIRMEE"
                setOnClickListener { onStart(item) }
            }, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
            root.addView(row)
            val finalRow = LinearLayout(root.context).apply { orientation = LinearLayout.HORIZONTAL }
            finalRow.addView(Button(root.context).apply {
                text = "Terminer"
                isEnabled = item.statut == "EN_COURS"
                setOnClickListener { onEnd(item) }
            }, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
            finalRow.addView(Button(root.context).apply {
                text = "Annuler"
                isEnabled = item.statut !in listOf("ANNULEE", "TERMINEE", "EN_COURS")
                setOnClickListener { onCancel(item) }
            }, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
            root.addView(finalRow)
        }
    }
}
