package com.example.vaccinkid

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.vaccinkid.model.BebeDto
import com.example.vaccinkid.model.RendezVousDto
import com.example.vaccinkid.db.SyncManager
import com.example.vaccinkid.model.UpdateRendezVousRequest
import com.example.vaccinkid.model.VaccinationHistoryDto
import com.example.vaccinkid.network.ApiClient
import com.google.gson.Gson
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class EnfantProfilFragment : Fragment(R.layout.fragment_enfant_profil) {

    private var bebeId: Int = 0
    private var bebeName: String = ""
    private var eligibleRdvs: List<RendezVousDto> = emptyList()
    private var lastVaccinations: List<VaccinationHistoryDto> = emptyList()
    private var eligibleRdvAdapter: EligibleRdvAdapter? = null

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val args = requireArguments()
        bebeId = args.getInt(ARG_BEBE_ID, 0)
        bebeName = args.getString(ARG_BEBE_NAME, "Bébé").orEmpty()
        val dateNaissance = args.getString(ARG_DATE_NAISSANCE)
        val sexe = args.getString(ARG_SEXE)
        val codeQr = args.getString(ARG_CODE_QR)
        val parentNom = args.getString(ARG_PARENT_NOM)
        val parentTel = args.getString(ARG_PARENT_TEL)

        val gson = Gson()
        eligibleRdvs = args.getString(ARG_RDVS_JSON)?.let {
            gson.fromJson(it, Array<RendezVousDto>::class.java).toList()
        } ?: emptyList()
        lastVaccinations = args.getString(ARG_HIST_JSON)?.let {
            gson.fromJson(it, Array<VaccinationHistoryDto>::class.java).toList()
        } ?: emptyList()

        bindIdentity(view, dateNaissance, sexe)
        bindParent(view, parentNom, parentTel)
        setupEligibleRdvs(view)
        setupVaccinHistory(view)

        view.findViewById<View>(R.id.btnBackProfil).setOnClickListener {
            parentFragmentManager.popBackStack()
        }

        view.findViewById<View>(R.id.btnViewGrowth).setOnClickListener {
            (activity as? MainInfirmierActivity)?.naviguerVers(
                GrowthChartFragment.newInstance(bebeId, bebeName, sexe, dateNaissance)
            )
        }

        view.findViewById<View>(R.id.btnViewQr).setOnClickListener {
            (activity as? MainInfirmierActivity)?.naviguerVers(
                BebeQrFragment.newInstance(bebeName, codeQr)
            )
        }
    }

    private fun bindIdentity(view: View, dateNaissance: String?, sexe: String?) {
        val nameParts = bebeName.split(" ").filter { it.isNotBlank() }
        val initials = nameParts.mapNotNull { it.firstOrNull()?.uppercaseChar() }.joinToString("").take(2)
        view.findViewById<TextView>(R.id.tvProfilInitials).text = initials.ifBlank { "?" }
        view.findViewById<TextView>(R.id.tvProfilName).text = bebeName
        view.findViewById<TextView>(R.id.tvProfilAge).text = calculateAge(dateNaissance)

        val genderView = view.findViewById<TextView>(R.id.tvProfilGender)
        when (sexe?.lowercase()?.trim()) {
            "masculin", "m", "garcon", "garçon", "male" -> {
                genderView.text = "Garçon"
                genderView.setBackgroundResource(R.drawable.bg_badge_info)
                genderView.visibility = View.VISIBLE
            }
            "feminin", "féminin", "f", "fille", "female" -> {
                genderView.text = "Fille"
                genderView.setBackgroundResource(R.drawable.bg_badge_success)
                genderView.visibility = View.VISIBLE
            }
            else -> genderView.visibility = View.GONE
        }
    }

    private fun bindParent(view: View, parentNomArg: String?, parentTelArg: String?) {
        val firstRdv = eligibleRdvs.firstOrNull()
        val phone = parentTelArg ?: firstRdv?.parentTelephone
        val resolvedName = parentNomArg?.ifBlank { null }
            ?: listOfNotNull(firstRdv?.parentPrenom, firstRdv?.parentNom).joinToString(" ").ifBlank { null }
            ?: "Non renseigné"

        view.findViewById<TextView>(R.id.tvParentNom).text = resolvedName
        view.findViewById<TextView>(R.id.tvParentPhone).text = phone?.ifBlank { "—" } ?: "—"

        view.findViewById<View>(R.id.btnCallParent).setOnClickListener {
            if (!phone.isNullOrBlank()) {
                startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone")))
            } else {
                Toast.makeText(requireContext(), "Numéro non disponible", Toast.LENGTH_SHORT).show()
            }
        }
        view.findViewById<View>(R.id.btnSmsParent).setOnClickListener {
            if (!phone.isNullOrBlank()) {
                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("sms:$phone")))
            } else {
                Toast.makeText(requireContext(), "Numéro non disponible", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun setupEligibleRdvs(view: View) {
        val rv = view.findViewById<RecyclerView>(R.id.rvEligibleRdv)
        val empty = view.findViewById<View>(R.id.tvEmptyRdv)
        if (eligibleRdvs.isEmpty()) {
            rv.visibility = View.GONE
            empty.visibility = View.VISIBLE
            return
        }
        rv.visibility = View.VISIBLE
        empty.visibility = View.GONE
        rv.isNestedScrollingEnabled = false
        if (rv.layoutManager == null) rv.layoutManager = LinearLayoutManager(requireContext())
        if (eligibleRdvAdapter == null) {
            eligibleRdvAdapter = EligibleRdvAdapter()
            rv.adapter = eligibleRdvAdapter
        } else {
            eligibleRdvAdapter!!.notifyDataSetChanged()
        }
    }

    private fun setupVaccinHistory(view: View) {
        val rv = view.findViewById<RecyclerView>(R.id.rvVaccinHistory)
        val empty = view.findViewById<View>(R.id.tvEmptyHistory)
        if (lastVaccinations.isEmpty()) {
            rv.visibility = View.GONE
            empty.visibility = View.VISIBLE
            return
        }
        rv.isNestedScrollingEnabled = false
        rv.layoutManager = LinearLayoutManager(requireContext())
        rv.adapter = VaccinHistoryAdapter()
    }

    private fun updateRdvStatus(rdvId: Int, statut: String) {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val r = ApiClient.apiService.updateRendezVous(rdvId, UpdateRendezVousRequest(statut))
                if (r.status != "success") throw Exception(r.message ?: "Refusé")
                val msg = if (statut == "PRESENT") "✓ Patient marqué présent" else "Patient marqué absent"
                Toast.makeText(requireContext(), msg, Toast.LENGTH_SHORT).show()
                eligibleRdvs = eligibleRdvs.map { if (it.id == rdvId) it.copy(statut = statut) else it }
                setupEligibleRdvs(requireView())
            } catch (e: Exception) {
                SyncManager.queueRdvStatusUpdate(requireContext(), rdvId, statut)
                eligibleRdvs = eligibleRdvs.map { if (it.id == rdvId) it.copy(statut = statut) else it }
                setupEligibleRdvs(requireView())
                Toast.makeText(requireContext(), "⚠ Hors-ligne — changement enregistré localement", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun calculateAge(dateNaissance: String?): String {
        if (dateNaissance.isNullOrBlank()) return "Âge inconnu"
        return try {
            val dob = SimpleDateFormat("yyyy-MM-dd", Locale.FRENCH).parse(dateNaissance) ?: return "Âge inconnu"
            val totalMonths = ((Date().time - dob.time) / (1000L * 60 * 60 * 24 * 30.44)).toInt()
            val years = totalMonths / 12
            val months = totalMonths % 12
            if (years > 0) "$years an${if (years > 1) "s" else ""}, $months mois" else "$totalMonths mois"
        } catch (_: Exception) { "Âge inconnu" }
    }

    private fun formatDate(dateHeure: String?): String {
        if (dateHeure.isNullOrBlank()) return "—"
        return try {
            val output = SimpleDateFormat("dd/MM/yyyy", Locale.FRENCH)
            val cleaned = dateHeure.take(19).replace("T", " ")
            val input = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.FRENCH)
            output.format(input.parse(cleaned) ?: return dateHeure.take(10))
        } catch (_: Exception) { dateHeure.take(10) }
    }

    // ── Adapter: eligible RDVs ─────────────────────────────────────────────────

    inner class EligibleRdvAdapter : RecyclerView.Adapter<EligibleRdvAdapter.Holder>() {
        inner class Holder(v: View) : RecyclerView.ViewHolder(v)

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) = Holder(
            LayoutInflater.from(parent.context).inflate(R.layout.item_eligible_rdv, parent, false)
        )

        override fun getItemCount() = eligibleRdvs.size

        override fun onBindViewHolder(holder: Holder, position: Int) {
            val rdv = eligibleRdvs[position]
            val v = holder.itemView

            v.findViewById<TextView>(R.id.tvRdvVaccin).text = rdv.vaccinNom ?: "Vaccination"
            v.findViewById<TextView>(R.id.tvRdvHeure).text = rdv.heureDebut?.take(5) ?: "—"

            val statutView = v.findViewById<TextView>(R.id.tvRdvStatut)
            when (rdv.statut?.lowercase()?.replace("_", " ")) {
                "confirme", "confirmé" -> {
                    statutView.text = "Confirmé"
                    statutView.setBackgroundResource(R.drawable.bg_badge_success)
                    statutView.setTextColor(requireContext().getColor(R.color.success_dark))
                }
                "en attente" -> {
                    statutView.text = "En attente"
                    statutView.setBackgroundResource(R.drawable.bg_badge_warning)
                    statutView.setTextColor(requireContext().getColor(R.color.warning_dark))
                }
                else -> {
                    statutView.text = rdv.statut ?: ""
                    statutView.setBackgroundResource(R.drawable.bg_badge_info)
                    statutView.setTextColor(requireContext().getColor(R.color.info_dark))
                }
            }

            val statut = rdv.statut?.uppercase()
            val canVaccinate = statut in listOf("PRESENT", "CONFIRME")
            val canMarkPresent = RdvTransitionPolicy.allows(rdv.statut, "PRESENT")
            val canMarkAbsent = RdvTransitionPolicy.allows(rdv.statut, "ABSENT")

            val btnVacciner = v.findViewById<View>(R.id.btnRdvVacciner)
            btnVacciner.visibility = if (canVaccinate) View.VISIBLE else View.GONE
            btnVacciner.setOnClickListener {
                val sessionId = rdv.sessionId
                if (sessionId == null || sessionId <= 0) {
                    Toast.makeText(requireContext(), "Ce RDV n'est lié à aucune session active", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }
                (activity as? MainInfirmierActivity)?.naviguerVers(
                    EnregistrementVaccinationFragment.newInstance(bebeName, bebeId.toString(), rdv.id, sessionId)
                )
            }

            val btnPresent = v.findViewById<View>(R.id.btnRdvPresent)
            btnPresent.visibility = if (canMarkPresent) View.VISIBLE else View.GONE
            btnPresent.setOnClickListener { updateRdvStatus(rdv.id, "PRESENT") }

            val btnAbsent = v.findViewById<View>(R.id.btnRdvAbsent)
            btnAbsent.visibility = if (canMarkAbsent) View.VISIBLE else View.GONE
            btnAbsent.setOnClickListener { updateRdvStatus(rdv.id, "ABSENT") }
        }
    }

    // ── Adapter: vaccination history ───────────────────────────────────────────

    inner class VaccinHistoryAdapter : RecyclerView.Adapter<VaccinHistoryAdapter.Holder>() {
        inner class Holder(v: View) : RecyclerView.ViewHolder(v)

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) = Holder(
            LayoutInflater.from(parent.context).inflate(R.layout.item_vaccination_history, parent, false)
        )

        override fun getItemCount() = lastVaccinations.size

        override fun onBindViewHolder(holder: Holder, position: Int) {
            val hist = lastVaccinations[position]
            val v = holder.itemView

            v.findViewById<TextView>(R.id.tvHistVaccinNom).text = hist.vaccinNom ?: "Vaccin"
            v.findViewById<TextView>(R.id.tvHistDate).text = formatDate(hist.dateHeure)
            v.findViewById<TextView>(R.id.tvHistInfirmier).text =
                listOfNotNull(hist.infirmierPrenom, hist.infirmierNom).joinToString(" ").ifBlank { "Infirmier(e)" }

            val poidsView = v.findViewById<TextView>(R.id.tvHistPoids)
            if (hist.poids != null) {
                poidsView.text = "${hist.poids} kg"
                poidsView.visibility = View.VISIBLE
            } else {
                poidsView.visibility = View.GONE
            }
        }
    }

    // ── Factory ────────────────────────────────────────────────────────────────

    companion object {
        private const val ARG_BEBE_ID = "bebeId"
        private const val ARG_BEBE_NAME = "bebeName"
        private const val ARG_DATE_NAISSANCE = "dateNaissance"
        private const val ARG_SEXE = "sexe"
        private const val ARG_CODE_QR = "codeQr"
        private const val ARG_PARENT_NOM = "parentNom"
        private const val ARG_PARENT_TEL = "parentTel"
        private const val ARG_RDVS_JSON = "rdvsJson"
        private const val ARG_HIST_JSON = "histJson"

        fun newInstance(
            bebe: BebeDto,
            rdvs: List<RendezVousDto>,
            hist: List<VaccinationHistoryDto>
        ): EnfantProfilFragment {
            val gson = Gson()
            val firstRdv = rdvs.firstOrNull()
            return EnfantProfilFragment().apply {
                arguments = Bundle().apply {
                    putInt(ARG_BEBE_ID, bebe.id)
                    putString(
                        ARG_BEBE_NAME,
                        listOfNotNull(bebe.prenom, bebe.nom).joinToString(" ").ifBlank { "Bébé #${bebe.id}" }
                    )
                    putString(ARG_DATE_NAISSANCE, bebe.dateNaissance)
                    putString(ARG_SEXE, bebe.sexe)
                    putString(ARG_CODE_QR, bebe.codeQr)
                    putString(
                        ARG_PARENT_NOM,
                        listOfNotNull(firstRdv?.parentPrenom, firstRdv?.parentNom).joinToString(" ").ifBlank { null }
                    )
                    putString(ARG_PARENT_TEL, firstRdv?.parentTelephone)
                    putString(ARG_RDVS_JSON, gson.toJson(rdvs))
                    putString(ARG_HIST_JSON, gson.toJson(hist))
                }
            }
        }

        fun newInstanceFromRdv(rdv: RendezVousDto): EnfantProfilFragment {
            val gson = Gson()
            val name = listOfNotNull(rdv.bebePrenom, rdv.bebeNom).joinToString(" ").ifBlank { "Bébé #${rdv.bebeId}" }
            return EnfantProfilFragment().apply {
                arguments = Bundle().apply {
                    putInt(ARG_BEBE_ID, rdv.bebeId ?: 0)
                    putString(ARG_BEBE_NAME, name)
                    putString(ARG_DATE_NAISSANCE, rdv.bebeDateNaissance)
                    putString(ARG_SEXE, rdv.bebeSexe)
                    putString(ARG_CODE_QR, rdv.bebeCodeQr)
                    putString(ARG_PARENT_NOM, listOfNotNull(rdv.parentPrenom, rdv.parentNom).joinToString(" ").ifBlank { null })
                    putString(ARG_PARENT_TEL, rdv.parentTelephone)
                    putString(ARG_RDVS_JSON, gson.toJson(listOf(rdv)))
                    putString(ARG_HIST_JSON, gson.toJson(emptyList<Any>()))
                }
            }
        }
    }
}
