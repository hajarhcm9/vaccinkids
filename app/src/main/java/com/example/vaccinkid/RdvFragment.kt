package com.example.vaccinkid

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.core.content.ContextCompat
import androidx.core.widget.doAfterTextChanged
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.example.vaccinkid.db.AppDatabase
import com.example.vaccinkid.db.toDto
import com.example.vaccinkid.db.toEntity
import com.example.vaccinkid.model.RendezVousDto
import com.example.vaccinkid.model.SessionDto
import com.example.vaccinkid.model.UpdateRendezVousRequest
import com.example.vaccinkid.network.ApiClient
import com.example.vaccinkid.network.TokenManager
import com.google.android.material.button.MaterialButton
import com.google.android.material.chip.Chip
import com.google.android.material.chip.ChipGroup
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.textfield.TextInputEditText
import kotlinx.coroutines.launch

class RdvFragment : Fragment(R.layout.fragment_rdv) {
    private lateinit var refreshView: SwipeRefreshLayout
    private lateinit var sessionSpinner: Spinner
    private lateinit var statusFilters: ChipGroup
    private lateinit var searchInput: TextInputEditText
    private lateinit var recyclerView: RecyclerView
    private lateinit var progress: ProgressBar
    private lateinit var messageView: TextView
    private lateinit var offlineBanner: LinearLayout
    private lateinit var offlineBannerText: TextView
    private lateinit var adapter: StaffRdvAdapter
    private lateinit var queueButton: MaterialButton
    private lateinit var vialsButton: MaterialButton
    private lateinit var statsButton: MaterialButton
    private lateinit var startButton: MaterialButton
    private lateinit var endButton: MaterialButton

    private var sessions: List<SessionDto> = emptyList()
    private var rendezVous: List<RendezVousDto> = emptyList()
    private var selectedStatus = ALL_STATUSES
    private var actionInFlight = false
    private var loadingRequests = 0
    private var offlineMode = false

    private val debounceHandler = Handler(Looper.getMainLooper())
    private val filterRunnable = Runnable { applyFilters() }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        bindViews(view)
        bindActions()
        setupStatusFilters()
        loadSessions()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        debounceHandler.removeCallbacks(filterRunnable)
    }

    private fun bindViews(view: View) {
        refreshView       = view.findViewById(R.id.rdvRefresh)
        sessionSpinner    = view.findViewById(R.id.rdvSessionSpinner)
        statusFilters     = view.findViewById(R.id.rdvStatusFilters)
        searchInput       = view.findViewById(R.id.rdvSearch)
        recyclerView      = view.findViewById(R.id.rdvList)
        progress          = view.findViewById(R.id.rdvProgress)
        messageView       = view.findViewById(R.id.rdvMessage)
        offlineBanner     = view.findViewById(R.id.rdvOfflineBanner)
        offlineBannerText = view.findViewById(R.id.rdvOfflineText)
        queueButton       = view.findViewById(R.id.rdvOpenQueue)
        vialsButton       = view.findViewById(R.id.rdvOpenVials)
        statsButton       = view.findViewById(R.id.rdvOpenStats)
        startButton       = view.findViewById(R.id.rdvStartSession)
        endButton         = view.findViewById(R.id.rdvEndSession)

        adapter = StaffRdvAdapter(
            onPresent   = { updateRdvStatus(it, "PRESENT") },
            onAbsent    = { updateRdvStatus(it, "ABSENT") },
            onConfirm   = { updateRdvStatus(it, "CONFIRME") },
            onVaccinate = (::openVaccination),
            onGrowth    = (::openGrowth)
        )
        recyclerView.layoutManager = LinearLayoutManager(requireContext())
        recyclerView.adapter = adapter
    }

    private fun bindActions() {
        refreshView.setColorSchemeResources(R.color.staff_primary, R.color.brand_coral, R.color.brand_blue)
        refreshView.setOnRefreshListener(::loadSessions)

        searchInput.doAfterTextChanged {
            debounceHandler.removeCallbacks(filterRunnable)
            debounceHandler.postDelayed(filterRunnable, 200)
        }

        queueButton.setOnClickListener {
            (activity as? MainInfirmierActivity)?.naviguerVers(QueueFragment())
        }
        vialsButton.setOnClickListener { openFlacons() }
        statsButton.setOnClickListener { openStats() }
        startButton.setOnClickListener { updateSession(start = true) }
        endButton.setOnClickListener   { confirmEndSession() }
        updateSessionActions(null)
    }

    private fun setupStatusFilters() {
        val tealColor = ContextCompat.getColor(requireContext(), R.color.brand_teal)
        val white     = ContextCompat.getColor(requireContext(), R.color.white)
        val minChipW  = (84 * resources.displayMetrics.density).toInt()

        STATUS_OPTIONS.forEach { status ->
            statusFilters.addView(Chip(requireContext()).apply {
                id = View.generateViewId()
                text = statusLabel(status)
                isCheckable = true
                isChecked = (status == ALL_STATUSES)
                tag = status
                chipCornerRadius = 20f
                chipStrokeWidth = 1.5f
                setChipStrokeColorResource(R.color.brand_teal)
                isCheckedIconVisible = false
                minWidth = minChipW
                chipBackgroundColor = android.content.res.ColorStateList(
                    arrayOf(intArrayOf(android.R.attr.state_checked), intArrayOf()),
                    intArrayOf(tealColor, white)
                )
                setTextColor(android.content.res.ColorStateList(
                    arrayOf(intArrayOf(android.R.attr.state_checked), intArrayOf()),
                    intArrayOf(white, tealColor)
                ))
                textSize = 12.5f
            })
        }
        statusFilters.setOnCheckedStateChangeListener { group, checkedIds ->
            val chip = checkedIds.firstOrNull()?.let { group.findViewById<Chip>(it) }
            selectedStatus = chip?.tag as? String ?: ALL_STATUSES
            applyFilters()
        }
    }

    // ── Data loading ─────────────────────────────────────────────────────────

    private fun loadSessions() {
        viewLifecycleOwner.lifecycleScope.launch {
            beginLoading()
            try {
                val response = ApiClient.apiService.getTodaySessions()
                if (response.status != "success") throw Exception(response.message ?: "Sessions indisponibles")
                sessions = response.data.orEmpty()
                val db = AppDatabase.getInstance(requireContext())
                if (sessions.isNotEmpty()) db.sessionDao().insertAll(sessions.map { it.toEntity() })
                setOffline(false)
            } catch (_: Exception) {
                val centreId = TokenManager.getCentreId()
                val cached = if (centreId != null)
                    AppDatabase.getInstance(requireContext()).sessionDao().getByCentre(centreId).map { it.toDto() }
                else emptyList()
                if (cached.isNotEmpty()) {
                    sessions = cached
                    setOffline(true, "Mode hors-ligne · sessions du cache")
                } else {
                    sessions = emptyList()
                    setOffline(false)
                }
            }

            sessionSpinner.adapter = ArrayAdapter(
                requireContext(),
                android.R.layout.simple_spinner_dropdown_item,
                sessions.map { it.label() }.ifEmpty { listOf("Aucune session aujourd'hui") }
            )
            sessionSpinner.onItemSelectedListener = object : android.widget.AdapterView.OnItemSelectedListener {
                override fun onItemSelected(parent: android.widget.AdapterView<*>?, view: View?, position: Int, id: Long) {
                    updateSessionActions(selectedSession())
                    loadRdvForSelectedSession()
                }
                override fun onNothingSelected(parent: android.widget.AdapterView<*>?) = Unit
            }
            if (sessions.isEmpty()) {
                rendezVous = emptyList()
                applyFilters()
                updateSessionActions(null)
            }
            endLoading()
        }
    }

    private fun loadRdvForSelectedSession() {
        val session = selectedSession() ?: return
        viewLifecycleOwner.lifecycleScope.launch {
            beginLoading()
            try {
                val response = ApiClient.apiService.getSessionRendezVous(session.id)
                if (response.status != "success") throw Exception(response.message ?: "RDV indisponibles")
                rendezVous = response.data.orEmpty()
                val db = AppDatabase.getInstance(requireContext())
                if (rendezVous.isNotEmpty()) db.rendezVousDao().insertAll(rendezVous.map { it.toEntity() })
                if (!offlineMode) setOffline(false)
                applyFilters()
            } catch (_: Exception) {
                val cached = AppDatabase.getInstance(requireContext())
                    .rendezVousDao().getBySession(session.id).map { it.toDto() }
                rendezVous = cached
                applyFilters()
                if (cached.isNotEmpty()) {
                    setOffline(true, "Mode hors-ligne · ${cached.size} RDV en cache")
                } else {
                    messageView.text = "Erreur réseau — aucun cache disponible"
                }
            } finally {
                endLoading()
            }
        }
    }

    // ── Filtering ─────────────────────────────────────────────────────────────

    private fun applyFilters() {
        updateStatusFilterCounts()
        val query = searchInput.text?.toString().orEmpty().trim().lowercase()
        val filtered = rendezVous.filter { rdv ->
            val matchesStatus = selectedStatus == ALL_STATUSES || rdv.statut == selectedStatus
            val searchable = listOf(
                rdv.bebePrenom, rdv.bebeNom,
                rdv.parentPrenom, rdv.parentNom,
                rdv.parentTelephone, rdv.vaccinNom
            ).joinToString(" ").lowercase()
            matchesStatus && (query.isBlank() || searchable.contains(query))
        }
        adapter.submit(filtered)
        if (loadingRequests == 0) {
            messageView.text = when {
                sessions.isEmpty() -> "Aucune session aujourd'hui."
                filtered.isEmpty() -> "Aucun rendez-vous pour ces filtres."
                else               -> "${filtered.size} rendez-vous affiché(s)"
            }
        }
    }

    private fun updateStatusFilterCounts() {
        (0 until statusFilters.childCount)
            .mapNotNull { statusFilters.getChildAt(it) as? Chip }
            .forEach { chip ->
                val status = chip.tag as? String ?: return@forEach
                val count = if (status == ALL_STATUSES) rendezVous.size
                            else rendezVous.count { it.statut == status }
                chip.text = "${statusLabel(status)}  $count"
            }
    }

    // ── Actions ───────────────────────────────────────────────────────────────

    private fun updateRdvStatus(rdv: RendezVousDto, status: String) {
        if (actionInFlight) return
        if (!RdvTransitionPolicy.allows(rdv.statut, status)) {
            messageView.text = "Transition ${rdv.statut ?: "inconnue"} → $status non autorisée."
            return
        }
        actionInFlight = true
        adapter.setActionsEnabled(false)
        viewLifecycleOwner.lifecycleScope.launch {
            beginLoading()
            try {
                val response = ApiClient.apiService.updateRendezVous(rdv.id, UpdateRendezVousRequest(status))
                if (response.status != "success") throw Exception(response.message ?: "Mise à jour impossible")
                Toast.makeText(requireContext(), "Statut confirmé", Toast.LENGTH_SHORT).show()
                loadRdvForSelectedSession()
            } catch (_: Exception) {
                com.example.vaccinkid.db.SyncManager.queueRdvStatusUpdate(requireContext(), rdv.id, status)
                rendezVous = rendezVous.map { if (it.id == rdv.id) it.copy(statut = status) else it }
                applyFilters()
                setOffline(true, "Hors-ligne · changement enregistré localement")
            } finally {
                actionInFlight = false
                adapter.setActionsEnabled(true)
                endLoading()
            }
        }
    }

    private fun confirmEndSession() {
        val session = selectedSession() ?: return
        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Clôturer la session ?")
            .setMessage(
                "${session.vaccinNom ?: "Session"} · ${session.heureDebut?.take(5) ?: "--:--"}\n\n" +
                "Cette action est irréversible. Les RDV non traités resteront en attente."
            )
            .setPositiveButton("Clôturer") { _, _ -> updateSession(start = false) }
            .setNegativeButton("Annuler", null)
            .show()
    }

    private fun updateSession(start: Boolean) {
        if (actionInFlight) return
        val session = selectedSession() ?: return
        actionInFlight = true
        setSessionButtonsEnabled(false)
        viewLifecycleOwner.lifecycleScope.launch {
            beginLoading()
            try {
                val response = if (start) ApiClient.apiService.startSession(session.id)
                               else ApiClient.apiService.endSession(session.id)
                if (response.status != "success") throw Exception(response.message ?: "Action impossible")
                Toast.makeText(
                    requireContext(),
                    if (start) "Session démarrée" else "Session clôturée",
                    Toast.LENGTH_SHORT
                ).show()
                loadSessions()
            } catch (error: Exception) {
                messageView.text = error.message ?: "Erreur réseau"
            } finally {
                actionInFlight = false
                setSessionButtonsEnabled(true)
                endLoading()
            }
        }
    }

    private fun openFlacons() {
        val session = selectedSession() ?: run {
            Toast.makeText(requireContext(), "Sélectionnez une session d'abord", Toast.LENGTH_SHORT).show()
            return
        }
        (activity as? MainInfirmierActivity)?.naviguerVers(
            GestionFlaconsFragment.newInstance(session.id, session.vaccinId ?: 0, session.label())
        )
    }

    private fun openVaccination(rdv: RendezVousDto) {
        val session = selectedSession() ?: return
        val name = listOfNotNull(rdv.bebePrenom, rdv.bebeNom).joinToString(" ")
            .ifBlank { "Bébé #${rdv.bebeId}" }
        (activity as? MainInfirmierActivity)?.naviguerVers(
            EnregistrementVaccinationFragment.newInstance(
                name,
                rdv.bebeId?.toString() ?: "",
                rdv.id,
                session.id
            )
        )
    }

    private fun openGrowth(rdv: RendezVousDto) {
        (activity as? MainInfirmierActivity)?.naviguerVers(
            EnfantProfilFragment.newInstanceFromRdv(rdv)
        )
    }

    private fun openStats() {
        val session = selectedSession() ?: run {
            Toast.makeText(requireContext(), "Sélectionnez une session d'abord", Toast.LENGTH_SHORT).show()
            return
        }
        (activity as? MainInfirmierActivity)?.naviguerVers(
            StatistiquesSessionFragment.newInstance(session.id, session.label())
        )
    }

    // ── UI helpers ────────────────────────────────────────────────────────────

    private fun selectedSession(): SessionDto? =
        sessions.getOrNull(sessionSpinner.selectedItemPosition)

    private fun setOffline(offline: Boolean, message: String = "") {
        offlineMode = offline
        offlineBanner.visibility = if (offline) View.VISIBLE else View.GONE
        if (offline && message.isNotBlank()) offlineBannerText.text = "⚠  $message"
    }

    private fun updateSessionActions(session: SessionDto?) {
        val status = session?.statut?.uppercase()
        queueButton.visibility = if (session == null) View.GONE else View.VISIBLE
        vialsButton.visibility = if (status == "CONFIRMEE" || status == "EN_COURS") View.VISIBLE else View.GONE
        statsButton.visibility = if (status == "EN_COURS") View.VISIBLE else View.GONE
        startButton.visibility = if (status == "CONFIRMEE") View.VISIBLE else View.GONE
        endButton.visibility   = if (status == "EN_COURS") View.VISIBLE else View.GONE
    }

    private fun setSessionButtonsEnabled(enabled: Boolean) {
        startButton.isEnabled = enabled
        endButton.isEnabled   = enabled
        queueButton.isEnabled = enabled
        vialsButton.isEnabled = enabled
        statsButton.isEnabled = enabled
    }

    private fun beginLoading() {
        loadingRequests += 1
        progress.visibility = View.VISIBLE
        refreshView.isRefreshing = true
    }

    private fun endLoading() {
        loadingRequests = (loadingRequests - 1).coerceAtLeast(0)
        val loading = loadingRequests > 0
        progress.visibility = if (loading) View.VISIBLE else View.GONE
        refreshView.isRefreshing = loading
    }

    private fun SessionDto.label(): String {
        val vaccine   = vaccinNom ?: "Vaccin #${vaccinId ?: "-"}"
        val hour      = heureDebut?.take(5) ?: "--:--"
        val count     = "${inscrits ?: 0}/${maxInscriptions ?: "?"}"
        val statusStr = when (statut?.uppercase()) {
            "EN_COURS"  -> "● En cours"
            "CONFIRMEE" -> "○ Confirmée"
            "TERMINEE"  -> "✓ Terminée"
            "ANNULEE"   -> "✗ Annulée"
            else        -> statut ?: "—"
        }
        return "$statusStr  ·  $vaccine  ·  $hour  ·  $count inscrits"
    }

    private fun statusLabel(status: String): String = when (status) {
        ALL_STATUSES -> "Tous"
        "EN_ATTENTE" -> "En attente"
        "CONFIRME"   -> "Confirmés"
        "PRESENT"    -> "Présents"
        "ABSENT"     -> "Absents"
        else         -> status
    }

    companion object {
        private const val ALL_STATUSES = "ALL"
        private val STATUS_OPTIONS = listOf(ALL_STATUSES, "EN_ATTENTE", "CONFIRME", "PRESENT", "ABSENT")
    }
}

// ── Adapter ──────────────────────────────────────────────────────────────────

private class StaffRdvAdapter(
    private val onPresent:   (RendezVousDto) -> Unit,
    private val onAbsent:    (RendezVousDto) -> Unit,
    private val onConfirm:   (RendezVousDto) -> Unit,
    private val onVaccinate: (RendezVousDto) -> Unit,
    private val onGrowth:    (RendezVousDto) -> Unit
) : RecyclerView.Adapter<StaffRdvAdapter.ViewHolder>() {

    private var items: List<RendezVousDto> = emptyList()
    private var actionsEnabled = true

    fun submit(next: List<RendezVousDto>) {
        val diff = DiffUtil.calculateDiff(object : DiffUtil.Callback() {
            override fun getOldListSize() = items.size
            override fun getNewListSize() = next.size
            override fun areItemsTheSame(oldPos: Int, newPos: Int) =
                items[oldPos].id == next[newPos].id
            override fun areContentsTheSame(oldPos: Int, newPos: Int) =
                items[oldPos] == next[newPos]
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
        ViewHolder(LayoutInflater.from(parent.context).inflate(R.layout.item_staff_rdv, parent, false))

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(items[position], actionsEnabled, onPresent, onAbsent, onConfirm, onVaccinate, onGrowth)
    }

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        private val babyView:        TextView       = view.findViewById(R.id.staffRdvBaby)
        private val metaView:        TextView       = view.findViewById(R.id.staffRdvMeta)
        private val timeView:        TextView       = view.findViewById(R.id.staffRdvTime)
        private val parentView:      TextView       = view.findViewById(R.id.staffRdvParent)
        private val phoneView:       TextView       = view.findViewById(R.id.staffRdvPhone)
        private val statusView:      TextView       = view.findViewById(R.id.staffRdvStatus)
        private val presentButton:   MaterialButton = view.findViewById(R.id.staffRdvPresent)
        private val absentButton:    MaterialButton = view.findViewById(R.id.staffRdvAbsent)
        private val confirmButton:   MaterialButton = view.findViewById(R.id.staffRdvConfirm)
        private val vaccinateButton: MaterialButton = view.findViewById(R.id.staffRdvVaccinate)
        private val growthButton:    MaterialButton = view.findViewById(R.id.staffRdvGrowth)

        fun bind(
            rdv: RendezVousDto,
            actionsEnabled: Boolean,
            onPresent:   (RendezVousDto) -> Unit,
            onAbsent:    (RendezVousDto) -> Unit,
            onConfirm:   (RendezVousDto) -> Unit,
            onVaccinate: (RendezVousDto) -> Unit,
            onGrowth:    (RendezVousDto) -> Unit
        ) {
            val name   = listOfNotNull(rdv.bebePrenom, rdv.bebeNom).joinToString(" ").ifBlank { "Bébé #${rdv.bebeId}" }
            val parent = listOfNotNull(rdv.parentPrenom, rdv.parentNom).joinToString(" ").ifBlank { "Parent #${rdv.parentId}" }

            babyView.text   = name
            timeView.text   = rdv.heureDebut?.take(5) ?: "—"
            metaView.text   = listOfNotNull(rdv.vaccinNom, "RDV #${rdv.id}").joinToString(" · ")
            parentView.text = parent
            phoneView.text  = formatPhone(rdv.parentTelephone)
            statusView.text = rdv.statut ?: "INCONNU"
            styleStatus(rdv.statut)

            bindAction(presentButton,   actionsEnabled && RdvTransitionPolicy.allows(rdv.statut, "PRESENT"))  { onPresent(rdv) }
            bindAction(absentButton,    actionsEnabled && RdvTransitionPolicy.allows(rdv.statut, "ABSENT"))   { onAbsent(rdv) }
            bindAction(confirmButton,   actionsEnabled && RdvTransitionPolicy.allows(rdv.statut, "CONFIRME")) { onConfirm(rdv) }
            bindAction(vaccinateButton, actionsEnabled && rdv.statut in listOf("PRESENT", "CONFIRME"))        { onVaccinate(rdv) }
            bindAction(growthButton,    actionsEnabled && rdv.statut in listOf("PRESENT", "CONFIRME"))        { onGrowth(rdv) }
        }

        private fun bindAction(button: MaterialButton, visible: Boolean, action: () -> Unit) {
            button.visibility = if (visible) View.VISIBLE else View.GONE
            button.isEnabled  = visible
            button.setOnClickListener { action() }
        }

        private fun styleStatus(status: String?) {
            val ctx = statusView.context
            val (textColor, bgColor) = when (status) {
                "PRESENT"  -> R.color.success_dark to R.color.success_light
                "CONFIRME" -> R.color.info_dark    to R.color.info_light
                "ABSENT"   -> R.color.error_dark   to R.color.error_light
                else       -> R.color.warning_dark  to R.color.warning_light
            }
            statusView.setTextColor(ContextCompat.getColor(ctx, textColor))
            statusView.background = StaffUi.rounded(
                ContextCompat.getColor(ctx, bgColor),
                ContextCompat.getColor(ctx, bgColor),
                20
            )
        }

        companion object {
            fun formatPhone(raw: String?): String {
                if (raw == null) return "Tél. indisponible"
                val digits = raw.removePrefix("+212").removePrefix("0").filter { it.isDigit() }
                return if (digits.length == 9)
                    "+212 ${digits[0]} ${digits.substring(1, 3)} ${digits.substring(3, 5)} ${digits.substring(5, 7)} ${digits.substring(7, 9)}"
                else raw
            }
        }
    }
}
