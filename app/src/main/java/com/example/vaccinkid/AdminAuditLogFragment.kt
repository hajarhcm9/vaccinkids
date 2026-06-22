package com.example.vaccinkid

import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ProgressBar
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.vaccinkid.model.AdminAuditLogDto
import com.example.vaccinkid.network.ApiClient
import com.google.android.material.button.MaterialButton
import com.google.android.material.textfield.TextInputEditText
import kotlinx.coroutines.launch

class AdminAuditLogFragment : Fragment(R.layout.fragment_audit_log) {

    private lateinit var etAction: TextInputEditText
    private lateinit var etTable: TextInputEditText
    private lateinit var etUserId: TextInputEditText
    private lateinit var etDateStart: TextInputEditText
    private lateinit var etDateEnd: TextInputEditText
    private lateinit var btnFilter: MaterialButton
    private lateinit var btnPrev: MaterialButton
    private lateinit var btnNext: MaterialButton
    private lateinit var tvPageInfo: TextView
    private lateinit var auditProgress: ProgressBar
    private lateinit var adapter: AuditAdapter

    private var page = 1

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        etAction = view.findViewById(R.id.etAuditAction)
        etTable = view.findViewById(R.id.etAuditTable)
        etUserId = view.findViewById(R.id.etAuditUserId)
        etDateStart = view.findViewById(R.id.etAuditDateStart)
        etDateEnd = view.findViewById(R.id.etAuditDateEnd)
        btnFilter = view.findViewById(R.id.btnAuditFilter)
        btnPrev = view.findViewById(R.id.btnAuditPrev)
        btnNext = view.findViewById(R.id.btnAuditNext)
        tvPageInfo = view.findViewById(R.id.tvAuditPageInfo)
        auditProgress = view.findViewById(R.id.auditProgress)

        adapter = AuditAdapter()
        view.findViewById<RecyclerView>(R.id.rvAuditLog).apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = this@AdminAuditLogFragment.adapter
        }

        btnFilter.setOnClickListener { page = 1; loadAudit() }
        btnPrev.setOnClickListener { if (page > 1) { page--; loadAudit() } }
        btnNext.setOnClickListener { page++; loadAudit(fromNext = true) }

        loadAudit()
    }

    private fun loadAudit(fromNext: Boolean = false) {
        auditProgress.visibility = View.VISIBLE
        tvPageInfo.text = "Chargement…"
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.getAdminAuditLog(
                    page = page,
                    action = etAction.text?.toString()?.trim()?.ifBlank { null },
                    tableName = etTable.text?.toString()?.trim()?.ifBlank { null },
                    userId = etUserId.text?.toString()?.trim()?.toIntOrNull(),
                    startDate = etDateStart.text?.toString()?.trim()?.ifBlank { null },
                    endDate = etDateEnd.text?.toString()?.trim()?.ifBlank { null }
                )
                val data = response.data
                if (response.status != "success" || data == null)
                    throw Exception(response.message ?: "Audit indisponible")

                adapter.submit(data.entries)
                tvPageInfo.text = "Page ${data.page} / ${data.totalPages}  ·  ${data.total} entrée(s)"
                btnPrev.visibility = if (data.page > 1) View.VISIBLE else View.GONE
                btnNext.visibility = if (data.page < data.totalPages) View.VISIBLE else View.GONE
            } catch (e: Exception) {
                if (fromNext) page--
                adapter.submit(emptyList())
                tvPageInfo.text = e.message ?: "Erreur réseau"
                btnPrev.visibility = if (page > 1) View.VISIBLE else View.GONE
                btnNext.visibility = View.GONE
            } finally {
                auditProgress.visibility = View.GONE
            }
        }
    }
}

private class AuditAdapter : RecyclerView.Adapter<AuditAdapter.VH>() {
    private var items: List<AdminAuditLogDto> = emptyList()
    fun submit(next: List<AdminAuditLogDto>) { items = next; notifyDataSetChanged() }
    override fun getItemCount() = items.size
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH =
        VH(LayoutInflater.from(parent.context).inflate(R.layout.item_audit_log, parent, false))
    override fun onBindViewHolder(h: VH, pos: Int) = h.bind(items[pos])

    class VH(v: View) : RecyclerView.ViewHolder(v) {
        private val tvAction: TextView = v.findViewById(R.id.tvAuditAction)
        private val tvTarget: TextView = v.findViewById(R.id.tvAuditTarget)
        private val tvTimestamp: TextView = v.findViewById(R.id.tvAuditTimestamp)
        private val tvUser: TextView = v.findViewById(R.id.tvAuditUser)

        fun bind(item: AdminAuditLogDto) {
            val action = item.action ?: "—"
            tvAction.text = action

            // Color-code action badges
            val (bgColor, textColor) = when (action.uppercase()) {
                "INSERT", "CREATE" -> "#DCFCE7" to "#166534"
                "UPDATE" -> "#FEF3C7" to "#92400E"
                "DELETE" -> "#FEE2E2" to "#991B1B"
                "READ" -> "#EFF6FF" to "#1E40AF"
                else -> "#F3F4F6" to "#374151"
            }
            tvAction.background = GradientDrawable().apply {
                setColor(Color.parseColor(bgColor))
                cornerRadius = tvAction.resources.displayMetrics.density * 8
            }
            tvAction.setTextColor(Color.parseColor(textColor))

            tvTarget.text = "${item.tableName ?: "?"} #${item.recordId ?: 0}"
            tvTimestamp.text = item.timestamp?.take(16)?.replace("T", " ") ?: "—"
            tvUser.text = "${item.userRole ?: "?"} · ID ${item.userId ?: "?"}"
        }
    }
}
