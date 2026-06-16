package com.example.vaccinkid

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.example.vaccinkid.network.ApiClient
import com.example.vaccinkid.viewmodel.InfirmierAuthViewModel
import com.github.mikephil.charting.charts.BarChart
import com.github.mikephil.charting.data.BarData
import com.github.mikephil.charting.data.BarDataSet
import com.github.mikephil.charting.data.BarEntry
import kotlinx.coroutines.launch

class AdminDashboardFragment : Fragment(R.layout.fragment_admin_dashboard) {
    private lateinit var authViewModel: InfirmierAuthViewModel
    private lateinit var refreshView: SwipeRefreshLayout
    private lateinit var barChart: BarChart
    
    private lateinit var totalVaccinesView: TextView
    private lateinit var centresCountView: TextView
    private lateinit var staffCountView: TextView
    private lateinit var sessionsCountView: TextView
    private lateinit var activityContainer: LinearLayout

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        authViewModel = ViewModelProvider(this)[InfirmierAuthViewModel::class.java]
        
        bindViews(view)
        setupChart()
        loadDashboard()
    }

    private fun bindViews(view: View) {
        refreshView = view.findViewById(R.id.adminRefresh)
        barChart = view.findViewById(R.id.barChartSummary)
        totalVaccinesView = view.findViewById(R.id.tvTotalVaccines)
        centresCountView = view.findViewById(R.id.tvKpiCentres)
        staffCountView = view.findViewById(R.id.tvKpiStaff)
        sessionsCountView = view.findViewById(R.id.tvKpiSessions)
        activityContainer = view.findViewById(R.id.llAdminActivities)

        refreshView.setOnRefreshListener { loadDashboard() }
        view.findViewById<View>(R.id.btnAdminLogout).setOnClickListener { confirmLogout() }
    }

    private fun setupChart() {
        barChart.description.isEnabled = false
        barChart.legend.isEnabled = false
        barChart.xAxis.isEnabled = false
        barChart.axisLeft.isEnabled = false
        barChart.axisRight.isEnabled = false
        barChart.setTouchEnabled(false)
        
        val entries = listOf(
            BarEntry(1f, 10f), BarEntry(2f, 15f), BarEntry(3f, 12f),
            BarEntry(4f, 20f), BarEntry(5f, 18f), BarEntry(6f, 25f)
        )
        val set = BarDataSet(entries, "").apply {
            color = Color.WHITE
            setDrawValues(false)
        }
        barChart.data = BarData(set)
        barChart.invalidate()
    }

    private fun loadDashboard() {
        refreshView.isRefreshing = true
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.getDashboardStats()
                val stats = response.data
                if (response.status == "success" && stats != null) {
                    totalVaccinesView.text = stats.totalVaccinations?.toString() ?: "0"
                    centresCountView.text = stats.centresActifs?.toString() ?: "0"
                    staffCountView.text = stats.totalPersonnel?.toString() ?: "0"
                    sessionsCountView.text = stats.sessionsAVenir?.toString() ?: "0"
                    
                    renderRecentActivity()
                }
            } catch (_: Exception) {
            } finally {
                refreshView.isRefreshing = false
            }
        }
    }

    private fun renderRecentActivity() {
        activityContainer.removeAllViews()
        val centers = listOf("Centre Al Amal" to "156 vaccinations", "Centre Al Nour" to "98 vaccinations")
        centers.forEach { (name, desc) ->
            val row = android.view.LayoutInflater.from(requireContext()).inflate(android.R.layout.simple_list_item_2, activityContainer, false)
            row.findViewById<TextView>(android.R.id.text1).text = name
            row.findViewById<TextView>(android.R.id.text1).setTextColor(Color.BLACK)
            row.findViewById<TextView>(android.R.id.text1).textSize = 15f
            row.findViewById<TextView>(android.R.id.text2).text = desc
            activityContainer.addView(row)
            
            // Separator
            val line = View(requireContext())
            line.layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 1)
            line.setBackgroundColor(Color.LTGRAY)
            activityContainer.addView(line)
        }
    }

    private fun confirmLogout() {
        AlertDialog.Builder(requireContext())
            .setTitle("Deconnexion")
            .setMessage("Voulez-vous fermer la session administrateur ?")
            .setNegativeButton("Annuler", null)
            .setPositiveButton("Deconnexion") { _, _ ->
                authViewModel.logout {
                    startActivity(Intent(requireContext(), AdminLoginActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                    })
                }
            }
            .show()
    }
}
