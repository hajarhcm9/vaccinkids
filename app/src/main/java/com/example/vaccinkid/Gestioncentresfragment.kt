package com.example.vaccinkid

import android.app.AlertDialog
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.vaccinkid.model.AdminCentreDto
import com.example.vaccinkid.model.AdminCentreRequest
import com.example.vaccinkid.network.ApiClient
import kotlinx.coroutines.launch

class GestionCentresFragment : Fragment(R.layout.fragment_gestion_centres) {

    private lateinit var adapter: CentreXmlAdapter
    private lateinit var messageView: TextView
    private lateinit var resumeView: TextView
    private lateinit var progressBar: ProgressBar

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        messageView = view.findViewById(R.id.tvCentresMessage)
        resumeView = view.findViewById(R.id.tvCentresResume)
        progressBar = view.findViewById(R.id.centresProgress)

        adapter = CentreXmlAdapter(
            onEdit = { showForm(it) },
            onToggle = { toggleCentre(it) }
        )
        view.findViewById<RecyclerView>(R.id.rvCentres).apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = this@GestionCentresFragment.adapter
        }

        view.findViewById<View>(R.id.fabAddCentre).setOnClickListener { showForm(null) }

        loadCentres()
    }

    private fun loadCentres() {
        progressBar.visibility = View.VISIBLE
        messageView.visibility = View.GONE
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.getAdminCentres()
                val data = response.data
                if (response.status != "success" || data == null) throw Exception(response.message)
                adapter.submit(data.centres)
                val actifs = data.centres.count { it.estActif == true }
                resumeView.text = "$actifs actif(s) sur ${data.total} centres"
            } catch (e: Exception) {
                messageView.text = e.message ?: "Erreur réseau"
                messageView.visibility = View.VISIBLE
            } finally {
                progressBar.visibility = View.GONE
            }
        }
    }

    private fun showForm(item: AdminCentreDto?) {
        val root = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL; setPadding(64, 32, 64, 8)
        }
        fun et(hint: String, value: String = "") = EditText(requireContext()).apply {
            this.hint = hint; setText(value)
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT
            ).also { it.bottomMargin = 16 }
        }
        val nom = et("Nom du centre", item?.nom ?: "")
        val adresse = et("Adresse", item?.adresse ?: "")
        val telephone = et("Téléphone", item?.telephone ?: "")
        val gpsLat = et("GPS lat", item?.gpsLat?.toString() ?: "")
        val gpsLng = et("GPS lng", item?.gpsLng?.toString() ?: "")
        listOf(nom, adresse, telephone, gpsLat, gpsLng).forEach { root.addView(it) }

        AlertDialog.Builder(requireContext())
            .setTitle(if (item == null) "Ajouter centre" else "Modifier centre")
            .setView(root)
            .setNegativeButton("Annuler", null)
            .setPositiveButton("Valider") { _, _ ->
                saveCentre(item?.id, AdminCentreRequest(
                    nom = nom.text.toString().trim(),
                    adresse = adresse.text.toString().trim(),
                    telephone = telephone.text.toString().trim(),
                    gpsLat = gpsLat.text.toString().trim().toDoubleOrNull(),
                    gpsLng = gpsLng.text.toString().trim().toDoubleOrNull()
                ))
            }
            .show()
    }

    private fun saveCentre(id: Int?, request: AdminCentreRequest) {
        if (request.nom.isNullOrBlank() || request.adresse.isNullOrBlank() || request.telephone.isNullOrBlank()) {
            Toast.makeText(requireContext(), "Nom, adresse et téléphone sont obligatoires", Toast.LENGTH_SHORT).show()
            return
        }
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val r = if (id == null) ApiClient.apiService.createAdminCentre(request)
                else ApiClient.apiService.updateAdminCentre(id, request)
                if (r.status != "success") throw Exception(r.message ?: "Refusé")
                Toast.makeText(requireContext(), "Centre enregistré", Toast.LENGTH_SHORT).show()
                loadCentres()
            } catch (e: Exception) {
                Toast.makeText(requireContext(), e.message ?: "Erreur réseau", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun toggleCentre(item: AdminCentreDto) {
        AlertDialog.Builder(requireContext())
            .setTitle(if (item.estActif == true) "Désactiver le centre" else "Réactiver le centre")
            .setMessage(item.nom ?: "Centre #${item.id}")
            .setNegativeButton("Annuler", null)
            .setPositiveButton("Confirmer") { _, _ ->
                viewLifecycleOwner.lifecycleScope.launch {
                    try {
                        val r = if (item.estActif == true) ApiClient.apiService.deactivateAdminCentre(item.id)
                        else ApiClient.apiService.reactivateAdminCentre(item.id)
                        if (r.status != "success") throw Exception(r.message)
                        loadCentres()
                    } catch (e: Exception) {
                        Toast.makeText(requireContext(), e.message ?: "Erreur réseau", Toast.LENGTH_SHORT).show()
                    }
                }
            }
            .show()
    }
}

private class CentreXmlAdapter(
    private val onEdit: (AdminCentreDto) -> Unit,
    private val onToggle: (AdminCentreDto) -> Unit
) : RecyclerView.Adapter<CentreXmlAdapter.VH>() {
    private var items: List<AdminCentreDto> = emptyList()
    fun submit(next: List<AdminCentreDto>) { items = next; notifyDataSetChanged() }
    override fun getItemCount() = items.size
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH =
        VH(android.view.LayoutInflater.from(parent.context).inflate(R.layout.item_admin_centre, parent, false), onEdit, onToggle)
    override fun onBindViewHolder(h: VH, pos: Int) = h.bind(items[pos])

    class VH(v: View, val onEdit: (AdminCentreDto) -> Unit, val onToggle: (AdminCentreDto) -> Unit) : RecyclerView.ViewHolder(v) {
        private val tvNom = v.findViewById<TextView>(R.id.tvCentreNom)
        private val tvBadge = v.findViewById<TextView>(R.id.tvCentreBadge)
        private val tvAdresse = v.findViewById<TextView>(R.id.tvCentreAdresse)
        private val tvPersonnel = v.findViewById<TextView>(R.id.tvCentrePersonnel)
        private val tvSessions = v.findViewById<TextView>(R.id.tvCentreSessions)
        private val tvAlertes = v.findViewById<TextView>(R.id.tvCentreAlertes)
        private val llActions = v.findViewById<LinearLayout>(R.id.llCentreActions)

        fun bind(c: AdminCentreDto) {
            val actif = c.estActif == true
            tvNom.text = c.nom ?: "Centre #${c.id}"
            tvAdresse.text = buildString {
                append(c.adresse ?: "")
                if (!c.telephone.isNullOrBlank()) append("  ·  ${c.telephone}")
            }
            tvPersonnel.text = "${c.nbPersonnel ?: 0} personnel"
            tvSessions.text = "${c.nbSessions ?: 0} sessions"
            val alertes = c.alertesStock ?: 0
            tvAlertes.text = if (alertes > 0) "$alertes alertes stock" else ""
            tvAlertes.visibility = if (alertes > 0) View.VISIBLE else View.GONE

            if (actif) {
                tvBadge.text = "Actif"
                tvBadge.setBackgroundResource(R.drawable.bg_badge_success)
                tvBadge.setTextColor(Color.parseColor("#065F46"))
            } else {
                tvBadge.text = "Inactif"
                tvBadge.setBackgroundResource(R.drawable.bg_badge_error)
                tvBadge.setTextColor(Color.parseColor("#991B1B"))
            }

            llActions.removeAllViews()
            fun btn(label: String, color: Int, click: () -> Unit) {
                llActions.addView(Button(itemView.context).apply {
                    text = label
                    setTextColor(Color.WHITE)
                    backgroundTintList = android.content.res.ColorStateList.valueOf(color)
                    textSize = 11f
                    layoutParams = LinearLayout.LayoutParams(0, 72).also { it.weight = 1f; it.marginEnd = 6 }
                    setOnClickListener { click() }
                })
            }
            btn("Modifier", Color.parseColor("#64748B")) { onEdit(c) }
            btn(
                if (actif) "Désactiver" else "Réactiver",
                if (actif) Color.parseColor("#EF4444") else Color.parseColor("#10B981")
            ) { onToggle(c) }
        }
    }
}
