package com.example.vaccinkid

import android.Manifest
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.example.vaccinkid.db.AppDatabase
import com.example.vaccinkid.model.BebeDto
import com.example.vaccinkid.model.RendezVousDto
import com.example.vaccinkid.network.ApiClient
import com.google.gson.Gson
import com.journeyapps.barcodescanner.ScanContract
import com.journeyapps.barcodescanner.ScanIntentResult
import com.journeyapps.barcodescanner.ScanOptions
import kotlinx.coroutines.launch

class ScanQrFragment : Fragment() {
    private val secureQrPattern = Regex("^VK1\\.[a-f0-9]{64}$")
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
            (activity as? MainInfirmierActivity)?.naviguerVers(RechercheManuelleFragment())
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
        if (!secureQrPattern.matches(code)) {
            Toast.makeText(requireContext(), "QR invalide ou expiré", Toast.LENGTH_SHORT).show()
            return
        }

        viewLifecycleOwner.lifecycleScope.launch {
            setLoading(true)
            try {
                val response = ApiClient.apiService.getBebeByQr(code)
                val bebe = response.data?.bebe
                if (response.status == "success" && bebe != null) {
                    val rdvs = response.data?.eligibleAppointments.orEmpty()
                    val hist = response.data?.lastVaccinations.orEmpty()
                    (activity as? MainInfirmierActivity)?.naviguerVers(
                        EnfantProfilFragment.newInstance(bebe, rdvs, hist)
                    )
                } else {
                    Toast.makeText(
                        requireContext(),
                        response.message ?: "Carnet introuvable",
                        Toast.LENGTH_LONG
                    ).show()
                }
            } catch (e: Exception) {
                val cached = AppDatabase.getInstance(requireContext()).bebeDao().getByQr(code)
                if (cached != null) {
                    val bebe = BebeDto(
                        id = cached.id,
                        parentId = cached.parentId,
                        prenom = cached.prenom,
                        nom = cached.nom,
                        dateNaissance = cached.dateNaissance,
                        sexe = cached.sexe,
                        codeQr = cached.codeQr
                    )
                    Toast.makeText(requireContext(), "Mode hors-ligne — données locales", Toast.LENGTH_SHORT).show()
                    (activity as? MainInfirmierActivity)?.naviguerVers(
                        EnfantProfilFragment.newInstance(bebe, emptyList(), emptyList())
                    )
                } else {
                    Toast.makeText(
                        requireContext(),
                        "Connexion requise. Carnet introuvable hors-ligne.",
                        Toast.LENGTH_LONG
                    ).show()
                }
            } finally {
                setLoading(false)
            }
        }
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

    private fun setLoading(isLoading: Boolean) {
        btnScanner.isEnabled = !isLoading
        btnSaisieManuelle.isEnabled = !isLoading
        btnScanner.text = if (isLoading) "Recherche du carnet..." else "Ouvrir la caméra"
    }
}
