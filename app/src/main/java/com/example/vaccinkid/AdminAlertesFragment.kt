package com.example.vaccinkid

import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.vaccinkid.model.NotificationDto
import com.example.vaccinkid.network.ApiClient
import kotlinx.coroutines.launch

class AdminAlertesFragment : Fragment(R.layout.fragment_admin_alertes) {

    private lateinit var adapter: AlertesAdminAdapter
    private var allItems: List<NotificationDto> = emptyList()
    private var activeTab = "TOUTES"

    private lateinit var tabAll: TextView
    private lateinit var tabAlertes: TextView
    private lateinit var tabInfos: TextView
    private lateinit var tvMessage: TextView

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        tabAll = view.findViewById(R.id.tabAlertesAll)
        tabAlertes = view.findViewById(R.id.tabAlertesAlertes)
        tabInfos = view.findViewById(R.id.tabAlertesInfos)
        tvMessage = view.findViewById(R.id.tvAlertesMessage)

        adapter = AlertesAdminAdapter()
        view.findViewById<RecyclerView>(R.id.rvAlertes).apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = this@AdminAlertesFragment.adapter
        }

        tabAll.setOnClickListener { selectTab("TOUTES") }
        tabAlertes.setOnClickListener { selectTab("ALERTES") }
        tabInfos.setOnClickListener { selectTab("INFOS") }

        loadAlertes()
    }

    private fun selectTab(tab: String) {
        activeTab = tab
        val tabs = listOf(tabAll to "TOUTES", tabAlertes to "ALERTES", tabInfos to "INFOS")
        tabs.forEach { (tv, key) ->
            if (key == tab) {
                tv.setBackgroundResource(R.drawable.bg_btn_teal_pill)
                tv.setTextColor(requireContext().getColor(R.color.white))
            } else {
                tv.setBackgroundResource(R.drawable.bg_chip_inactive)
                tv.setTextColor(requireContext().getColor(R.color.text_secondary))
            }
        }
        applyFilter()
    }

    private fun applyFilter() {
        val filtered = when (activeTab) {
            "ALERTES" -> allItems.filter {
                val t = (it.titre ?: "").lowercase()
                t.contains("stock") || t.contains("alerte") || t.contains("critique") || t.contains("session annul")
            }
            "INFOS" -> allItems.filter {
                val t = (it.titre ?: "").lowercase()
                !t.contains("stock") && !t.contains("alerte") && !t.contains("critique")
            }
            else -> allItems
        }
        adapter.submit(filtered)
    }

    private fun loadAlertes() {
        tvMessage.visibility = View.GONE
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.getNotifications()
                if (response.status != "success") throw Exception(response.message ?: "Erreur serveur")
                allItems = response.data.orEmpty()
                applyFilter()
                if (allItems.isEmpty()) {
                    tvMessage.text = "Aucune alerte pour le moment"
                    tvMessage.visibility = View.VISIBLE
                }
            } catch (e: Exception) {
                tvMessage.text = e.message ?: "Erreur réseau"
                tvMessage.visibility = View.VISIBLE
            }
        }
    }
}

private class AlertesAdminAdapter : RecyclerView.Adapter<AlertesAdminAdapter.VH>() {
    private var items: List<NotificationDto> = emptyList()
    fun submit(next: List<NotificationDto>) { items = next; notifyDataSetChanged() }
    override fun getItemCount() = items.size
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH =
        VH(android.view.LayoutInflater.from(parent.context).inflate(R.layout.item_notification, parent, false))
    override fun onBindViewHolder(h: VH, pos: Int) = h.bind(items[pos])

    class VH(v: View) : RecyclerView.ViewHolder(v) {
        private val tvTitle = v.findViewById<TextView>(R.id.tvNotifTitle)
        private val tvMsg = v.findViewById<TextView>(R.id.tvNotifMessage)
        private val tvTime = v.findViewById<TextView>(R.id.tvNotifTime)
        private val accentBar = v.findViewById<View>(R.id.notifAccentBar)
        private val dot = v.findViewById<View>(R.id.viewUnreadDot)

        fun bind(n: NotificationDto) {
            tvTitle.text = n.titre ?: "Alerte"
            tvMsg.text = n.message ?: ""
            tvTime.text = n.createdAt?.take(10) ?: "Récent"
            val isCritique = (n.titre ?: "").lowercase().let {
                it.contains("critique") || it.contains("stock") || it.contains("annul")
            }
            accentBar.setBackgroundColor(if (isCritique) Color.parseColor("#EF4444") else Color.parseColor("#3B82F6"))
            dot.visibility = if (n.estLue == true) View.GONE else View.VISIBLE
        }
    }
}
