package com.example.vaccinkid

import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.core.view.setPadding
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.vaccinkid.model.NotificationDto
import com.example.vaccinkid.network.ApiClient
import kotlinx.coroutines.launch

class StaffNotificationsFragment : Fragment() {
    private lateinit var progress: ProgressBar
    private lateinit var message: TextView
    private lateinit var adapter: StaffNotificationAdapter
    private var loading = false

    override fun onCreateView(
        inflater: android.view.LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: android.os.Bundle?
    ): View {
        val root = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(24)
        }
        root.addView(TextView(requireContext()).apply {
            text = "Notifications staff"
            textSize = 22f
        })
        val actions = LinearLayout(requireContext()).apply { orientation = LinearLayout.HORIZONTAL }
        actions.addView(button("Rafraichir") { loadNotifications() }, weight())
        actions.addView(button("Tout marquer lu") { markAllRead() }, weight())
        root.addView(actions)
        progress = ProgressBar(requireContext()).apply { visibility = View.GONE }
        message = TextView(requireContext()).apply { setPadding(0, 8, 0, 8) }
        root.addView(progress)
        root.addView(message)
        adapter = StaffNotificationAdapter { markRead(it) }
        root.addView(RecyclerView(requireContext()).apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = this@StaffNotificationsFragment.adapter
        }, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))
        return root
    }

    override fun onViewCreated(view: View, savedInstanceState: android.os.Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        loadNotifications()
    }

    private fun loadNotifications() {
        if (loading) return
        setLoading(true, "Chargement...")
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.getNotifications()
                if (response.status != "success") {
                    throw Exception(response.message ?: "Notifications indisponibles")
                }
                val notifications = response.data.orEmpty()
                adapter.submit(notifications)
                setLoading(false, "${notifications.count { it.estLue != true }} non lue(s)")
            } catch (error: Exception) {
                adapter.submit(emptyList())
                setLoading(false, error.message ?: "Connexion requise")
            }
        }
    }

    private fun markRead(notification: NotificationDto) {
        if (loading || notification.estLue == true) return
        setLoading(true, "Mise a jour...")
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.markNotificationRead(notification.id)
                if (response.status != "success") throw Exception(response.message ?: "Action refusee")
                setLoading(false)
                loadNotifications()
            } catch (error: Exception) {
                setLoading(false, error.message ?: "Connexion requise")
            }
        }
    }

    private fun markAllRead() {
        if (loading) return
        setLoading(true, "Mise a jour...")
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.markAllNotificationsRead()
                if (response.status != "success") throw Exception(response.message ?: "Action refusee")
                setLoading(false)
                loadNotifications()
            } catch (error: Exception) {
                setLoading(false, error.message ?: "Connexion requise")
            }
        }
    }

    private fun setLoading(value: Boolean, text: String? = null) {
        loading = value
        progress.visibility = if (value) View.VISIBLE else View.GONE
        if (text != null) message.text = text
    }

    private fun button(label: String, action: () -> Unit): Button =
        Button(requireContext()).apply {
            text = label
            setOnClickListener { action() }
        }

    private fun weight() = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
}

private class StaffNotificationAdapter(
    private val onRead: (NotificationDto) -> Unit
) : RecyclerView.Adapter<StaffNotificationAdapter.ViewHolder>() {
    private var items = emptyList<NotificationDto>()

    fun submit(next: List<NotificationDto>) {
        items = next
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder =
        ViewHolder(LinearLayout(parent.context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(20)
        })

    override fun onBindViewHolder(holder: ViewHolder, position: Int) = holder.bind(items[position])

    override fun getItemCount(): Int = items.size

    inner class ViewHolder(private val root: LinearLayout) : RecyclerView.ViewHolder(root) {
        fun bind(notification: NotificationDto) {
            root.removeAllViews()
            root.addView(TextView(root.context).apply {
                text = notification.titre ?: "Notification"
                textSize = 16f
                setTypeface(typeface, android.graphics.Typeface.BOLD)
            })
            root.addView(TextView(root.context).apply {
                text = notification.message ?: ""
            })
            root.addView(TextView(root.context).apply {
                text = if (notification.estLue == true) "Lue" else "Non lue - toucher pour marquer lue"
            })
            root.setOnClickListener { onRead(notification) }
        }
    }
}
