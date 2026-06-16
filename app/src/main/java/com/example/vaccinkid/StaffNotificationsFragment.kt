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
    private var loading = false

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        rvNotifications = view.findViewById(R.id.rvNotifications)
        rvNotifications.layoutManager = LinearLayoutManager(requireContext())
        adapter = NotificationAdapter { markRead(it) }
        rvNotifications.adapter = adapter
        
        view.findViewById<View>(R.id.tvMarkAllAsRead).setOnClickListener { markAllRead() }
        
        loadNotifications()
    }

    private fun loadNotifications() {
        if (loading) return
        loading = true
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.getNotifications()
                if (response.status == "success") {
                    adapter.submit(response.data.orEmpty())
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
