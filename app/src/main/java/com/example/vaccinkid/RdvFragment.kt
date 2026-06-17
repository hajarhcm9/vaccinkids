package com.example.vaccinkid

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.ProgressBar
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.core.content.ContextCompat
import androidx.core.widget.doAfterTextChanged
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.example.vaccinkid.model.RendezVousDto
import com.example.vaccinkid.model.SessionDto
import com.example.vaccinkid.model.UpdateRendezVousRequest
import com.example.vaccinkid.network.ApiClient
import com.google.android.material.button.MaterialButton
import com.google.android.material.chip.Chip
import com.google.android.material.chip.ChipGroup
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

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        bindViews(view)
        bindActions()
        setupStatusFilters()
        loadSessions()
    }

    private fun bindViews(view: View) {
        refreshView = view.findViewById(R.id.rdvRefresh)
        sessionSpinner = view.findViewById(R.id.rdvSessionSpinner)
        statusFilters = view.findViewById(R.id.rdvStatusFilters)
        searchInput = view.findViewById(R.id.rdvSearch)
        recyclerView = view.findViewById(R.id.rdvList)
        progress = view.findViewById(R.id.rdvProgress)
        messageView = view.findViewById(R.id.rdvMessage)
        queueButton = view.findViewById(R.id.rdvOpenQueue)
        vialsButton = view.findViewById(R.id.rdvOpenVials)
        statsButton = view.findViewById(R.id.rdvOpenStats)
        startButton = view.findViewById(R.id.rdvStartSession)
        endButton = view.findViewById(R.id.rdvEndSession)

        adapter = StaffRdvAdapter(
            onPresent = { updateRdvStatus(it, "PRESENT") },
            onAbsent = { updateRdvStatus(it, "ABSENT") },
            onVaccinate =(::openVaccination),
            onGrowth =(::openGrowth)
        )
        recyclerView.layoutManager = LinearLayoutManager(requireContext())
        recyclerView.adapter = adapter
    }

    private fun bindActions() {
        refreshView.setColorSchemeResources(R.color.staff_primary, R.color.brand_coral, R.color.brand_blue)
        refreshView.setOnRefreshListener(::loadSessions)
        searchInput.doAfterTextChanged { applyFilters() }
        queueButton.setOnClickListener {
            (activity as? MainInfirmierActivity)?.naviguerVers(QueueFragment())
        }
        vialsButton.setOnClickListener { openFlacons() }
        statsButton.setOnClickListener { openStats() }
        startButton.setOnClickListener { updateSession(start = true) }
        endButton.setOnClickListener { updateSession(start = false) }
        updateSessionActions(null)
    }

    private fun setupStatusFilters() {
        val tealColor = androidx.core.content.ContextCompat.getColor(requireContext(), R.color.brand_teal)
        val white = androidx.core.content.ContextCompat.getColor(requireContext(), R.color.white)

        STATUS_OPTIONS.forEach { status ->
            statusFilters.addView(Chip(requireContext()).apply {
                id = View.generateViewId()
                text = statusLabel(status)
                isCheckable = true
                isChecked = status == ALL_STATUSES
                tag = status
                chipCornerRadius = 20f
                chipStrokeWidth = 1.5f
                setChipStrokeColorResource(R.color.brand_teal)
                isCheckedIconVisible = false
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
            val checkedChip = checkedIds.firstOrNull()?.let { group.findViewById<Chip>(it) }
            selectedStatus = checkedChip?.tag as? String ?: ALL_STATUSES
            applyFilters()
        }
    }

    private fun loadSessions() {
        viewLifecycleOwner.lifecycleScope.launch {
            beginLoading("Chargement des sessions du jour...")
            try {
                val response = ApiClient.apiService.getTodaySessions()
                if (response.status != "success") throw Exception(response.message ?: "Sessions indisponibles")
                sessions = response.data.orEmpty()
                sessionSpinner.adapter = ArrayAdapter(
                    requireContext(),
                    android.R.layout.simple_spinner_dropdown_item,
                    sessions.map { it.label() }.ifEmpty { listOf("Aucune session aujourd'hui") }
                )
                sessionSpinner.onItemSelectedListener = object : android.widget.AdapterView.OnItemSelectedListener {
                    override fun onItemSelected(
                        parent: android.widget.AdapterView<*>?,
                        view: View?,
                        position: Int,
                        id: Long
                    ) {
                        updateSessionActions(selectedSession())
                        loadRdvForSelectedSession()
                    }

                    override fun onNothingSelected(parent: android.widget.AdapterView<*>?) = Unit
                }
                if (sessions.isEmpty()) {
                    rendezVous = emptyList()
                    applyFilters()
                    updateSessionActions(null)
                    messageView.text = "Aucune session aujourd'hui."
                }
            } catch (error: Exception) {
                sessions = emptyList()
                rendezVous = emptyList()
                applyFilters()
                updateSessionActions(null)
                messageView.text = error.message ?: "Erreur reseau"
            } finally {
                endLoading()
            }
        }
    }

    private fun loadRdvForSelectedSession() {
        val session = selectedSession() ?: return
        viewLifecycleOwner.lifecycleScope.launch {
            beginLoading("Chargement des rendez-vous...")
            try {
                val response = ApiClient.apiService.getSessionRendezVous(session.id)
                if (response.status != "success") throw Exception(response.message ?: "RDV indisponibles")
                rendezVous = response.data.orEmpty()
                applyFilters()
            } catch (error: Exception) {
                rendezVous = emptyList()
                applyFilters()
                messageView.text = error.message ?: "Erreur reseau"
            } finally {
                endLoading()
            }
        }
    }

    private fun applyFilters() {
        updateStatusFilterCounts()
        val query = searchInput.text?.toString().orEmpty().trim().lowercase()
        val filtered = rendezVous.filter { rdv ->
            val matchesStatus = selectedStatus == ALL_STATUSES || rdv.statut == selectedStatus
            val searchable = listOf(
                rdv.bebePrenom,
                rdv.bebeNom,
                rdv.parentPrenom,
                rdv.parentNom,
                rdv.parentTelephone,
                rdv.vaccinNom
            ).joinToString(" ").lowercase()
            matchesStatus && (query.isBlank() || searchable.contains(query))
        }
        adapter.submit(filtered)
        if (loadingRequests == 0) {
            messageView.text = when {
                sessions.isEmpty() -> "Aucune session aujourd'hui."
                filtered.isEmpty() -> "Aucun rendez-vous pour ces filtres."
                else -> "${filtered.size} rendez-vous affiche(s)"
            }
        }
    }

    private fun updateStatusFilterCounts() {
        (0 until statusFilters.childCount)
            .mapNotNull { statusFilters.getChildAt(it) as? Chip }
            .forEach { chip ->
                val status = chip.tag as? String ?: return@forEach
                val count = if (status == ALL_STATUSES) {
                    rendezVous.size
                } else {
                    rendezVous.count { it.statut == status }
                }
                chip.text = "${statusLabel(status)} $count"
            }
    }

    private fun updateRdvStatus(rdv: RendezVousDto, status: String) {
        if (actionInFlight) return
        if (!RdvTransitionPolicy.allows(rdv.statut, status)) {
            messageView.text = "Transition ${rdv.statut ?: "inconnue"} -> $status interdite."
            return
        }
        actionInFlight = true
        adapter.setActionsEnabled(false)
        viewLifecycleOwner.lifecycleScope.launch {
            beginLoading("Mise a jour ${statusLabel(status)}...")
            try {
                val response = ApiClient.apiService.updateRendezVous(rdv.id, UpdateRendezVousRequest(status))
                if (response.status != "success") throw Exception(response.message ?: "Mise a jour impossible")
                Toast.makeText(requireContext(), "Statut confirme par le serveur", Toast.LENGTH_SHORT).show()
                loadRdvForSelectedSession()
            } catch (error: Exception) {
                messageView.text = error.message ?: "Erreur reseau"
            } finally {
                actionInFlight = false
                adapter.setActionsEnabled(true)
                endLoading()
            }
        }
    }

    private fun updateSession(start: Boolean) {
        if (actionInFlight) return
        val session = selectedSession() ?: return
        actionInFlight = true
        setSessionButtonsEnabled(false)
        viewLifecycleOwner.lifecycleScope.launch {
            beginLoading(if (start) "Demarrage session..." else "Cloture session...")
            try {
                val response = if (start) ApiClient.apiService.startSession(session.id)
                else ApiClient.apiService.endSession(session.id)
                if (response.status != "success") throw Exception(response.message ?: "Action session impossible")
                Toast.makeText(requireContext(), "Session confirmee par le serveur", Toast.LENGTH_SHORT).show()
                loadSessions()
            } catch (error: Exception) {
                messageView.text = error.message ?: "Erreur reseau"
            } finally {
                actionInFlight = false
                setSessionButtonsEnabled(true)
                endLoading()
            }
        }
    }

    private fun openFlacons() {
        val session = selectedSession() ?: return
        (activity as? MainInfirmierActivity)?.naviguerVers(
            GestionFlaconsFragment.newInstance(session.id, session.vaccinId ?: 0, session.label())
        )
    }

    private fun openVaccination(rdv: RendezVousDto) {
        val session = selectedSession() ?: return
        val name = listOfNotNull(rdv.bebePrenom, rdv.bebeNom).joinToString(" ")
            .ifBlank { "Bebe #${rdv.bebeId}" }
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

    private fun selectedSession(): SessionDto? = sessions.getOrNull(sessionSpinner.selectedItemPosition)

    private fun updateSessionActions(session: SessionDto?) {
        val status = session?.statut?.uppercase()
        queueButton.visibility = if (session == null) View.GONE else View.VISIBLE
        vialsButton.visibility = if (status in listOf("CONFIRMEE", "EN_COURS")) View.VISIBLE else View.GONE
        statsButton.visibility = if (status == "EN_COURS") View.VISIBLE else View.GONE
        startButton.visibility = if (status == "CONFIRMEE") View.VISIBLE else View.GONE
        endButton.visibility = if (status == "EN_COURS") View.VISIBLE else View.GONE
    }

    private fun openStats() {
        val session = selectedSession() ?: return
        (activity as? MainInfirmierActivity)?.naviguerVers(
            StatistiquesSessionFragment.newInstance(session.id, session.label())
        )
    }

    private fun setSessionButtonsEnabled(enabled: Boolean) {
        startButton.isEnabled = enabled
        endButton.isEnabled = enabled
        queueButton.isEnabled = enabled
        vialsButton.isEnabled = enabled
        statsButton.isEnabled = enabled
    }

    private fun beginLoading(message: String) {
        loadingRequests += 1
        progress.visibility = View.VISIBLE
        refreshView.isRefreshing = true
        messageView.text = message
    }

    private fun endLoading() {
        loadingRequests = (loadingRequests - 1).coerceAtLeast(0)
        val loading = loadingRequests > 0
        progress.visibility = if (loading) View.VISIBLE else View.GONE
        refreshView.isRefreshing = loading
    }

    private fun SessionDto.label(): String {
        val vaccine = vaccinNom ?: "Vaccin #${vaccinId ?: "-"}"
        val hour = heureDebut ?: "--:--"
        val count = "${inscrits ?: 0}/${maxInscriptions ?: "?"}"
        return "$vaccine - $hour - ${statut ?: "?"} - $count"
    }

    private fun statusLabel(status: String): String = when (status) {
        ALL_STATUSES -> "Tous"
        "EN_ATTENTE" -> "En attente"
        "CONFIRME" -> "Confirmes"
        "PRESENT" -> "Presents"
        "ABSENT" -> "Absents"
        else -> status
    }

    companion object {
        private const val ALL_STATUSES = "ALL"
        private val STATUS_OPTIONS = listOf(ALL_STATUSES, "EN_ATTENTE", "CONFIRME", "PRESENT", "ABSENT")
    }
}

private class StaffRdvAdapter(
    private val onPresent: (RendezVousDto) -> Unit,
    private val onAbsent: (RendezVousDto) -> Unit,
    private val onVaccinate: (RendezVousDto) -> Unit,
    private val onGrowth: (RendezVousDto) -> Unit
) : RecyclerView.Adapter<StaffRdvAdapter.ViewHolder>() {
    private var items: List<RendezVousDto> = emptyList()
    private var actionsEnabled = true

    fun submit(next: List<RendezVousDto>) {
        items = next
        notifyDataSetChanged()
    }

    fun setActionsEnabled(enabled: Boolean) {
        actionsEnabled = enabled
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder =
        ViewHolder(
            LayoutInflater.from(parent.context).inflate(R.layout.item_staff_rdv, parent, false)
        )

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(items[position], actionsEnabled, onPresent, onAbsent, onVaccinate, onGrowth)
    }

    override fun getItemCount() = items.size

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        private val babyView: TextView = view.findViewById(R.id.staffRdvBaby)
        private val metaView: TextView = view.findViewById(R.id.staffRdvMeta)
        private val parentView: TextView = view.findViewById(R.id.staffRdvParent)
        private val statusView: TextView = view.findViewById(R.id.staffRdvStatus)
        private val presentButton: MaterialButton = view.findViewById(R.id.staffRdvPresent)
        private val absentButton: MaterialButton = view.findViewById(R.id.staffRdvAbsent)
        private val vaccinateButton: MaterialButton = view.findViewById(R.id.staffRdvVaccinate)
        private val growthButton: MaterialButton = view.findViewById(R.id.staffRdvGrowth)

        fun bind(
            rdv: RendezVousDto,
            actionsEnabled: Boolean,
            onPresent: (RendezVousDto) -> Unit,
            onAbsent: (RendezVousDto) -> Unit,
            onVaccinate: (RendezVousDto) -> Unit,
            onGrowth: (RendezVousDto) -> Unit
        ) {
            val name = listOfNotNull(rdv.bebePrenom, rdv.bebeNom).joinToString(" ")
                .ifBlank { "Bebe #${rdv.bebeId}" }
            val parent = listOfNotNull(rdv.parentPrenom, rdv.parentNom).joinToString(" ")
                .ifBlank { "Parent #${rdv.parentId}" }
            babyView.text = name
            metaView.text = listOfNotNull(rdv.heureDebut, rdv.vaccinNom, "RDV #${rdv.id}").joinToString(" - ")
            parentView.text = "$parent - ${rdv.parentTelephone ?: "Telephone indisponible"}"
            statusView.text = rdv.statut ?: "INCONNU"
            styleStatus(rdv.statut)

            bindAction(presentButton, actionsEnabled && RdvTransitionPolicy.allows(rdv.statut, "PRESENT")) {
                onPresent(rdv)
            }
            bindAction(absentButton, actionsEnabled && RdvTransitionPolicy.allows(rdv.statut, "ABSENT")) {
                onAbsent(rdv)
            }
            bindAction(vaccinateButton, actionsEnabled && rdv.statut in listOf("PRESENT", "CONFIRME")) {
                onVaccinate(rdv)
            }
            bindAction(growthButton, actionsEnabled && rdv.statut in listOf("PRESENT", "CONFIRME")) {
                onGrowth(rdv)
            }
        }

        private fun bindAction(button: MaterialButton, visible: Boolean, action: () -> Unit) {
            button.visibility = if (visible) View.VISIBLE else View.GONE
            button.isEnabled = visible
            button.setOnClickListener { action() }
        }

        private fun styleStatus(status: String?) {
            val context = statusView.context
            val (textColor, backgroundColor) = when (status) {
                "PRESENT" -> R.color.success_dark to R.color.success_light
                "CONFIRME" -> R.color.info_dark to R.color.info_light
                "ABSENT" -> R.color.error_dark to R.color.error_light
                else -> R.color.warning_dark to R.color.warning_light
            }
            statusView.setTextColor(ContextCompat.getColor(context, textColor))
            statusView.background = StaffUi.rounded(
                ContextCompat.getColor(context, backgroundColor),
                ContextCompat.getColor(context, backgroundColor),
                20
            )
        }
    }
}
