package com.example.vaccinkid

import android.graphics.Bitmap
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class BebeQrFragment : Fragment(R.layout.fragment_bebe_qr) {

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val bebeName = requireArguments().getString(ARG_BEBE_NAME, "Bébé")
        val codeQr = requireArguments().getString(ARG_CODE_QR)

        view.findViewById<TextView>(R.id.tvQrBebeName).text = bebeName
        view.findViewById<View>(R.id.btnBackQr).setOnClickListener {
            parentFragmentManager.popBackStack()
        }

        val progress = view.findViewById<ProgressBar>(R.id.qrProgress)
        val imageView = view.findViewById<ImageView>(R.id.ivQrCode)
        val tvQrValue = view.findViewById<TextView>(R.id.tvQrValue)
        val tvQrError = view.findViewById<TextView>(R.id.tvQrError)

        if (codeQr.isNullOrBlank()) {
            progress.visibility = View.GONE
            tvQrError.text = "Code QR non disponible pour ce patient."
            tvQrError.visibility = View.VISIBLE
            return
        }

        tvQrValue.text = codeQr
        tvQrError.visibility = View.GONE

        viewLifecycleOwner.lifecycleScope.launch {
            progress.visibility = View.VISIBLE
            val bitmap = withContext(Dispatchers.Default) { generateQr(codeQr, 600) }
            progress.visibility = View.GONE
            if (bitmap != null) {
                imageView.setImageBitmap(bitmap)
                imageView.visibility = View.VISIBLE
            } else {
                tvQrError.text = "Impossible de générer le QR code."
                tvQrError.visibility = View.VISIBLE
            }
        }
    }

    private fun generateQr(content: String, sizePx: Int): Bitmap? = try {
        val hints = mapOf(EncodeHintType.MARGIN to 1)
        val bits = QRCodeWriter().encode(content, BarcodeFormat.QR_CODE, sizePx, sizePx, hints)
        val pixels = IntArray(sizePx * sizePx) { idx ->
            val x = idx % sizePx; val y = idx / sizePx
            if (bits[x, y]) Color.BLACK else Color.WHITE
        }
        Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888).also {
            it.setPixels(pixels, 0, sizePx, 0, 0, sizePx, sizePx)
        }
    } catch (_: Exception) { null }

    companion object {
        private const val ARG_BEBE_NAME = "bebeName"
        private const val ARG_CODE_QR = "codeQr"

        fun newInstance(bebeName: String, codeQr: String?): BebeQrFragment =
            BebeQrFragment().apply {
                arguments = Bundle().apply {
                    putString(ARG_BEBE_NAME, bebeName)
                    putString(ARG_CODE_QR, codeQr)
                }
            }
    }
}
