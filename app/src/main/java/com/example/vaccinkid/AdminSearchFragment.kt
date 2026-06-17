package com.example.vaccinkid

import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.vaccinkid.network.ApiClient
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class AdminSearchFragment : Fragment() {
    private lateinit var adapter: SearchResultAdapter
    private lateinit var statusView: TextView
    private var searchJob: Job? = null

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        adapter = SearchResultAdapter()
        return LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(requireContext().getColor(R.color.bg_screen))

            addView(LinearLayout(requireContext()).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(56, 56, 56, 16)
                addView(TextView(requireContext()).apply {
                    text = "Recherche globale"
                    textSize = 24f
                    setTextColor(requireContext().getColor(R.color.text_primary))
                    setTypeface(null, android.graphics.Typeface.BOLD)
                })
            })

            val searchInput = EditText(requireContext()).apply {
                hint = "Rechercher parents, bébés, sessions, vaccins..."
                textSize = 15f
                setBackgroundResource(R.drawable.bg_card_rounded)
                setPadding(32, 28, 32, 28)
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT
                ).also { it.setMargins(44, 0, 44, 16) }
                addTextChangedListener(object : TextWatcher {
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
            addView(searchInput)

            statusView = TextView(requireContext()).apply {
                setPadding(56, 0, 56, 8)
                setTextColor(requireContext().getColor(R.color.text_secondary))
            }
            addView(statusView)

            addView(RecyclerView(requireContext()).apply {
                layoutManager = LinearLayoutManager(requireContext())
                adapter = this@AdminSearchFragment.adapter
                clipToPadding = false
                setPadding(44, 0, 44, 60)
            }, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))
        }
    }

    private suspend fun performSearch(query: String) {
        statusView.text = "Recherche..."
        try {
            val resp = ApiClient.apiService.searchGlobal(query)
            if (resp.status != "success") throw Exception(resp.message ?: "Erreur")
            val raw = resp.data.orEmpty()
            val results = raw.map { m ->
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
                Pair(label, detail)
            }
            adapter.submit(results)
            statusView.text = if (results.isEmpty()) "Aucun résultat pour \"$query\"" else "${results.size} résultat(s)"
        } catch (e: Exception) {
            statusView.text = e.message ?: "Erreur réseau"
        }
    }
}

private class SearchResultAdapter : RecyclerView.Adapter<SearchResultAdapter.VH>() {
    private var items: List<Pair<String, String>> = emptyList()
    fun submit(next: List<Pair<String, String>>) { items = next; notifyDataSetChanged() }
    override fun getItemCount() = items.size
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
        val card = LinearLayout(parent.context).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundResource(R.drawable.bg_card_rounded)
            layoutParams = RecyclerView.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
            ).also { it.bottomMargin = 12 }
            setPadding(28, 20, 28, 16)
        }
        return VH(card)
    }
    override fun onBindViewHolder(h: VH, pos: Int) = h.bind(items[pos])

    class VH(private val root: LinearLayout) : RecyclerView.ViewHolder(root) {
        fun bind(item: Pair<String, String>) {
            root.removeAllViews()
            root.addView(TextView(root.context).apply {
                text = item.first
                textSize = 14f
                setTypeface(null, android.graphics.Typeface.BOLD)
                setTextColor(root.context.getColor(R.color.text_primary))
            })
            root.addView(TextView(root.context).apply {
                text = item.second
                textSize = 12f
                setTextColor(root.context.getColor(R.color.text_secondary))
                setPadding(0, 4, 0, 0)
            })
        }
    }
}
