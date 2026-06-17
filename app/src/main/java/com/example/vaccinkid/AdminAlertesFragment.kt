package com.example.vaccinkid

import android.graphics.Color
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.vaccinkid.model.NotificationDto
import com.example.vaccinkid.network.ApiClient
import kotlinx.coroutines.launch

class AdminAlertesFragment : Fragment() {
    private lateinit var adapter: AlertesAdminAdapter
    private var allItems: List<NotificationDto> = emptyList()
    private var activeTab = "TOUTES"

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        return LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(requireContext().getColor(R.color.bg_screen))

            // Header
            addView(LinearLayout(requireContext()).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(56, 56, 56, 36)
                addView(TextView(requireContext()).apply {
                    text = "Alertes"
                    textSize = 26f
                    setTextColor(requireContext().getColor(R.color.text_primary))
                    setTypeface(null, android.graphics.Typeface.BOLD)
                })
                addView(TextView(requireContext()).apply {
                    text = "Surveillance du système"
                    textSize = 13f
                    setTextColor(requireContext().getColor(R.color.text_secondary))
                })
            })

            // Tabs
            val tabTout = makeTab("Toutes", true)
            val tabAlerte = makeTab("Alertes", false)
            val tabInfo = makeTab("Infos", false)
            val tabRow = LinearLayout(requireContext()).apply {
                orientation = LinearLayout.HORIZONTAL
                setPadding(44, 0, 44, 20)
                addView(tabTout, LinearLayout.LayoutParams(0, 90, 1f))
                addView(tabAlerte, LinearLayout.LayoutParams(0, 90, 1f))
                addView(tabInfo, LinearLayout.LayoutParams(0, 90, 1f))
            }
            addView(tabRow)

            fun selectTab(tab: String) {
                activeTab = tab
                listOf(tabTout to "TOUTES", tabAlerte to "ALERTES", tabInfo to "INFOS").forEach { (tv, key) ->
                    if (key == tab) {
                        tv.setBackgroundResource(R.drawable.bg_btn_teal_pill)
                        tv.setTextColor(requireContext().getColor(R.color.white))
                    } else {
                        tv.background = null
                        tv.setTextColor(requireContext().getColor(R.color.text_secondary))
                    }
                }
                applyFilter()
            }
            tabTout.setOnClickListener { selectTab("TOUTES") }
            tabAlerte.setOnClickListener { selectTab("ALERTES") }
            tabInfo.setOnClickListener { selectTab("INFOS") }

            // List
            val rv = RecyclerView(requireContext()).apply {
                layoutManager = LinearLayoutManager(requireContext())
                clipToPadding = false
                setPadding(44, 0, 44, 60)
            }
            adapter = AlertesAdminAdapter()
            rv.adapter = adapter
            addView(rv, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))
        }
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        loadAlertes()
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
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.getNotifications()
                if (response.status == "success") {
                    allItems = response.data.orEmpty()
                    applyFilter()
                }
            } catch (_: Exception) {}
        }
    }

    private fun makeTab(label: String, active: Boolean) = TextView(requireContext()).apply {
        text = label; gravity = android.view.Gravity.CENTER
        textSize = 13f
        if (active) {
            setBackgroundResource(R.drawable.bg_btn_teal_pill)
            setTextColor(requireContext().getColor(R.color.white))
            setTypeface(null, android.graphics.Typeface.BOLD)
        } else {
            setTextColor(requireContext().getColor(R.color.text_secondary))
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
