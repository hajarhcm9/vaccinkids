package com.example.vaccinkid

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.FileProvider
import androidx.lifecycle.lifecycleScope
import com.example.vaccinkid.network.ApiClient
import com.example.vaccinkid.network.TokenManager
import java.io.File
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request

class ExportsAdminActivity : AppCompatActivity() {
    private val httpClient = OkHttpClient()
    private lateinit var typeSpinner: Spinner
    private lateinit var formatSpinner: Spinner
    private lateinit var centreInput: EditText
    private lateinit var startInput: EditText
    private lateinit var endInput: EditText
    private lateinit var statusView: TextView
    private lateinit var exportButton: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 32, 32, 32)
        }
        setContentView(root)
        root.addView(TextView(this).apply {
            text = "Exports admin"
            textSize = 24f
            setTypeface(typeface, android.graphics.Typeface.BOLD)
        })
        typeSpinner = Spinner(this).apply {
            adapter = ArrayAdapter(this@ExportsAdminActivity, android.R.layout.simple_spinner_dropdown_item, listOf("vaccinations", "sessions", "absenteisme", "stock"))
        }
        formatSpinner = Spinner(this).apply {
            adapter = ArrayAdapter(this@ExportsAdminActivity, android.R.layout.simple_spinner_dropdown_item, listOf("pdf", "excel"))
        }
        centreInput = edit("Centre ID optionnel")
        startInput = edit("Date debut YYYY-MM-DD")
        endInput = edit("Date fin YYYY-MM-DD")
        statusView = TextView(this)
        exportButton = Button(this).apply {
            text = "Telecharger"
            setOnClickListener { exportSelected() }
        }
        listOf(typeSpinner, formatSpinner, centreInput, startInput, endInput, exportButton, statusView).forEach { root.addView(it) }
    }

    private fun exportSelected() {
        val type = typeSpinner.selectedItem.toString()
        val format = formatSpinner.selectedItem.toString()
        if (type == "stock" && format == "pdf") {
            statusView.text = "Le backend expose stock en Excel uniquement."
            return
        }
        val endpoint = "exports/$type/$format${queryString()}"
        val extension = if (format == "pdf") "pdf" else "xlsx"
        val mime = if (format == "pdf") "application/pdf" else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        downloadAndOpen(endpoint, "${type}_export.$extension", mime)
    }

    private fun queryString(): String {
        val params = mutableListOf<String>()
        centreInput.text.toString().trim().ifBlank { null }?.let { params.add("centre_id=$it") }
        startInput.text.toString().trim().ifBlank { null }?.let { params.add("date_debut=$it") }
        endInput.text.toString().trim().ifBlank { null }?.let { params.add("date_fin=$it") }
        return if (params.isEmpty()) "" else params.joinToString("&", prefix = "?")
    }

    private fun downloadAndOpen(endpoint: String, fileName: String, mimeType: String) {
        val token = TokenManager.getAccessToken()
        if (token.isNullOrBlank()) {
            Toast.makeText(this, "Session expiree. Reconnectez-vous.", Toast.LENGTH_LONG).show()
            return
        }
        lifecycleScope.launch {
            setLoading(true, "Telechargement en cours...")
            try {
                val file = withContext(Dispatchers.IO) { downloadFile(endpoint, fileName, token) }
                setLoading(false, "Telecharge: ${file.name}")
                openFile(file, mimeType)
            } catch (e: Exception) {
                setLoading(false, "Export impossible : ${e.message}")
            }
        }
    }

    private fun downloadFile(endpoint: String, fileName: String, token: String): File {
        val request = Request.Builder()
            .url(ApiClient.BASE_URL + endpoint)
            .header("Authorization", "Bearer $token")
            .header("Accept", "*/*")
            .build()
        httpClient.newCall(request).execute().use { response ->
            if (!response.isSuccessful) throw IllegalStateException("HTTP ${response.code}")
            val body = response.body ?: throw IllegalStateException("Reponse vide")
            val exportDir = File(cacheDir, "exports").apply { mkdirs() }
            val file = File(exportDir, fileName)
            file.outputStream().use { output -> body.byteStream().use { input -> input.copyTo(output) } }
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
            Toast.makeText(this, "Fichier telecharge : ${file.name}", Toast.LENGTH_LONG).show()
        }
    }

    private fun setLoading(loading: Boolean, message: String) {
        exportButton.isEnabled = !loading
        statusView.text = message
    }

    private fun edit(hintText: String): EditText = EditText(this).apply { hint = hintText }
}
