package com.example.vaccinkid

import android.Manifest
import android.app.AlertDialog
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import com.journeyapps.barcodescanner.ScanContract
import com.journeyapps.barcodescanner.ScanIntentResult
import com.journeyapps.barcodescanner.ScanOptions

class ScanQrFragment : Fragment() {

    private val scanLauncher = registerForActivityResult(ScanContract()) { result: ScanIntentResult ->
        if (result.contents != null) {
            handleQRResult(result.contents)
        } else {
            Toast.makeText(requireContext(), "Scan annulé", Toast.LENGTH_SHORT).show()
        }
    }

    private val cameraPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            startQRScanner()
        } else {
            Toast.makeText(requireContext(), "Permission caméra refusée", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        // ✅ on garde une référence à la vue
        val view = inflater.inflate(R.layout.fragment_scan_qr, container, false)

        // ✅ view.findViewById, pas juste findViewById
        val btnScanner: Button = view.findViewById(R.id.btnScanner)
        val btnSaisieManuelle: Button = view.findViewById(R.id.btnSaisieManuelle)

        btnScanner.setOnClickListener {
            checkCameraPermissionAndScan()
        }

        btnSaisieManuelle.setOnClickListener {
            showManualInputDialog()
        }

        return view
    }

    private fun checkCameraPermissionAndScan() {
        if (ContextCompat.checkSelfPermission(
                requireContext(), Manifest.permission.CAMERA
            ) == PackageManager.PERMISSION_GRANTED
        ) {
            startQRScanner()
        } else {
            cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    private fun startQRScanner() {
        val options = ScanOptions().apply {
            setDesiredBarcodeFormats(ScanOptions.QR_CODE)
            setPrompt("Pointez la caméra vers le QR code")
            setBeepEnabled(true)
            setOrientationLocked(true)
        }
        scanLauncher.launch(options)
    }

    private fun handleQRResult(content: String) {
        Toast.makeText(requireContext(), "QR lu : $content", Toast.LENGTH_LONG).show()
        // 👉 Ajoutez ici votre logique métier (appel API, navigation, etc.)
    }

    private fun showManualInputDialog() {
        val editText = EditText(requireContext()).apply {
            hint = "Entrez le numéro du carnet"
            setPadding(48, 32, 48, 16)
        }

        AlertDialog.Builder(requireContext())
            .setTitle("Saisie manuelle")
            .setMessage("Entrez l'identifiant du carnet de vaccination :")
            .setView(editText)
            .setPositiveButton("Valider") { _, _ ->
                val input = editText.text.toString().trim()
                if (input.isNotEmpty()) {
                    handleQRResult(input)
                } else {
                    Toast.makeText(requireContext(), "Champ vide", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Annuler", null)
            .show()
    }
}