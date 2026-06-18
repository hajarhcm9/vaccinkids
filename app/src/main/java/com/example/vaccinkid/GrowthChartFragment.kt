package com.example.vaccinkid

import android.content.res.ColorStateList
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.example.vaccinkid.model.AddCroissanceRequest
import com.example.vaccinkid.model.CroissanceDto
import com.example.vaccinkid.network.ApiClient
import com.github.mikephil.charting.charts.LineChart
import com.github.mikephil.charting.components.XAxis
import com.github.mikephil.charting.data.Entry
import com.github.mikephil.charting.data.LineData
import com.github.mikephil.charting.data.LineDataSet
import com.github.mikephil.charting.formatter.ValueFormatter
import com.google.android.material.button.MaterialButton
import kotlinx.coroutines.launch
import kotlin.math.abs

class GrowthChartFragment : Fragment(R.layout.fragment_growth_chart) {
    private lateinit var chart: LineChart
    private lateinit var patientNameView: TextView
    private lateinit var patientAgeView: TextView
    private lateinit var currentValueView: TextView
    private lateinit var evolutionView: TextView
    private lateinit var axisLabelView: TextView
    private lateinit var lastMeasureDateView: TextView

    private lateinit var btnTabPoids: MaterialButton
    private lateinit var btnTabTaille: MaterialButton
    private lateinit var btnTabImc: MaterialButton

    private var bebeId: Int = 0
    private var bebeName: String = ""
    private var currentData: List<CroissanceDto> = emptyList()

    // WHO weight-for-age percentile reference (boys, 0–30 months)
    // Each array: [month, P3, P15, P50, P85, P97]
    private val whoWeightRef = arrayOf(
        floatArrayOf(0f, 2.9f, 3.3f, 3.9f, 4.5f, 5.0f),
        floatArrayOf(2f, 4.6f, 5.1f, 5.8f, 6.6f, 7.2f),
        floatArrayOf(4f, 5.8f, 6.4f, 7.3f, 8.2f, 9.0f),
        floatArrayOf(6f, 6.5f, 7.1f, 8.0f, 9.0f, 9.9f),
        floatArrayOf(9f, 7.4f, 8.1f, 9.2f, 10.3f, 11.3f),
        floatArrayOf(12f, 8.1f, 8.9f, 10.2f, 11.5f, 12.6f),
        floatArrayOf(15f, 8.7f, 9.5f, 10.9f, 12.4f, 13.7f),
        floatArrayOf(18f, 9.2f, 10.1f, 11.6f, 13.2f, 14.7f),
        floatArrayOf(21f, 9.7f, 10.6f, 12.2f, 14.0f, 15.6f),
        floatArrayOf(24f, 10.2f, 11.2f, 12.9f, 14.8f, 16.5f),
        floatArrayOf(27f, 10.6f, 11.7f, 13.5f, 15.6f, 17.4f),
        floatArrayOf(30f, 11.0f, 12.1f, 14.1f, 16.4f, 18.3f)
    )

    // WHO height-for-age percentile reference (boys, 0–30 months)
    private val whoHeightRef = arrayOf(
        floatArrayOf(0f, 46.3f, 48.0f, 49.9f, 51.8f, 53.4f),
        floatArrayOf(2f, 54.4f, 56.4f, 58.4f, 60.4f, 62.2f),
        floatArrayOf(4f, 60.0f, 62.1f, 64.3f, 66.5f, 68.5f),
        floatArrayOf(6f, 63.3f, 65.6f, 68.0f, 70.3f, 72.5f),
        floatArrayOf(9f, 67.7f, 70.2f, 72.8f, 75.3f, 77.6f),
        floatArrayOf(12f, 71.3f, 73.9f, 76.8f, 79.7f, 82.3f),
        floatArrayOf(15f, 74.4f, 77.2f, 80.2f, 83.3f, 86.1f),
        floatArrayOf(18f, 77.0f, 80.0f, 83.2f, 86.5f, 89.5f),
        floatArrayOf(21f, 79.4f, 82.5f, 85.9f, 89.4f, 92.5f),
        floatArrayOf(24f, 81.7f, 84.9f, 88.5f, 92.2f, 95.5f),
        floatArrayOf(27f, 83.8f, 87.2f, 91.0f, 94.9f, 98.4f),
        floatArrayOf(30f, 85.9f, 89.4f, 93.4f, 97.5f, 101.1f)
    )

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
        evolutionView = view.findViewById(R.id.tvGrowthEvolution)
        axisLabelView = view.findViewById(R.id.tvGrowthAxisLabel)
        lastMeasureDateView = view.findViewById(R.id.tvLastMeasureDate)

        btnTabPoids = view.findViewById(R.id.btnTabPoids)
        btnTabTaille = view.findViewById(R.id.btnTabTaille)
        btnTabImc = view.findViewById(R.id.btnTabImc)

        patientNameView.text = bebeName.ifBlank { "Patient #$bebeId" }

        view.findViewById<View>(R.id.btnBackGrowth).setOnClickListener {
            parentFragmentManager.popBackStack()
        }
        view.findViewById<View>(R.id.fabAddMeasure).setOnClickListener {
            showAddMeasureDialog()
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
        chart.legend.isEnabled = false
        chart.setDrawGridBackground(false)
        chart.setExtraOffsets(8f, 10f, 8f, 6f)

        chart.xAxis.apply {
            position = XAxis.XAxisPosition.BOTTOM
            setDrawGridLines(false)
            granularity = 3f
            textColor = Color.parseColor("#64748B")
            textSize = 10f
            valueFormatter = object : ValueFormatter() {
                override fun getFormattedValue(value: Float): String = "${value.toInt()}m"
            }
        }

        chart.axisLeft.apply {
            setDrawGridLines(true)
            gridColor = Color.parseColor("#20000000")
            gridLineWidth = 0.5f
            textColor = Color.parseColor("#64748B")
            textSize = 10f
        }
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
        val teal = Color.parseColor("#006D77")
        val gray = Color.parseColor("#64748B")

        listOf(btnTabPoids, btnTabTaille, btnTabImc).forEachIndexed { i, btn ->
            val active = i == index
            btn.backgroundTintList = ColorStateList.valueOf(if (active) teal else Color.TRANSPARENT)
            btn.setTextColor(if (active) Color.WHITE else gray)
            btn.setTypeface(null, if (active) android.graphics.Typeface.BOLD else android.graphics.Typeface.NORMAL)
        }

        when (index) {
            0 -> renderPoids()
            1 -> renderTaille()
            2 -> renderImc()
        }
    }

    private fun renderPoids() {
        axisLabelView.text = "Poids (kg)"
        val entries = currentData.mapNotNull { m ->
            m.poids?.let { Entry((m.ageSemaines ?: 0).toFloat() / 4f, it.toFloat()) }
        }
        val last = currentData.lastOrNull { it.poids != null }
        currentValueView.text = last?.poids?.let { "$it kg" } ?: "-- kg"
        lastMeasureDateView.text = last?.dateMesure ?: "--"
        updateEvolution(currentData.mapNotNull { m -> m.poids?.let { Pair((m.ageSemaines ?: 0).toFloat() / 4f, it) } }, "kg")
        updateChartWithPercentiles(entries, Color.parseColor("#006D77"), whoWeightRef)
    }

    private fun renderTaille() {
        axisLabelView.text = "Taille (cm)"
        val entries = currentData.mapNotNull { m ->
            m.taille?.let { Entry((m.ageSemaines ?: 0).toFloat() / 4f, it.toFloat()) }
        }
        val last = currentData.lastOrNull { it.taille != null }
        currentValueView.text = last?.taille?.let { "$it cm" } ?: "-- cm"
        lastMeasureDateView.text = last?.dateMesure ?: "--"
        updateEvolution(currentData.mapNotNull { m -> m.taille?.let { Pair((m.ageSemaines ?: 0).toFloat() / 4f, it) } }, "cm")
        updateChartWithPercentiles(entries, Color.parseColor("#0EA5E9"), whoHeightRef)
    }

    private fun renderImc() {
        axisLabelView.text = "IMC (kg/m²)"
        val entries = currentData.mapNotNull { m ->
            val p = m.poids; val t = m.taille
            if (p != null && t != null && t > 0) {
                val imc = p / ((t / 100.0) * (t / 100.0))
                Entry((m.ageSemaines ?: 0).toFloat() / 4f, imc.toFloat())
            } else null
        }
        currentValueView.text = entries.lastOrNull()?.y?.let { String.format("%.1f", it) } ?: "--"
        lastMeasureDateView.text = currentData.lastOrNull()?.dateMesure ?: "--"
        evolutionView.text = ""
        updateChartWithPercentiles(entries, Color.parseColor("#7B5EA7"), null)
    }

    private fun updateEvolution(points: List<Pair<Float, Double>>, unit: String) {
        if (points.size < 2) { evolutionView.text = ""; return }
        val last = points.last()
        // find point closest to 1 month (4 weeks) before the last
        val targetAge = last.first - 1f
        val prev = points.minByOrNull { abs(it.first - targetAge) }
            ?.takeIf { it.first < last.first && abs(it.first - last.first) < 3f }
        if (prev == null) { evolutionView.text = ""; return }
        val delta = last.second - prev.second
        val sign = if (delta >= 0) "+" else ""
        val deltaStr = String.format("$sign%.1f $unit depuis 1 mois", delta)
        evolutionView.text = deltaStr
        evolutionView.setTextColor(
            requireContext().getColor(if (delta >= 0) R.color.success else R.color.error)
        )
    }

    private fun updateChartWithPercentiles(
        patientEntries: List<Entry>,
        patientColor: Int,
        refData: Array<FloatArray>?
    ) {
        val dataSets = mutableListOf<LineDataSet>()

        if (refData != null) {
            // Color scheme per zone: P3 gray, P15 rose, P50 green, P85 teal, P97 orange
            val percColors = listOf(
                Color.parseColor("#94A3B8"), // P3
                Color.parseColor("#F43F5E"), // P15
                Color.parseColor("#10B981"), // P50
                Color.parseColor("#006D77"), // P85 (lighter teal)
                Color.parseColor("#F59E0B")  // P97
            )
            val percLabels = listOf("P3", "P15", "P50", "P85", "P97")

            for (col in 0..4) {
                val pEntries = refData.map { row -> Entry(row[0], row[col + 1]) }
                val ds = LineDataSet(pEntries, percLabels[col]).apply {
                    color = percColors[col]
                    lineWidth = 1.2f
                    setDrawCircles(false)
                    setDrawValues(false)
                    enableDashedLine(8f, 4f, 0f)
                    mode = LineDataSet.Mode.CUBIC_BEZIER
                    setDrawFilled(false)
                    isHighlightEnabled = false
                }
                dataSets.add(ds)
            }
        }

        // Patient's actual curve — drawn on top
        if (patientEntries.isNotEmpty()) {
            val patientSet = LineDataSet(patientEntries, "Patient").apply {
                color = patientColor
                setCircleColor(patientColor)
                lineWidth = 3f
                circleRadius = 5f
                circleHoleRadius = 2.5f
                circleHoleColor = Color.WHITE
                setDrawValues(false)
                mode = LineDataSet.Mode.CUBIC_BEZIER
                setDrawFilled(true)
                fillAlpha = 25
                fillColor = patientColor
                isHighlightEnabled = true
            }
            dataSets.add(patientSet)
        }

        if (dataSets.isEmpty()) {
            chart.data = null
            chart.invalidate()
            return
        }

        chart.data = LineData(dataSets.map { it })
        chart.invalidate()
    }

    private fun showAddMeasureDialog() {
        if (bebeId <= 0) {
            Toast.makeText(requireContext(), "Identifiant bébé invalide", Toast.LENGTH_SHORT).show()
            return
        }
        val root = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(64, 32, 64, 8)
        }
        val etPoids = EditText(requireContext()).apply {
            hint = "Poids (kg) — ex: 7.5"
            inputType = android.text.InputType.TYPE_CLASS_NUMBER or android.text.InputType.TYPE_NUMBER_FLAG_DECIMAL
        }
        val etTaille = EditText(requireContext()).apply {
            hint = "Taille (cm) — ex: 65.0"
            inputType = android.text.InputType.TYPE_CLASS_NUMBER or android.text.InputType.TYPE_NUMBER_FLAG_DECIMAL
        }
        root.addView(etPoids)
        root.addView(etTaille)

        AlertDialog.Builder(requireContext())
            .setTitle("Ajouter une mesure")
            .setView(root)
            .setNegativeButton("Annuler", null)
            .setPositiveButton("Enregistrer") { _, _ ->
                val poids = etPoids.text.toString().replace(',', '.').toDoubleOrNull()
                val taille = etTaille.text.toString().replace(',', '.').toDoubleOrNull()
                if (poids == null && taille == null) {
                    Toast.makeText(requireContext(), "Entrez au moins poids ou taille", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                if (poids != null && (poids < 0.5 || poids > 100)) {
                    Toast.makeText(requireContext(), "Poids invalide (0.5–100 kg)", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                if (taille != null && (taille < 20 || taille > 220)) {
                    Toast.makeText(requireContext(), "Taille invalide (20–220 cm)", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                viewLifecycleOwner.lifecycleScope.launch {
                    try {
                        val response = ApiClient.apiService.addCroissance(bebeId, AddCroissanceRequest(poids, taille))
                        if (response.status == "success") {
                            Toast.makeText(requireContext(), "Mesure enregistrée", Toast.LENGTH_SHORT).show()
                            loadGrowth()
                        } else {
                            Toast.makeText(requireContext(), response.message ?: "Erreur", Toast.LENGTH_SHORT).show()
                        }
                    } catch (e: Exception) {
                        Toast.makeText(requireContext(), "Erreur réseau : ${e.message}", Toast.LENGTH_SHORT).show()
                    }
                }
            }
            .show()
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
