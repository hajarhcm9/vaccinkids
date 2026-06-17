package com.example.vaccinkid

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.vaccinkid.model.CreateFlaconRequest
import com.example.vaccinkid.model.FlaconDto
import com.example.vaccinkid.network.ApiClient
import com.google.android.material.button.MaterialButton
import com.google.android.material.textfield.TextInputEditText
import kotlinx.coroutines.launch

class GestionFlaconsFragment : Fragment(R.layout.fragment_gestion_flacons) {

    private lateinit var etLot: TextInputEditText
    private lateinit var etFabricant: TextInputEditText
    private lateinit var btnOuvrir: MaterialButton
    private lateinit var pbFlacons: View
    private lateinit var tvMessage: TextView
    private lateinit var rvFlacons: RecyclerView
    private lateinit var tvEmpty: TextView
    private lateinit var adapter: FlaconAdapter
    private var loading = false

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        etLot = view.findViewById(R.id.etFlaconLot)
        etFabricant = view.findViewById(R.id.etFlaconFabricant)
        btnOuvrir = view.findViewById(R.id.btnOuvrirFlacon)
        pbFlacons = view.findViewById(R.id.pbFlacons)
        tvMessage = view.findViewById(R.id.tvFlaconsMessage)
        rvFlacons = view.findViewById(R.id.rvFlacons)
        tvEmpty = view.findViewById(R.id.tvFlaconsEmpty)

        view.findViewById<TextView>(R.id.tvFlaconsSessionLabel).text =
            requireArguments().getString(ARG_SESSION_LABEL) ?: "Session"

        view.findViewById<View>(R.id.btnBackFlacons).setOnClickListener {
            parentFragmentManager.popBackStack()
        }

        adapter = FlaconAdapter(
            onWaste = { flacon -> recordWaste(flacon) },
            onClose = { flacon -> closeFlacon(flacon) }
        )
        rvFlacons.layoutManager = LinearLayoutManager(requireContext())
        rvFlacons.adapter = adapter

        if (sessionId() <= 0 || vaccinId() <= 0) {
            btnOuvrir.isEnabled = false
            tvMessage.text = "Ouverture possible uniquement depuis une session serveur."
            return
        }

        btnOuvrir.setOnClickListener { openFlacon() }
        loadFlacons()
    }

    private fun loadFlacons() {
        val sessionId = sessionId()
        if (sessionId <= 0 || loading) return
        setLoading(true, "Chargement des flacons...")
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.getSessionFlacons(sessionId)
                val data = response.data
                if (response.status == "success" && data != null) {
                    adapter.submit(data)
                    showList(data.isNotEmpty())
                    tvMessage.text = "${data.size} flacon(s) chargé(s)."
                } else {
                    tvMessage.text = response.message ?: "Flacons indisponibles."
                    showList(false)
                }
            } catch (e: Exception) {
                tvMessage.text = e.message ?: "Erreur réseau."
                showList(false)
            } finally {
                setLoading(false)
            }
        }
    }

    private fun openFlacon() {
        val lot = etLot.text?.toString()?.trim().orEmpty()
        val fabricant = etFabricant.text?.toString()?.trim().orEmpty()
        if (lot.isBlank() || fabricant.isBlank()) {
            tvMessage.text = "Numéro de lot et fabricant sont obligatoires."
            return
        }
        if (loading) return
        setLoading(true, "Ouverture en cours...")
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.createFlacon(
                    CreateFlaconRequest(vaccinId(), sessionId(), lot, fabricant)
                )
                if (response.status == "success" && response.data != null) {
                    Toast.makeText(requireContext(), "Flacon ouvert", Toast.LENGTH_SHORT).show()
                    etLot.text?.clear()
                    etFabricant.text?.clear()
                    setLoading(false)
                    loadFlacons()
                } else {
                    tvMessage.text = response.message ?: "Ouverture refusée."
                }
            } catch (e: Exception) {
                tvMessage.text = e.message ?: "Erreur réseau."
            } finally {
                setLoading(false)
            }
        }
    }

    private fun recordWaste(flacon: FlaconDto) {
        if (loading) return
        setLoading(true, "Enregistrement du gaspillage...")
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.recordWaste(flacon.id)
                if (response.status == "success") {
                    Toast.makeText(requireContext(), "Gaspillage enregistré", Toast.LENGTH_SHORT).show()
                    setLoading(false)
                    loadFlacons()
                } else {
                    tvMessage.text = response.message ?: "Gaspillage refusé."
                }
            } catch (e: Exception) {
                tvMessage.text = e.message ?: "Erreur réseau."
            } finally {
                setLoading(false)
            }
        }
    }

    private fun closeFlacon(flacon: FlaconDto) {
        if (loading) return
        setLoading(true, "Fermeture du flacon...")
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.closeFlacon(flacon.id)
                if (response.status == "success") {
                    Toast.makeText(requireContext(), "Flacon fermé", Toast.LENGTH_SHORT).show()
                    setLoading(false)
                    loadFlacons()
                } else {
                    tvMessage.text = response.message ?: "Fermeture refusée."
                }
            } catch (e: Exception) {
                tvMessage.text = e.message ?: "Erreur réseau."
            } finally {
                setLoading(false)
            }
        }
    }

    private fun setLoading(value: Boolean, message: String? = null) {
        loading = value
        pbFlacons.visibility = if (value) View.VISIBLE else View.GONE
        btnOuvrir.isEnabled = !value && sessionId() > 0 && vaccinId() > 0
        if (message != null) tvMessage.text = message
    }

    private fun showList(hasItems: Boolean) {
        rvFlacons.visibility = if (hasItems) View.VISIBLE else View.GONE
        tvEmpty.visibility = if (hasItems) View.GONE else View.VISIBLE
    }

    private fun sessionId(): Int = requireArguments().getInt(ARG_SESSION_ID, 0)
    private fun vaccinId(): Int = requireArguments().getInt(ARG_VACCIN_ID, 0)

    private inner class FlaconAdapter(
        private val onWaste: (FlaconDto) -> Unit,
        private val onClose: (FlaconDto) -> Unit
    ) : RecyclerView.Adapter<FlaconAdapter.Holder>() {

        private val items = mutableListOf<FlaconDto>()

        fun submit(data: List<FlaconDto>) {
            items.clear()
            items.addAll(data)
            notifyDataSetChanged()
        }

        override fun getItemCount() = items.size

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) = Holder(
            LayoutInflater.from(parent.context).inflate(R.layout.item_flacon, parent, false)
        )

        override fun onBindViewHolder(holder: Holder, position: Int) = holder.bind(items[position])

        inner class Holder(v: View) : RecyclerView.ViewHolder(v) {
            fun bind(flacon: FlaconDto) {
                val v = itemView
                val isClosed = flacon.dateFermeture != null

                v.findViewById<View>(R.id.flaconAccentBar).setBackgroundColor(
                    requireContext().getColor(if (isClosed) R.color.text_tertiary else R.color.brand_teal)
                )

                v.findViewById<TextView>(R.id.tvFlaconLot).text = "Lot ${flacon.numeroLot ?: flacon.id}"
                v.findViewById<TextView>(R.id.tvFlaconFabricant).text = flacon.fabricant ?: "Fabricant inconnu"

                val statusView = v.findViewById<TextView>(R.id.tvFlaconStatus)
                if (isClosed) {
                    statusView.text = "Fermé"
                    statusView.setBackgroundResource(R.drawable.bg_badge_info)
                    statusView.setTextColor(requireContext().getColor(R.color.info_dark))
                } else {
                    statusView.text = "Ouvert"
                    statusView.setBackgroundResource(R.drawable.bg_badge_success)
                    statusView.setTextColor(requireContext().getColor(R.color.success_dark))
                }

                v.findViewById<TextView>(R.id.tvFlaconUtilisees).text = (flacon.dosesUtilisees ?: 0).toString()
                v.findViewById<TextView>(R.id.tvFlaconGaspillees).text = (flacon.dosesGaspillees ?: 0).toString()
                v.findViewById<TextView>(R.id.tvFlaconRestantes).text = flacon.dosesRestantes?.toString() ?: "—"

                val remaining = flacon.dosesRestantes ?: 0
                val btnWaste = v.findViewById<MaterialButton>(R.id.btnFlaconGaspillage)
                val btnClose = v.findViewById<MaterialButton>(R.id.btnFlaconFermer)

                btnWaste.isEnabled = !isClosed && remaining > 0
                btnWaste.alpha = if (btnWaste.isEnabled) 1f else 0.4f
                btnWaste.setOnClickListener { onWaste(flacon) }

                btnClose.isEnabled = !isClosed && remaining == 0
                btnClose.alpha = if (btnClose.isEnabled) 1f else 0.4f
                btnClose.setOnClickListener { onClose(flacon) }
            }
        }
    }

    companion object {
        private const val ARG_SESSION_ID = "sessionId"
        private const val ARG_VACCIN_ID = "vaccinId"
        private const val ARG_SESSION_LABEL = "sessionLabel"

        fun newInstance(
            sessionId: Int,
            vaccinId: Int,
            sessionLabel: String
        ): GestionFlaconsFragment = GestionFlaconsFragment().apply {
            arguments = Bundle().apply {
                putInt(ARG_SESSION_ID, sessionId)
                putInt(ARG_VACCIN_ID, vaccinId)
                putString(ARG_SESSION_LABEL, sessionLabel)
            }
        }
    }
}
