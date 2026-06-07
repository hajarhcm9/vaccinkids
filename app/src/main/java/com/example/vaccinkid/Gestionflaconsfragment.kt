package com.example.vaccinkid

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.core.view.setPadding
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.vaccinkid.model.CreateFlaconRequest
import com.example.vaccinkid.model.FlaconDto
import com.example.vaccinkid.network.ApiClient
import kotlinx.coroutines.launch

class GestionFlaconsFragment : Fragment() {
    private lateinit var messageView: TextView
    private lateinit var lotInput: EditText
    private lateinit var fabricantInput: EditText
    private lateinit var openButton: Button
    private lateinit var adapter: FlaconAdapter
    private var loading = false

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        adapter = FlaconAdapter(
            onWaste = { flacon -> recordWaste(flacon) },
            onClose = { flacon -> closeFlacon(flacon) }
        )

        return LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(24)

            addView(TextView(requireContext()).apply {
                text = "Flacons de session"
                textSize = 22f
            })

            addView(TextView(requireContext()).apply {
                text = requireArguments().getString(ARG_SESSION_LABEL) ?: "Session"
                textSize = 15f
                setPadding(0, 8, 0, 12)
            })

            lotInput = EditText(requireContext()).apply { hint = "Numero de lot" }
            addView(lotInput)

            fabricantInput = EditText(requireContext()).apply { hint = "Fabricant" }
            addView(fabricantInput)

            val actions = LinearLayout(requireContext()).apply {
                orientation = LinearLayout.HORIZONTAL
            }
            openButton = Button(requireContext()).apply {
                text = "Ouvrir flacon"
                setOnClickListener { openFlacon() }
            }
            actions.addView(openButton, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
            actions.addView(Button(requireContext()).apply {
                text = "Rafraichir"
                setOnClickListener { loadFlacons() }
            }, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
            addView(actions)

            messageView = TextView(requireContext()).apply {
                setPadding(0, 10, 0, 10)
            }
            addView(messageView)

            addView(RecyclerView(requireContext()).apply {
                layoutManager = LinearLayoutManager(requireContext())
                adapter = this@GestionFlaconsFragment.adapter
            }, LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                0,
                1f
            ))
        }
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        if (sessionId() <= 0 || vaccinId() <= 0) {
            openButton.isEnabled = false
            messageView.text = "Ouverture possible uniquement depuis une session serveur."
            return
        }
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
                    messageView.text = "${data.size} flacon(s) charge(s)."
                } else {
                    messageView.text = response.message ?: "Flacons indisponibles."
                }
            } catch (e: Exception) {
                messageView.text = e.message ?: "Erreur reseau."
            } finally {
                setLoading(false)
            }
        }
    }

    private fun openFlacon() {
        val lot = lotInput.text.toString().trim()
        val fabricant = fabricantInput.text.toString().trim()
        if (lot.isBlank() || fabricant.isBlank()) {
            messageView.text = "Numero de lot et fabricant sont obligatoires."
            return
        }
        if (loading) return
        setLoading(true, "Ouverture serveur en cours...")
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.createFlacon(
                    CreateFlaconRequest(vaccinId(), sessionId(), lot, fabricant)
                )
                if (response.status == "success" && response.data != null) {
                    Toast.makeText(requireContext(), "Flacon ouvert", Toast.LENGTH_SHORT).show()
                    lotInput.text.clear()
                    fabricantInput.text.clear()
                    setLoading(false)
                    loadFlacons()
                } else {
                    messageView.text = response.message ?: "Ouverture refusee."
                }
            } catch (e: Exception) {
                messageView.text = e.message ?: "Erreur reseau."
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
                if (response.status == "success" && response.data != null) {
                    Toast.makeText(requireContext(), "Gaspillage enregistre", Toast.LENGTH_SHORT).show()
                    setLoading(false)
                    loadFlacons()
                } else {
                    messageView.text = response.message ?: "Gaspillage refuse."
                }
            } catch (e: Exception) {
                messageView.text = e.message ?: "Erreur reseau."
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
                if (response.status == "success" && response.data != null) {
                    Toast.makeText(requireContext(), "Flacon ferme par le serveur", Toast.LENGTH_SHORT).show()
                    setLoading(false)
                    loadFlacons()
                } else {
                    messageView.text = response.message ?: "Fermeture refusee."
                }
            } catch (e: Exception) {
                messageView.text = e.message ?: "Erreur reseau."
            } finally {
                setLoading(false)
            }
        }
    }

    private fun setLoading(value: Boolean, message: String? = null) {
        loading = value
        openButton.isEnabled = !value && sessionId() > 0 && vaccinId() > 0
        if (message != null) messageView.text = message
    }

    private fun sessionId(): Int = requireArguments().getInt(ARG_SESSION_ID, 0)

    private fun vaccinId(): Int = requireArguments().getInt(ARG_VACCIN_ID, 0)

    private class FlaconAdapter(
        private val onWaste: (FlaconDto) -> Unit,
        private val onClose: (FlaconDto) -> Unit
    ) : RecyclerView.Adapter<FlaconAdapter.ViewHolder>() {
        private val items = mutableListOf<FlaconDto>()

        fun submit(data: List<FlaconDto>) {
            items.clear()
            items.addAll(data)
            notifyDataSetChanged()
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
            return ViewHolder(
                LinearLayout(parent.context).apply {
                    orientation = LinearLayout.VERTICAL
                    setPadding(16)
                },
                onWaste,
                onClose
            )
        }

        override fun getItemCount(): Int = items.size

        override fun onBindViewHolder(holder: ViewHolder, position: Int) {
            holder.bind(items[position])
        }

        class ViewHolder(
            private val root: LinearLayout,
            private val onWaste: (FlaconDto) -> Unit,
            private val onClose: (FlaconDto) -> Unit
        ) : RecyclerView.ViewHolder(root) {
            fun bind(flacon: FlaconDto) {
                root.removeAllViews()
                root.addView(TextView(root.context).apply {
                    text = "Lot ${flacon.numeroLot ?: flacon.id} - ${flacon.fabricant ?: "fabricant inconnu"}"
                    textSize = 16f
                })
                root.addView(TextView(root.context).apply {
                    val closed = if (flacon.dateFermeture == null) "ouvert" else "ferme"
                    text = "Utilisees ${flacon.dosesUtilisees ?: 0} / gaspillees ${flacon.dosesGaspillees ?: 0} / restantes ${flacon.remainingDosesLabel()} / $closed"
                })
                root.addView(Button(root.context).apply {
                    text = "Declarer gaspillage"
                    isEnabled = flacon.dateFermeture == null && (flacon.dosesRestantes ?: 0) > 0
                    setOnClickListener { onWaste(flacon) }
                })
                root.addView(Button(root.context).apply {
                    text = "Fermer flacon"
                    isEnabled = flacon.dateFermeture == null && (flacon.dosesRestantes ?: 0) == 0
                    setOnClickListener { onClose(flacon) }
                })
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
        ): GestionFlaconsFragment {
            return GestionFlaconsFragment().apply {
                arguments = Bundle().apply {
                    putInt(ARG_SESSION_ID, sessionId)
                    putInt(ARG_VACCIN_ID, vaccinId)
                    putString(ARG_SESSION_LABEL, sessionLabel)
                }
            }
        }
    }
}

private fun FlaconDto.remainingDosesLabel(): String {
    return dosesRestantes?.toString() ?: "serveur indisponible"
}
