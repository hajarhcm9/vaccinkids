package com.example.vaccinkid

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.FileProvider
import androidx.lifecycle.lifecycleScope
import com.example.vaccinkid.model.AdminRefCentreDto
import com.example.vaccinkid.network.ApiClient
import com.example.vaccinkid.network.TokenManager
import com.google.android.material.button.MaterialButton
import com.google.android.material.card.MaterialCardView
import com.google.android.material.textfield.TextInputEditText
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.Request
import java.io.File
import android.widget.ProgressBar
import android.widget.Spinner
import android.widget.TextView

class ExportsAdminActivity : AppCompatActivity() {

    private lateinit var spinnerType: Spinner
    private lateinit var spinnerFormat: Spinner
    private lateinit var spinnerCentre: Spinner
    private lateinit var etDateDebut: TextInputEditText
    private lateinit var etDateFin: TextInputEditText
    private lateinit var btnTelecharger: MaterialButton
    private lateinit var cardStatus: MaterialCardView
    private lateinit var progressBar: ProgressBar
    private lateinit var tvStatus: TextView

    private var centres: List<AdminRefCentreDto> = emptyList()
    private var centresLoaded = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        protectSensitiveContent()
        setContentView(R.layout.activity_exports_admin)

        spinnerType = findViewById(R.id.spinnerExportType)
        spinnerFormat = findViewById(R.id.spinnerExportFormat)
        spinnerCentre = findViewById(R.id.spinnerExportCentre)
        etDateDebut = findViewById(R.id.etExportDateDebut)
        etDateFin = findViewById(R.id.etExportDateFin)
        btnTelecharger = findViewById(R.id.btnTelecharger)
        cardStatus = findViewById(R.id.cardExportStatus)
        progressBar = findViewById(R.id.exportProgressBar)
        tvStatus = findViewById(R.id.tvExportStatus)

        spinnerType.adapter = ArrayAdapter(
            this, android.R.layout.simple_spinner_dropdown_item,
            listOf("vaccinations", "sessions", "absenteisme", "stock")
        )
        spinnerFormat.adapter = ArrayAdapter(
            this, android.R.layout.simple_spinner_dropdown_item,
            listOf("pdf", "excel")
        )

        btnTelecharger.setOnClickListener { exportSelected() }
        loadCentres()
    }

    private fun exportSelected() {
        if (!centresLoaded) {
            showStatus("Chargement des références en cours…")
            return
        }
        val start = etDateDebut.text?.toString()?.trim().orEmpty()
        val end = etDateFin.text?.toString()?.trim().orEmpty()
        if (!isValidDate(start)) { showStatus("Date début invalide (format : AAAA-MM-JJ)"); return }
        if (!isValidDate(end)) { showStatus("Date fin invalide (format : AAAA-MM-JJ)"); return }

        val type = spinnerType.selectedItem.toString()
        val format = spinnerFormat.selectedItem.toString()
        if (type == "stock" && format == "pdf") {
            showStatus("Le stock n'est exportable qu'en Excel.")
            return
        }
        val endpoint = "exports/$type/$format${queryString()}"
        val extension = if (format == "pdf") "pdf" else "xlsx"
        val mime = if (format == "pdf") "application/pdf"
        else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        downloadAndOpen(endpoint, "${type}_export.$extension", mime)
    }

    private fun queryString(): String {
        val params = mutableListOf<String>()
        centres.getOrNull(spinnerCentre.selectedItemPosition - 1)?.id?.let { params.add("centre_id=$it") }
        etDateDebut.text?.toString()?.trim()?.ifBlank { null }?.let { params.add("date_debut=$it") }
        etDateFin.text?.toString()?.trim()?.ifBlank { null }?.let { params.add("date_fin=$it") }
        return if (params.isEmpty()) "" else params.joinToString("&", prefix = "?")
    }

    private fun downloadAndOpen(endpoint: String, fileName: String, mimeType: String) {
        lifecycleScope.launch {
            setLoading(true, "Téléchargement en cours…")
            try {
                val file = withContext(Dispatchers.IO) { downloadFile(endpoint, fileName) }
                setLoading(false, "Téléchargé : ${file.name}")
                openFile(file, mimeType)
            } catch (e: Exception) {
                setLoading(false, "Export impossible : ${e.message}")
            }
        }
    }

    private fun downloadFile(endpoint: String, fileName: String): File {
        val token = TokenManager.getAccessToken()
        val requestBuilder = Request.Builder()
            .url(ApiClient.BASE_URL + endpoint)
            .header("Accept", "*/*")
        if (!token.isNullOrBlank()) requestBuilder.header("Authorization", "Bearer $token")
        val request = requestBuilder.build()
        ApiClient.httpClient.newCall(request).execute().use { response ->
            if (!response.isSuccessful) throw IllegalStateException("HTTP ${response.code}")
            val body = response.body ?: throw IllegalStateException("Réponse vide")
            val exportDir = File(cacheDir, "exports").apply { mkdirs() }
            val file = File(exportDir, fileName)
            file.outputStream().use { out -> body.byteStream().use { it.copyTo(out) } }
            return file
        }
    }

    private fun openFile(file: File, mimeType: String) {
        val uri: Uri = FileProvider.getUriForFile(this, "${packageName}.fileprovider", file)
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, mimeType)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        try {
            startActivity(Intent.createChooser(intent, "Ouvrir le rapport"))
        } catch (_: Exception) {
            Toast.makeText(this, "Fichier téléchargé : ${file.name}", Toast.LENGTH_LONG).show()
        }
    }

    private fun setLoading(loading: Boolean, message: String) {
        btnTelecharger.isEnabled = !loading
        progressBar.visibility = if (loading) View.VISIBLE else View.GONE
        showStatus(message)
    }

    private fun showStatus(message: String) {
        tvStatus.text = message
        cardStatus.visibility = if (message.isBlank()) View.GONE else View.VISIBLE
    }

    private fun isValidDate(s: String): Boolean {
        if (s.isBlank()) return true
        return try {
            val sdf = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault())
            sdf.isLenient = false
            sdf.parse(s)
            true
        } catch (_: Exception) { false }
    }

    private fun loadCentres() {
        showStatus("Chargement des références…")
        btnTelecharger.isEnabled = false
        lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.getAdminReferences()
                if (response.status != "success") throw Exception(response.message ?: "Références indisponibles")
                centres = response.data?.centres.orEmpty()
                spinnerCentre.adapter = ArrayAdapter(
                    this@ExportsAdminActivity,
                    android.R.layout.simple_spinner_dropdown_item,
                    listOf("Tous les centres") + centres.map { it.nom ?: "Centre #${it.id}" }
                )
                centresLoaded = true
                btnTelecharger.isEnabled = true
                showStatus("")
            } catch (e: Exception) {
                showStatus((e.message ?: "Références indisponibles") + " — export désactivé.")
            }
        }
    }
}
