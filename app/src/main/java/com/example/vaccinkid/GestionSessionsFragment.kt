package com.example.vaccinkid

import android.app.AlertDialog
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.vaccinkid.model.AdminRefCentreDto
import com.example.vaccinkid.model.AdminRefVaccinDto
import com.example.vaccinkid.model.SessionDto
import com.example.vaccinkid.model.SessionRequest
import com.example.vaccinkid.network.ApiClient
import kotlinx.coroutines.launch

class GestionSessionsFragment : Fragment(R.layout.fragment_gestion_sessions_admin) {

    private lateinit var adapter: SessionXmlAdapter
    private lateinit var progressBar: ProgressBar
    private lateinit var messageView: TextView
    private var allSessions: List<SessionDto> = emptyList()
    private var centres: List<AdminRefCentreDto> = emptyList()
    private var vaccins: List<AdminRefVaccinDto> = emptyList()
    private var activeTab = "TOUTES"

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        progressBar = view.findViewById(R.id.sessionsProgress)
        messageView = view.findViewById(R.id.tvSessionsMessage)

        adapter = SessionXmlAdapter(
            onEdit = { showForm(it) },
            onAction = { session, action -> updateStatus(session, action) }
        )
        view.findViewById<RecyclerView>(R.id.rvSessions).apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = this@GestionSessionsFragment.adapter
        }

        // Tabs
        val tabs = listOf(
            view.findViewById<TextView>(R.id.tabSessionsToutes),
            view.findViewById<TextView>(R.id.tabSessionsAujourdHui),
            view.findViewById<TextView>(R.id.tabSessionsAvenir),
            view.findViewById<TextView>(R.id.tabSessionsTerminees)
        )
        val tabKeys = listOf("TOUTES", "AUJOURD_HUI", "A_VENIR", "TERMINEES")

        fun selectTab(idx: Int) {
            activeTab = tabKeys[idx]
            tabs.forEachIndexed { i, tv ->
                if (i == idx) {
                    tv.setBackgroundResource(R.drawable.bg_btn_teal_pill)
                    tv.setTextColor(requireContext().getColor(R.color.white))
                    tv.setTypeface(null, android.graphics.Typeface.BOLD)
                } else {
                    tv.background = null
                    tv.setTextColor(requireContext().getColor(R.color.text_secondary))
                    tv.setTypeface(null, android.graphics.Typeface.NORMAL)
                }
            }
            applyFilter()
        }
        tabs.forEachIndexed { i, tv -> tv.setOnClickListener { selectTab(i) } }

        view.findViewById<View>(R.id.fabAddSession).setOnClickListener { showForm(null) }

        loadSessions()
        loadReferences()
    }

    private fun applyFilter() {
        val today = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault())
            .format(java.util.Date())
        val filtered = allSessions.filter { s ->
            when (activeTab) {
                "AUJOURD_HUI" -> s.dateSession?.startsWith(today) == true
                "A_VENIR"     -> s.statut in listOf("EN_FORMATION", "PLANIFIEE", "CONFIRMEE")
                "TERMINEES"   -> s.statut in listOf("TERMINEE", "ANNULEE")
                else -> true
            }
        }
        adapter.submit(filtered)
        messageView.text = if (filtered.isEmpty()) "${allSessions.size} sessions au total" else "${filtered.size} sessions"
        messageView.visibility = View.VISIBLE
    }

    private fun loadSessions() {
        progressBar.visibility = View.VISIBLE
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.getSessions()
                val data = response.data
                if (response.status != "success" || data == null) throw Exception(response.message)
                allSessions = data
                applyFilter()
            } catch (e: Exception) {
                messageView.text = e.message ?: "Erreur réseau"
                messageView.visibility = View.VISIBLE
            } finally {
                progressBar.visibility = View.GONE
            }
        }
    }

    private fun showForm(item: SessionDto?) {
        if (centres.isEmpty() || vaccins.isEmpty()) { loadReferences(); return }
        val root = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL; setPadding(64, 32, 64, 8)
        }
        fun et(hint: String, value: String = "") = EditText(requireContext()).apply {
            this.hint = hint; setText(value)
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT
            ).also { it.bottomMargin = 14 }
        }
        fun sp(labels: List<String>, sel: Int = 0) = Spinner(requireContext()).apply {
            adapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_dropdown_item, labels)
            setSelection(sel.coerceAtLeast(0))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT
            ).also { it.bottomMargin = 14 }
        }
        val cSp = sp(centres.map { it.nom ?: "Centre #${it.id}" }, centres.indexOfFirst { it.id == item?.centreId })
        val vSp = sp(vaccins.map { it.nom ?: "Vaccin #${it.id}" }, vaccins.indexOfFirst { it.id == item?.vaccinId })
        val date = et("Date YYYY-MM-DD", item?.dateSession?.take(10) ?: "")
        val debut = et("Heure début HH:MM", item?.heureDebut?.take(5) ?: "")
        val fin = et("Heure fin HH:MM", item?.heureFin?.take(5) ?: "")
        val cap = et("Capacité max", item?.maxInscriptions?.toString() ?: "")
        listOf(cSp, vSp, date, debut, fin, cap).forEach { root.addView(it) }

        AlertDialog.Builder(requireContext())
            .setTitle(if (item == null) "Créer une session" else "Modifier la session")
            .setView(root)
            .setNegativeButton("Annuler", null)
            .setPositiveButton("Valider") { _, _ ->
                saveSession(item?.id, SessionRequest(
                    centreId = centres.getOrNull(cSp.selectedItemPosition)?.id,
                    vaccinId = vaccins.getOrNull(vSp.selectedItemPosition)?.id,
                    dateSession = date.text.toString().trim(),
                    heureDebut = debut.text.toString().trim(),
                    heureFin = fin.text.toString().trim(),
                    maxInscriptions = cap.text.toString().trim().toIntOrNull()
                ))
            }
            .show()
    }

    private fun saveSession(id: Int?, request: SessionRequest) {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val r = if (id == null) ApiClient.apiService.createSession(request)
                else ApiClient.apiService.updateSession(id, request)
                if (r.status != "success") throw Exception(r.message ?: "Refusé")
                Toast.makeText(requireContext(), "Session enregistrée", Toast.LENGTH_SHORT).show()
                loadSessions()
            } catch (e: Exception) {
                Toast.makeText(requireContext(), e.message ?: "Erreur réseau", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun updateStatus(item: SessionDto, action: String) {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val r = when (action) {
                    "confirm" -> ApiClient.apiService.confirmSession(item.id)
                    "start"   -> ApiClient.apiService.startSession(item.id)
                    "end"     -> ApiClient.apiService.endSession(item.id)
                    else      -> ApiClient.apiService.cancelSession(item.id)
                }
                if (r.status != "success") throw Exception(r.message ?: "Refusé")
                loadSessions()
            } catch (e: Exception) {
                Toast.makeText(requireContext(), e.message ?: "Erreur réseau", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun loadReferences() {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val r = ApiClient.apiService.getAdminReferences()
                if (r.status == "success") {
                    centres = r.data?.centres.orEmpty()
                    vaccins = r.data?.vaccins.orEmpty()
                }
            } catch (_: Exception) {}
        }
    }
}

private class SessionXmlAdapter(
    private val onEdit: (SessionDto) -> Unit,
    private val onAction: (SessionDto, String) -> Unit
) : RecyclerView.Adapter<SessionXmlAdapter.VH>() {
    private var items: List<SessionDto> = emptyList()
    fun submit(next: List<SessionDto>) { items = next; notifyDataSetChanged() }
    override fun getItemCount() = items.size
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH =
        VH(android.view.LayoutInflater.from(parent.context).inflate(R.layout.item_admin_session, parent, false), onEdit, onAction)
    override fun onBindViewHolder(holder: VH, position: Int) = holder.bind(items[position])

    class VH(v: View, val onEdit: (SessionDto) -> Unit, val onAction: (SessionDto, String) -> Unit) : RecyclerView.ViewHolder(v) {
        private val tvNom = v.findViewById<TextView>(R.id.tvSessionNom)
        private val tvCentre = v.findViewById<TextView>(R.id.tvSessionCentre)
        private val tvStatut = v.findViewById<TextView>(R.id.tvSessionStatut)
        private val tvDate = v.findViewById<TextView>(R.id.tvSessionDate)
        private val tvHeure = v.findViewById<TextView>(R.id.tvSessionHeure)
        private val pb = v.findViewById<ProgressBar>(R.id.pbSessionProgress)
        private val tvCount = v.findViewById<TextView>(R.id.tvSessionCount)
        private val llActions = v.findViewById<LinearLayout>(R.id.llSessionActions)

        fun bind(s: SessionDto) {
            tvNom.text = s.vaccinNom ?: "Vaccin #${s.vaccinId}"
            tvCentre.text = s.centreNom ?: "Centre #${s.centreId}"
            tvDate.text = s.dateSession?.take(10) ?: "-"
            tvHeure.text = "${s.heureDebut?.take(5) ?: "-"} — ${s.heureFin?.take(5) ?: "-"}"

            val inscrits = s.inscrits ?: 0
            val max = s.maxInscriptions ?: 1
            val pct = ((inscrits.toFloat() / max) * 100).toInt().coerceIn(0, 100)
            pb.progress = pct
            tvCount.text = "$inscrits / $max"

            val status = s.statut?.uppercase() ?: ""
            val (statusLabel, statusColor, badgeBg) = when (status) {
                "EN_COURS"   -> Triple("En cours", "#065F46", R.drawable.bg_badge_success)
                "CONFIRMEE"  -> Triple("Confirmée", "#1D4ED8", R.drawable.bg_badge_info)
                "PLANIFIEE"  -> Triple("Planifiée", "#1D4ED8", R.drawable.bg_badge_info)
                "TERMINEE"   -> Triple("Terminée", "#475569", R.drawable.bg_badge_teal)
                "ANNULEE"    -> Triple("Annulée", "#991B1B", R.drawable.bg_badge_error)
                else         -> Triple(s.statut ?: "-", "#64748B", R.drawable.bg_badge_teal)
            }
            tvStatut.text = statusLabel
            tvStatut.setBackgroundResource(badgeBg)
            tvStatut.setTextColor(Color.parseColor(statusColor))

            llActions.removeAllViews()
            fun addBtn(label: String, color: Int, click: () -> Unit) {
                llActions.addView(Button(itemView.context).apply {
                    text = label
                    setTextColor(Color.WHITE)
                    backgroundTintList = android.content.res.ColorStateList.valueOf(color)
                    textSize = 11f
                    layoutParams = LinearLayout.LayoutParams(0, 80).also { it.weight = 1f; it.marginEnd = 6 }
                    setOnClickListener { click() }
                })
            }
            if (status in listOf("EN_FORMATION", "PLANIFIEE", "CONFIRMEE")) {
                addBtn("Modifier", Color.parseColor("#64748B")) { onEdit(s) }
            }
            if (status in listOf("EN_FORMATION", "PLANIFIEE")) addBtn("Confirmer", Color.parseColor("#3B82F6")) { onAction(s, "confirm") }
            if (status == "CONFIRMEE") addBtn("Démarrer", Color.parseColor("#0F766E")) { onAction(s, "start") }
            if (status == "EN_COURS") addBtn("Terminer", Color.parseColor("#8B5CF6")) { onAction(s, "end") }
            if (status in listOf("EN_FORMATION", "PLANIFIEE", "CONFIRMEE")) addBtn("Annuler", Color.parseColor("#EF4444")) { onAction(s, "cancel") }
        }
    }
}
