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
            if (t == tab) {
                tv.setBackgroundResource(R.drawable.bg_btn_teal_pill)
                tv.setTextColor(white)
                tv.setTypeface(null, android.graphics.Typeface.BOLD)
            } else {
                tv.background = null
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

        fun bind(notification: NotificationDto) {
            title.text = notification.titre ?: "Notification"
            message.text = notification.message ?: ""
            time.text = "Aujourd'hui"
            
            // Styliser selon le titre pour le demo
            val t = title.text.toString().lowercase()
            when {
                t.contains("vaccin") -> {
                    icon.setImageResource(R.drawable.ic_syringe)
                    iconContainer.backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#E0F2FE"))
                    icon.imageTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#0EA5E9"))
                }
                t.contains("stock") -> {
                    icon.setImageResource(R.drawable.ic_notifications)
                    iconContainer.backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#FEF3C7"))
                    icon.imageTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#F59E0B"))
                }
                else -> {
                    icon.setImageResource(R.drawable.ic_notifications)
                    iconContainer.backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#F0FDFA"))
                    icon.imageTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#0F766E"))
                }
            }
            
            itemView.alpha = if (notification.estLue == true) 0.6f else 1.0f
            itemView.setOnClickListener { onRead(notification) }
        }
    }
}
