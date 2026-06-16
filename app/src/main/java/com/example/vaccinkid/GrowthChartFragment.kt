package com.example.vaccinkid

import android.content.res.ColorStateList
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.example.vaccinkid.model.CroissanceDto
import com.example.vaccinkid.network.ApiClient
import com.github.mikephil.charting.charts.LineChart
import com.github.mikephil.charting.components.XAxis
import com.github.mikephil.charting.data.Entry
import com.github.mikephil.charting.data.LineData
import com.github.mikephil.charting.data.LineDataSet
import com.google.android.material.button.MaterialButton
import kotlinx.coroutines.launch

class GrowthChartFragment : Fragment(R.layout.fragment_growth_chart) {
    private lateinit var chart: LineChart
    private lateinit var patientNameView: TextView
    private lateinit var patientAgeView: TextView
    private lateinit var currentValueView: TextView
    private lateinit var lastMeasureView: TextView
    private lateinit var lastMeasureDateView: TextView
    
    private lateinit var btnTabPoids: MaterialButton
    private lateinit var btnTabTaille: MaterialButton
    private lateinit var btnTabImc: MaterialButton

    private var bebeId: Int = 0
    private var bebeName: String = ""
    private var currentData: List<CroissanceDto> = emptyList()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        bebeId = arguments?.getInt(ARG_BEBE_ID) ?: 0
        bebeName = arguments?.getString(ARG_BEBE_NAME).orEmpty()
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        bindViews(view)
        setupChart()
        loadGrowth()
    }

    private fun bindViews(view: View) {
        chart = view.findViewById(R.id.lineChartGrowth)
        patientNameView = view.findViewById(R.id.tvGrowthPatientName)
        patientAgeView = view.findViewById(R.id.tvGrowthPatientAge)
        currentValueView = view.findViewById(R.id.tvCurrentValue)
        lastMeasureView = view.findViewById(R.id.tvLastMeasure)
        lastMeasureDateView = view.findViewById(R.id.tvLastMeasureDate)
        
        btnTabPoids = view.findViewById(R.id.btnTabPoids)
        btnTabTaille = view.findViewById(R.id.btnTabTaille)
        btnTabImc = view.findViewById(R.id.btnTabImc)

        patientNameView.text = bebeName.ifBlank { "Patient #$bebeId" }
        
        view.findViewById<View>(R.id.btnBackGrowth).setOnClickListener {
            parentFragmentManager.popBackStack()
        }
        
        btnTabPoids.setOnClickListener { selectTab(0) }
        btnTabTaille.setOnClickListener { selectTab(1) }
        btnTabImc.setOnClickListener { selectTab(2) }
    }

    private fun setupChart() {
        chart.description.isEnabled = false
        chart.setNoDataText("Chargement...")
        chart.setTouchEnabled(true)
        chart.setPinchZoom(true)
        chart.axisRight.isEnabled = false
        chart.xAxis.position = XAxis.XAxisPosition.BOTTOM
        chart.xAxis.setDrawGridLines(false)
        chart.xAxis.granularity = 1f
        chart.legend.isEnabled = false
    }

    private fun loadGrowth() {
        if (bebeId <= 0) return

        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.getCroissance(bebeId)
                if (response.status == "success") {
                    currentData = response.data.orEmpty().sortedBy { it.ageSemaines ?: 0 }
                    renderPoids()
                }
            } catch (_: Exception) {
                chart.setNoDataText("Erreur réseau")
                chart.invalidate()
            }
        }
    }

    private fun selectTab(index: Int) {
        val teal = Color.parseColor("#0F766E")
        val gray = Color.parseColor("#64748B")
        val transparent = Color.TRANSPARENT

        listOf(btnTabPoids, btnTabTaille, btnTabImc).forEachIndexed { i, btn ->
            val active = i == index
            btn.backgroundTintList = ColorStateList.valueOf(if (active) teal else transparent)
            btn.setTextColor(if (active) Color.WHITE else gray)
        }

        when (index) {
            0 -> renderPoids()
            1 -> renderTaille()
            2 -> renderImc()
        }
    }

    private fun renderPoids() {
        val entries = currentData.mapNotNull { m -> 
            m.poids?.let { Entry((m.ageSemaines ?: 0).toFloat() / 4f, it.toFloat()) } 
        }
        updateChart(entries, "Poids (kg)", Color.parseColor("#0F766E"))
        
        val last = currentData.lastOrNull { it.poids != null }
        currentValueView.text = last?.poids?.let { "$it kg" } ?: "-- kg"
        lastMeasureView.text = "Dernière mesure : ${currentValueView.text}"
        lastMeasureDateView.text = last?.dateMesure ?: ""
    }

    private fun renderTaille() {
        val entries = currentData.mapNotNull { m -> 
            m.taille?.let { Entry((m.ageSemaines ?: 0).toFloat() / 4f, it.toFloat()) } 
        }
        updateChart(entries, "Taille (cm)", Color.parseColor("#0EA5E9"))
        
        val last = currentData.lastOrNull { it.taille != null }
        currentValueView.text = last?.taille?.let { "$it cm" } ?: "-- cm"
        lastMeasureView.text = "Dernière mesure : ${currentValueView.text}"
        lastMeasureDateView.text = last?.dateMesure ?: ""
    }

    private fun renderImc() {
        val entries = currentData.mapNotNull { m ->
            val p = m.poids
            val t = m.taille
            if (p != null && t != null && t > 0) {
                val imc = p / ((t/100.0) * (t/100.0))
                Entry((m.ageSemaines ?: 0).toFloat() / 4f, imc.toFloat())
            } else null
        }
        updateChart(entries, "IMC", Color.parseColor("#7B5EA7"))
        currentValueView.text = entries.lastOrNull()?.y?.let { String.format("%.1f", it) } ?: "--"
        lastMeasureView.text = "Dernière mesure : IMC ${currentValueView.text}"
    }

    private fun updateChart(entries: List<Entry>, label: String, color: Int) {
        if (entries.isEmpty()) {
            chart.data = null
            chart.invalidate()
            return
        }
        val set = LineDataSet(entries, label).apply {
            this.color = color
            setCircleColor(color)
            lineWidth = 3f
            circleRadius = 5f
            setDrawValues(false)
            mode = LineDataSet.Mode.CUBIC_BEZIER
            setDrawFilled(true)
            fillAlpha = 20
            fillColor = color
        }
        chart.data = LineData(set)
        chart.invalidate()
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
