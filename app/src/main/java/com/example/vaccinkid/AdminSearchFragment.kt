package com.example.vaccinkid

import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.vaccinkid.network.ApiClient
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.textfield.TextInputEditText
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private data class SearchResult(
    val label: String,
    val badge: String,
    val type: String,
    val raw: Map<String, Any?>
)

class AdminSearchFragment : Fragment(R.layout.fragment_admin_search) {

    private lateinit var adapter: SearchResultAdapter
    private lateinit var statusView: TextView
    private var searchJob: Job? = null

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        statusView = view.findViewById(R.id.tvSearchStatus)

        adapter = SearchResultAdapter(::onResultClick)
        view.findViewById<RecyclerView>(R.id.rvSearchResults).apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = this@AdminSearchFragment.adapter
        }

        view.findViewById<TextInputEditText>(R.id.etSearch).addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                val q = s?.toString()?.trim() ?: ""
                searchJob?.cancel()
                if (q.length < 2) { adapter.submit(emptyList()); statusView.text = ""; return }
                searchJob = viewLifecycleOwner.lifecycleScope.launch {
                    delay(400)
                    performSearch(q)
                }
            }
        })
    }

    private suspend fun performSearch(query: String) {
        statusView.text = "Recherche…"
        try {
            val resp = ApiClient.apiService.searchGlobal(query)
            if (resp.status != "success") throw Exception(resp.message ?: "Erreur")
            val results = resp.data.orEmpty().map { m ->
                val type = m["type"]?.toString() ?: ""
                val label = when (type) {
                    "parent" -> "${m["prenom"]} ${m["nom"]} (${m["telephone"] ?: "-"})"
                    "bebe" -> "${m["prenom"]} ${m["nom"]} — né le ${(m["date_naissance"] as? String)?.take(10) ?: "-"}"
                    "session" -> "Session #${m["id"]} – ${(m["date_session"] as? String)?.take(10) ?: "-"}"
                    "vaccin" -> "${m["nom"]} (vaccin)"
                    else -> m["nom"]?.toString() ?: "Résultat #${m["id"]}"
                }
                val badge = when (type) {
                    "parent" -> "Parent"
                    "bebe" -> "Bébé"
                    "session" -> "Session"
                    "vaccin" -> "Vaccin"
                    else -> type.replaceFirstChar { it.uppercase() }
                }
                SearchResult(label, badge, type, m)
            }
            adapter.submit(results)
            statusView.text = if (results.isEmpty()) "Aucun résultat pour \"$query\"" else "${results.size} résultat(s)"
        } catch (e: Exception) {
            statusView.text = e.message ?: "Erreur réseau"
        }
    }

    private fun onResultClick(result: SearchResult) {
        val m = result.raw
        val details = buildString {
            when (result.type) {
                "bebe" -> {
                    appendLine("Prénom : ${m["prenom"] ?: "-"}")
                    appendLine("Nom : ${m["nom"] ?: "-"}")
                    appendLine("Date de naissance : ${(m["date_naissance"] as? String)?.take(10) ?: "-"}")
                    appendLine("Sexe : ${m["sexe"] ?: "-"}")
                    m["numero_centre"]?.let { appendLine("N° au centre : $it") }
                    m["centre_nom"]?.let { appendLine("Centre : $it") }
                }
                "parent" -> {
                    appendLine("Prénom : ${m["prenom"] ?: "-"}")
                    appendLine("Nom : ${m["nom"] ?: "-"}")
                    appendLine("Téléphone : ${m["telephone"] ?: "-"}")
                    m["email"]?.let { appendLine("Email : $it") }
                }
                "session" -> {
                    appendLine("Date : ${(m["date_session"] as? String)?.take(10) ?: "-"}")
                    appendLine("Statut : ${m["statut"] ?: "-"}")
                    m["vaccin_nom"]?.let { appendLine("Vaccin : $it") }
                    m["centre_nom"]?.let { appendLine("Centre : $it") }
                    m["heure_debut"]?.let { appendLine("Heure : $it") }
                }
                "vaccin" -> {
                    appendLine("Nom : ${m["nom"] ?: "-"}")
                    m["description"]?.let { appendLine("Description : $it") }
                }
                else -> appendLine(result.label)
            }
        }.trim()

        MaterialAlertDialogBuilder(requireContext())
            .setTitle("${result.badge} · ${m["prenom"] ?: m["nom"] ?: "#${m["id"]}"}")
            .setMessage(details)
            .setPositiveButton("Fermer", null)
            .show()
    }
}

private class SearchResultAdapter(
    private val onClick: (SearchResult) -> Unit
) : RecyclerView.Adapter<SearchResultAdapter.VH>() {
    private var items: List<SearchResult> = emptyList()
    fun submit(next: List<SearchResult>) { items = next; notifyDataSetChanged() }
    override fun getItemCount() = items.size
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH =
        VH(android.view.LayoutInflater.from(parent.context).inflate(R.layout.item_search_result, parent, false), onClick)
    override fun onBindViewHolder(h: VH, pos: Int) = h.bind(items[pos])

    class VH(v: View, private val onClick: (SearchResult) -> Unit) : RecyclerView.ViewHolder(v) {
        private val tvType: TextView = v.findViewById(R.id.tvSearchType)
        private val tvLabel: TextView = v.findViewById(R.id.tvSearchLabel)
        private val tvDetail: TextView = v.findViewById(R.id.tvSearchDetail)

        fun bind(item: SearchResult) {
            tvLabel.text = item.label
            tvDetail.text = item.badge
            tvType.text = item.badge.uppercase()
            itemView.setOnClickListener { onClick(item) }
        }
    }
}
