package com.example.vaccinkid

import android.graphics.Color
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.example.vaccinkid.model.CroissanceDto
import com.example.vaccinkid.network.ApiClient
import com.github.mikephil.charting.charts.LineChart
import com.github.mikephil.charting.components.XAxis
import com.github.mikephil.charting.data.Entry
import com.github.mikephil.charting.data.LineData
import com.github.mikephil.charting.data.LineDataSet
import kotlinx.coroutines.launch

class GrowthChartFragment : Fragment() {
    private lateinit var titleView: TextView
    private lateinit var emptyView: TextView
    private lateinit var chart: LineChart
    private lateinit var progress: ProgressBar

    private var bebeId: Int = 0
    private var bebeName: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        bebeId = arguments?.getInt(ARG_BEBE_ID) ?: 0
        bebeName = arguments?.getString(ARG_BEBE_NAME).orEmpty()
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        val view = inflater.inflate(R.layout.fragment_growth_chart, container, false)
        titleView = view.findViewById(R.id.tvGrowthTitle)
        emptyView = view.findViewById(R.id.tvGrowthEmpty)
        chart = view.findViewById(R.id.lineChartGrowth)
        progress = view.findViewById(R.id.progressGrowth)

        titleView.text = "Courbes de croissance : ${bebeName.ifBlank { "Bébé #$bebeId" }}"
        setupChart()
        loadGrowth()
        return view
    }

    private fun setupChart() {
        chart.description.isEnabled = false
        chart.setNoDataText("Aucune mesure de croissance")
        chart.setTouchEnabled(true)
        chart.setPinchZoom(true)
        chart.axisRight.isEnabled = false
        chart.xAxis.position = XAxis.XAxisPosition.BOTTOM
        chart.xAxis.granularity = 1f
        chart.legend.isEnabled = true
    }

    private fun loadGrowth() {
        if (bebeId <= 0) {
            showEmpty("Identifiant bébé invalide")
            return
        }

        viewLifecycleOwner.lifecycleScope.launch {
            progress.visibility = View.VISIBLE
            emptyView.visibility = View.GONE
            try {
                val response = ApiClient.apiService.getCroissance(bebeId)
                val data = response.data.orEmpty()
                if (response.status == "success" && data.isNotEmpty()) {
                    renderChart(data)
                } else {
                    showEmpty(response.message ?: "Aucune mesure enregistrée")
                }
            } catch (e: Exception) {
                showEmpty("Chargement impossible")
                Toast.makeText(requireContext(), e.message ?: "Erreur réseau", Toast.LENGTH_LONG).show()
            } finally {
                progress.visibility = View.GONE
            }
        }
    }

    private fun renderChart(data: List<CroissanceDto>) {
        val sorted = data.sortedWith(compareBy<CroissanceDto> { it.ageSemaines ?: Int.MAX_VALUE }
            .thenBy { it.dateMesure.orEmpty() })
        val poidsEntries = mutableListOf<Entry>()
        val tailleEntries = mutableListOf<Entry>()

        sorted.forEachIndexed { index, mesure ->
            val x = (mesure.ageSemaines ?: index).toFloat()
            mesure.poids?.let { poidsEntries.add(Entry(x, it.toFloat())) }
            mesure.taille?.let { tailleEntries.add(Entry(x, it.toFloat())) }
        }

        if (poidsEntries.isEmpty() && tailleEntries.isEmpty()) {
            showEmpty("Mesures incomplètes")
            return
        }

        val sets = mutableListOf<LineDataSet>()
        if (poidsEntries.isNotEmpty()) {
            sets.add(createDataSet(poidsEntries, "Poids (kg)", Color.rgb(245, 166, 35)))
        }
        if (tailleEntries.isNotEmpty()) {
            sets.add(createDataSet(tailleEntries, "Taille (cm)", Color.rgb(255, 138, 128)))
        }

        chart.data = LineData(sets.toList())
        chart.invalidate()
        chart.visibility = View.VISIBLE
        emptyView.visibility = View.GONE
    }

    private fun createDataSet(entries: List<Entry>, label: String, color: Int): LineDataSet {
        return LineDataSet(entries, label).apply {
            this.color = color
            setCircleColor(color)
            lineWidth = 2.5f
            circleRadius = 4f
            valueTextSize = 10f
            mode = LineDataSet.Mode.CUBIC_BEZIER
        }
    }

    private fun showEmpty(message: String) {
        chart.visibility = View.GONE
        emptyView.text = message
        emptyView.visibility = View.VISIBLE
    }

    companion object {
        private const val ARG_BEBE_ID = "bebe_id"
        private const val ARG_BEBE_NAME = "bebe_name"

        fun newInstance(bebeId: Int, bebeName: String): GrowthChartFragment {
            return GrowthChartFragment().apply {
                arguments = Bundle().apply {
                    putInt(ARG_BEBE_ID, bebeId)
                    putString(ARG_BEBE_NAME, bebeName)
                }
            }
        }
    }
}
