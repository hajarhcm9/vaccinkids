package com.example.vaccinkid

import android.Manifest
import android.app.AlertDialog
import android.content.pm.PackageManager
import android.net.Uri
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
import androidx.lifecycle.lifecycleScope
import com.example.vaccinkid.model.BebeDto
import com.example.vaccinkid.network.ApiClient
import com.journeyapps.barcodescanner.ScanContract
import com.journeyapps.barcodescanner.ScanIntentResult
import com.journeyapps.barcodescanner.ScanOptions
import kotlinx.coroutines.launch

class ScanQrFragment : Fragment() {
    private lateinit var btnScanner: Button
    private lateinit var btnSaisieManuelle: Button

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
        btnScanner = view.findViewById(R.id.btnScanner)
        btnSaisieManuelle = view.findViewById(R.id.btnSaisieManuelle)

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
        val code = extractQrCode(content)
        if (code.isBlank()) {
            Toast.makeText(requireContext(), "QR invalide", Toast.LENGTH_SHORT).show()
            return
        }

        viewLifecycleOwner.lifecycleScope.launch {
            setLoading(true)
            try {
                val response = ApiClient.apiService.getBebeByQr(code)
                val bebe = response.data?.bebe
                if (response.status == "success" && bebe != null) {
                    showBabyFoundDialog(bebe, code)
                } else {
                    Toast.makeText(
                        requireContext(),
                        response.message ?: "Carnet introuvable",
                        Toast.LENGTH_LONG
                    ).show()
                }
            } catch (e: Exception) {
                Toast.makeText(
                    requireContext(),
                    "Recherche impossible : ${e.message}",
                    Toast.LENGTH_LONG
                ).show()
            } finally {
                setLoading(false)
            }
        }
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

    private fun extractQrCode(rawContent: String): String {
        val trimmed = rawContent.trim()
        if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
            return trimmed
        }

        return try {
            val uri = Uri.parse(trimmed)
            uri.getQueryParameter("code")
                ?: uri.getQueryParameter("qr")
                ?: uri.lastPathSegment
                ?: trimmed
        } catch (_: Exception) {
            trimmed
        }
    }

    private fun showBabyFoundDialog(bebe: BebeDto, code: String) {
        val fullName = listOfNotNull(bebe.prenom, bebe.nom)
            .joinToString(" ")
            .ifBlank { "Bébé #${bebe.id}" }
        val message = """
            Bébé : $fullName
            Code : ${bebe.codeQr ?: code}
            Né(e) le : ${bebe.dateNaissance ?: "Non renseigné"}
        """.trimIndent()

        AlertDialog.Builder(requireContext())
            .setTitle("Carnet trouvé")
            .setMessage(message)
            .setPositiveButton("Enregistrer vaccination") { _, _ ->
                val fragment = EnregistrementVaccinationFragment.newInstance(fullName, bebe.id.toString())
                navigateTo(fragment)
            }
            .setNeutralButton("Courbes") { _, _ ->
                navigateTo(GrowthChartFragment.newInstance(bebe.id, fullName))
            }
            .setNegativeButton("Rescanner", null)
            .show()
    }

    private fun navigateTo(fragment: Fragment) {
        (activity as? MainInfirmierActivity)?.naviguerVers(fragment)
            ?: parentFragmentManager.beginTransaction()
                .replace(R.id.fragmentContainer, fragment)
                .addToBackStack(null)
                .commit()
    }

    private fun setLoading(isLoading: Boolean) {
        btnScanner.isEnabled = !isLoading
        btnSaisieManuelle.isEnabled = !isLoading
        btnScanner.text = if (isLoading) "RECHERCHE..." else "SCANNER"
    }
}
