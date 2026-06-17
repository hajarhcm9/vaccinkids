package com.example.vaccinkid

import android.app.AlertDialog
import android.graphics.Color
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.example.vaccinkid.model.RendezVousDto
import com.example.vaccinkid.network.ApiClient
import kotlinx.coroutines.launch

class AdminRendezVousFragment : Fragment() {
    private lateinit var adapter: RdvAdminAdapter
    private lateinit var messageView: TextView
    private lateinit var refreshLayout: SwipeRefreshLayout
    private var allRdv: List<RendezVousDto> = emptyList()
    private var activeFilter = "TOUS"

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        adapter = RdvAdminAdapter(onDelete = { confirmDelete(it) })

        val root = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(requireContext().getColor(R.color.bg_screen))
        }

        root.addView(LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(56, 56, 56, 24)
            addView(TextView(requireContext()).apply {
                text = "Rendez-vous"
                textSize = 24f
                setTextColor(requireContext().getColor(R.color.text_primary))
                setTypeface(null, android.graphics.Typeface.BOLD)
            })
            addView(TextView(requireContext()).apply {
                text = "Gestion de tous les RDV"
                textSize = 13f
                setTextColor(requireContext().getColor(R.color.text_secondary))
                setPadding(0, 4, 0, 0)
            })
        })

        // Filter tabs
        val tabTous = makeTab("Tous", true)
        val tabPresents = makeTab("Présents", false)
        val tabAbsents = makeTab("Absents", false)
        val tabAttente = makeTab("En attente", false)
        val tabRow = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(44, 0, 44, 20)
            addView(tabTous, LinearLayout.LayoutParams(0, 90, 1f))
            addView(tabPresents, LinearLayout.LayoutParams(0, 90, 1f))
            addView(tabAbsents, LinearLayout.LayoutParams(0, 90, 1f))
            addView(tabAttente, LinearLayout.LayoutParams(0, 90, 1f))
        }
        root.addView(tabRow)

        fun selectTab(filter: String) {
            activeFilter = filter
            mapOf(tabTous to "TOUS", tabPresents to "PRESENT", tabAbsents to "ABSENT", tabAttente to "EN_ATTENTE").forEach { (tv, key) ->
                if (key == filter) {
                    tv.setBackgroundResource(R.drawable.bg_btn_teal_pill)
                    tv.setTextColor(requireContext().getColor(R.color.white))
                    tv.setTypeface(null, android.graphics.Typeface.BOLD)
                } else {
                    tv.setBackgroundResource(R.drawable.bg_chip_inactive)
                    tv.setTextColor(requireContext().getColor(R.color.text_secondary))
                    tv.setTypeface(null, android.graphics.Typeface.NORMAL)
                }
            }
            applyFilter()
        }
        tabTous.setOnClickListener { selectTab("TOUS") }
        tabPresents.setOnClickListener { selectTab("PRESENT") }
        tabAbsents.setOnClickListener { selectTab("ABSENT") }
        tabAttente.setOnClickListener { selectTab("EN_ATTENTE") }

        messageView = TextView(requireContext()).apply {
            setPadding(56, 0, 56, 8)
            setTextColor(requireContext().getColor(R.color.text_secondary))
        }
        root.addView(messageView)

        val rv = RecyclerView(requireContext()).apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = this@AdminRendezVousFragment.adapter
            clipToPadding = false
            setPadding(44, 0, 44, 60)
        }

        refreshLayout = SwipeRefreshLayout(requireContext()).apply {
            addView(rv)
        }
        root.addView(refreshLayout, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f
        ))

        refreshLayout.setOnRefreshListener { loadRdv() }
        return root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        loadRdv()
    }

    private fun loadRdv() {
        refreshLayout.isRefreshing = true
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val resp = ApiClient.apiService.getRendezVous()
                if (resp.status != "success") throw Exception(resp.message ?: "Erreur")
                allRdv = resp.data.orEmpty()
                applyFilter()
            } catch (e: Exception) {
                messageView.text = e.message ?: "Erreur réseau"
            } finally {
                refreshLayout.isRefreshing = false
            }
        }
    }

    private fun applyFilter() {
        val filtered = if (activeFilter == "TOUS") allRdv
        else allRdv.filter { it.statut?.uppercase() == activeFilter }
        adapter.submit(filtered)
        messageView.text = "${filtered.size} RDV"
    }

    private fun confirmDelete(rdv: RendezVousDto) {
        AlertDialog.Builder(requireContext())
            .setTitle("Supprimer ce RDV ?")
            .setMessage("RDV #${rdv.id} — ${rdv.statut ?: "-"}")
            .setNegativeButton("Annuler", null)
            .setPositiveButton("Supprimer") { _, _ ->
                viewLifecycleOwner.lifecycleScope.launch {
                    try {
                        val r = ApiClient.apiService.deleteRendezVous(rdv.id)
                        if (r.status != "success") throw Exception(r.message)
                        Toast.makeText(requireContext(), "RDV supprimé", Toast.LENGTH_SHORT).show()
                        loadRdv()
                    } catch (e: Exception) {
                        Toast.makeText(requireContext(), e.message ?: "Erreur réseau", Toast.LENGTH_SHORT).show()
                    }
                }
            }
            .show()
    }

    private fun makeTab(label: String, active: Boolean) = TextView(requireContext()).apply {
        text = label
        gravity = android.view.Gravity.CENTER
        textSize = 11f
        if (active) {
            setBackgroundResource(R.drawable.bg_btn_teal_pill)
            setTextColor(requireContext().getColor(R.color.white))
            setTypeface(null, android.graphics.Typeface.BOLD)
        } else {
            setBackgroundResource(R.drawable.bg_chip_inactive)
            setTextColor(requireContext().getColor(R.color.text_secondary))
        }
        isClickable = true; isFocusable = true
    }
}

private class RdvAdminAdapter(
    private val onDelete: (RendezVousDto) -> Unit
) : RecyclerView.Adapter<RdvAdminAdapter.VH>() {
    private var items: List<RendezVousDto> = emptyList()
    fun submit(next: List<RendezVousDto>) { items = next; notifyDataSetChanged() }
    override fun getItemCount() = items.size
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
        val card = LinearLayout(parent.context).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundResource(R.drawable.bg_card_rounded)
            layoutParams = RecyclerView.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
            ).also { it.bottomMargin = 16 }
            setPadding(28, 20, 28, 16)
        }
        return VH(card, onDelete)
    }
    override fun onBindViewHolder(h: VH, pos: Int) = h.bind(items[pos])

    class VH(
        private val root: LinearLayout,
        private val onDelete: (RendezVousDto) -> Unit
    ) : RecyclerView.ViewHolder(root) {
        fun bind(rdv: RendezVousDto) {
            root.removeAllViews()
            val ctx = root.context
            val statut = rdv.statut?.uppercase() ?: "INCONNU"
            val statusColor = when (statut) {
                "PRESENT" -> Color.parseColor("#10B981")
                "ABSENT" -> Color.parseColor("#EF4444")
                "EN_ATTENTE" -> Color.parseColor("#F59E0B")
                "CONFIRME" -> Color.parseColor("#3B82F6")
                else -> Color.GRAY
            }

            root.addView(LinearLayout(ctx).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = android.view.Gravity.CENTER_VERTICAL
                addView(LinearLayout(ctx).apply {
                    orientation = LinearLayout.VERTICAL
                    layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                    addView(TextView(ctx).apply {
                        text = "RDV #${rdv.id}"
                        textSize = 15f
                        setTypeface(null, android.graphics.Typeface.BOLD)
                        setTextColor(ctx.getColor(R.color.text_primary))
                    })
                    addView(TextView(ctx).apply {
                        text = rdv.heureDebut?.take(5)?.let { "Heure : $it" } ?: "Heure non définie"
                        textSize = 12f
                        setTextColor(ctx.getColor(R.color.text_secondary))
                        setPadding(0, 2, 0, 0)
                    })
                })
                addView(TextView(ctx).apply {
                    text = statut.replace("_", " ")
                    textSize = 11f
                    setPadding(16, 6, 16, 6)
                    setBackgroundColor(statusColor)
                    setTextColor(Color.WHITE)
                })
            })

            rdv.parentNom?.let { nom ->
                root.addView(TextView(ctx).apply {
                    text = "Parent : $nom"
                    textSize = 12f
                    setTextColor(ctx.getColor(R.color.text_secondary))
                    setPadding(0, 8, 0, 0)
                })
            }

            rdv.vaccinNom?.let { vaccin ->
                root.addView(TextView(ctx).apply {
                    text = "Vaccin : $vaccin"
                    textSize = 12f
                    setTextColor(ctx.getColor(R.color.text_secondary))
                    setPadding(0, 2, 0, 0)
                })
            }

            root.addView(android.widget.Button(ctx).apply {
                text = "Supprimer"
                setTextColor(Color.WHITE)
                backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#EF4444"))
                textSize = 11f
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT, 72
                ).also { it.topMargin = 12 }
                setOnClickListener { onDelete(rdv) }
            })
        }
    }
}
