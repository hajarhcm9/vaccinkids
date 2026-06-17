package com.example.vaccinkid

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ProgressBar
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.example.vaccinkid.model.QueueEntryDto
import com.example.vaccinkid.network.ApiClient
import com.example.vaccinkid.network.TokenManager
import com.google.android.material.button.MaterialButton
import com.google.android.material.snackbar.Snackbar
import kotlinx.coroutines.launch

class QueueFragment : Fragment(R.layout.fragment_queue) {
    private lateinit var refreshView: SwipeRefreshLayout
    private lateinit var waitingTab: MaterialButton
    private lateinit var calledTab: MaterialButton
    private lateinit var callNextButton: MaterialButton
    private lateinit var progress: ProgressBar
    private lateinit var message: TextView
    private lateinit var adapter: QueueAdapter

    private var entries: List<QueueEntryDto> = emptyList()
    private var selectedTab = TAB_WAITING
    private var actionInFlight = false
    private var queueError: String? = null

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        refreshView = view.findViewById(R.id.queueRefresh)
        waitingTab = view.findViewById(R.id.queueWaitingTab)
        calledTab = view.findViewById(R.id.queueCalledTab)
        callNextButton = view.findViewById(R.id.queueCallNext)
        progress = view.findViewById(R.id.queueProgress)
        message = view.findViewById(R.id.queueMessage)

        adapter = QueueAdapter(::complete)
        view.findViewById<RecyclerView>(R.id.queueList).apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = this@QueueFragment.adapter
        }

        refreshView.setColorSchemeResources(R.color.staff_primary, R.color.brand_coral, R.color.brand_blue)
        refreshView.setOnRefreshListener(::loadQueue)
        waitingTab.setOnClickListener { selectTab(TAB_WAITING) }
        calledTab.setOnClickListener { selectTab(TAB_CALLED) }
        callNextButton.setOnClickListener { callNext() }
        selectTab(TAB_WAITING)
        loadQueue()
    }

    private fun selectTab(tab: String) {
        selectedTab = tab
        val teal = requireContext().getColor(R.color.brand_teal)
        val white = requireContext().getColor(R.color.white)
        val secondary = requireContext().getColor(R.color.text_secondary)
        listOf(waitingTab to TAB_WAITING, calledTab to TAB_CALLED).forEach { (btn, t) ->
            btn.isClickable = true
            btn.isFocusable = true
            if (t == tab) {
                btn.setBackgroundResource(R.drawable.bg_btn_teal_pill)
                btn.setTextColor(white)
                btn.setTypeface(null, android.graphics.Typeface.BOLD)
            } else {
                btn.setBackgroundResource(R.drawable.bg_chip_inactive)
                btn.setTextColor(secondary)
                btn.setTypeface(null, android.graphics.Typeface.NORMAL)
            }
        }
        renderEntries()
    }

    private fun loadQueue() {
        val centreId = TokenManager.getCentreId()
        if (centreId == null) {
            entries = emptyList()
            queueError = "Aucun centre affecté à ce compte."
            renderEntries()
            return
        }
        viewLifecycleOwner.lifecycleScope.launch {
            setLoading(true, "Chargement de la file...")
            try {
                val response = ApiClient.apiService.getCentreQueue(centreId)
                if (response.status != "success") throw Exception(response.message ?: "File indisponible")
                entries = response.data?.entries.orEmpty()
                queueError = null
            } catch (error: Exception) {
                entries = emptyList()
                queueError = error.message ?: "Erreur réseau"
            } finally {
                setLoading(false)
                renderEntries()
            }
        }
    }

    private fun renderEntries() {
        val waiting = entries.filter { it.statut == "EN_ATTENTE" }.sortedBy { it.position ?: Int.MAX_VALUE }
        val called = entries.filter { it.statut == "EN_COURS" }.sortedBy { it.position ?: Int.MAX_VALUE }
        waitingTab.text = "En attente ${waiting.size}"
        calledTab.text = "Appelés ${called.size}"
        val visible = if (selectedTab == TAB_WAITING) waiting else called
        adapter.submit(visible)
        callNextButton.visibility = if (selectedTab == TAB_WAITING) View.VISIBLE else View.GONE
        val canCallNext = waiting.isNotEmpty() && !actionInFlight
        callNextButton.isEnabled = canCallNext
        callNextButton.alpha = if (canCallNext) 1.0f else 0.45f
        if (!refreshView.isRefreshing) {
            message.text = queueError ?: when {
                visible.isEmpty() && selectedTab == TAB_WAITING -> "File vide – aucun patient en attente"
                visible.isEmpty() -> "Aucun patient appelé"
                else -> ""
            }
        }
    }

    private fun callNext() {
        val centreId = TokenManager.getCentreId() ?: return
        if (actionInFlight) return
        actionInFlight = true
        callNextButton.isEnabled = false
        viewLifecycleOwner.lifecycleScope.launch {
            setLoading(true, "Appel du prochain patient...")
            try {
                val response = ApiClient.apiService.callNext(mapOf("centre_id" to centreId))
                if (response.status != "success" || response.data == null) {
                    throw Exception(response.message ?: "Personne en attente")
                }
                Snackbar.make(requireView(), "Patient appelé et confirmé par le serveur", Snackbar.LENGTH_SHORT).show()
                loadQueue()
            } catch (error: Exception) {
                message.text = error.message ?: "Erreur réseau"
            } finally {
                actionInFlight = false
                setLoading(false)
                renderEntries()
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
                Snackbar.make(requireView(), "Service terminé et confirmé par le serveur", Snackbar.LENGTH_SHORT).show()
                loadQueue()
            } catch (error: Exception) {
                message.text = error.message ?: "Erreur réseau"
            } finally {
                actionInFlight = false
                setLoading(false)
            }
        }
    }

    private fun setLoading(loading: Boolean, text: String? = null) {
        refreshView.isRefreshing = loading
        progress.visibility = if (loading) View.VISIBLE else View.GONE
        text?.let { message.text = it }
    }

    companion object {
        private const val TAB_WAITING = "waiting"
        private const val TAB_CALLED = "called"
    }
}

private class QueueAdapter(
    private val onComplete: (QueueEntryDto) -> Unit
) : RecyclerView.Adapter<QueueAdapter.ViewHolder>() {
    private var items: List<QueueEntryDto> = emptyList()

    fun submit(next: List<QueueEntryDto>) {
        items = next
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder =
        ViewHolder(LayoutInflater.from(parent.context).inflate(R.layout.item_queue_patient, parent, false))

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(items[position], onComplete)
    }

    override fun getItemCount() = items.size

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        private val positionView: TextView = view.findViewById(R.id.queueItemPosition)
        private val nameView: TextView = view.findViewById(R.id.queueItemName)
        private val phoneView: TextView = view.findViewById(R.id.queueItemPhone)
        private val statusView: TextView = view.findViewById(R.id.queueItemStatus)
        private val completeButton: MaterialButton = view.findViewById(R.id.queueItemComplete)

        fun bind(entry: QueueEntryDto, onComplete: (QueueEntryDto) -> Unit) {
            positionView.text = (entry.numeroAttente ?: entry.position ?: "-").toString()
            nameView.text = listOfNotNull(entry.bebePrenom, entry.bebeNom).joinToString(" ")
                .ifBlank { "Bébé #${entry.bebeId ?: "-"}" }
            phoneView.text = entry.parentTelephone ?: "Téléphone indisponible"
            val called = entry.statut == "EN_COURS"
            statusView.text = if (called) "Appelé" else "En attente"
            statusView.setTextColor(itemView.context.getColor(if (called) R.color.info_dark else R.color.warning_dark))
            statusView.background = StaffUi.rounded(
                itemView.context.getColor(if (called) R.color.info_light else R.color.warning_light),
                itemView.context.getColor(if (called) R.color.info_light else R.color.warning_light),
                20
            )
            completeButton.visibility = if (called) View.VISIBLE else View.GONE
            completeButton.setOnClickListener { onComplete(entry) }
        }
    }
}
