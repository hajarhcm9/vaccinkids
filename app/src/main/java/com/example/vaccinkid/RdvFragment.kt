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
import com.google.android.material.progressindicator.LinearProgressIndicator
import com.google.android.material.textfield.TextInputEditText
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.abs

class RdvFragment : Fragment(R.layout.fragment_rdv) {

    private lateinit var refreshView: SwipeRefreshLayout
    private lateinit var statusFilters: ChipGroup
    private lateinit var searchInput: TextInputEditText
    private lateinit var recyclerView: RecyclerView
    private lateinit var progress: ProgressBar
    private lateinit var messageView: TextView
    private lateinit var offlineBanner: LinearLayout
    private lateinit var offlineBannerText: TextView
    private lateinit var llEmptyRdv: LinearLayout
    private lateinit var tvEmptyRdvSubtitle: TextView
    private lateinit var adapter: StaffRdvAdapter
    private lateinit var queueButton: MaterialButton
    private lateinit var vialsButton: MaterialButton
    private lateinit var statsButton: MaterialButton
    private lateinit var startButton: MaterialButton
    private lateinit var endButton: MaterialButton

    // Session navigation views
    private lateinit var btnPrevSession: View
    private lateinit var btnNextSession: View
    private lateinit var tvSessionVaccin: TextView
    private lateinit var tvSessionTimeRange: TextView
    private lateinit var tvSessionStatusBadge: TextView
    private lateinit var tvSessionInscrits: TextView
    private lateinit var tvSessionCounter: TextView
    private lateinit var tvSessionProgress: TextView
    private lateinit var progressRdvSession: LinearProgressIndicator
    private lateinit var vSessionStatusBar: View

    private var sessions: List<SessionDto> = emptyList()
    private var rendezVous: List<RendezVousDto> = emptyList()
    private var selectedStatus = ALL_STATUSES
    private var actionInFlight = false
    private var loadingRequests = 0
    private var offlineMode = false
    private var currentSessionIndex = 0

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
        refreshView        = view.findViewById(R.id.rdvRefresh)
        statusFilters      = view.findViewById(R.id.rdvStatusFilters)
        searchInput        = view.findViewById(R.id.rdvSearch)
        recyclerView       = view.findViewById(R.id.rdvList)
        progress           = view.findViewById(R.id.rdvProgress)
        messageView        = view.findViewById(R.id.rdvMessage)
        offlineBanner      = view.findViewById(R.id.rdvOfflineBanner)
        offlineBannerText  = view.findViewById(R.id.rdvOfflineText)
        llEmptyRdv         = view.findViewById(R.id.llEmptyRdv)
        tvEmptyRdvSubtitle = view.findViewById(R.id.tvEmptyRdvSubtitle)
        queueButton        = view.findViewById(R.id.rdvOpenQueue)
        vialsButton        = view.findViewById(R.id.rdvOpenVials)
        statsButton        = view.findViewById(R.id.rdvOpenStats)
        startButton        = view.findViewById(R.id.rdvStartSession)
        endButton          = view.findViewById(R.id.rdvEndSession)

        // Session nav
        btnPrevSession       = view.findViewById(R.id.btnPrevSession)
        btnNextSession       = view.findViewById(R.id.btnNextSession)
        tvSessionVaccin      = view.findViewById(R.id.tvSessionVaccin)
        tvSessionTimeRange   = view.findViewById(R.id.tvSessionTimeRange)
        tvSessionStatusBadge = view.findViewById(R.id.tvSessionStatusBadge)
        tvSessionInscrits    = view.findViewById(R.id.tvSessionInscrits)
        tvSessionCounter     = view.findViewById(R.id.tvSessionCounter)
        tvSessionProgress    = view.findViewById(R.id.tvSessionProgress)
        progressRdvSession   = view.findViewById(R.id.progressRdvSession)
        vSessionStatusBar    = view.findViewById(R.id.vSessionStatusBar)

        view.findViewById<TextView>(R.id.tvRdvHeaderDate).text =
            SimpleDateFormat("EEEE dd MMMM", Locale.FRENCH).format(Date())
                .replaceFirstChar { it.uppercaseChar() }

        adapter = StaffRdvAdapter(
            onPresent   = { updateRdvStatus(it, "PRESENT") },
            onAbsent    = { updateRdvStatus(it, "ABSENT") },
            onConfirm   = { updateRdvStatus(it, "CONFIRME") },
            onVaccinate = (::openVaccination),
            onGrowth    = (::openGrowth),
            onCall      = { rdv ->
                val phone = rdv.parentTelephone
                if (!phone.isNullOrBlank()) {
                    startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone")))
                } else {
                    Toast.makeText(requireContext(), "Téléphone indisponible", Toast.LENGTH_SHORT).show()
                }
            }
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

        btnPrevSession.setOnClickListener {
            if (currentSessionIndex > 0) {
                currentSessionIndex--
                rendezVous = emptyList()
                updateSessionProgress()
                updateCurrentSessionDisplay()
            }
        }
        btnNextSession.setOnClickListener {
            if (currentSessionIndex < sessions.size - 1) {
                currentSessionIndex++
                rendezVous = emptyList()
                updateSessionProgress()
                updateCurrentSessionDisplay()
            }
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
        val minChipW  = (80 * resources.displayMetrics.density).toInt()

        STATUS_OPTIONS.forEach { status ->
            statusFilters.addView(Chip(requireContext()).apply {
                id = View.generateViewId()
                text = statusLabel(status)
                isCheckable = true
                isChecked = (status == ALL_STATUSES)
                tag = status
                shapeAppearanceModel = shapeAppearanceModel.toBuilder()
                    .setAllCornerSizes(20f).build()
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
                textSize = 12f
            })
        }
        statusFilters.setOnCheckedStateChangeListener { group, checkedIds ->
            val chip = checkedIds.firstOrNull()?.let { group.findViewById<Chip>(it) }
            selectedStatus = chip?.tag as? String ?: ALL_STATUSES
            applyFilters()
        }
    }

    // ── Data loading ──────────────────────────────────────────────────────────

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

            // Auto-select the active EN_COURS session, fallback to 0
            currentSessionIndex = sessions
                .indexOfFirst { it.statut?.uppercase() == "EN_COURS" }
                .coerceAtLeast(0)

            updateCurrentSessionDisplay()

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
                updateSessionProgress()
                applyFilters()
            } catch (_: Exception) {
                val cached = AppDatabase.getInstance(requireContext())
                    .rendezVousDao().getBySession(session.id).map { it.toDto() }
                rendezVous = cached
                updateSessionProgress()
                applyFilters()
                if (cached.isNotEmpty()) {
                    setOffline(true, "Mode hors-ligne · ${cached.size} RDV en cache")
                } else {
                    messageView.text = "Erreur réseau — aucun cache disponible"
                    messageView.visibility = View.VISIBLE
                }
            } finally {
                endLoading()
            }
        }
    }

    private fun updateSessionProgress() {
        val total    = rendezVous.size
        val presents = rendezVous.count { it.statut?.uppercase() == "PRESENT" }
        if (total > 0) {
            tvSessionProgress.text = "$presents / $total vaccinés"
            val pct = (presents * 100) / total
            progressRdvSession.setProgressCompat(pct, true)
        } else {
            tvSessionProgress.text = "— / — vaccinés"
            progressRdvSession.setProgressCompat(0, false)
        }
    }

    private fun updateCurrentSessionDisplay() {
        val session = selectedSession()
        val count   = sessions.size

        tvSessionCounter.text = if (count > 0) "${currentSessionIndex + 1}/$count" else "—"
        btnPrevSession.isEnabled = currentSessionIndex > 0
        btnPrevSession.alpha     = if (currentSessionIndex > 0) 1f else 0.30f
        btnNextSession.isEnabled = currentSessionIndex < count - 1
        btnNextSession.alpha     = if (currentSessionIndex < count - 1) 1f else 0.30f

        if (session != null) {
            tvSessionVaccin.text = session.vaccinNom ?: "Session #${session.id}"
            val s = session.heureDebut?.take(5)
            val e = session.heureFin?.take(5)
            tvSessionTimeRange.text = if (s != null && e != null) "$s – $e" else "Heure inconnue"
            tvSessionInscrits.text  = "${session.inscrits ?: 0}/${session.maxInscriptions ?: "?"} inscrits"

            val (statusText, statusColorRes) = when (session.statut?.uppercase()) {
                "EN_COURS"  -> "● EN COURS"  to R.color.success
                "CONFIRMEE" -> "○ CONFIRMÉE" to R.color.info
                "TERMINEE"  -> "✓ TERMINÉE"  to R.color.text_secondary
                "ANNULEE"   -> "✗ ANNULÉE"   to R.color.error
                else        -> (session.statut ?: "—") to R.color.text_secondary
            }
            tvSessionStatusBadge.text = statusText
            tvSessionStatusBadge.setTextColor(ContextCompat.getColor(requireContext(), statusColorRes))
        } else {
            tvSessionVaccin.text       = "Aucune session"
            tvSessionTimeRange.text    = "—"
            tvSessionInscrits.text     = "0/0 inscrits"
            tvSessionStatusBadge.text  = ""
        }

        updateSessionActions(session)
        loadRdvForSelectedSession()
    }

    // ── Filtering ─────────────────────────────────────────────────────────────

    private fun applyFilters() {
        updateStatusFilterCounts()
        val query = searchInput.text?.toString().orEmpty().trim().lowercase()
        val filtered = rendezVous.filter { rdv ->
            val matchesStatus = selectedStatus == ALL_STATUSES ||
                    rdv.statut?.uppercase() == selectedStatus.uppercase()
            val searchable = listOf(
                rdv.bebePrenom, rdv.bebeNom,
                rdv.parentPrenom, rdv.parentNom,
                rdv.parentTelephone, rdv.vaccinNom
            ).joinToString(" ").lowercase()
            matchesStatus && (query.isBlank() || searchable.contains(query))
        }
        adapter.submit(filtered)

        val isEmpty = filtered.isEmpty() && loadingRequests == 0
        recyclerView.visibility  = if (isEmpty) View.GONE else View.VISIBLE
        llEmptyRdv.visibility    = if (isEmpty) View.VISIBLE else View.GONE
        messageView.visibility   = View.GONE

        if (isEmpty) {
            tvEmptyRdvSubtitle.text = when {
                sessions.isEmpty() -> "Aucune session active aujourd'hui."
                query.isNotBlank() -> "Aucun résultat pour « $query »."
                selectedStatus != ALL_STATUSES -> "Aucun RDV avec le statut « ${statusLabel(selectedStatus)} »."
                else -> "La liste des RDV est vide."
            }
        }
    }

    private fun updateStatusFilterCounts() {
        (0 until statusFilters.childCount)
            .mapNotNull { statusFilters.getChildAt(it) as? Chip }
            .forEach { chip ->
                val status = chip.tag as? String ?: return@forEach
                val count = if (status == ALL_STATUSES) rendezVous.size
                            else rendezVous.count { it.statut?.uppercase() == status }
                chip.text = "${statusLabel(status)} ($count)"
            }
    }

    // ── Actions ───────────────────────────────────────────────────────────────

    private fun updateRdvStatus(rdv: RendezVousDto, status: String) {
        if (actionInFlight) return
        if (!RdvTransitionPolicy.allows(rdv.statut, status)) {
            Toast.makeText(
                requireContext(),
                "Transition ${rdv.statut ?: "inconnue"} → $status non autorisée.",
                Toast.LENGTH_SHORT
            ).show()
            return
        }
        actionInFlight = true
        adapter.setActionsEnabled(false)
        viewLifecycleOwner.lifecycleScope.launch {
            beginLoading()
            try {
                val response = ApiClient.apiService.updateRendezVous(rdv.id, UpdateRendezVousRequest(status))
                if (response.status != "success") throw Exception(response.message ?: "Mise à jour impossible")
                Toast.makeText(requireContext(), "Statut mis à jour", Toast.LENGTH_SHORT).show()
                loadRdvForSelectedSession()
            } catch (e: Exception) {
                val msg = e.message ?: ""
                if (msg.contains("réseau", ignoreCase = true) || msg.contains("timeout", ignoreCase = true)
                    || msg.contains("Unable to resolve", ignoreCase = true)
                    || msg.contains("connect", ignoreCase = true)) {
                    com.example.vaccinkid.db.SyncManager.queueRdvStatusUpdate(requireContext(), rdv.id, status)
                    rendezVous = rendezVous.map { if (it.id == rdv.id) it.copy(statut = status) else it }
                    updateSessionProgress()
                    applyFilters()
                    setOffline(true, "Hors-ligne · changement enregistré localement")
                } else {
                    Toast.makeText(requireContext(), msg.ifBlank { "Erreur serveur" }, Toast.LENGTH_LONG).show()
                }
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
                Toast.makeText(requireContext(), error.message ?: "Erreur réseau", Toast.LENGTH_LONG).show()
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

    private fun selectedSession(): SessionDto? = sessions.getOrNull(currentSessionIndex)

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

        val barColorRes = when (status) {
            "EN_COURS"  -> R.color.success
            "CONFIRMEE" -> R.color.info
            "TERMINEE"  -> R.color.text_secondary
            "ANNULEE"   -> R.color.error
            else        -> R.color.brand_teal
        }
        vSessionStatusBar.setBackgroundColor(ContextCompat.getColor(requireContext(), barColorRes))
    }

    private fun setSessionButtonsEnabled(enabled: Boolean) {
        startButton.isEnabled  = enabled
        endButton.isEnabled    = enabled
        queueButton.isEnabled  = enabled
        vialsButton.isEnabled  = enabled
        statsButton.isEnabled  = enabled
        btnPrevSession.isEnabled = enabled
        btnNextSession.isEnabled = enabled
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
        ALL_STATUSES        -> "Tous"
        "EN_ATTENTE"        -> "En attente"
        "CONFIRME"          -> "Confirmés"
        "EN_LISTE_ATTENTE"  -> "Liste attente"
        "PRESENT"           -> "Présents"
        "ABSENT"            -> "Absents"
        else                -> status
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
    private val onGrowth:    (RendezVousDto) -> Unit,
    private val onCall:      (RendezVousDto) -> Unit
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
        holder.bind(items[position], actionsEnabled, onPresent, onAbsent, onConfirm, onVaccinate, onGrowth, onCall)
    }

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        private val statusBar:       View           = view.findViewById(R.id.vStatusBar)
        private val avatarFrame:     FrameLayout    = view.findViewById(R.id.flAvatar)
        private val initialsView:    TextView       = view.findViewById(R.id.tvAvatarInitials)
        private val babyView:        TextView       = view.findViewById(R.id.staffRdvBaby)
        private val queueView:       TextView       = view.findViewById(R.id.tvRdvQueue)
        private val vaccinBadge:     TextView       = view.findViewById(R.id.tvVaccinBadge)
        private val timeView:        TextView       = view.findViewById(R.id.staffRdvTime)
        private val parentView:      TextView       = view.findViewById(R.id.staffRdvParent)
        private val phoneView:       TextView       = view.findViewById(R.id.staffRdvPhone)
        private val callButton:      FrameLayout    = view.findViewById(R.id.btnCallPhone)
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
            onGrowth:    (RendezVousDto) -> Unit,
            onCall:      (RendezVousDto) -> Unit
        ) {
            val ctx    = itemView.context
            val name   = listOfNotNull(rdv.bebePrenom, rdv.bebeNom).joinToString(" ").ifBlank { "Bébé #${rdv.bebeId}" }
            val parent = listOfNotNull(rdv.parentPrenom, rdv.parentNom).joinToString(" ").ifBlank { "Parent #${rdv.parentId}" }

            babyView.text    = name
            timeView.text    = rdv.heureDebut?.take(5) ?: "—"
            vaccinBadge.text = rdv.vaccinNom ?: "—"
            parentView.text  = parent
            phoneView.text   = formatPhone(rdv.parentTelephone)
            statusView.text  = statusLabel(rdv.statut)

            // Avatar initials + color by id
            val initials = buildString {
                rdv.bebePrenom?.firstOrNull()?.uppercaseChar()?.let { append(it) }
                rdv.bebeNom?.firstOrNull()?.uppercaseChar()?.let { append(it) }
            }.ifBlank { "?" }
            initialsView.text = initials
            val avatarColors = listOf(
                R.color.brand_teal, R.color.info, R.color.success,
                R.color.brand_coral, R.color.brand_lavender
            )
            avatarFrame.backgroundTintList = ColorStateList.valueOf(
                ContextCompat.getColor(ctx, avatarColors[abs(rdv.id) % avatarColors.size])
            )

            // Queue badge
            val queueNum = rdv.numeroQueue
            if (queueNum != null) {
                queueView.text       = "#$queueNum"
                queueView.visibility = View.VISIBLE
            } else {
                queueView.visibility = View.GONE
            }

            // Status bar + badge styling
            styleStatus(rdv.statut)

            // Call button
            callButton.setOnClickListener { onCall(rdv) }
            callButton.visibility = if (!rdv.parentTelephone.isNullOrBlank()) View.VISIBLE else View.GONE

            // Action buttons
            bindAction(presentButton,   actionsEnabled && RdvTransitionPolicy.allows(rdv.statut, "PRESENT"))  { onPresent(rdv) }
            bindAction(absentButton,    actionsEnabled && RdvTransitionPolicy.allows(rdv.statut, "ABSENT"))   { onAbsent(rdv) }
            bindAction(confirmButton,   actionsEnabled && RdvTransitionPolicy.allows(rdv.statut, "CONFIRME")) { onConfirm(rdv) }
            bindAction(vaccinateButton, actionsEnabled && rdv.statut?.uppercase() == "PRESENT")               { onVaccinate(rdv) }
            bindAction(growthButton,    actionsEnabled && rdv.statut?.uppercase() in listOf("PRESENT", "CONFIRME")) { onGrowth(rdv) }

            // Hide action rows if nothing to show
            val rowAVisible = presentButton.visibility == View.VISIBLE
                    || absentButton.visibility == View.VISIBLE
                    || confirmButton.visibility == View.VISIBLE
            val rowBVisible = vaccinateButton.visibility == View.VISIBLE
                    || growthButton.visibility == View.VISIBLE
            (presentButton.parent as? ViewGroup)?.visibility  = if (rowAVisible) View.VISIBLE else View.GONE
            (vaccinateButton.parent as? ViewGroup)?.visibility = if (rowBVisible) View.VISIBLE else View.GONE
        }

        private fun bindAction(button: MaterialButton, visible: Boolean, action: () -> Unit) {
            button.visibility = if (visible) View.VISIBLE else View.GONE
            button.isEnabled  = visible
            button.setOnClickListener { action() }
        }

        private fun styleStatus(status: String?) {
            val ctx = statusView.context
            val (barColor, textColor, bgColor) = when (status?.uppercase()) {
                "PRESENT"           -> Triple(R.color.success,        R.color.success_dark,   R.color.success_light)
                "CONFIRME"          -> Triple(R.color.info,           R.color.info_dark,      R.color.info_light)
                "EN_LISTE_ATTENTE"  -> Triple(R.color.brand_lavender, R.color.brand_lavender_dark, R.color.brand_lavender_light)
                "ABSENT"            -> Triple(R.color.error,          R.color.error_dark,     R.color.error_light)
                else                -> Triple(R.color.warning,        R.color.warning_dark,   R.color.warning_light)
            }
            statusBar.setBackgroundColor(ContextCompat.getColor(ctx, barColor))
            statusView.setTextColor(ContextCompat.getColor(ctx, textColor))
            statusView.background = StaffUi.rounded(
                ContextCompat.getColor(ctx, bgColor),
                ContextCompat.getColor(ctx, bgColor),
                20
            )
        }

        private fun statusLabel(status: String?): String = when (status?.uppercase()) {
            "EN_ATTENTE"       -> "EN ATTENTE"
            "EN_LISTE_ATTENTE" -> "LISTE ATTENTE"
            "CONFIRME"         -> "CONFIRMÉ"
            "PRESENT"          -> "PRÉSENT"
            "ABSENT"           -> "ABSENT"
            else               -> status?.uppercase() ?: "INCONNU"
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
