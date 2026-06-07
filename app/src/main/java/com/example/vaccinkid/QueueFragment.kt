package com.example.vaccinkid

import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.core.view.setPadding
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.vaccinkid.model.QueueEntryDto
import com.example.vaccinkid.network.ApiClient
import com.example.vaccinkid.network.TokenManager
import kotlinx.coroutines.launch

class QueueFragment : Fragment() {
    private lateinit var progress: ProgressBar
    private lateinit var message: TextView
    private lateinit var adapter: QueueAdapter
    private var actionInFlight = false

    override fun onCreateView(
        inflater: android.view.LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        val root = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(0xFFFFF5E6.toInt())
        }
        root.addView(TextView(requireContext()).apply {
            text = "File d'attente du centre"
            textSize = 22f
            setTypeface(typeface, android.graphics.Typeface.BOLD)
            setTextColor(0xFF7A2040.toInt())
            setPadding(dp(16), dp(16), dp(16), dp(8))
        })

        val row = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(dp(16), 0, dp(16), dp(8))
        }
        row.addView(button("Rafraichir") { loadQueue() }, weightWrap())
        row.addView(button("Appeler prochain") { callNext() }, weightWrap())
        root.addView(row)

        progress = ProgressBar(requireContext()).apply { visibility = View.GONE }
        message = TextView(requireContext()).apply {
            setTextColor(0xFFC8550A.toInt())
            setPadding(dp(16), dp(4), dp(16), dp(8))
        }
        root.addView(progress, matchWrap())
        root.addView(message, matchWrap())

        val recycler = RecyclerView(requireContext()).apply {
            layoutManager = LinearLayoutManager(requireContext())
        }
        adapter = QueueAdapter { complete(it) }
        recycler.adapter = adapter
        root.addView(recycler, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            0,
            1f
        ))
        return root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        loadQueue()
    }

    private fun loadQueue() {
        val centreId = TokenManager.getCentreId()
        if (centreId == null) {
            message.text = "Aucun centre affecte a ce compte."
            adapter.submit(emptyList())
            return
        }
        viewLifecycleOwner.lifecycleScope.launch {
            setLoading(true, "Chargement file...")
            try {
                val response = ApiClient.apiService.getCentreQueue(centreId)
                if (response.status != "success") throw Exception(response.message ?: "File indisponible")
                val entries = response.data?.entries ?: emptyList()
                adapter.submit(entries)
                setLoading(false, "${entries.size} personne(s) dans la file")
            } catch (e: Exception) {
                adapter.submit(emptyList())
                setLoading(false, e.message ?: "Erreur reseau")
            }
        }
    }

    private fun callNext() {
        val centreId = TokenManager.getCentreId() ?: return
        if (actionInFlight) return
        actionInFlight = true
        viewLifecycleOwner.lifecycleScope.launch {
            setLoading(true, "Appel du prochain patient...")
            try {
                val response = ApiClient.apiService.callNext(mapOf("centre_id" to centreId))
                if (response.status != "success" || response.data == null) {
                    throw Exception(response.message ?: "Personne en attente")
                }
                Toast.makeText(requireContext(), "Patient appele par le serveur", Toast.LENGTH_SHORT).show()
                loadQueue()
            } catch (e: Exception) {
                setLoading(false, e.message ?: "Erreur reseau")
            } finally {
                actionInFlight = false
            }
        }
    }

    private fun complete(entry: QueueEntryDto) {
        if (actionInFlight) return
        actionInFlight = true
        viewLifecycleOwner.lifecycleScope.launch {
            setLoading(true, "Fin de service...")
            try {
                val response = ApiClient.apiService.completeService(entry.id)
                if (response.status != "success") throw Exception(response.message ?: "Action impossible")
                Toast.makeText(requireContext(), "Service termine", Toast.LENGTH_SHORT).show()
                loadQueue()
            } catch (e: Exception) {
                setLoading(false, e.message ?: "Erreur reseau")
            } finally {
                actionInFlight = false
            }
        }
    }

    private fun setLoading(isLoading: Boolean, text: String) {
        progress.visibility = if (isLoading) View.VISIBLE else View.GONE
        message.text = text
    }

    private fun button(text: String, onClick: () -> Unit): Button =
        Button(requireContext()).apply {
            this.text = text
            setOnClickListener { onClick() }
        }

    private fun weightWrap() = LinearLayout.LayoutParams(
        0,
        ViewGroup.LayoutParams.WRAP_CONTENT,
        1f
    ).apply { marginEnd = dp(6) }

    private fun matchWrap() = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.WRAP_CONTENT
    )

    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()
}

private class QueueAdapter(
    private val onComplete: (QueueEntryDto) -> Unit
) : RecyclerView.Adapter<QueueAdapter.ViewHolder>() {
    private var items: List<QueueEntryDto> = emptyList()

    fun submit(next: List<QueueEntryDto>) {
        items = next
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        return ViewHolder(LinearLayout(parent.context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(24)
            setBackgroundColor(0xFFFFFFFF.toInt())
        })
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(items[position], onComplete)
    }

    override fun getItemCount() = items.size

    class ViewHolder(private val root: LinearLayout) : RecyclerView.ViewHolder(root) {
        fun bind(entry: QueueEntryDto, onComplete: (QueueEntryDto) -> Unit) {
            root.removeAllViews()
            val ctx = root.context
            val name = listOfNotNull(entry.bebePrenom, entry.bebeNom).joinToString(" ")
                .ifBlank { "Bebe #${entry.bebeId ?: "-"}" }
            root.addView(TextView(ctx).apply {
                text = "#${entry.numeroAttente ?: entry.position ?: "-"} - $name"
                textSize = 17f
                setTypeface(typeface, android.graphics.Typeface.BOLD)
            })
            root.addView(TextView(ctx).apply {
                text = "Statut : ${entry.statut ?: "INCONNU"} | Tel : ${entry.parentTelephone ?: "-"}"
                textSize = 13f
            })
            root.addView(Button(ctx).apply {
                text = "Terminer service"
                isEnabled = entry.statut == "EN_COURS"
                setOnClickListener { onComplete(entry) }
            })
        }
    }
}
