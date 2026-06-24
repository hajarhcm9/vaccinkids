package com.example.vaccinkid

import android.content.res.ColorStateList
import android.graphics.Color
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.core.content.ContextCompat
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
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.textfield.TextInputEditText
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.abs

class GrowthChartFragment : Fragment(R.layout.fragment_growth_chart) {

    // ── Views ─────────────────────────────────────────────────────────────────
    private lateinit var chart:               LineChart
    private lateinit var patientNameView:     TextView
    private lateinit var patientAgeView:      TextView
    private lateinit var currentValueView:    TextView
    private lateinit var evolutionView:       TextView
    private lateinit var axisLabelView:       TextView
    private lateinit var lastMeasureDateView: TextView
    private lateinit var tvGenderBadge:       TextView
    private lateinit var tvInitials:          TextView
    private lateinit var flAvatar:            FrameLayout
    private lateinit var llPercentileStatus:  LinearLayout
    private lateinit var tvPercentileIcon:    TextView
    private lateinit var tvPercentileText:    TextView
    private lateinit var pbLoading:           ProgressBar
    private lateinit var llEmpty:             LinearLayout
    private lateinit var btnTabPoids:         MaterialButton
    private lateinit var btnTabTaille:        MaterialButton
    private lateinit var btnTabImc:           MaterialButton

    // ── State ──────────────────────────────────────────────────────────────────
    private var bebeId:        Int     = 0
    private var bebeName:      String  = ""
    private var sexe:          String? = null
    private var dateNaissance: String? = null
    private var currentData:   List<CroissanceDto> = emptyList()
    private var currentTab:    Int     = 0

    // ── WHO Poids garçons [mois, P3, P15, P50, P85, P97] ─────────────────────
    private val whoWeightBoys = arrayOf(
        floatArrayOf(0f,  2.9f,  3.3f,  3.9f,  4.5f,  5.0f),
        floatArrayOf(2f,  4.6f,  5.1f,  5.8f,  6.6f,  7.2f),
        floatArrayOf(4f,  5.8f,  6.4f,  7.3f,  8.2f,  9.0f),
        floatArrayOf(6f,  6.5f,  7.1f,  8.0f,  9.0f,  9.9f),
        floatArrayOf(9f,  7.4f,  8.1f,  9.2f, 10.3f, 11.3f),
        floatArrayOf(12f, 8.1f,  8.9f, 10.2f, 11.5f, 12.6f),
        floatArrayOf(15f, 8.7f,  9.5f, 10.9f, 12.4f, 13.7f),
        floatArrayOf(18f, 9.2f, 10.1f, 11.6f, 13.2f, 14.7f),
        floatArrayOf(21f, 9.7f, 10.6f, 12.2f, 14.0f, 15.6f),
        floatArrayOf(24f,10.2f, 11.2f, 12.9f, 14.8f, 16.5f),
        floatArrayOf(27f,10.6f, 11.7f, 13.5f, 15.6f, 17.4f),
        floatArrayOf(30f,11.0f, 12.1f, 14.1f, 16.4f, 18.3f)
    )

    private val whoWeightGirls = arrayOf(
        floatArrayOf(0f,  2.8f,  3.2f,  3.7f,  4.2f,  4.6f),
        floatArrayOf(2f,  4.0f,  4.5f,  5.1f,  5.8f,  6.4f),
        floatArrayOf(4f,  5.0f,  5.5f,  6.2f,  7.0f,  7.7f),
        floatArrayOf(6f,  5.7f,  6.3f,  7.1f,  8.1f,  8.9f),
        floatArrayOf(9f,  6.5f,  7.2f,  8.2f,  9.3f, 10.2f),
        floatArrayOf(12f, 7.1f,  7.9f,  9.0f, 10.2f, 11.3f),
        floatArrayOf(15f, 7.6f,  8.5f,  9.7f, 11.1f, 12.3f),
        floatArrayOf(18f, 8.1f,  9.0f, 10.4f, 11.9f, 13.2f),
        floatArrayOf(21f, 8.5f,  9.5f, 11.0f, 12.7f, 14.1f),
        floatArrayOf(24f, 8.9f, 10.0f, 11.5f, 13.3f, 14.8f),
        floatArrayOf(27f, 9.3f, 10.4f, 12.1f, 14.0f, 15.6f),
        floatArrayOf(30f, 9.7f, 10.9f, 12.7f, 14.7f, 16.4f)
    )

    private val whoHeightBoys = arrayOf(
        floatArrayOf(0f,  46.3f, 48.0f, 49.9f, 51.8f, 53.4f),
        floatArrayOf(2f,  54.4f, 56.4f, 58.4f, 60.4f, 62.2f),
        floatArrayOf(4f,  60.0f, 62.1f, 64.3f, 66.5f, 68.5f),
        floatArrayOf(6f,  63.3f, 65.6f, 68.0f, 70.3f, 72.5f),
        floatArrayOf(9f,  67.7f, 70.2f, 72.8f, 75.3f, 77.6f),
        floatArrayOf(12f, 71.3f, 73.9f, 76.8f, 79.7f, 82.3f),
        floatArrayOf(15f, 74.4f, 77.2f, 80.2f, 83.3f, 86.1f),
        floatArrayOf(18f, 77.0f, 80.0f, 83.2f, 86.5f, 89.5f),
        floatArrayOf(21f, 79.4f, 82.5f, 85.9f, 89.4f, 92.5f),
        floatArrayOf(24f, 81.7f, 84.9f, 88.5f, 92.2f, 95.5f),
        floatArrayOf(27f, 83.8f, 87.2f, 91.0f, 94.9f, 98.4f),
        floatArrayOf(30f, 85.9f, 89.4f, 93.4f, 97.5f,101.1f)
    )

    private val whoHeightGirls = arrayOf(
        floatArrayOf(0f,  45.6f, 47.3f, 49.1f, 51.0f, 52.6f),
        floatArrayOf(2f,  52.7f, 54.8f, 57.1f, 59.4f, 61.3f),
        floatArrayOf(4f,  58.4f, 60.6f, 63.1f, 65.7f, 67.8f),
        floatArrayOf(6f,  61.8f, 64.2f, 66.9f, 69.6f, 71.9f),
        floatArrayOf(9f,  66.2f, 68.7f, 71.7f, 74.6f, 77.1f),
        floatArrayOf(12f, 69.9f, 72.6f, 75.8f, 79.0f, 81.7f),
        floatArrayOf(15f, 73.3f, 76.2f, 79.7f, 83.1f, 86.1f),
        floatArrayOf(18f, 76.3f, 79.4f, 83.1f, 86.8f, 89.9f),
        floatArrayOf(21f, 79.0f, 82.2f, 86.1f, 90.0f, 93.3f),
        floatArrayOf(24f, 81.3f, 84.7f, 88.8f, 92.9f, 96.4f),
        floatArrayOf(27f, 83.3f, 86.9f, 91.2f, 95.5f, 99.2f),
        floatArrayOf(30f, 85.2f, 89.0f, 93.5f, 98.0f,101.9f)
    )

    private fun isFemale() = sexe?.lowercase()?.trim() in listOf("f", "fille", "feminin", "féminin", "female")

    // ── Lifecycle ─────────────────────────────────────────────────────────────
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        bebeId        = arguments?.getInt(ARG_BEBE_ID) ?: 0
        bebeName      = arguments?.getString(ARG_BEBE_NAME).orEmpty()
        sexe          = arguments?.getString(ARG_SEXE)
        dateNaissance = arguments?.getString(ARG_DATE_NAISSANCE)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        bindViews(view)
        setupChart()
        selectTab(0)
        loadGrowth()
    }

    // ── Bind ──────────────────────────────────────────────────────────────────
    private fun bindViews(view: View) {
        chart               = view.findViewById(R.id.lineChartGrowth)
        patientNameView     = view.findViewById(R.id.tvGrowthPatientName)
        patientAgeView      = view.findViewById(R.id.tvGrowthPatientAge)
        currentValueView    = view.findViewById(R.id.tvCurrentValue)
        evolutionView       = view.findViewById(R.id.tvGrowthEvolution)
        axisLabelView       = view.findViewById(R.id.tvGrowthAxisLabel)
        lastMeasureDateView = view.findViewById(R.id.tvLastMeasureDate)
        tvGenderBadge       = view.findViewById(R.id.tvGrowthGender)
        tvInitials          = view.findViewById(R.id.tvGrowthInitials)
        flAvatar            = view.findViewById(R.id.flGrowthAvatar)
        llPercentileStatus  = view.findViewById(R.id.llPercentileStatus)
        tvPercentileIcon    = view.findViewById(R.id.tvPercentileIcon)
        tvPercentileText    = view.findViewById(R.id.tvPercentileText)
        pbLoading           = view.findViewById(R.id.pbGrowthLoading)
        llEmpty             = view.findViewById(R.id.llGrowthEmpty)
        btnTabPoids         = view.findViewById(R.id.btnTabPoids)
        btnTabTaille        = view.findViewById(R.id.btnTabTaille)
        btnTabImc           = view.findViewById(R.id.btnTabImc)

        // Patient info
        patientNameView.text = bebeName.ifBlank { "Patient #$bebeId" }
        patientAgeView.text  = calculateAge(dateNaissance)

        // Initials from name
        val parts = bebeName.trim().split(" ")
        tvInitials.text = buildString {
            parts.getOrNull(0)?.firstOrNull()?.uppercaseChar()?.let { append(it) }
            parts.getOrNull(1)?.firstOrNull()?.uppercaseChar()?.let { append(it) }
        }.ifBlank { "?" }

        // Avatar + gender badge colored by sex
        if (isFemale()) {
            flAvatar.backgroundTintList = ColorStateList.valueOf(
                ContextCompat.getColor(requireContext(), R.color.brand_coral)
            )
            tvGenderBadge.text = "Fille"
            tvGenderBadge.setTextColor(ContextCompat.getColor(requireContext(), R.color.brand_coral))
            tvGenderBadge.setBackgroundResource(R.drawable.bg_badge_error)
        } else if (!sexe.isNullOrBlank()) {
            flAvatar.backgroundTintList = ColorStateList.valueOf(
                ContextCompat.getColor(requireContext(), R.color.info)
            )
            tvGenderBadge.text = "Garçon"
        }
        tvGenderBadge.visibility = if (!sexe.isNullOrBlank()) View.VISIBLE else View.GONE

        // Actions
        view.findViewById<View>(R.id.btnBackGrowth).setOnClickListener {
            parentFragmentManager.popBackStack()
        }
        view.findViewById<View>(R.id.fabAddMeasure).setOnClickListener {
            showAddMeasureDialog()
        }
        btnTabPoids.setOnClickListener  { selectTab(0) }
        btnTabTaille.setOnClickListener { selectTab(1) }
        btnTabImc.setOnClickListener    { selectTab(2) }
    }

    // ── Chart setup ───────────────────────────────────────────────────────────
    private fun setupChart() {
        chart.description.isEnabled  = false
        chart.setNoDataText("")
        chart.setTouchEnabled(true)
        chart.setPinchZoom(true)
        chart.axisRight.isEnabled    = false
        chart.legend.isEnabled       = false
        chart.setDrawGridBackground(false)
        chart.setExtraOffsets(8f, 10f, 8f, 6f)

        chart.xAxis.apply {
            position = XAxis.XAxisPosition.BOTTOM
            setDrawGridLines(false)
            granularity = 3f
            textColor = Color.parseColor("#64748B")
            textSize  = 10f
            valueFormatter = object : ValueFormatter() {
                override fun getFormattedValue(value: Float) = "${value.toInt()}m"
            }
        }
        chart.axisLeft.apply {
            setDrawGridLines(true)
            gridColor     = Color.parseColor("#20000000")
            gridLineWidth = 0.5f
            textColor     = Color.parseColor("#64748B")
            textSize      = 10f
        }
    }

    // ── Data loading ──────────────────────────────────────────────────────────
    private fun loadGrowth() {
        if (bebeId <= 0) return
        pbLoading.visibility = View.VISIBLE
        llEmpty.visibility   = View.GONE
        chart.visibility     = View.GONE

        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.getCroissance(bebeId)
                if (response.status == "success") {
                    currentData = response.data.orEmpty().sortedBy { it.ageSemaines ?: 0 }
                }
            } catch (_: Exception) {
                // silent — chart stays empty
            } finally {
                pbLoading.visibility = View.GONE
                renderCurrentTab()
            }
        }
    }

    // ── Tab selection ─────────────────────────────────────────────────────────
    private fun selectTab(index: Int) {
        currentTab = index
        val teal = Color.parseColor("#006D77")
        val gray = Color.parseColor("#64748B")

        listOf(btnTabPoids, btnTabTaille, btnTabImc).forEachIndexed { i, btn ->
            val active = i == index
            btn.backgroundTintList = ColorStateList.valueOf(if (active) teal else Color.TRANSPARENT)
            btn.setTextColor(if (active) Color.WHITE else gray)
            btn.setTypeface(null, if (active) android.graphics.Typeface.BOLD else android.graphics.Typeface.NORMAL)
        }
        if (currentData.isNotEmpty()) renderCurrentTab()
    }

    private fun renderCurrentTab() {
        when (currentTab) {
            0 -> renderPoids()
            1 -> renderTaille()
            2 -> renderImc()
        }
    }

    // ── Render functions ──────────────────────────────────────────────────────
    private fun renderPoids() {
        axisLabelView.text = "POIDS (kg)"
        val entries = currentData.mapNotNull { m ->
            m.poids?.let { Entry((m.ageSemaines ?: 0).toFloat() / 4f, it.toFloat()) }
        }
        val last = currentData.lastOrNull { it.poids != null }
        currentValueView.text = last?.poids?.let { "${String.format("%.1f", it)} kg" } ?: "-- kg"
        currentValueView.setTextColor(Color.parseColor("#006D77"))
        lastMeasureDateView.text = formatDate(last?.dateMesure)

        val refData = if (isFemale()) whoWeightGirls else whoWeightBoys
        updateEvolution(currentData.mapNotNull { m -> m.poids?.let { Pair((m.ageSemaines ?: 0).toFloat() / 4f, it) } }, "kg")
        updateChartWithPercentiles(entries, Color.parseColor("#006D77"), refData)

        // Percentile status for the last point
        if (last != null && last.poids != null) {
            val ageMonths = (last.ageSemaines ?: 0).toFloat() / 4f
            showPercentileStatus(ageMonths, last.poids!!.toFloat(), refData, "poids")
        } else {
            llPercentileStatus.visibility = View.GONE
        }
    }

    private fun renderTaille() {
        axisLabelView.text = "TAILLE (cm)"
        val entries = currentData.mapNotNull { m ->
            m.taille?.let { Entry((m.ageSemaines ?: 0).toFloat() / 4f, it.toFloat()) }
        }
        val last = currentData.lastOrNull { it.taille != null }
        currentValueView.text = last?.taille?.let { "${String.format("%.1f", it)} cm" } ?: "-- cm"
        currentValueView.setTextColor(Color.parseColor("#0EA5E9"))
        lastMeasureDateView.text = formatDate(last?.dateMesure)

        val refData = if (isFemale()) whoHeightGirls else whoHeightBoys
        updateEvolution(currentData.mapNotNull { m -> m.taille?.let { Pair((m.ageSemaines ?: 0).toFloat() / 4f, it) } }, "cm")
        updateChartWithPercentiles(entries, Color.parseColor("#0EA5E9"), refData)

        if (last != null && last.taille != null) {
            val ageMonths = (last.ageSemaines ?: 0).toFloat() / 4f
            showPercentileStatus(ageMonths, last.taille!!.toFloat(), refData, "taille")
        } else {
            llPercentileStatus.visibility = View.GONE
        }
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
        val lastImc = entries.lastOrNull()
        currentValueView.text = lastImc?.y?.let { "${String.format("%.1f", it)} kg/m²" } ?: "-- kg/m²"
        currentValueView.setTextColor(Color.parseColor("#7B5EA7"))
        lastMeasureDateView.text = formatDate(currentData.lastOrNull()?.dateMesure)
        evolutionView.text = ""
        llPercentileStatus.visibility = View.GONE
        updateChartWithPercentiles(entries, Color.parseColor("#7B5EA7"), null)
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private fun updateEvolution(points: List<Pair<Float, Double>>, unit: String) {
        if (points.size < 2) { evolutionView.text = ""; return }
        val last = points.last()
        val targetAge = last.first - 1f
        val prev = points.minByOrNull { abs(it.first - targetAge) }
            ?.takeIf { it.first < last.first && abs(it.first - last.first) < 3f }
        if (prev == null) { evolutionView.text = ""; return }
        val delta = last.second - prev.second
        val sign = if (delta >= 0) "▲ +" else "▼ "
        evolutionView.text = "${sign}${String.format("%.1f", delta)} $unit/mois"
        evolutionView.setTextColor(
            requireContext().getColor(if (delta >= 0) R.color.success else R.color.error)
        )
    }

    private fun showPercentileStatus(ageMonths: Float, value: Float, refData: Array<FloatArray>, type: String) {
        // Interpolate WHO values at this age
        val rows = refData.sortedBy { it[0] }
        if (ageMonths > rows.last()[0]) {
            // Beyond our WHO data range
            llPercentileStatus.visibility = View.GONE
            return
        }
        val lower = rows.lastOrNull { it[0] <= ageMonths } ?: rows.first()
        val upper = rows.firstOrNull { it[0] >= ageMonths } ?: rows.last()
        val t  = if (upper[0] == lower[0]) 1f else (ageMonths - lower[0]) / (upper[0] - lower[0])
        val p3  = lower[1] + t * (upper[1] - lower[1])
        val p15 = lower[2] + t * (upper[2] - lower[2])
        val p85 = lower[4] + t * (upper[4] - lower[4])
        val p97 = lower[5] + t * (upper[5] - lower[5])

        val (bg, icon, text, textColor) = when {
            value < p3  -> Quadruple(R.drawable.bg_badge_error,   "🔴", "Alerte : $type très bas (<P3) — consultation urgente", R.color.error)
            value < p15 -> Quadruple(R.drawable.bg_badge_warning, "⚠", "Attention : $type faible (P3–P15)", R.color.warning_dark)
            value < p85 -> Quadruple(R.drawable.bg_badge_success, "✓", "Croissance normale (P15–P85)", R.color.success_dark)
            value < p97 -> Quadruple(R.drawable.bg_badge_info,    "ℹ", "$type au-dessus de la médiane (P85–P97)", R.color.info_dark)
            else        -> Quadruple(R.drawable.bg_badge_warning, "⚠", "$type élevé(e) (>P97) — à surveiller", R.color.warning_dark)
        }

        llPercentileStatus.setBackgroundResource(bg)
        tvPercentileIcon.text = icon
        tvPercentileIcon.setTextColor(ContextCompat.getColor(requireContext(), textColor))
        tvPercentileText.text = text
        tvPercentileText.setTextColor(ContextCompat.getColor(requireContext(), textColor))
        llPercentileStatus.visibility = View.VISIBLE
    }

    private data class Quadruple<A, B, C, D>(val a: A, val b: B, val c: C, val d: D)

    private fun updateChartWithPercentiles(
        patientEntries: List<Entry>,
        patientColor:   Int,
        refData:        Array<FloatArray>?
    ) {
        val isEmpty = patientEntries.isEmpty()
        chart.visibility  = if (isEmpty) View.GONE else View.VISIBLE
        llEmpty.visibility = if (isEmpty) View.VISIBLE else View.GONE

        if (isEmpty) {
            chart.data = null
            chart.invalidate()
            return
        }

        val dataSets = ArrayList<com.github.mikephil.charting.interfaces.datasets.ILineDataSet>()

        if (refData != null) {
            val percColors = listOf(
                Color.parseColor("#94A3B8"), // P3
                Color.parseColor("#F43F5E"), // P15
                Color.parseColor("#10B981"), // P50
                Color.parseColor("#006D77"), // P85
                Color.parseColor("#F59E0B")  // P97
            )
            val percLabels = listOf("P3", "P15", "P50", "P85", "P97")
            for (col in 0..4) {
                val pEntries = refData.map { row -> Entry(row[0], row[col + 1]) }
                dataSets.add(LineDataSet(pEntries, percLabels[col]).apply {
                    color     = percColors[col]
                    lineWidth = 1.2f
                    setDrawCircles(false)
                    setDrawValues(false)
                    enableDashedLine(8f, 4f, 0f)
                    mode                = LineDataSet.Mode.CUBIC_BEZIER
                    setDrawFilled(false)
                    isHighlightEnabled  = false
                })
            }
        }

        dataSets.add(LineDataSet(patientEntries, "Patient").apply {
            color              = patientColor
            setCircleColor(patientColor)
            lineWidth          = 3f
            circleRadius       = 5f
            circleHoleRadius   = 2.5f
            circleHoleColor    = Color.WHITE
            setDrawValues(false)
            mode               = LineDataSet.Mode.CUBIC_BEZIER
            setDrawFilled(true)
            fillAlpha          = 25
            fillColor          = patientColor
            isHighlightEnabled = true
        })

        chart.data = LineData(dataSets)
        chart.invalidate()
    }

    // ── Add measure dialog ────────────────────────────────────────────────────
    private fun showAddMeasureDialog() {
        if (bebeId <= 0) {
            Toast.makeText(requireContext(), "Identifiant bébé invalide", Toast.LENGTH_SHORT).show()
            return
        }
        val dialogView = LayoutInflater.from(requireContext()).inflate(R.layout.dialog_add_measure, null)
        val etPoids  = dialogView.findViewById<TextInputEditText>(R.id.etMeasurePoids)
        val etTaille = dialogView.findViewById<TextInputEditText>(R.id.etMeasureTaille)

        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Ajouter une mesure")
            .setView(dialogView)
            .setNegativeButton("Annuler", null)
            .setPositiveButton("Enregistrer") { _, _ ->
                val poids  = etPoids.text?.toString()?.replace(',', '.')?.toDoubleOrNull()
                val taille = etTaille.text?.toString()?.replace(',', '.')?.toDoubleOrNull()
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
                            Toast.makeText(requireContext(), "Mesure enregistrée ✓", Toast.LENGTH_SHORT).show()
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

    // ── Date & age helpers ────────────────────────────────────────────────────
    private fun formatDate(raw: String?): String {
        if (raw.isNullOrBlank()) return "--"
        return try {
            val inputFormats = listOf(
                "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
                "yyyy-MM-dd'T'HH:mm:ss'Z'",
                "yyyy-MM-dd"
            )
            for (fmt in inputFormats) {
                try {
                    val date = SimpleDateFormat(fmt, Locale.FRENCH).parse(raw) ?: continue
                    return SimpleDateFormat("dd MMM yyyy", Locale.FRENCH).format(date)
                } catch (_: Exception) { }
            }
            raw
        } catch (_: Exception) { raw }
    }

    private fun calculateAge(dateNaissance: String?): String {
        if (dateNaissance.isNullOrBlank()) return "Âge inconnu"
        return try {
            val dob = SimpleDateFormat("yyyy-MM-dd", Locale.FRENCH).parse(dateNaissance)
                ?: return "Âge inconnu"
            val totalMonths = ((Date().time - dob.time) / (1000L * 60 * 60 * 24 * 30.44)).toInt()
            val years  = totalMonths / 12
            val months = totalMonths % 12
            if (years > 0) "$years an${if (years > 1) "s" else ""} $months mois" else "$totalMonths mois"
        } catch (_: Exception) { "Âge inconnu" }
    }

    // ── Companion ─────────────────────────────────────────────────────────────
    companion object {
        private const val ARG_BEBE_ID        = "bebe_id"
        private const val ARG_BEBE_NAME      = "bebe_name"
        private const val ARG_SEXE           = "sexe"
        private const val ARG_DATE_NAISSANCE = "date_naissance"

        fun newInstance(bebeId: Int, bebeName: String, sexe: String? = null, dateNaissance: String? = null) =
            GrowthChartFragment().apply {
                arguments = Bundle().apply {
                    putInt(ARG_BEBE_ID, bebeId)
                    putString(ARG_BEBE_NAME, bebeName)
                    putString(ARG_SEXE, sexe)
                    putString(ARG_DATE_NAISSANCE, dateNaissance)
                }
            }
    }
}
