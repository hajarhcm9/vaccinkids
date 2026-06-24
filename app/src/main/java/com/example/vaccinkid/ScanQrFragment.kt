package com.example.vaccinkid

import android.Manifest
import android.animation.ObjectAnimator
import android.animation.ValueAnimator
import android.content.Context
import android.content.pm.PackageManager
import android.hardware.camera2.CameraManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.animation.DecelerateInterpolator
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.core.content.res.ResourcesCompat
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.vaccinkid.db.AppDatabase
import com.example.vaccinkid.model.BebeDto
import com.example.vaccinkid.model.RendezVousDto
import com.example.vaccinkid.model.VaccinationHistoryDto
import com.example.vaccinkid.network.ApiClient
import com.google.android.material.button.MaterialButton
import com.google.android.material.card.MaterialCardView
import com.journeyapps.barcodescanner.ScanContract
import com.journeyapps.barcodescanner.ScanIntentResult
import com.journeyapps.barcodescanner.ScanOptions
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

class ScanQrFragment : Fragment() {

    private val secureQrPattern = Regex("^VK1\\.[a-f0-9]{64}$")

    // Views
    private lateinit var btnScanner: MaterialButton
    private lateinit var btnSaisieManuelle: LinearLayout
    private lateinit var btnTorchLayout: LinearLayout
    private lateinit var ivTorchIcon: ImageView
    private lateinit var tvTorchLabel: TextView
    private lateinit var btnBackScan: FrameLayout
    private lateinit var scanLine: View
    private lateinit var pbScanSpinner: ProgressBar
    private lateinit var overlayLoading: FrameLayout
    private lateinit var tvScanGuide: TextView
    private lateinit var tvScanCount: TextView
    private lateinit var llScanCounter: LinearLayout

    private lateinit var cvDetectedPatient: MaterialCardView
    private lateinit var tvDetectedName: TextView
    private lateinit var tvDetectedAge: TextView
    private lateinit var tvDetectedVaccin: TextView
    private lateinit var tvDetectedInitials: TextView
    private lateinit var flDetectedAvatar: FrameLayout
    private lateinit var btnOpenProfile: MaterialButton
    private lateinit var btnDismissDetected: FrameLayout

    private lateinit var llRecentScans: LinearLayout
    private lateinit var rvRecentScans: RecyclerView

    // State
    private var scanning = false
    private var torchOn = false
    private var scanLineAnimator: ObjectAnimator? = null
    private val recentScans = ArrayDeque<RecentScan>(5)
    private var pendingNavigation: (() -> Unit)? = null

    data class RecentScan(
        val bebe: BebeDto,
        val rdvs: List<RendezVousDto>,
        val hist: List<VaccinationHistoryDto>,
        val scannedAt: String
    )

    // ── Launchers ──────────────────────────────────────────────────────────

    private val scanLauncher = registerForActivityResult(ScanContract()) { result: ScanIntentResult ->
        if (result.contents != null) {
            handleQRResult(result.contents)
        } else {
            scanning = false
            updateScanButton(loading = false)
        }
    }

    private val cameraPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            startQRScanner()
        } else {
            tvScanGuide.text = "Permission caméra requise pour scanner"
            tvScanGuide.setTextColor(
                ContextCompat.getColor(requireContext(), R.color.error)
            )
            Toast.makeText(requireContext(), "Autorisez l'accès à la caméra dans les réglages", Toast.LENGTH_LONG).show()
        }
    }

    // ── Lifecycle ──────────────────────────────────────────────────────────

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View? =
        inflater.inflate(R.layout.fragment_scan_qr, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        bindViews(view)
        bindActions()
        startScanLineAnimation()
    }

    override fun onResume() {
        super.onResume()
        startScanLineAnimation()
    }

    override fun onPause() {
        super.onPause()
        scanLineAnimator?.pause()
        if (torchOn) toggleTorch(forceOff = true)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        scanLineAnimator?.cancel()
        scanLineAnimator = null
    }

    // ── Binding ────────────────────────────────────────────────────────────

    private fun bindViews(view: View) {
        btnScanner        = view.findViewById(R.id.btnScanner)
        btnSaisieManuelle = view.findViewById(R.id.btnSaisieManuelle)
        btnTorchLayout    = view.findViewById(R.id.btnTorch)
        ivTorchIcon       = view.findViewById(R.id.ivTorchIcon)
        tvTorchLabel      = view.findViewById(R.id.tvTorchLabel)
        btnBackScan       = view.findViewById(R.id.btnBackScan)
        scanLine          = view.findViewById(R.id.scanLine)
        pbScanSpinner     = view.findViewById(R.id.pbScanSpinner)
        overlayLoading    = view.findViewById(R.id.overlayLoading)
        tvScanGuide       = view.findViewById(R.id.tvScanGuide)
        tvScanCount       = view.findViewById(R.id.tvScanCount)
        llScanCounter     = view.findViewById(R.id.llScanCounter)

        cvDetectedPatient  = view.findViewById(R.id.cvDetectedPatient)
        tvDetectedName     = view.findViewById(R.id.tvDetectedName)
        tvDetectedAge      = view.findViewById(R.id.tvDetectedAge)
        tvDetectedVaccin   = view.findViewById(R.id.tvDetectedVaccin)
        tvDetectedInitials = view.findViewById(R.id.tvDetectedInitials)
        flDetectedAvatar   = view.findViewById(R.id.flDetectedAvatar)
        btnOpenProfile     = view.findViewById(R.id.btnOpenProfile)
        btnDismissDetected = view.findViewById(R.id.btnDismissDetected)

        llRecentScans = view.findViewById(R.id.llRecentScans)
        rvRecentScans = view.findViewById(R.id.rvRecentScans)

        val lm = LinearLayoutManager(requireContext(), LinearLayoutManager.HORIZONTAL, false)
        rvRecentScans.layoutManager = lm
    }

    private fun bindActions() {
        btnBackScan.setOnClickListener {
            parentFragmentManager.popBackStack()
        }

        btnScanner.setOnClickListener {
            if (!scanning) checkCameraPermissionAndScan()
        }

        btnSaisieManuelle.setOnClickListener {
            (activity as? MainInfirmierActivity)?.naviguerVers(RechercheManuelleFragment())
        }

        btnTorchLayout.setOnClickListener {
            toggleTorch()
        }

        btnDismissDetected.setOnClickListener {
            dismissDetectedCard()
        }

        btnOpenProfile.setOnClickListener {
            pendingNavigation?.invoke()
            pendingNavigation = null
            dismissDetectedCard()
        }
    }

    // ── Camera & scan ─────────────────────────────────────────────────────

    private fun checkCameraPermissionAndScan() {
        if (ContextCompat.checkSelfPermission(requireContext(), Manifest.permission.CAMERA)
            == PackageManager.PERMISSION_GRANTED) {
            startQRScanner()
        } else {
            cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    private fun startQRScanner() {
        scanning = true
        val options = ScanOptions().apply {
            setDesiredBarcodeFormats(ScanOptions.QR_CODE)
            setPrompt("Pointez vers le QR code du carnet")
            setBeepEnabled(true)
            setOrientationLocked(true)
        }
        scanLauncher.launch(options)
    }

    // ── QR result handling ─────────────────────────────────────────────────

    private fun handleQRResult(content: String) {
        val code = extractQrCode(content)
        if (!secureQrPattern.matches(code)) {
            scanning = false
            Toast.makeText(requireContext(), "QR invalide — ce code n'appartient pas à VacciniKids", Toast.LENGTH_LONG).show()
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

                    // Cache rdvs locally
                    if (rdvs.isNotEmpty()) {
                        val db = AppDatabase.getInstance(requireContext())
                        db.rendezVousDao().insertAll(rdvs.map { it.toEntity() })
                    }

                    onScanSuccess(bebe, rdvs, hist)
                } else {
                    Toast.makeText(
                        requireContext(),
                        response.message ?: "Carnet introuvable",
                        Toast.LENGTH_LONG
                    ).show()
                }
            } catch (_: Exception) {
                val cached = AppDatabase.getInstance(requireContext()).bebeDao().getByQr(code)
                if (cached != null) {
                    val bebe = BebeDto(
                        id            = cached.id,
                        parentId      = cached.parentId,
                        prenom        = cached.prenom,
                        nom           = cached.nom,
                        dateNaissance = cached.dateNaissance,
                        sexe          = cached.sexe,
                        codeQr        = cached.codeQr
                    )
                    Toast.makeText(requireContext(), "Mode hors-ligne — données du cache", Toast.LENGTH_SHORT).show()
                    onScanSuccess(bebe, emptyList(), emptyList())
                } else {
                    Toast.makeText(
                        requireContext(),
                        "Connexion requise. Carnet introuvable hors-ligne.",
                        Toast.LENGTH_LONG
                    ).show()
                }
            } finally {
                setLoading(false)
                scanning = false
            }
        }
    }

    private fun onScanSuccess(bebe: BebeDto, rdvs: List<RendezVousDto>, hist: List<VaccinationHistoryDto>) {
        vibrate()

        val name = listOfNotNull(bebe.prenom, bebe.nom).joinToString(" ")
            .ifBlank { "Bébé #${bebe.id}" }
        val initials = buildString {
            bebe.prenom?.firstOrNull()?.uppercaseChar()?.let { append(it) }
            bebe.nom?.firstOrNull()?.uppercaseChar()?.let { append(it) }
        }.ifBlank { "?" }
        val age = calculateAge(bebe.dateNaissance)
        val nextVaccin = rdvs.firstOrNull { it.statut?.uppercase() in listOf("EN_ATTENTE", "CONFIRME") }?.vaccinNom

        // Add to recent scans
        val now = SimpleDateFormat("HH:mm", Locale.FRENCH).format(Date())
        recentScans.addFirst(RecentScan(bebe, rdvs, hist, now))
        if (recentScans.size > 5) recentScans.removeLast()
        updateRecentScans()

        // Update scan counter
        tvScanCount.text = recentScans.size.toString()
        llScanCounter.visibility = View.VISIBLE

        // Populate overlay card
        tvDetectedName.text     = name
        tvDetectedAge.text      = age
        tvDetectedInitials.text = initials
        if (nextVaccin != null) {
            tvDetectedVaccin.text       = nextVaccin
            tvDetectedVaccin.visibility = View.VISIBLE
        } else {
            tvDetectedVaccin.visibility = View.GONE
        }

        // Store navigation action
        pendingNavigation = {
            (activity as? MainInfirmierActivity)?.naviguerVers(
                EnfantProfilFragment.newInstance(bebe, rdvs, hist)
            )
        }

        // Show overlay card with slide-up animation
        showDetectedCard()
    }

    private fun showDetectedCard() {
        cvDetectedPatient.visibility = View.VISIBLE
        cvDetectedPatient.animate()
            .translationY(0f)
            .setDuration(350)
            .setInterpolator(DecelerateInterpolator())
            .start()
    }

    private fun dismissDetectedCard() {
        cvDetectedPatient.animate()
            .translationY(300f)
            .setDuration(250)
            .withEndAction { cvDetectedPatient.visibility = View.GONE }
            .start()
        pendingNavigation = null
    }

    // ── Torch ─────────────────────────────────────────────────────────────

    private fun toggleTorch(forceOff: Boolean = false) {
        val cameraManager = requireContext().getSystemService(Context.CAMERA_SERVICE) as? CameraManager
            ?: return
        try {
            val cameraId = cameraManager.cameraIdList.firstOrNull() ?: return
            torchOn = if (forceOff) false else !torchOn
            cameraManager.setTorchMode(cameraId, torchOn)
            updateTorchUI(torchOn)
        } catch (_: Exception) {
            Toast.makeText(requireContext(), "Torche indisponible", Toast.LENGTH_SHORT).show()
        }
    }

    private fun updateTorchUI(on: Boolean) {
        val bgRes = if (on) R.drawable.bg_torch_on else R.drawable.bg_torch_off
        val tintColor = if (on) R.color.warning_dark else R.color.brand_teal
        btnTorchLayout.background = ContextCompat.getDrawable(requireContext(), bgRes)
        ivTorchIcon.imageTintList = android.content.res.ColorStateList.valueOf(
            ContextCompat.getColor(requireContext(), tintColor)
        )
        tvTorchLabel.setTextColor(ContextCompat.getColor(requireContext(), tintColor))
        tvTorchLabel.text = if (on) "Torche ON" else "Torche"
    }

    // ── Loading & animations ───────────────────────────────────────────────

    private fun setLoading(isLoading: Boolean) {
        overlayLoading.visibility = if (isLoading) View.VISIBLE else View.GONE
        btnScanner.isEnabled      = !isLoading
        pbScanSpinner.visibility  = if (isLoading) View.VISIBLE else View.GONE
    }

    private fun updateScanButton(loading: Boolean) {
        btnScanner.isEnabled = !loading
    }

    private fun startScanLineAnimation() {
        scanLineAnimator?.cancel()
        scanLine.post {
            val parent = scanLine.parent as? View ?: return@post
            val maxTranslation = parent.height.toFloat() - scanLine.height
            if (maxTranslation <= 0f) return@post
            scanLineAnimator = ObjectAnimator.ofFloat(scanLine, "translationY", 0f, maxTranslation).apply {
                duration = 2000
                repeatCount = ValueAnimator.INFINITE
                repeatMode  = ValueAnimator.REVERSE
                interpolator = android.view.animation.LinearInterpolator()
                start()
            }
        }
    }

    // ── Recent scans RecyclerView ─────────────────────────────────────────

    private fun updateRecentScans() {
        if (recentScans.isEmpty()) {
            llRecentScans.visibility = View.GONE
            return
        }
        llRecentScans.visibility = View.VISIBLE
        rvRecentScans.adapter = RecentScanAdapter(recentScans.toList()) { scan ->
            (activity as? MainInfirmierActivity)?.naviguerVers(
                EnfantProfilFragment.newInstance(scan.bebe, scan.rdvs, scan.hist)
            )
        }
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private fun extractQrCode(rawContent: String): String {
        val trimmed = rawContent.trim().trimEnd('/')
        if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return trimmed
        return try {
            val uri = Uri.parse(trimmed)
            uri.getQueryParameter("code")
                ?: uri.getQueryParameter("qr")
                ?: uri.lastPathSegment?.takeIf { it.isNotBlank() }
                ?: trimmed
        } catch (_: Exception) { trimmed }
    }

    private fun calculateAge(dateNaissance: String?): String {
        if (dateNaissance.isNullOrBlank()) return "Âge inconnu"
        return try {
            val sdf   = SimpleDateFormat("yyyy-MM-dd", Locale.FRENCH)
            val dob   = sdf.parse(dateNaissance) ?: return "Âge inconnu"
            val cal   = Calendar.getInstance()
            val today = cal.clone() as Calendar
            cal.time  = dob
            var years  = today.get(Calendar.YEAR)  - cal.get(Calendar.YEAR)
            var months = today.get(Calendar.MONTH) - cal.get(Calendar.MONTH)
            if (months < 0) { years--; months += 12 }
            when {
                years > 0  -> "$years an${if (years > 1) "s" else ""} $months mois"
                months > 0 -> "$months mois"
                else       -> "Nouveau-né"
            }
        } catch (_: Exception) { "Âge inconnu" }
    }

    private fun vibrate() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vm = requireContext().getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
                vm.defaultVibrator.vibrate(VibrationEffect.createOneShot(80, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                val v = requireContext().getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    v?.vibrate(VibrationEffect.createOneShot(80, VibrationEffect.DEFAULT_AMPLITUDE))
                } else {
                    @Suppress("DEPRECATION")
                    v?.vibrate(80)
                }
            }
        } catch (_: Exception) { /* vibration not supported */ }
    }

    private fun RendezVousDto.toEntity() = com.example.vaccinkid.db.RendezVousEntity(
        id                 = id,
        sessionId          = sessionId,
        bebeId             = bebeId,
        parentId           = parentId,
        statut             = statut,
        bebePrenom         = bebePrenom,
        bebeNom            = bebeNom,
        bebeDateNaissance  = bebeDateNaissance,
        parentNom          = parentNom,
        parentPrenom       = parentPrenom,
        parentTelephone    = parentTelephone,
        heureDebut         = heureDebut,
        vaccinNom          = vaccinNom,
        numeroQueue        = numeroQueue
    )
}

// ── Recent scans adapter ──────────────────────────────────────────────────

private class RecentScanAdapter(
    private val items: List<ScanQrFragment.RecentScan>,
    private val onClick: (ScanQrFragment.RecentScan) -> Unit
) : RecyclerView.Adapter<RecentScanAdapter.VH>() {

    override fun getItemCount() = items.size

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH =
        VH(LayoutInflater.from(parent.context).inflate(R.layout.item_recent_scan, parent, false))

    override fun onBindViewHolder(holder: VH, position: Int) = holder.bind(items[position], onClick)

    class VH(view: View) : RecyclerView.ViewHolder(view) {
        private val avatarFrame: FrameLayout = view.findViewById(R.id.flRecentAvatar)
        private val initialsView: TextView   = view.findViewById(R.id.tvRecentInitials)
        private val nameView: TextView       = view.findViewById(R.id.tvRecentName)
        private val ageView: TextView        = view.findViewById(R.id.tvRecentAge)
        private val timeView: TextView       = view.findViewById(R.id.tvRecentTime)

        fun bind(scan: ScanQrFragment.RecentScan, onClick: (ScanQrFragment.RecentScan) -> Unit) {
            val bebe = scan.bebe
            val name = listOfNotNull(bebe.prenom, bebe.nom).joinToString(" ").ifBlank { "Bébé #${bebe.id}" }
            val initials = buildString {
                bebe.prenom?.firstOrNull()?.uppercaseChar()?.let { append(it) }
                bebe.nom?.firstOrNull()?.uppercaseChar()?.let { append(it) }
            }.ifBlank { "?" }

            val shortName = bebe.prenom ?: name
            nameView.text = if (bebe.nom != null) "$shortName ${bebe.nom.first()}." else name
            initialsView.text = initials
            ageView.text = calculateAge(bebe.dateNaissance)
            timeView.text = scan.scannedAt

            val colors = listOf(
                R.color.brand_teal, R.color.info, R.color.success,
                R.color.brand_coral, R.color.brand_lavender
            )
            avatarFrame.backgroundTintList = android.content.res.ColorStateList.valueOf(
                ContextCompat.getColor(itemView.context, colors[Math.abs(bebe.id) % colors.size])
            )

            itemView.setOnClickListener { onClick(scan) }
        }

        private fun calculateAge(dateNaissance: String?): String {
            if (dateNaissance.isNullOrBlank()) return "—"
            return try {
                val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.FRENCH)
                val dob = sdf.parse(dateNaissance) ?: return "—"
                val cal = Calendar.getInstance()
                val today = cal.clone() as Calendar
                cal.time = dob
                var years  = today.get(Calendar.YEAR)  - cal.get(Calendar.YEAR)
                var months = today.get(Calendar.MONTH) - cal.get(Calendar.MONTH)
                if (months < 0) { years--; months += 12 }
                when {
                    years > 0  -> "$years ans"
                    months > 0 -> "$months mois"
                    else       -> "Nouveau-né"
                }
            } catch (_: Exception) { "—" }
        }
    }
}
