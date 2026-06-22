package com.example.vaccinkid

import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.vaccinkid.model.NotificationDto
import com.example.vaccinkid.network.ApiClient
import kotlinx.coroutines.launch

class StaffNotificationsFragment : Fragment(R.layout.fragment_staff_notifications) {
    private lateinit var rvNotifications: RecyclerView
    private lateinit var adapter: NotificationAdapter
    private lateinit var tabToutes: TextView
    private lateinit var tabNonLues: TextView
    private lateinit var tabRdv: TextView
    private var loading = false
    private var allNotifications: List<NotificationDto> = emptyList()
    private var activeTab = "ALL"

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        rvNotifications = view.findViewById(R.id.rvNotifications)
        rvNotifications.layoutManager = LinearLayoutManager(requireContext())
        adapter = NotificationAdapter { markRead(it) }
        rvNotifications.adapter = adapter

        tabToutes = view.findViewById(R.id.tabNotifToutes)
        tabNonLues = view.findViewById(R.id.tabNotifNonLues)
        tabRdv = view.findViewById(R.id.tabNotifRdv)

        tabToutes.setOnClickListener { selectTab("ALL") }
        tabNonLues.setOnClickListener { selectTab("UNREAD") }
        tabRdv.setOnClickListener { selectTab("RDV") }

        view.findViewById<View>(R.id.tvMarkAllAsRead).setOnClickListener { markAllRead() }

        loadNotifications()
    }

    private fun selectTab(tab: String) {
        activeTab = tab
        val teal = requireContext().getColor(R.color.brand_teal)
        val secondary = requireContext().getColor(R.color.text_secondary)
        val white = requireContext().getColor(R.color.white)
        listOf(tabToutes to "ALL", tabNonLues to "UNREAD", tabRdv to "RDV").forEach { (tv, t) ->
            tv.isClickable = true
            tv.isFocusable = true
            if (t == tab) {
                tv.setBackgroundResource(R.drawable.bg_btn_teal_pill)
                tv.setTextColor(white)
                tv.setTypeface(null, android.graphics.Typeface.BOLD)
            } else {
                tv.setBackgroundResource(R.drawable.bg_chip_inactive)
                tv.setTextColor(secondary)
                tv.setTypeface(null, android.graphics.Typeface.NORMAL)
            }
        }
        applyFilter()
    }

    private fun applyFilter() {
        val filtered = when (activeTab) {
            "UNREAD" -> allNotifications.filter { it.estLue != true }
            "RDV" -> allNotifications.filter {
                val t = (it.titre ?: "").lowercase()
                t.contains("rdv") || t.contains("rendez") || t.contains("vaccin")
            }
            else -> allNotifications
        }
        adapter.submit(filtered)
    }

    private fun loadNotifications() {
        if (loading) return
        loading = true
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.getNotifications()
                if (response.status == "success") {
                    allNotifications = response.data.orEmpty()
                    applyFilter()
                }
            } catch (_: Exception) {
            } finally {
                loading = false
            }
        }
    }

    private fun markRead(notification: NotificationDto) {
        if (loading || notification.estLue == true) return
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                ApiClient.apiService.markNotificationRead(notification.id)
                loadNotifications()
            } catch (_: Exception) {}
        }
    }

    private fun markAllRead() {
        if (loading) return
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                ApiClient.apiService.markAllNotificationsRead()
                loadNotifications()
            } catch (_: Exception) {}
        }
    }
}

private class NotificationAdapter(
    private val onRead: (NotificationDto) -> Unit
) : RecyclerView.Adapter<NotificationAdapter.ViewHolder>() {
    private var items = emptyList<NotificationDto>()

    fun submit(next: List<NotificationDto>) {
        items = next
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder =
        ViewHolder(android.view.LayoutInflater.from(parent.context).inflate(R.layout.item_notification, parent, false))

    override fun onBindViewHolder(holder: ViewHolder, position: Int) = holder.bind(items[position])
    override fun getItemCount(): Int = items.size

    inner class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        private val title = view.findViewById<TextView>(R.id.tvNotifTitle)
        private val message = view.findViewById<TextView>(R.id.tvNotifMessage)
        private val time = view.findViewById<TextView>(R.id.tvNotifTime)
        private val icon = view.findViewById<ImageView>(R.id.ivNotifIcon)
        private val iconContainer = view.findViewById<View>(R.id.flNotifIconContainer)
        private val accentBar = view.findViewById<View>(R.id.notifAccentBar)
        private val unreadDot = view.findViewById<View>(R.id.viewUnreadDot)

        fun bind(notification: NotificationDto) {
            val isRead = notification.estLue == true
            title.text = notification.titre ?: "Notification"
            message.text = notification.message ?: ""

            // Format time from ISO date if available, else fallback
            val rawDate = notification.createdAt
            time.text = formatRelativeTime(rawDate)

            val t = (notification.titre ?: "").lowercase()
            when {
                t.contains("vaccin") || t.contains("rappel") -> {
                    icon.setImageResource(R.drawable.ic_syringe)
                    iconContainer.backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#E0F2FE"))
                    icon.imageTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#0EA5E9"))
                }
                t.contains("stock") || t.contains("alerte") -> {
                    icon.setImageResource(R.drawable.ic_notifications)
                    iconContainer.backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#FEF3C7"))
                    icon.imageTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#F59E0B"))
                }
                t.contains("rdv") || t.contains("rendez") -> {
                    icon.setImageResource(R.drawable.ic_calendar_event)
                    iconContainer.backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#F0FDF4"))
                    icon.imageTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#10B981"))
                }
                else -> {
                    icon.setImageResource(R.drawable.ic_notifications)
                    iconContainer.backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#F0FDFA"))
                    icon.imageTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#0F766E"))
                }
            }

            // Read/unread visuals
            unreadDot.visibility = if (isRead) View.GONE else View.VISIBLE
            accentBar.setBackgroundColor(
                if (isRead) Color.parseColor("#CBD5E1") else Color.parseColor("#006D77")
            )
            itemView.alpha = if (isRead) 0.65f else 1.0f

            itemView.setOnClickListener { onRead(notification) }
        }

        private fun formatRelativeTime(iso: String?): String {
            if (iso.isNullOrBlank()) return "Aujourd'hui"
            return try {
                val formats = arrayOf("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", "yyyy-MM-dd'T'HH:mm:ss'Z'")
                val date = formats.firstNotNullOfOrNull { fmt ->
                    try { java.text.SimpleDateFormat(fmt, java.util.Locale.getDefault()).also { it.timeZone = java.util.TimeZone.getTimeZone("UTC") }.parse(iso) } catch (_: Exception) { null }
                } ?: return "Aujourd'hui"
                val diffMs = System.currentTimeMillis() - date.time
                val diffMin = diffMs / 60_000
                when {
                    diffMin < 1 -> "À l'instant"
                    diffMin < 60 -> "Il y a ${diffMin}min"
                    diffMin < 1440 -> "Il y a ${diffMin / 60}h"
                    diffMin < 2880 -> "Hier"
                    else -> "Il y a ${diffMin / 1440}j"
                }
            } catch (_: Exception) { "Aujourd'hui" }
        }
    }
}
