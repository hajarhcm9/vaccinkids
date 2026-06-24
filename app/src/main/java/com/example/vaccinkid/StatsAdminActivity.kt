package com.example.vaccinkid

import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.Typeface
import android.os.Bundle
import android.text.TextUtils
import android.view.Gravity
import android.view.View
import android.os.CountDownTimer
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.example.vaccinkid.model.AdminRefCentreDto
import com.example.vaccinkid.network.ApiClient
import com.github.mikephil.charting.charts.LineChart
import com.github.mikephil.charting.charts.PieChart
import com.github.mikephil.charting.components.Legend
import com.github.mikephil.charting.components.XAxis
import com.github.mikephil.charting.data.Entry
import com.github.mikephil.charting.data.LineData
import com.github.mikephil.charting.data.LineDataSet
import com.github.mikephil.charting.data.PieData
import com.github.mikephil.charting.data.PieDataSet
import com.github.mikephil.charting.data.PieEntry
import com.github.mikephil.charting.formatter.IndexAxisValueFormatter
import com.github.mikephil.charting.formatter.PercentFormatter
import com.google.android.material.button.MaterialButton
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.progressindicator.LinearProgressIndicator
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch

class StatsAdminActivity : AppCompatActivity() {

    private lateinit var statsProgress: ProgressBar
    private lateinit var tvStatsMessage: TextView
    private lateinit var tvKpiVaccines: TextView
    private lateinit var tvKpiCoverage: TextView
    private lateinit var tvKpiSessions: TextView
    private lateinit var tvKpiVaccinesBadge: TextView
    private lateinit var tvKpiCoverageBadge: TextView
    private lateinit var tvKpiSessionsBadge: TextView
    private lateinit var lineChart: LineChart
    private lateinit var pieChart: PieChart
    private lateinit var llTopCentres: LinearLayout
    private lateinit var tvAlertAbsenteisme: TextView
    private lateinit var tvAlertStock: TextView
    private lateinit var tvAlertSessions: TextView
    private lateinit var btnCentreFilter: MaterialButton
    private lateinit var btnPeriodMonth: MaterialButton
    private lateinit var btnPeriodTrimester: MaterialButton
    private lateinit var btnPeriodYear: MaterialButton

    private var centres: List<AdminRefCentreDto> = emptyList()
    private var selectedCentreId: Int? = null
    private var selectedCentreLabel = "Tous les centres"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        protectSensitiveContent()
        setContentView(R.layout.activity_stats_admin)

        statsProgress      = findViewById(R.id.statsProgress)
        tvStatsMessage     = findViewById(R.id.tvStatsMessage)
        tvKpiVaccines      = findViewById(R.id.tvKpiVaccines)
        tvKpiCoverage      = findViewById(R.id.tvKpiCoverage)
        tvKpiSessions      = findViewById(R.id.tvKpiSessions)
        tvKpiVaccinesBadge = findViewById(R.id.tvKpiVaccinesBadge)
        tvKpiCoverageBadge = findViewById(R.id.tvKpiCoverageBadge)
        tvKpiSessionsBadge = findViewById(R.id.tvKpiSessionsBadge)
        lineChart          = findViewById(R.id.lineChartStats)
        pieChart           = findViewById(R.id.pieChartStats)
        llTopCentres       = findViewById(R.id.llTopCentres)
        tvAlertAbsenteisme = findViewById(R.id.tvAlertAbsenteisme)
        tvAlertStock       = findViewById(R.id.tvAlertStock)
        tvAlertSessions    = findViewById(R.id.tvAlertSessions)
        btnCentreFilter    = findViewById(R.id.btnCentreFilter)
        btnPeriodMonth     = findViewById(R.id.btnPeriodMonth)
        btnPeriodTrimester = findViewById(R.id.btnPeriodTrimester)
        btnPeriodYear      = findViewById(R.id.btnPeriodYear)

        setupCharts()
        setupPeriodButtons()
        setupCentreFilter()
        loadAll()
    }

    private fun setupPeriodButtons() {
        val teal = ContextCompat.getColor(this, R.color.stormy_teal)
        val gray = ContextCompat.getColor(this, R.color.text_secondary)
        val active = ColorStateList.valueOf(teal)
        val transparent = ColorStateList.valueOf(Color.TRANSPARENT)

        listOf(btnPeriodMonth, btnPeriodTrimester, btnPeriodYear).forEach { btn ->
            btn.setOnClickListener {
                listOf(btnPeriodMonth, btnPeriodTrimester, btnPeriodYear).forEach { b ->
                    if (b === btn) {
                        b.backgroundTintList = active
                        b.setTextColor(Color.WHITE)
                    } else {
                        b.backgroundTintList = transparent
                        b.setTextColor(gray)
                    }
                }
                loadAll()
            }
        }
    }

    private fun setupCentreFilter() {
        btnCentreFilter.setOnClickListener {
            if (centres.isEmpty()) return@setOnClickListener
            val options = listOf("Tous les centres") + centres.map { it.nom ?: "Centre #${it.id}" }
            val current = if (selectedCentreId == null) 0
                          else centres.indexOfFirst { it.id == selectedCentreId } + 1
            MaterialAlertDialogBuilder(this)
                .setTitle("Filtrer par centre")
                .setSingleChoiceItems(options.toTypedArray(), current) { dialog, which ->
                    if (which == 0) {
                        selectedCentreId = null
                        selectedCentreLabel = "Tous les centres"
                    } else {
                        val c = centres[which - 1]
                        selectedCentreId = c.id
                        selectedCentreLabel = c.nom ?: "Centre #${c.id}"
                    }
                    btnCentreFilter.text = "$selectedCentreLabel ▼"
                    dialog.dismiss()
                    loadAll()
                }
                .show()
        }
    }

    private fun setupCharts() {
        lineChart.apply {
            description.isEnabled = false
            legend.isEnabled = false
            setTouchEnabled(true)
            isDragEnabled = true
            setScaleEnabled(false)
            setPinchZoom(false)
            setDrawGridBackground(false)
            setExtraOffsets(0f, 8f, 0f, 8f)

            xAxis.apply {
                position = XAxis.XAxisPosition.BOTTOM
                setDrawGridLines(false)
                textColor = Color.parseColor("#94A3B8")
                textSize = 10f
                granularity = 1f
                axisLineColor = Color.parseColor("#E2E8F0")
                yOffset = 4f
            }
            axisLeft.apply {
                setDrawGridLines(true)
                gridColor = Color.parseColor("#F1F5F9")
                gridLineWidth = 1f
                textColor = Color.parseColor("#94A3B8")
                textSize = 10f
                axisLineColor = Color.parseColor("#E2E8F0")
            }
            axisRight.isEnabled = false
        }

        pieChart.apply {
            description.isEnabled = false
            setUsePercentValues(true)
            holeRadius = 52f
            transparentCircleRadius = 56f
            setHoleColor(Color.WHITE)
            setTransparentCircleColor(Color.WHITE)
            setTransparentCircleAlpha(80)
            setCenterTextSize(13f)
            setCenterTextColor(Color.parseColor("#0F172A"))
            setCenterTextTypeface(Typeface.DEFAULT_BOLD)
            isRotationEnabled = true
            rotationAngle = -90f
            legend.apply {
                isEnabled = true
                textSize = 11f
                textColor = Color.parseColor("#374151")
                form = Legend.LegendForm.CIRCLE
                formSize = 8f
                xEntrySpace = 14f
                yEntrySpace = 4f
                verticalAlignment = Legend.LegendVerticalAlignment.BOTTOM
                horizontalAlignment = Legend.LegendHorizontalAlignment.CENTER
                orientation = Legend.LegendOrientation.HORIZONTAL
                setDrawInside(false)
                isWordWrapEnabled = true
            }
        }
    }

    private fun loadAll() {
        statsProgress.visibility = View.VISIBLE
        tvStatsMessage.visibility = View.GONE

        lifecycleScope.launch {
            try {
                val dashboard: Map<String, Any?>
                val sessions: Map<String, Any?>
                val absenteisme: Map<String, Any?>
                val comparaison: Map<String, Any?>
                val stock: Map<String, Any?>

                coroutineScope {
                    val dD = async { ApiClient.apiService.getStatsDashboard(selectedCentreId) }
                    val dS = async { ApiClient.apiService.getStatsSessions(selectedCentreId) }
                    val dA = async { ApiClient.apiService.getStatsAbsenteisme(selectedCentreId) }
                    val dC = async { ApiClient.apiService.getStatsComparaisonCentres() }
                    val dT = async { ApiClient.apiService.getStatsStock(selectedCentreId) }
                    val dR = async { ApiClient.apiService.getAdminReferences() }

                    dashboard   = dD.await().data ?: emptyMap()
                    sessions    = dS.await().data ?: emptyMap()
                    absenteisme = dA.await().data ?: emptyMap()
                    comparaison = dC.await().data ?: emptyMap()
                    stock       = dT.await().data ?: emptyMap()
                    val refs    = dR.await()
                    if (refs.status == "success") centres = refs.data?.centres.orEmpty()
                }

                fillKpis(dashboard, sessions)
                buildLineChart(sessions)
                buildPieChart(sessions)
                buildTopCentres(comparaison)
                fillAlerts(absenteisme, stock, dashboard)

            } catch (e: Exception) {
                tvStatsMessage.text = e.message ?: "Erreur réseau. Vérifiez la connexion."
                tvStatsMessage.visibility = View.VISIBLE
            } finally {
                statsProgress.visibility = View.GONE
            }
        }
    }

    private fun fillKpis(dashboard: Map<String, Any?>, sessions: Map<String, Any?>) {
        val totalVaccinations = (dashboard["totalVaccinations"] as? Number)?.toInt() ?: 0
        val totalBebes        = (dashboard["totalBebes"] as? Number)?.toInt() ?: 0

        animateCounter(tvKpiVaccines, totalVaccinations.toLong())
        tvKpiVaccinesBadge.text = "↑ $totalBebes bébés"

        val coverage = if (totalBebes > 0) (totalVaccinations.toDouble() / totalBebes * 100).toInt() else 0
        animatePercent(tvKpiCoverage, coverage.toFloat())

        @Suppress("UNCHECKED_CAST")
        val statusDist = sessions["statusDistribution"] as? List<Map<String, Any?>> ?: emptyList()
        val total   = statusDist.sumOf { it["nb"]?.toString()?.toIntOrNull() ?: 0 }
        val enCours = statusDist.find { it["statut"] == "EN_COURS" }?.get("nb")?.toString()?.toIntOrNull() ?: 0
        animateCounter(tvKpiSessions, total.toLong())
        tvKpiSessionsBadge.text = "↑ $enCours en cours"
    }

    @Suppress("UNCHECKED_CAST")
    private fun buildLineChart(sessions: Map<String, Any?>) {
        val tendances = (sessions["tendancesMensuelles"] as? List<Map<String, Any?>> ?: emptyList())
            .filter {
                val m = it["mois"]?.toString() ?: ""
                m.startsWith("2025") || m.startsWith("2026")
            }
            .sortedBy { it["mois"]?.toString() ?: "" }
            .takeLast(6)

        if (tendances.isEmpty()) { lineChart.visibility = View.GONE; return }

        val labels = tendances.map {
            it["mois"]?.toString()?.split("-")?.let { p ->
                if (p.size >= 2) "${p[1]}/${p[0].takeLast(2)}" else p[0]
            } ?: ""
        }

        val tealColor  = Color.parseColor("#00BFA6")
        val purpleColor = Color.parseColor("#8B5CF6")

        val dsAll = LineDataSet(tendances.mapIndexed { i, t ->
            Entry(i.toFloat(), t["nb_sessions"]?.toString()?.toFloatOrNull() ?: 0f)
        }, "Sessions").apply {
            color = tealColor
            setCircleColor(tealColor)
            circleHoleColor = Color.WHITE
            lineWidth = 2.5f
            circleRadius = 4.5f
            setDrawCircleHole(true)
            circleHoleRadius = 2f
            valueTextSize = 9f
            valueTextColor = tealColor
            mode = LineDataSet.Mode.CUBIC_BEZIER
            fillColor = tealColor
            fillAlpha = 18
            setDrawFilled(true)
            setDrawValues(tendances.size <= 6)
        }

        val dsTerm = LineDataSet(tendances.mapIndexed { i, t ->
            Entry(i.toFloat(), t["nb_terminees"]?.toString()?.toFloatOrNull() ?: 0f)
        }, "Terminées").apply {
            color = purpleColor
            setCircleColor(purpleColor)
            circleHoleColor = Color.WHITE
            lineWidth = 2f
            circleRadius = 3.5f
            setDrawCircleHole(true)
            circleHoleRadius = 1.5f
            mode = LineDataSet.Mode.CUBIC_BEZIER
            setDrawValues(false)
        }

        lineChart.xAxis.valueFormatter = IndexAxisValueFormatter(labels)
        lineChart.data = LineData(dsAll, dsTerm)
        lineChart.animateX(1000)
        lineChart.visibility = View.VISIBLE
    }

    @Suppress("UNCHECKED_CAST")
    private fun buildPieChart(sessions: Map<String, Any?>) {
        val statusDist = sessions["statusDistribution"] as? List<Map<String, Any?>> ?: emptyList()
        if (statusDist.isEmpty()) { pieChart.visibility = View.GONE; return }

        val colorMap = mapOf(
            "EN_FORMATION" to "#F59E0B",
            "EN_COURS"     to "#00BFA6",
            "TERMINEE"     to "#10B981",
            "CONFIRMEE"    to "#3B82F6",
            "ANNULEE"      to "#EF4444"
        )
        val labelMap = mapOf(
            "EN_FORMATION" to "Formation",
            "EN_COURS"     to "En cours",
            "TERMINEE"     to "Terminée",
            "CONFIRMEE"    to "Confirmée",
            "ANNULEE"      to "Annulée"
        )

        val entries = ArrayList<PieEntry>()
        val colors  = ArrayList<Int>()
        statusDist.forEach { item ->
            val statut = item["statut"]?.toString() ?: return@forEach
            val nb = item["nb"]?.toString()?.toFloatOrNull() ?: return@forEach
            if (nb > 0) {
                entries.add(PieEntry(nb, labelMap[statut] ?: statut))
                colors.add(Color.parseColor(colorMap[statut] ?: "#94A3B8"))
            }
        }
        if (entries.isEmpty()) { pieChart.visibility = View.GONE; return }

        val total = entries.sumOf { it.value.toInt() }
        pieChart.centerText = "$total\nsessions"

        val dataSet = PieDataSet(entries, "").apply {
            this.colors = colors
            sliceSpace = 2.5f
            selectionShift = 6f
            valueLinePart1Length = 0.35f
            valueLinePart2Length = 0.35f
            valueLineColor = Color.parseColor("#64748B")
            yValuePosition = PieDataSet.ValuePosition.OUTSIDE_SLICE
            xValuePosition = PieDataSet.ValuePosition.OUTSIDE_SLICE
        }

        pieChart.data = PieData(dataSet).apply {
            setValueTextSize(10f)
            setValueTextColor(Color.parseColor("#374151"))
            setValueFormatter(PercentFormatter(pieChart))
        }
        pieChart.animateY(1000)
        pieChart.visibility = View.VISIBLE
    }

    @Suppress("UNCHECKED_CAST")
    private fun buildTopCentres(comparaison: Map<String, Any?>) {
        val list = (comparaison["vaccinations"] as? List<Map<String, Any?>> ?: emptyList())
            .sortedByDescending { it["total_vaccinations"]?.toString()?.toIntOrNull() ?: 0 }
            .take(5)

        llTopCentres.removeAllViews()
        if (list.isEmpty()) {
            llTopCentres.addView(TextView(this).apply {
                text = "Aucune donnée disponible"
                textSize = 13f
                setTextColor(Color.parseColor("#94A3B8"))
            })
            return
        }

        val maxVacc = list.first()["total_vaccinations"]?.toString()?.toIntOrNull()?.coerceAtLeast(1) ?: 1

        list.forEachIndexed { index, centre ->
            val nom   = centre["centre_nom"]?.toString() ?: "Centre"
            val vacc  = centre["total_vaccinations"]?.toString()?.toIntOrNull() ?: 0
            val sess  = centre["total_sessions"]?.toString()?.toIntOrNull() ?: 0
            val pct   = (vacc.toFloat() / maxVacc * 100).toInt()

            val row = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                val lp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
                lp.bottomMargin = if (index < list.size - 1) dpToPx(16) else 0
                layoutParams = lp
            }

            val nameRow = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
            }

            nameRow.addView(TextView(this).apply {
                text = "#${index + 1}"
                textSize = 10f
                setTypeface(null, Typeface.BOLD)
                setTextColor(if (index == 0) Color.WHITE else ContextCompat.getColor(this@StatsAdminActivity, R.color.stormy_teal))
                setBackgroundResource(if (index == 0) R.drawable.bg_pill_teal_active else R.drawable.bg_pill_outline_teal)
                setPadding(dpToPx(8), dpToPx(2), dpToPx(8), dpToPx(2))
                val lp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT)
                lp.marginEnd = dpToPx(10)
                layoutParams = lp
            })

            val col = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            }
            col.addView(TextView(this).apply {
                text = nom
                textSize = 13f
                setTypeface(null, Typeface.BOLD)
                setTextColor(Color.parseColor("#0F172A"))
                maxLines = 1
                ellipsize = TextUtils.TruncateAt.END
            })
            col.addView(TextView(this).apply {
                text = "$vacc vaccinations · $sess sessions"
                textSize = 11f
                setTextColor(Color.parseColor("#64748B"))
                val lp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT)
                lp.topMargin = dpToPx(1)
                layoutParams = lp
            })
            nameRow.addView(col)

            nameRow.addView(TextView(this).apply {
                text = "$pct%"
                textSize = 13f
                setTypeface(null, Typeface.BOLD)
                setTextColor(Color.parseColor("#006D77"))
                val lp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT)
                lp.marginStart = dpToPx(8)
                layoutParams = lp
            })

            row.addView(nameRow)

            row.addView(LinearProgressIndicator(this).apply {
                trackCornerRadius = dpToPx(2)
                max = 100
                setProgress(pct, false)
                setIndicatorColor(ContextCompat.getColor(this@StatsAdminActivity, R.color.stormy_teal))
                setTrackColor(ContextCompat.getColor(this@StatsAdminActivity, R.color.alice_blue))
                val lp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
                lp.topMargin = dpToPx(7)
                layoutParams = lp
            })

            llTopCentres.addView(row)
        }
    }

    private fun fillAlerts(absenteisme: Map<String, Any?>, stock: Map<String, Any?>, dashboard: Map<String, Any?>) {
        val tauxAbs     = (absenteisme["tauxAbsenteisme"] as? Number)?.toDouble() ?: 0.0
        val alerteStock = (stock["alerteStockBas"] as? Number)?.toInt() ?: 0
        val totalDoses  = (stock["totalDoses"] as? Number)?.toInt() ?: 0
        val totalBebes  = (dashboard["totalBebes"] as? Number)?.toInt() ?: 0

        tvAlertAbsenteisme.text = "%.1f%% d'absentéisme".format(tauxAbs)
        tvAlertAbsenteisme.setTextColor(
            if (tauxAbs > 5.0) ContextCompat.getColor(this, R.color.error)
            else ContextCompat.getColor(this, R.color.success_dark)
        )

        tvAlertStock.text = "$totalDoses doses disponibles" +
            if (alerteStock > 0) " · ⚠ $alerteStock alertes" else ""
        tvAlertStock.setTextColor(
            if (alerteStock > 0) ContextCompat.getColor(this, R.color.warning)
            else ContextCompat.getColor(this, R.color.success_dark)
        )

        tvAlertSessions.text = "$totalBebes bébés enregistrés"
    }

    private fun animateCounter(view: TextView, end: Long) {
        if (end == 0L) { view.text = "0"; return }
        object : CountDownTimer(1000L, 16L) {
            override fun onTick(left: Long) {
                val frac = 1f - left / 1000f
                view.text = "${(end * frac).toLong()}"
            }
            override fun onFinish() { view.text = "$end" }
        }.start()
    }

    private fun animatePercent(view: TextView, end: Float) {
        if (end == 0f) { view.text = "0%"; return }
        object : CountDownTimer(1000L, 16L) {
            override fun onTick(left: Long) {
                val frac = 1f - left / 1000f
                view.text = "${(end * frac).toInt()}%"
            }
            override fun onFinish() { view.text = "${end.toInt()}%" }
        }.start()
    }

    private fun dpToPx(dp: Int): Int = (dp * resources.displayMetrics.density).toInt()
}
