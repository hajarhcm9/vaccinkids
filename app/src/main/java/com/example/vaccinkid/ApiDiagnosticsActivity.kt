package com.example.vaccinkid

import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.example.vaccinkid.network.ApiDiagnostics

class ApiDiagnosticsActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (!BuildConfig.DEBUG) {
            finish()
            return
        }
        setContentView(R.layout.activity_api_diagnostics)

        val tvApi = findViewById<TextView>(R.id.tvApiBaseUrl)
        val tvVariant = findViewById<TextView>(R.id.tvVariant)
        val btnCopy = findViewById<Button>(R.id.btnCopyApiUrl)

        tvApi.text = ApiDiagnostics.apiBaseUrl
        tvVariant.text = ApiDiagnostics.variantLabel

        btnCopy.setOnClickListener {
            val url = ApiDiagnostics.apiBaseUrl
            if (url.isNotBlank()) {
                ApiDiagnostics.copyToClipboard(this, url)
                Toast.makeText(this, "URL API copiée", Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(this, "URL API vide", Toast.LENGTH_SHORT).show()
            }
        }
    }
}
