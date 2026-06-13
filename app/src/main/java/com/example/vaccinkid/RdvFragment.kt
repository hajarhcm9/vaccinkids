package com.example.vaccinkid

import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.core.view.setPadding
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.vaccinkid.model.RendezVousDto
import com.example.vaccinkid.model.SessionDto
import com.example.vaccinkid.model.UpdateRendezVousRequest
import com.example.vaccinkid.network.ApiClient
import kotlinx.coroutines.launch

class RdvFragment : Fragment() {
    private lateinit var sessionSpinner: Spinner
    private lateinit var statusSpinner: Spinner
    private lateinit var recyclerView: RecyclerView
    private lateinit var progress: ProgressBar
    private lateinit var messageView: TextView
    private lateinit var adapter: StaffRdvAdapter
    private lateinit var queueButton: Button
    private lateinit var vialsButton: Button
    private lateinit var startButton: Button
    private lateinit var endButton: Button
    private var sessions: List<SessionDto> = emptyList()
    private var actionInFlight = false
    private val statuses = listOf("Tous", "EN_ATTENTE", "CONFIRME", "PRESENT", "ABSENT")

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
            text = "RDV par session"
            textSize = 22f
            setTextColor(0xFF7A2040.toInt())
            setPadding(dp(16), dp(16), dp(16), dp(6))
            setTypeface(typeface, android.graphics.Typeface.BOLD)
        })

        sessionSpinner = Spinner(requireContext())
        statusSpinner = Spinner(requireContext())
        progress = ProgressBar(requireContext()).apply { visibility = View.GONE }
        messageView = TextView(requireContext()).apply {
            setTextColor(0xFFC8550A.toInt())
            setPadding(dp(16), dp(6), dp(16), dp(6))
        }

        root.addView(sessionSpinner, matchWrap())
        root.addView(statusSpinner, matchWrap())

        val actionRow = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(dp(16), dp(8), dp(16), dp(8))
        }
        actionRow.addView(button("Rafraichir") { loadSessions() }, weightWrap())
        queueButton = button("File") {
            (activity as? MainInfirmierActivity)?.naviguerVers(QueueFragment())
        }
        vialsButton = button("Flacons") { openFlacons() }
        actionRow.addView(queueButton, weightWrap())
        actionRow.addView(vialsButton, weightWrap())
        root.addView(actionRow)

        val sessionRow = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(dp(16), 0, dp(16), dp(8))
        }
        startButton = button("Demarrer") { updateSession(start = true) }
        endButton = button("Terminer") { updateSession(start = false) }
        sessionRow.addView(startButton, weightWrap())
        sessionRow.addView(endButton, weightWrap())
        root.addView(sessionRow)
        updateSessionActions(null)

        root.addView(progress, matchWrap())
        root.addView(messageView, matchWrap())

        recyclerView = RecyclerView(requireContext()).apply {
            layoutManager = LinearLayoutManager(requireContext())
        }
        adapter = StaffRdvAdapter(
            onPresent = { updateRdvStatus(it, "PRESENT") },
            onAbsent = { updateRdvStatus(it, "ABSENT") },
            onVaccinate = { openVaccination(it) },
            onGrowth = { openGrowth(it) }
        )
        recyclerView.adapter = adapter
        root.addView(recyclerView, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            0,
            1f
        ))

        statusSpinner.adapter = ArrayAdapter(
            requireContext(),
            android.R.layout.simple_spinner_dropdown_item,
            statuses
        )
        statusSpinner.setOnItemSelectedListener(object : android.widget.AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: android.widget.AdapterView<*>?, view: View?, position: Int, id: Long) {
                loadRdvForSelectedSession()
            }
            override fun onNothingSelected(parent: android.widget.AdapterView<*>?) = Unit
        })

        return root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        loadSessions()
    }

    private fun loadSessions() {
        viewLifecycleOwner.lifecycleScope.launch {
            setLoading(true, "Chargement des sessions du jour...")
            try {
                val response = ApiClient.apiService.getTodaySessions()
                sessions = response.data ?: emptyList()
                if (response.status != "success") throw Exception(response.message ?: "Sessions indisponibles")
                val labels = sessions.map { it.label() }.ifEmpty { listOf("Aucune session aujourd'hui") }
                sessionSpinner.adapter = ArrayAdapter(
                    requireContext(),
                    android.R.layout.simple_spinner_dropdown_item,
                    labels
                )
                sessionSpinner.setOnItemSelectedListener(object : android.widget.AdapterView.OnItemSelectedListener {
                    override fun onItemSelected(parent: android.widget.AdapterView<*>?, view: View?, position: Int, id: Long) {
                        updateSessionActions(selectedSession())
                        loadRdvForSelectedSession()
                    }
                    override fun onNothingSelected(parent: android.widget.AdapterView<*>?) = Unit
                })
                if (sessions.isEmpty()) {
                    adapter.submit(emptyList())
                    updateSessionActions(null)
                }
                setLoading(false, if (sessions.isEmpty()) "Aucune session aujourd'hui." else "")
            } catch (e: Exception) {
                sessions = emptyList()
                adapter.submit(emptyList())
                updateSessionActions(null)
                setLoading(false, e.message ?: "Erreur reseau")
            }
        }
    }

    private fun loadRdvForSelectedSession() {
        val session = selectedSession() ?: return
        viewLifecycleOwner.lifecycleScope.launch {
            setLoading(true, "Chargement des rendez-vous...")
            try {
                val response = ApiClient.apiService.getSessionRendezVous(session.id)
                val selectedStatus = statuses.getOrNull(statusSpinner.selectedItemPosition)
                val items = (response.data ?: emptyList()).filter {
                    selectedStatus == null || selectedStatus == "Tous" || it.statut == selectedStatus
                }
                if (response.status != "success") throw Exception(response.message ?: "RDV indisponibles")
                adapter.submit(items)
                setLoading(false, "${items.size} rendez-vous")
            } catch (e: Exception) {
                adapter.submit(emptyList())
                setLoading(false, e.message ?: "Erreur reseau")
            }
        }
    }

    private fun updateRdvStatus(rdv: RendezVousDto, statut: String) {
        if (actionInFlight) return
        val allowed = when (rdv.statut) {
            "EN_ATTENTE" -> statut == "CONFIRME" || statut == "ABSENT"
            "EN_LISTE_ATTENTE" -> statut == "CONFIRME"
            "CONFIRME" -> statut == "PRESENT" || statut == "ABSENT"
            else -> false
        }
        if (!allowed) {
            messageView.text = "Transition ${rdv.statut ?: "inconnue"} -> $statut interdite."
            return
        }
        actionInFlight = true
        viewLifecycleOwner.lifecycleScope.launch {
            setLoading(true, "Mise a jour $statut...")
            try {
                val response = ApiClient.apiService.updateRendezVous(
                    rdv.id,
                    UpdateRendezVousRequest(statut)
                )
                if (response.status != "success") throw Exception(response.message ?: "Mise a jour impossible")
                Toast.makeText(requireContext(), "Statut confirme par le serveur", Toast.LENGTH_SHORT).show()
                loadRdvForSelectedSession()
            } catch (e: Exception) {
                setLoading(false, e.message ?: "Erreur reseau")
            } finally {
                actionInFlight = false
            }
        }
    }

    private fun updateSession(start: Boolean) {
        val session = selectedSession() ?: return
        viewLifecycleOwner.lifecycleScope.launch {
            setLoading(true, if (start) "Demarrage session..." else "Cloture session...")
            try {
                val response = if (start) ApiClient.apiService.startSession(session.id)
                else ApiClient.apiService.endSession(session.id)
                if (response.status != "success") throw Exception(response.message ?: "Action session impossible")
                Toast.makeText(requireContext(), "Session confirmee par le serveur", Toast.LENGTH_SHORT).show()
                loadSessions()
            } catch (e: Exception) {
                setLoading(false, e.message ?: "Erreur reseau")
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
        val name = listOfNotNull(rdv.bebePrenom, rdv.bebeNom).joinToString(" ").ifBlank { "Bebe #${rdv.bebeId}" }
        (activity as? MainInfirmierActivity)?.naviguerVers(
            EnregistrementVaccinationFragment.newInstance(name, rdv.bebeId?.toString() ?: "", rdv.id, session.id)
        )
    }

    private fun openGrowth(rdv: RendezVousDto) {
        val bebeId = rdv.bebeId ?: return
        val name = listOfNotNull(rdv.bebePrenom, rdv.bebeNom).joinToString(" ").ifBlank { "Bebe #$bebeId" }
        (activity as? MainInfirmierActivity)?.naviguerVers(GrowthChartFragment.newInstance(bebeId, name))
    }

    private fun selectedSession(): SessionDto? = sessions.getOrNull(sessionSpinner.selectedItemPosition)

    private fun updateSessionActions(session: SessionDto?) {
        val status = session?.statut?.uppercase()
        queueButton.visibility = if (session == null) View.GONE else View.VISIBLE
        vialsButton.visibility = if (status in listOf("CONFIRMEE", "EN_COURS")) View.VISIBLE else View.GONE
        startButton.visibility = if (status == "CONFIRMEE") View.VISIBLE else View.GONE
        endButton.visibility = if (status == "EN_COURS") View.VISIBLE else View.GONE
    }

    private fun setLoading(isLoading: Boolean, message: String) {
        progress.visibility = if (isLoading) View.VISIBLE else View.GONE
        messageView.text = message
    }

    private fun SessionDto.label(): String {
        val vaccin = vaccinNom ?: "Vaccin #${vaccinId ?: "-"}"
        val heure = heureDebut ?: "--:--"
        val count = "${inscrits ?: 0}/${maxInscriptions ?: "?"}"
        return "#$id - $vaccin - $heure - ${statut ?: "?"} - $count"
    }

    private fun button(text: String, onClick: () -> Unit): Button =
        Button(requireContext()).apply {
            this.text = text
            textSize = 12f
            setOnClickListener { onClick() }
        }

    private fun matchWrap() = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.WRAP_CONTENT
    )

    private fun weightWrap() = LinearLayout.LayoutParams(
        0,
        ViewGroup.LayoutParams.WRAP_CONTENT,
        1f
    ).apply { marginEnd = dp(4) }

    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()
}

private class StaffRdvAdapter(
    private val onPresent: (RendezVousDto) -> Unit,
    private val onAbsent: (RendezVousDto) -> Unit,
    private val onVaccinate: (RendezVousDto) -> Unit,
    private val onGrowth: (RendezVousDto) -> Unit
) : RecyclerView.Adapter<StaffRdvAdapter.ViewHolder>() {
    private var items: List<RendezVousDto> = emptyList()

    fun submit(next: List<RendezVousDto>) {
        items = next
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val root = LinearLayout(parent.context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(24)
            setBackgroundColor(0xFFFFFFFF.toInt())
        }
        return ViewHolder(root)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val rdv = items[position]
        holder.bind(rdv, onPresent, onAbsent, onVaccinate, onGrowth)
    }

    override fun getItemCount() = items.size

    class ViewHolder(private val root: LinearLayout) : RecyclerView.ViewHolder(root) {
        fun bind(
            rdv: RendezVousDto,
            onPresent: (RendezVousDto) -> Unit,
            onAbsent: (RendezVousDto) -> Unit,
            onVaccinate: (RendezVousDto) -> Unit,
            onGrowth: (RendezVousDto) -> Unit
        ) {
            root.removeAllViews()
            val ctx = root.context
            val name = listOfNotNull(rdv.bebePrenom, rdv.bebeNom).joinToString(" ").ifBlank { "Bebe #${rdv.bebeId}" }
            val parent = listOfNotNull(rdv.parentPrenom, rdv.parentNom).joinToString(" ")
                .ifBlank { rdv.parentTelephone ?: "Parent #${rdv.parentId}" }
            root.addView(TextView(ctx).apply {
                text = "$name - ${rdv.statut ?: "INCONNU"}"
                textSize = 17f
                setTypeface(typeface, android.graphics.Typeface.BOLD)
            })
            root.addView(TextView(ctx).apply {
                text = "Parent : $parent | Tel : ${rdv.parentTelephone ?: "-"}"
                textSize = 13f
            })
            root.addView(TextView(ctx).apply {
                text = "RDV #${rdv.id} | Bebe #${rdv.bebeId ?: "-"}"
                textSize = 12f
            })
            val row = LinearLayout(ctx).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
            }
            if (rdv.statut == "CONFIRME") {
                row.addView(actionButton(ctx, "Present") { onPresent(rdv) })
            }
            if (rdv.statut == "CONFIRME" || rdv.statut == "EN_ATTENTE") {
                row.addView(actionButton(ctx, "Absent") { onAbsent(rdv) })
            }
            if (rdv.statut == "PRESENT" || rdv.statut == "CONFIRME") {
                row.addView(actionButton(ctx, "Vacciner") { onVaccinate(rdv) })
                row.addView(actionButton(ctx, "Carnet") { onGrowth(rdv) })
            }
            if (row.childCount > 0) root.addView(row)
        }

        private fun actionButton(ctx: android.content.Context, label: String, action: () -> Unit): Button =
            Button(ctx).apply {
                text = label
                textSize = 11f
                setOnClickListener { action() }
                layoutParams = LinearLayout.LayoutParams(
                    0,
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    1f
                )
            }
    }
}
