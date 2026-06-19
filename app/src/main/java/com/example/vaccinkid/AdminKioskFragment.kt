package com.example.vaccinkid

import android.graphics.Bitmap
import android.graphics.Color
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.vaccinkid.model.AdminRefCentreDto
import com.example.vaccinkid.model.CreateKioskRequest
import com.example.vaccinkid.model.KioskDto
import com.example.vaccinkid.network.ApiClient
import com.google.android.material.button.MaterialButton
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.textfield.TextInputEditText
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import kotlinx.coroutines.launch

class AdminKioskFragment : Fragment(R.layout.fragment_admin_kiosk) {

    private lateinit var kioskProgress: ProgressBar
    private lateinit var tvMessage: TextView
    private lateinit var adapter: KioskAdapter
    private var centres: List<AdminRefCentreDto> = emptyList()

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        kioskProgress = view.findViewById(R.id.kioskProgress)
        tvMessage = view.findViewById(R.id.tvKioskMessage)

        adapter = KioskAdapter(
            onRotate = { confirmAction("Renouveler le secret de", it) { rotateKiosk(it) } },
            onRevoke = { confirmAction("Révoquer le kiosk", it) { revokeKiosk(it) } }
        )
        view.findViewById<RecyclerView>(R.id.rvKiosks).apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = this@AdminKioskFragment.adapter
        }

        view.findViewById<MaterialButton>(R.id.btnCreateKiosk).setOnClickListener {
            showCreateDialog()
        }

        loadAll()
    }

    private fun loadAll() {
        kioskProgress.visibility = View.VISIBLE
        tvMessage.text = "Chargement…"
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val refs = ApiClient.apiService.getAdminReferences()
                centres = refs.data?.centres.orEmpty()
                val resp = ApiClient.apiService.getKiosks()
                if (resp.status != "success") throw Exception(resp.message ?: "Erreur")
                val list = resp.data.orEmpty()
                adapter.submit(list)
                tvMessage.text = "${list.size} kiosk(s) enregistré(s)"
            } catch (e: Exception) {
                tvMessage.text = e.message ?: "Erreur réseau"
            } finally {
                kioskProgress.visibility = View.GONE
            }
        }
    }

    private fun showCreateDialog() {
        val dialogView = LayoutInflater.from(requireContext())
            .inflate(R.layout.dialog_create_kiosk, null)
        val etCode = dialogView.findViewById<TextInputEditText>(R.id.etKioskCode)
        val spinner = dialogView.findViewById<Spinner>(R.id.spinnerKioskCentre)
        spinner.adapter = ArrayAdapter(
            requireContext(), android.R.layout.simple_spinner_dropdown_item,
            centres.map { it.nom ?: "Centre #${it.id}" }
        )

        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Créer un kiosk")
            .setView(dialogView)
            .setNegativeButton("Annuler", null)
            .setPositiveButton("Créer") { _, _ ->
                val code = etCode.text?.toString()?.trim().orEmpty()
                if (code.isBlank()) {
                    Toast.makeText(requireContext(), "Code requis", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                val centre = centres.getOrNull(spinner.selectedItemPosition)
                if (centre == null) {
                    Toast.makeText(requireContext(), "Sélectionnez un centre", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                createKiosk(code, centre.id)
            }
            .show()
    }

    private fun createKiosk(code: String, centreId: Int) {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val r = ApiClient.apiService.createKiosk(CreateKioskRequest(code = code, centreId = centreId))
                if (r.status != "success") throw Exception(r.message ?: "Refusé")
                val kioskCode = r.data?.code ?: code
                loadAll()
                showQrDialog(kioskCode)
            } catch (e: Exception) {
                Toast.makeText(requireContext(), e.message ?: "Erreur réseau", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun showQrDialog(code: String) {
        val qrBitmap = generateQr(code, 600)

        val dialogContent = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 32, 48, 16)

            addView(TextView(requireContext()).apply {
                text = "Kiosk créé avec succès"
                textSize = 16f
                setTypeface(null, android.graphics.Typeface.BOLD)
                setTextColor(requireContext().getColor(R.color.text_primary))
                gravity = android.view.Gravity.CENTER
            })
            addView(TextView(requireContext()).apply {
                text = "Code : $code"
                textSize = 14f
                setTextColor(requireContext().getColor(R.color.brand_teal))
                gravity = android.view.Gravity.CENTER
                setPadding(0, 8, 0, 16)
            })
            if (qrBitmap != null) {
                addView(ImageView(requireContext()).apply {
                    setImageBitmap(qrBitmap)
                    val size = (resources.displayMetrics.widthPixels * 0.55).toInt()
                    layoutParams = LinearLayout.LayoutParams(size, size).also {
                        it.gravity = android.view.Gravity.CENTER_HORIZONTAL
                        it.bottomMargin = 12
                    }
                    scaleType = ImageView.ScaleType.FIT_CENTER
                })
            }
            addView(TextView(requireContext()).apply {
                text = "Scannez ce QR code sur le terminal kiosk pour le connecter au centre."
                textSize = 12f
                setTextColor(requireContext().getColor(R.color.text_secondary))
                gravity = android.view.Gravity.CENTER
            })
        }

        MaterialAlertDialogBuilder(requireContext())
            .setView(dialogContent)
            .setPositiveButton("Fermer", null)
            .show()
    }

    private fun generateQr(content: String, sizePx: Int): Bitmap? = try {
        val hints = mapOf(EncodeHintType.MARGIN to 1)
        val bits = QRCodeWriter().encode(content, BarcodeFormat.QR_CODE, sizePx, sizePx, hints)
        val bmp = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.RGB_565)
        for (x in 0 until sizePx) for (y in 0 until sizePx)
            bmp.setPixel(x, y, if (bits[x, y]) Color.BLACK else Color.WHITE)
        bmp
    } catch (_: Exception) { null }

    private fun confirmAction(prefix: String, kiosk: KioskDto, action: () -> Unit) {
        MaterialAlertDialogBuilder(requireContext())
            .setTitle("$prefix ${kiosk.code}")
            .setMessage("Cette action est irréversible pour le terminal actuel.")
            .setNegativeButton("Annuler", null)
            .setPositiveButton("Confirmer") { _, _ -> action() }
            .show()
    }

    private fun rotateKiosk(kiosk: KioskDto) {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val r = ApiClient.apiService.rotateKiosk(kiosk.id)
                if (r.status != "success") throw Exception(r.message)
                val newCode = r.data?.code ?: kiosk.code ?: ""
                loadAll()
                showQrDialog(newCode)
            } catch (e: Exception) {
                Toast.makeText(requireContext(), e.message ?: "Erreur réseau", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun revokeKiosk(kiosk: KioskDto) {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val r = ApiClient.apiService.revokeKiosk(kiosk.id)
                if (r.status != "success") throw Exception(r.message)
                Toast.makeText(requireContext(), "Kiosk ${kiosk.code} révoqué", Toast.LENGTH_SHORT).show()
                loadAll()
            } catch (e: Exception) {
                Toast.makeText(requireContext(), e.message ?: "Erreur réseau", Toast.LENGTH_SHORT).show()
            }
        }
    }
}

private class KioskAdapter(
    private val onRotate: (KioskDto) -> Unit,
    private val onRevoke: (KioskDto) -> Unit
) : RecyclerView.Adapter<KioskAdapter.VH>() {
    private var items: List<KioskDto> = emptyList()
    fun submit(next: List<KioskDto>) { items = next; notifyDataSetChanged() }
    override fun getItemCount() = items.size
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH =
        VH(LayoutInflater.from(parent.context).inflate(R.layout.item_admin_kiosk, parent, false), onRotate, onRevoke)
    override fun onBindViewHolder(h: VH, pos: Int) = h.bind(items[pos])

    class VH(
        v: View,
        private val onRotate: (KioskDto) -> Unit,
        private val onRevoke: (KioskDto) -> Unit
    ) : RecyclerView.ViewHolder(v) {
        private val accentBar: View = v.findViewById(R.id.viewKioskAccent)
        private val tvCode: TextView = v.findViewById(R.id.tvKioskCode)
        private val tvCentre: TextView = v.findViewById(R.id.tvKioskCentre)
        private val tvStatus: TextView = v.findViewById(R.id.tvKioskStatus)
        private val tvDate: TextView = v.findViewById(R.id.tvKioskDate)
        private val llActions: LinearLayout = v.findViewById(R.id.llKioskActions)
        private val btnRotate: MaterialButton = v.findViewById(R.id.btnKioskRotate)
        private val btnRevoke: MaterialButton = v.findViewById(R.id.btnKioskRevoke)

        fun bind(k: KioskDto) {
            val actif = k.estActif != false
            tvCode.text = k.code ?: "Kiosk #${k.id}"
            tvCentre.text = k.centreNom ?: "Centre #${k.centreId}"
            tvDate.text = if (k.rotatedAt != null) "Renouvelé : ${k.rotatedAt.take(10)}"
                          else "Créé : ${k.createdAt?.take(10) ?: "—"}"

            if (actif) {
                accentBar.setBackgroundColor(Color.parseColor("#1A9099"))
                tvStatus.text = "Actif"
                tvStatus.setBackgroundResource(R.drawable.bg_badge_success)
                tvStatus.setTextColor(Color.parseColor("#065F46"))
            } else {
                accentBar.setBackgroundColor(Color.parseColor("#9CA3AF"))
                tvStatus.text = "Révoqué"
                tvStatus.setBackgroundResource(R.drawable.bg_badge_error)
                tvStatus.setTextColor(Color.parseColor("#991B1B"))
            }

            llActions.visibility = if (actif) View.VISIBLE else View.GONE
            btnRotate.setOnClickListener { onRotate(k) }
            btnRevoke.setOnClickListener { onRevoke(k) }
        }
    }
}
