package com.example.vaccinkid

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.cardview.widget.CardView
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.vaccinkid.model.RendezVousDto
import com.example.vaccinkid.network.ApiClient
import kotlinx.coroutines.launch

data class RdvItem(
    val heure: String,
    val enfant: String,
    val vaccin: String,
    val parent: String,
    val statut: String
)

class RdvListFragment : Fragment() {

    companion object {
        private const val ARG_TYPE = "type"
        fun newInstance(type: Int) = RdvListFragment().apply {
            arguments = Bundle().apply { putInt(ARG_TYPE, type) }
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_rdv_list, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val type = arguments?.getInt(ARG_TYPE) ?: 0
        val recycler = view.findViewById<RecyclerView>(R.id.recyclerRdv)
        recycler.layoutManager = LinearLayoutManager(requireContext())
        recycler.adapter = RdvAdapter(listOf(RdvItem("", "Chargement...", "", "", "")))

        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val statut = if (type == 0) null else "CONFIRME"
                val response = ApiClient.apiService.getRendezVous(statut = statut)
                val data = response.data
                val items = if (response.status == "success" && data != null) {
                    data.map { it.toRdvItem() }
                } else {
                    listOf(RdvItem("", response.message ?: "Rendez-vous indisponibles", "", "", ""))
                }
                recycler.adapter = RdvAdapter(items.ifEmpty {
                    listOf(RdvItem("", "Aucun rendez-vous retourne par le serveur", "", "", ""))
                })
            } catch (error: Exception) {
                recycler.adapter = RdvAdapter(
                    listOf(RdvItem("", error.message ?: "Erreur reseau", "", "", ""))
                )
            }
        }
    }

    private fun RendezVousDto.toRdvItem(): RdvItem {
        val enfant = listOfNotNull(bebePrenom, bebeNom).joinToString(" ").ifBlank { "Bebe #$bebeId" }
        val parent = listOfNotNull(parentPrenom, parentNom).joinToString(" ").ifBlank {
            parentTelephone ?: "Parent #$parentId"
        }
        return RdvItem(
            heure = "RDV #$id",
            enfant = enfant,
            vaccin = "Session ${sessionId ?: "-"}",
            parent = parent,
            statut = statut ?: "INCONNU"
        )
    }
}

class RdvAdapter(private val items: List<RdvItem>) :
    RecyclerView.Adapter<RdvAdapter.RdvViewHolder>() {

    inner class RdvViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val tvHeure: TextView  = view.findViewById(R.id.tvRdvHeure)
        val tvEnfant: TextView = view.findViewById(R.id.tvRdvEnfant)
        val tvVaccin: TextView = view.findViewById(R.id.tvRdvVaccin)
        val tvParent: TextView = view.findViewById(R.id.tvRdvParent)
        val tvStatut: TextView = view.findViewById(R.id.tvRdvStatut)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RdvViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_rdv, parent, false)
        return RdvViewHolder(view)
    }

    override fun onBindViewHolder(holder: RdvViewHolder, position: Int) {
        val item = items[position]
        holder.tvHeure.text  = item.heure
        holder.tvEnfant.text = item.enfant
        holder.tvVaccin.text = item.vaccin
        holder.tvParent.text = "Parent : ${item.parent}"
        holder.tvStatut.text = item.statut

        // Couleur statut
        val color = when (item.statut) {
            "CONFIRMÉ"   -> 0xFF0F6E56.toInt()
            "ABSENT"     -> 0xFFE02060.toInt()
            else         -> 0xFFC8550A.toInt()
        }
        holder.tvStatut.setTextColor(color)
    }

    override fun getItemCount() = items.size
}
