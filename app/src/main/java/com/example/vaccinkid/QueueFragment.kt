package com.example.vaccinkid

import android.content.Intent
import android.content.res.ColorStateList
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.example.vaccinkid.model.QueueEntryDto
import com.example.vaccinkid.network.ApiClient
import com.example.vaccinkid.network.TokenManager
import com.example.vaccinkid.viewmodel.QueueManagementViewModel
import com.google.android.material.button.MaterialButton
import com.google.android.material.card.MaterialCardView
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.snackbar.Snackbar
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.abs

class QueueFragment : Fragment(R.layout.fragment_queue) {

    private lateinit var viewModel: QueueManagementViewModel
    private lateinit var refreshView: SwipeRefreshLayout
    private lateinit var waitingTab: MaterialButton
    private lateinit var calledTab: MaterialButton
    private lateinit var callNextButton: MaterialButton
    private lateinit var progress: ProgressBar
    private lateinit var message: TextView
    private lateinit var tvLastRefresh: TextView
    private lateinit var tvNextPatientName: TextView
    private lateinit var llNextHint: LinearLayout
    private lateinit var llQueueEmpty: LinearLayout
    private lateinit var tvEmptyTitle: TextView
    private lateinit var tvEmptySub: TextView
    private lateinit var tvKpiWaiting: TextView
    private lateinit var tvKpiCalled: TextView
    private lateinit var tvKpiDone: TextView
    private lateinit var adapter: QueueAdapter

    private var entries: List<QueueEntryDto> = emptyList()
    private var selectedTab = TAB_WAITING
    private var actionInFlight = false
    private var lastError: String? = null

    private val autoRefreshHandler = Handler(Looper.getMainLooper())
    private val autoRefreshRunnable = object : Runnable {
        override fun run() {
            if (isAdded && !isDetached) {
                loadQueue(silent = true)
                autoRefreshHandler.postDelayed(this, AUTO_REFRESH_MS)
            }
        }
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        viewModel = ViewModelProvider(this)[QueueManagementViewModel::class.java]
        bindViews(view)
        bindActions()
        observeViewModel()
        loadQueue()
    }

    override fun onResume() {
        super.onResume()
        autoRefreshHandler.postDelayed(autoRefreshRunnable, AUTO_REFRESH_MS)
    }

    override fun onPause() {
        super.onPause()
        autoRefreshHandler.removeCallbacks(autoRefreshRunnable)
    }

    private fun bindViews(view: View) {
        refreshView      = view.findViewById(R.id.queueRefresh)
        waitingTab       = view.findViewById(R.id.queueWaitingTab)
        calledTab        = view.findViewById(R.id.queueCalledTab)
        callNextButton   = view.findViewById(R.id.queueCallNext)
        progress         = view.findViewById(R.id.queueProgress)
        message          = view.findViewById(R.id.queueMessage)
        tvLastRefresh    = view.findViewById(R.id.tvQueueLastRefresh)
        tvNextPatientName = view.findViewById(R.id.tvNextPatientName)
        llNextHint       = view.findViewById(R.id.llNextHint)
        llQueueEmpty     = view.findViewById(R.id.llQueueEmpty)
        tvEmptyTitle     = view.findViewById(R.id.tvEmptyQueueTitle)
        tvEmptySub       = view.findViewById(R.id.tvEmptyQueueSub)
        tvKpiWaiting     = view.findViewById(R.id.tvKpiQueueWaiting)
        tvKpiCalled      = view.findViewById(R.id.tvKpiQueueCalled)
        tvKpiDone        = view.findViewById(R.id.tvKpiQueueDone)

        adapter = QueueAdapter(
            onComplete = ::confirmComplete,
            onCall     = { entry ->
                val phone = entry.parentTelephone
                if (!phone.isNullOrBlank()) {
                    startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone")))
                }
            }
        )
        view.findViewById<RecyclerView>(R.id.queueList).apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter       = this@QueueFragment.adapter
        }
    }

    private fun bindActions() {
        refreshView.setColorSchemeResources(R.color.staff_primary, R.color.brand_coral, R.color.brand_blue)
        refreshView.setOnRefreshListener { loadQueue() }
        waitingTab.setOnClickListener { selectTab(TAB_WAITING) }
        calledTab.setOnClickListener  { selectTab(TAB_CALLED) }
        callNextButton.setOnClickListener {
            if (!actionInFlight) callNext()
        }
        selectTab(TAB_WAITING)
    }

    private fun observeViewModel() {
        viewModel.queue.observe(viewLifecycleOwner) { result ->
            result.fold(
                onSuccess = { queueList ->
                    entries    = queueList
                    lastError  = null
                    updateLastRefreshLabel()
                    renderEntries()
                },
                onFailure = { error ->
                    lastError = error.message ?: "Erreur réseau"
                    renderEntries()
                }
            )
            setLoading(false)
        }

        viewModel.queueStats.observe(viewLifecycleOwner) { result ->
            result.onSuccess { stats ->
                tvKpiWaiting.text = stats.enAttente.toString()
                tvKpiCalled.text  = stats.enCours.toString()
                tvKpiDone.text    = stats.termine.toString()
            }
        }

        viewModel.calledNext.observe(viewLifecycleOwner) { result ->
            result.fold(
                onSuccess = { entry ->
                    val name = listOfNotNull(entry.bebePrenom, entry.bebeNom).joinToString(" ")
                        .ifBlank { "Patient #${entry.id}" }
                    Snackbar.make(requireView(), "✓  $name appelé(e)", Snackbar.LENGTH_SHORT).show()
                },
                onFailure = { error ->
                    Snackbar.make(requireView(), error.message ?: "Personne en attente", Snackbar.LENGTH_SHORT).show()
                }
            )
            actionInFlight = false
            adapter.setActionsEnabled(true)
        }

        viewModel.isLoading.observe(viewLifecycleOwner) { loading ->
            if (!loading) {
                progress.visibility = View.GONE
                refreshView.isRefreshing = false
            }
        }
    }

    private fun loadQueue(silent: Boolean = false) {
        if (!silent) {
            setLoading(true)
        }
        viewModel.loadCentreQueue()
    }

    private fun selectTab(tab: String) {
        selectedTab = tab
        val teal      = requireContext().getColor(R.color.brand_teal)
        val white     = requireContext().getColor(R.color.white)
        val secondary = requireContext().getColor(R.color.text_secondary)
        listOf(waitingTab to TAB_WAITING, calledTab to TAB_CALLED).forEach { (btn, t) ->
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

    private fun renderEntries() {
        val waiting = entries.filter { it.statut?.uppercase() == "EN_ATTENTE" }
            .sortedBy { it.position ?: it.numeroAttente ?: Int.MAX_VALUE }
        val called  = entries.filter { it.statut?.uppercase() == "EN_COURS" }
            .sortedBy { it.position ?: it.numeroAttente ?: Int.MAX_VALUE }

        waitingTab.text = "En attente (${waiting.size})"
        calledTab.text  = "Appelés (${called.size})"

        val visible = if (selectedTab == TAB_WAITING) waiting else called
        adapter.submit(visible)

        val isEmpty = visible.isEmpty()
        view?.findViewById<RecyclerView>(R.id.queueList)?.visibility =
            if (isEmpty) View.GONE else View.VISIBLE
        llQueueEmpty.visibility = if (isEmpty) View.VISIBLE else View.GONE

        if (isEmpty) {
            tvEmptyTitle.text = if (selectedTab == TAB_WAITING) "File vide" else "Aucun patient appelé"
            tvEmptySub.text = if (selectedTab == TAB_WAITING)
                "Aucun patient en attente pour le moment."
            else
                "Passez sur l'onglet « En attente » pour appeler le prochain."
        }

        // Show/hide "Call next" CTA — always visible when on WAITING tab
        callNextButton.visibility = if (selectedTab == TAB_WAITING) View.VISIBLE else View.GONE

        val canCallNext = waiting.isNotEmpty() && !actionInFlight
        callNextButton.isEnabled = canCallNext
        callNextButton.alpha     = if (canCallNext) 1.0f else 0.5f

        // "Next patient" hint strip
        val next = waiting.firstOrNull()
        if (next != null && selectedTab == TAB_WAITING) {
            val nextName = listOfNotNull(next.bebePrenom, next.bebeNom).joinToString(" ")
                .ifBlank { "Bébé #${next.bebeId ?: "-"}" }
            tvNextPatientName.text = nextName
            llNextHint.visibility = View.VISIBLE
        } else {
            llNextHint.visibility = View.GONE
        }

        // Error / empty message
        message.text = lastError ?: ""
    }

    private fun callNext() {
        actionInFlight = true
        adapter.setActionsEnabled(false)
        callNextButton.isEnabled = false
        viewModel.callNext()
    }

    private fun confirmComplete(entry: QueueEntryDto) {
        if (actionInFlight) return
        val name = listOfNotNull(entry.bebePrenom, entry.bebeNom).joinToString(" ")
            .ifBlank { "ce patient" }
        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Terminer le service ?")
            .setMessage("Confirmer la fin de prise en charge de $name ?")
            .setPositiveButton("Terminer") { _, _ -> completeEntry(entry) }
            .setNegativeButton("Annuler", null)
            .show()
    }

    private fun completeEntry(entry: QueueEntryDto) {
        if (actionInFlight) return
        actionInFlight = true
        adapter.setActionsEnabled(false)
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.completeService(entry.id)
                if (response.status != "success") throw Exception(response.message ?: "Action impossible")
                val name = listOfNotNull(entry.bebePrenom, entry.bebeNom).joinToString(" ")
                    .ifBlank { "Patient" }
                Snackbar.make(requireView(), "✓  $name — service terminé", Snackbar.LENGTH_SHORT).show()
                loadQueue(silent = true)
            } catch (error: Exception) {
                Snackbar.make(requireView(), error.message ?: "Erreur réseau", Snackbar.LENGTH_SHORT).show()
            } finally {
                actionInFlight = false
                adapter.setActionsEnabled(true)
            }
        }
    }

    private fun setLoading(loading: Boolean) {
        refreshView.isRefreshing = loading
        progress.visibility = if (loading) View.VISIBLE else View.GONE
    }

    private fun updateLastRefreshLabel() {
        val time = SimpleDateFormat("HH:mm:ss", Locale.FRENCH).format(Date())
        tvLastRefresh.text = "Mis à jour $time"
    }

    companion object {
        private const val TAB_WAITING    = "waiting"
        private const val TAB_CALLED     = "called"
        private const val AUTO_REFRESH_MS = 15_000L
    }
}

// ── Adapter ──────────────────────────────────────────────────────────────────

private class QueueAdapter(
    private val onComplete: (QueueEntryDto) -> Unit,
    private val onCall:     (QueueEntryDto) -> Unit
) : RecyclerView.Adapter<QueueAdapter.ViewHolder>() {

    private var items: List<QueueEntryDto> = emptyList()
    private var actionsEnabled = true

    fun submit(next: List<QueueEntryDto>) {
        val diff = DiffUtil.calculateDiff(object : DiffUtil.Callback() {
            override fun getOldListSize() = items.size
            override fun getNewListSize() = next.size
            override fun areItemsTheSame(o: Int, n: Int) = items[o].id == next[n].id
            override fun areContentsTheSame(o: Int, n: Int) = items[o] == next[n]
        })
        items = next
        diff.dispatchUpdatesTo(this)
    }

    fun setActionsEnabled(enabled: Boolean) {
        if (actionsEnabled == enabled) return
        actionsEnabled = enabled
        notifyItemRangeChanged(0, items.size)
    }

    override fun getItemCount() = items.size

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder =
        ViewHolder(LayoutInflater.from(parent.context).inflate(R.layout.item_queue_patient, parent, false))

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(items[position], actionsEnabled, onComplete, onCall)
    }

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        private val statusBar:      View           = view.findViewById(R.id.queueStatusBar)
        private val queueNumBg:     FrameLayout    = view.findViewById(R.id.flQueueNumBg)
        private val positionView:   TextView       = view.findViewById(R.id.queueItemPosition)
        private val avatarFrame:    FrameLayout    = view.findViewById(R.id.flQueueAvatar)
        private val initialsView:   TextView       = view.findViewById(R.id.tvQueueInitials)
        private val nameView:       TextView       = view.findViewById(R.id.queueItemName)
        private val vaccinBadge:    TextView       = view.findViewById(R.id.tvQueueVaccin)
        private val phoneView:      TextView       = view.findViewById(R.id.queueItemPhone)
        private val callButton:     FrameLayout    = view.findViewById(R.id.btnQueueCall)
        private val statusView:     TextView       = view.findViewById(R.id.queueItemStatus)
        private val divider:        View           = view.findViewById(R.id.queueDivider)
        private val completeButton: MaterialButton = view.findViewById(R.id.queueItemComplete)

        fun bind(
            entry: QueueEntryDto,
            actionsEnabled: Boolean,
            onComplete: (QueueEntryDto) -> Unit,
            onCall:     (QueueEntryDto) -> Unit
        ) {
            val ctx     = itemView.context
            val called  = entry.statut?.uppercase() == "EN_COURS"
            val name    = listOfNotNull(entry.bebePrenom, entry.bebeNom).joinToString(" ")
                .ifBlank { "Bébé #${entry.bebeId ?: "-"}" }
            val initials = buildString {
                entry.bebePrenom?.firstOrNull()?.uppercaseChar()?.let { append(it) }
                entry.bebeNom?.firstOrNull()?.uppercaseChar()?.let { append(it) }
            }.ifBlank { "?" }

            // Position / queue number
            val num = (entry.numeroAttente ?: entry.position)?.toString() ?: "-"
            positionView.text = num

            // Avatar initials
            initialsView.text = initials
            val avatarColors  = listOf(
                R.color.brand_teal, R.color.info, R.color.success,
                R.color.brand_coral, R.color.brand_lavender
            )
            avatarFrame.backgroundTintList = ColorStateList.valueOf(
                ContextCompat.getColor(ctx, avatarColors[abs(entry.id) % avatarColors.size])
            )

            nameView.text = name
            phoneView.text = entry.parentTelephone ?: "Téléphone indisponible"

            // Status bar + badge + number bg
            if (called) {
                statusBar.setBackgroundColor(ContextCompat.getColor(ctx, R.color.info))
                queueNumBg.background = ContextCompat.getDrawable(ctx, R.drawable.bg_queue_number_called)
                positionView.setTextColor(ContextCompat.getColor(ctx, R.color.info_dark))

                statusView.text = "EN COURS"
                statusView.setTextColor(ContextCompat.getColor(ctx, R.color.info_dark))
                statusView.background = StaffUi.rounded(
                    ContextCompat.getColor(ctx, R.color.info_light),
                    ContextCompat.getColor(ctx, R.color.info_light), 20
                )
            } else {
                statusBar.setBackgroundColor(ContextCompat.getColor(ctx, R.color.warning))
                queueNumBg.background = ContextCompat.getDrawable(ctx, R.drawable.bg_queue_number_waiting)
                positionView.setTextColor(ContextCompat.getColor(ctx, R.color.warning_dark))

                statusView.text = "EN ATTENTE"
                statusView.setTextColor(ContextCompat.getColor(ctx, R.color.warning_dark))
                statusView.background = StaffUi.rounded(
                    ContextCompat.getColor(ctx, R.color.warning_light),
                    ContextCompat.getColor(ctx, R.color.warning_light), 20
                )
            }

            // Vaccin badge (if available — future field)
            vaccinBadge.visibility = View.GONE

            // Call button
            val hasPhone = !entry.parentTelephone.isNullOrBlank()
            callButton.visibility = if (hasPhone) View.VISIBLE else View.GONE
            callButton.isEnabled  = actionsEnabled
            callButton.setOnClickListener { onCall(entry) }

            // Actions divider + complete button
            val showActions = called && actionsEnabled
            divider.visibility          = if (called) View.VISIBLE else View.GONE
            completeButton.visibility   = if (called) View.VISIBLE else View.GONE
            completeButton.isEnabled    = showActions
            completeButton.setOnClickListener { onComplete(entry) }
        }
    }
}
