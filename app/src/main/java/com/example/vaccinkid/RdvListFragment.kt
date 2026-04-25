package com.example.vaccinkid

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.cardview.widget.CardView
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView

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

        // Données mockées — à remplacer par API
        val rdvList = if (type == 0) {
            listOf(
                RdvItem("09h00", "Youssef Amrani",   "BCG",          "Karim Amrani",   "EN ATTENTE"),
                RdvItem("09h30", "Fatima Benali",    "Pentavalent",  "Sara Benali",    "CONFIRMÉ"),
                RdvItem("10h00", "Adam El Fassi",    "Polio",        "Hassan El Fassi","EN ATTENTE"),
                RdvItem("10h30", "Meryem Tazi",      "ROR",          "Leila Tazi",     "CONFIRMÉ"),
                RdvItem("11h00", "Ibrahim Ouali",    "Hépatite B",   "Ahmed Ouali",    "ABSENT"),
                RdvItem("11h30", "Nora Cherkaoui",   "BCG",          "Zineb Cherkaoui","EN ATTENTE"),
            )
        } else {
            listOf(
                RdvItem("Lun 09h", "Youssef Amrani",  "BCG",         "Karim Amrani",   "EN ATTENTE"),
                RdvItem("Lun 10h", "Fatima Benali",   "Pentavalent", "Sara Benali",    "CONFIRMÉ"),
                RdvItem("Mar 09h", "Adam El Fassi",   "Polio",       "Hassan El Fassi","EN ATTENTE"),
                RdvItem("Mar 11h", "Meryem Tazi",     "ROR",         "Leila Tazi",     "CONFIRMÉ"),
                RdvItem("Mer 09h", "Ibrahim Ouali",   "Hépatite B",  "Ahmed Ouali",    "ABSENT"),
                RdvItem("Jeu 10h", "Nora Cherkaoui",  "BCG",         "Zineb Cherkaoui","EN ATTENTE"),
                RdvItem("Ven 09h", "Khalid Mansouri", "Pentavalent", "Rim Mansouri",   "CONFIRMÉ"),
            )
        }

        val recycler = view.findViewById<RecyclerView>(R.id.recyclerRdv)
        recycler.layoutManager = LinearLayoutManager(requireContext())
        recycler.adapter = RdvAdapter(rdvList)
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