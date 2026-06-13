package com.example.vaccinkid

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.view.setPadding
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.vaccinkid.model.AdminAuditLogDto
import com.example.vaccinkid.network.ApiClient
import kotlinx.coroutines.launch

class AdminAuditLogFragment : Fragment() {
    private lateinit var messageView: TextView
    private lateinit var actionFilter: EditText
    private lateinit var tableFilter: EditText
    private lateinit var userFilter: EditText
    private lateinit var startFilter: EditText
    private lateinit var endFilter: EditText
    private lateinit var adapter: AuditAdapter
    private var page = 1

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        adapter = AuditAdapter()
        return LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(20)
            addView(TextView(requireContext()).apply {
                text = "Audit log"
                textSize = 22f
                setTypeface(typeface, android.graphics.Typeface.BOLD)
            })
            actionFilter = EditText(requireContext()).apply { hint = "Action: READ, INSERT, UPDATE..." }
            tableFilter = EditText(requireContext()).apply { hint = "Table: personnel, centre..." }
            userFilter = EditText(requireContext()).apply { hint = "Utilisateur ID optionnel" }
            startFilter = EditText(requireContext()).apply { hint = "Date debut YYYY-MM-DD" }
            endFilter = EditText(requireContext()).apply { hint = "Date fin YYYY-MM-DD" }
            addView(actionFilter)
            addView(tableFilter)
            addView(userFilter)
            addView(startFilter)
            addView(endFilter)
            val row = LinearLayout(requireContext()).apply { orientation = LinearLayout.HORIZONTAL }
            row.addView(Button(requireContext()).apply {
                text = "Filtrer"
                setOnClickListener {
                    page = 1
                    loadAudit()
                }
            }, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
            row.addView(Button(requireContext()).apply {
                text = "Precedent"
                setOnClickListener {
                    if (page > 1) {
                        page -= 1
                        loadAudit()
                    }
                }
            }, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
            row.addView(Button(requireContext()).apply {
                text = "Suivant"
                setOnClickListener {
                    page += 1
                    loadAudit()
                }
            }, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
            addView(row)
            messageView = TextView(requireContext()).apply { setPadding(0, 8, 0, 8) }
            addView(messageView)
            addView(RecyclerView(requireContext()).apply {
                layoutManager = LinearLayoutManager(requireContext())
                adapter = this@AdminAuditLogFragment.adapter
            }, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))
        }
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        loadAudit()
    }

    private fun loadAudit() {
        messageView.text = "Chargement..."
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.getAdminAuditLog(
                    page = page,
                    action = actionFilter.text.toString().trim().ifBlank { null },
                    tableName = tableFilter.text.toString().trim().ifBlank { null },
                    userId = userFilter.text.toString().trim().toIntOrNull(),
                    startDate = startFilter.text.toString().trim().ifBlank { null },
                    endDate = endFilter.text.toString().trim().ifBlank { null }
                )
                val data = response.data
                if (response.status != "success" || data == null) throw Exception(response.message ?: "Audit indisponible")
                adapter.submit(data.entries)
                messageView.text = "Page ${data.page}/${data.totalPages} - ${data.total} entree(s)"
            } catch (e: Exception) {
                adapter.submit(emptyList())
                messageView.text = e.message ?: "Erreur reseau"
            }
        }
    }
}

private class AuditAdapter : RecyclerView.Adapter<AuditAdapter.ViewHolder>() {
    private var items: List<AdminAuditLogDto> = emptyList()
    fun submit(next: List<AdminAuditLogDto>) {
        items = next
        notifyDataSetChanged()
    }
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        return ViewHolder(LinearLayout(parent.context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(16)
        })
    }
    override fun getItemCount() = items.size
    override fun onBindViewHolder(holder: ViewHolder, position: Int) = holder.bind(items[position])

    class ViewHolder(private val root: LinearLayout) : RecyclerView.ViewHolder(root) {
        fun bind(item: AdminAuditLogDto) {
            root.removeAllViews()
            root.addView(TextView(root.context).apply {
                text = "${item.action ?: "-"} ${item.tableName ?: "-"} #${item.recordId ?: 0}"
                textSize = 15f
                setTypeface(typeface, android.graphics.Typeface.BOLD)
            })
            root.addView(TextView(root.context).apply {
                text = "User ${item.userRole ?: "-"}:${item.userId ?: "-"} | ${item.timestamp ?: "-"}"
            })
        }
    }
}
