package com.example.vaccinkid

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.Button
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

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_exports_admin)

        findViewById<Button>(R.id.btnExportPDF).setOnClickListener {
            downloadAndOpen("exports/pdf", "rapport_mensuel.pdf", "application/pdf")
        }

        findViewById<Button>(R.id.btnExportExcel).setOnClickListener {
            downloadAndOpen(
                "exports/excel",
                "donnees_vaccination.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
        }

        findViewById<Button>(R.id.btnRapportAbsenteisme).setOnClickListener {
            downloadAndOpen("exports/absenteisme/pdf", "rapport_absenteisme.pdf", "application/pdf")
        }
    }

    private fun downloadAndOpen(endpoint: String, fileName: String, mimeType: String) {
        val token = TokenManager.getAccessToken()
        if (token.isNullOrBlank()) {
            Toast.makeText(this, "Session expirée. Reconnectez-vous.", Toast.LENGTH_LONG).show()
            return
        }

        lifecycleScope.launch {
            setButtonsEnabled(false)
            Toast.makeText(this@ExportsAdminActivity, "Téléchargement en cours...", Toast.LENGTH_SHORT).show()
            try {
                val file = withContext(Dispatchers.IO) {
                    downloadFile(endpoint, fileName, token)
                }
                openFile(file, mimeType)
            } catch (e: Exception) {
                Toast.makeText(
                    this@ExportsAdminActivity,
                    "Export impossible : ${e.message}",
                    Toast.LENGTH_LONG
                ).show()
            } finally {
                setButtonsEnabled(true)
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
            if (!response.isSuccessful) {
                throw IllegalStateException("HTTP ${response.code}")
            }

            val body = response.body ?: throw IllegalStateException("Réponse vide")
            val exportDir = File(cacheDir, "exports").apply { mkdirs() }
            val file = File(exportDir, fileName)
            file.outputStream().use { output ->
                body.byteStream().use { input -> input.copyTo(output) }
            }
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

    private fun setButtonsEnabled(enabled: Boolean) {
        findViewById<Button>(R.id.btnExportPDF).isEnabled = enabled
        findViewById<Button>(R.id.btnExportExcel).isEnabled = enabled
        findViewById<Button>(R.id.btnRapportAbsenteisme).isEnabled = enabled
    }
}
