package com.example.vaccinkid

import android.graphics.Color
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.github.mikephil.charting.data.*
import com.github.mikephil.charting.utils.ColorTemplate
import com.github.mikephil.charting.animation.Easing

class StatsAdminActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_stats_admin)

        setupPieChart()
        setupBarChart()
        setupGaugeChart()
        setupLineChart()
    }

    // 1. Camembert (Couverture Vaccinale)
    private fun setupPieChart() {
        val pieChart = findViewById<com.github.mikephil.charting.charts.PieChart>(R.id.pieChart)

        val entries = arrayListOf<PieEntry>()
        entries.add(PieEntry(65f, "Vaccinés")) // Rose
        entries.add(PieEntry(35f, "Non Vaccinés")) // Jaune

        val dataSet = PieDataSet(entries, "Couverture")
        // Couleurs Rose et Jaune
        dataSet.colors = listOf(Color.parseColor("#FF8A80"), Color.parseColor("#F5A623"))

        val data = PieData(dataSet)
        data.setValueTextSize(14f)
        data.setValueTextColor(Color.WHITE)

        pieChart.data = data
        pieChart.isDrawHoleEnabled = true
        pieChart.centerText = "Couverture"
        pieChart.setCenterTextSize(16f)
        pieChart.animateY(1400, Easing.EaseInOutQuad)
        pieChart.invalidate() // Rafraîchir
    }

    // 2. Histogramme (Absentéisme)
    private fun setupBarChart() {
        val barChart = findViewById<com.github.mikephil.charting.charts.BarChart>(R.id.barChart)

        val entries = arrayListOf<BarEntry>()
        entries.add(BarEntry(0f, 10f)) // Semaine 1
        entries.add(BarEntry(1f, 15f)) // Semaine 2
        entries.add(BarEntry(2f, 8f))  // Semaine 3
        entries.add(BarEntry(3f, 12f)) // Semaine 4

        val dataSet = BarDataSet(entries, "Absences")
        dataSet.colors = listOf(Color.parseColor("#F5A623")) // Jaune

        val data = BarData(dataSet)
        barChart.data = data
        barChart.animateY(1400)
        barChart.invalidate()
    }

    // 3. Jauge (Utilisation flacons - On utilise un PieChart troué)
    private fun setupGaugeChart() {
        val gaugeChart = findViewById<com.github.mikephil.charting.charts.PieChart>(R.id.gaugeChart)

        val entries = arrayListOf<PieEntry>()
        entries.add(PieEntry(85f, "Utilisé")) // Rose
        entries.add(PieEntry(15f, "Gaspillé")) // Gris clair

        val dataSet = PieDataSet(entries, "")
        dataSet.colors = listOf(Color.parseColor("#FF8A80"), Color.parseColor("#EEEEEE"))

        val data = PieData(dataSet)
        data.setDrawValues(false) // Cache les chiffres sur la jauge pour un effet épuré

        gaugeChart.data = data
        gaugeChart.isDrawHoleEnabled = true
        gaugeChart.holeRadius = 75f // Grand trou pour l'effet jauge
        gaugeChart.centerText = "85%"
        gaugeChart.setCenterTextSize(24f)
        gaugeChart.setCenterTextColor(Color.parseColor("#FF8A80"))
        gaugeChart.animateY(1400)
        gaugeChart.invalidate()
    }

    // 4. Courbe (Temps d'attente)
    private fun setupLineChart() {
        val lineChart = findViewById<com.github.mikephil.charting.charts.LineChart>(R.id.lineChart)

        val entries = arrayListOf<Entry>()
        entries.add(Entry(0f, 20f)) // Mois 1: 20 min
        entries.add(Entry(1f, 15f)) // Mois 2: 15 min
        entries.add(Entry(2f, 25f)) // Mois 3: 25 min
        entries.add(Entry(3f, 10f)) // Mois 4: 10 min

        val dataSet = LineDataSet(entries, "Temps (min)")
        dataSet.color = Color.parseColor("#FF8A80") // Ligne Rose
        dataSet.setCircleColor(Color.parseColor("#F5A623")) // Points Jaunes
        dataSet.lineWidth = 3f

        val data = LineData(dataSet)
        lineChart.data = data
        lineChart.animateX(1400)
        lineChart.invalidate()
    }
}