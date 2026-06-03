package com.example.vaccinkid

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import java.io.File
import java.io.FileOutputStream
import java.io.OutputStreamWriter

class ExportsAdminActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_exports_admin)

        findViewById<Button>(R.id.btnExportPDF).setOnClickListener {
            // TODO: Logique de génération PDF (Étape suivante)
            Toast.makeText(this, "Génération PDF en cours...", Toast.LENGTH_SHORT).show()
        }

        findViewById<Button>(R.id.btnExportExcel).setOnClickListener {
            genererFichierCSV()
        }

        findViewById<Button>(R.id.btnRapportAbsenteisme).setOnClickListener {
            // TODO: Logique spécifique absentéisme
            Toast.makeText(this, "Génération rapport absences...", Toast.LENGTH_SHORT).show()
        }
    }

    private fun genererFichierCSV() {
        try {
            // Création du fichier dans le stockage interne de l'app
            val file = File(filesDir, "donnees_vaccination.csv")
            val writer = OutputStreamWriter(FileOutputStream(file))

            // En-têtes du tableau (Compatible SPSS/Excel)
            writer.append("ID,Bebe,Parent,Vaccin,Date,Statut\n")

            // Données fictives d'exemple
            writer.append("1,Youssef,Ahmed,BCG,2023-10-01,Present\n")
            writer.append("2,Fatima,Hajar,Pentavalent,2023-10-02,Absent\n")

            writer.close()
            Toast.makeText(this, "✅ Fichier CSV généré avec succès !", Toast.LENGTH_LONG).show()

            // Optionnel : Ouvrir le fichier
            val intent = Intent(Intent.ACTION_VIEW)
            // Logique pour partager/ouvrir le fichier...

        } catch (e: Exception) {
            Toast.makeText(this, "❌ Erreur: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }
}
