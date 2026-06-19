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
import com.google.android.material.textfield.TextInputEditText
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class AdminSearchFragment : Fragment(R.layout.fragment_admin_search) {

    private lateinit var adapter: SearchResultAdapter
    private lateinit var statusView: TextView
    private var searchJob: Job? = null

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        statusView = view.findViewById(R.id.tvSearchStatus)

        adapter = SearchResultAdapter()
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
                val detail = when (type) {
                    "parent" -> "Parent"
                    "bebe" -> "Bébé"
                    "session" -> "Session"
                    "vaccin" -> "Vaccin"
                    else -> type.replaceFirstChar { it.uppercase() }
                }
                Triple(label, detail, type)
            }
            adapter.submit(results)
            statusView.text = if (results.isEmpty()) "Aucun résultat pour \"$query\"" else "${results.size} résultat(s)"
        } catch (e: Exception) {
            statusView.text = e.message ?: "Erreur réseau"
        }
    }
}

private class SearchResultAdapter : RecyclerView.Adapter<SearchResultAdapter.VH>() {
    private var items: List<Triple<String, String, String>> = emptyList()
    fun submit(next: List<Triple<String, String, String>>) { items = next; notifyDataSetChanged() }
    override fun getItemCount() = items.size
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH =
        VH(android.view.LayoutInflater.from(parent.context).inflate(R.layout.item_search_result, parent, false))
    override fun onBindViewHolder(h: VH, pos: Int) = h.bind(items[pos])

    class VH(v: View) : RecyclerView.ViewHolder(v) {
        private val tvType: TextView = v.findViewById(R.id.tvSearchType)
        private val tvLabel: TextView = v.findViewById(R.id.tvSearchLabel)
        private val tvDetail: TextView = v.findViewById(R.id.tvSearchDetail)

        fun bind(item: Triple<String, String, String>) {
            tvLabel.text = item.first
            tvDetail.text = item.second
            tvType.text = item.second.uppercase()
        }
    }
}
