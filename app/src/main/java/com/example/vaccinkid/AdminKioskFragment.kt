package com.example.vaccinkid

import android.app.AlertDialog
import android.graphics.Color
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
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
import kotlinx.coroutines.launch

class AdminKioskFragment : Fragment() {
    private lateinit var adapter: KioskAdapter
    private lateinit var messageView: TextView
    private var centres: List<AdminRefCentreDto> = emptyList()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        adapter = KioskAdapter(
            onRotate = { confirmAction("Renouveler le secret de", it) { rotateKiosk(it) } },
            onRevoke = { confirmAction("Révoquer le kiosk", it) { revokeKiosk(it) } }
        )
        return LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(requireContext().getColor(R.color.bg_screen))

            addView(LinearLayout(requireContext()).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(56, 56, 56, 24)
                addView(TextView(requireContext()).apply {
                    text = "Kiosks de salle d'attente"
                    textSize = 24f
                    setTextColor(requireContext().getColor(R.color.text_primary))
                    setTypeface(null, android.graphics.Typeface.BOLD)
                })
                addView(TextView(requireContext()).apply {
                    text = "Terminaux autonomes connectés aux centres"
                    textSize = 13f
                    setTextColor(requireContext().getColor(R.color.text_secondary))
                    setPadding(0, 4, 0, 0)
                })
            })

            addView(com.google.android.material.button.MaterialButton(requireContext()).apply {
                text = "+ Créer un kiosk"
                backgroundTintList = android.content.res.ColorStateList.valueOf(
                    requireContext().getColor(R.color.teal_500)
                )
                setTextColor(requireContext().getColor(R.color.white))
                textSize = 14f
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT
                ).also { it.setMargins(44, 0, 44, 20) }
                setOnClickListener { showCreateDialog() }
            })

            messageView = TextView(requireContext()).apply {
                setPadding(56, 0, 56, 8)
                setTextColor(requireContext().getColor(R.color.text_secondary))
            }
            addView(messageView)

            addView(RecyclerView(requireContext()).apply {
                layoutManager = LinearLayoutManager(requireContext())
                adapter = this@AdminKioskFragment.adapter
                clipToPadding = false
                setPadding(44, 0, 44, 60)
            }, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))
        }
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        loadAll()
    }

    private fun loadAll() {
        messageView.text = "Chargement..."
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val refs = ApiClient.apiService.getAdminReferences()
                centres = refs.data?.centres.orEmpty()
                val resp = ApiClient.apiService.getKiosks()
                if (resp.status != "success") throw Exception(resp.message ?: "Erreur")
                val list = resp.data.orEmpty()
                adapter.submit(list)
                messageView.text = "${list.size} kiosk(s) enregistré(s)"
            } catch (e: Exception) {
                messageView.text = e.message ?: "Erreur réseau"
            }
        }
    }

    private fun showCreateDialog() {
        val root = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL; setPadding(64, 32, 64, 8)
        }
        val codeInput = EditText(requireContext()).apply {
            hint = "Code unique (ex: KIOSK-01)"
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT
            ).also { it.bottomMargin = 16 }
        }
        val centreSpinner = Spinner(requireContext()).apply {
            adapter = ArrayAdapter(
                requireContext(), android.R.layout.simple_spinner_dropdown_item,
                centres.map { it.nom ?: "Centre #${it.id}" }
            )
        }
        root.addView(codeInput)
        root.addView(TextView(requireContext()).apply {
            text = "Centre"; textSize = 13f
            setTextColor(requireContext().getColor(R.color.text_secondary))
        })
        root.addView(centreSpinner)

        AlertDialog.Builder(requireContext())
            .setTitle("Créer un kiosk")
            .setView(root)
            .setNegativeButton("Annuler", null)
            .setPositiveButton("Créer") { _, _ ->
                val code = codeInput.text.toString().trim()
                if (code.isBlank()) { Toast.makeText(requireContext(), "Code requis", Toast.LENGTH_SHORT).show(); return@setPositiveButton }
                val centre = centres.getOrNull(centreSpinner.selectedItemPosition)
                if (centre == null) { Toast.makeText(requireContext(), "Sélectionnez un centre", Toast.LENGTH_SHORT).show(); return@setPositiveButton }
                createKiosk(code, centre.id)
            }
            .show()
    }

    private fun createKiosk(code: String, centreId: Int) {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val r = ApiClient.apiService.createKiosk(CreateKioskRequest(code = code, centreId = centreId))
                if (r.status != "success") throw Exception(r.message ?: "Refusé")
                AlertDialog.Builder(requireContext())
                    .setTitle("Kiosk créé")
                    .setMessage("Code : ${r.data?.code}\nNotez le secret maintenant — il ne sera plus affiché.")
                    .setPositiveButton("OK", null)
                    .show()
                loadAll()
            } catch (e: Exception) {
                Toast.makeText(requireContext(), e.message ?: "Erreur réseau", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun confirmAction(prefix: String, kiosk: KioskDto, action: () -> Unit) {
        AlertDialog.Builder(requireContext())
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
                Toast.makeText(requireContext(), "Secret renouvelé pour ${kiosk.code}", Toast.LENGTH_SHORT).show()
                loadAll()
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
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
        val card = LinearLayout(parent.context).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundResource(R.drawable.bg_card_rounded)
            layoutParams = RecyclerView.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
            ).also { it.bottomMargin = 20 }
            setPadding(36, 28, 36, 20)
        }
        return VH(card, onRotate, onRevoke)
    }
    override fun onBindViewHolder(h: VH, pos: Int) = h.bind(items[pos])

    class VH(
        private val root: LinearLayout,
        private val onRotate: (KioskDto) -> Unit,
        private val onRevoke: (KioskDto) -> Unit
    ) : RecyclerView.ViewHolder(root) {
        fun bind(k: KioskDto) {
            root.removeAllViews()
            val actif = k.estActif != false
            val ctx = root.context

            root.addView(LinearLayout(ctx).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = android.view.Gravity.CENTER_VERTICAL
                addView(TextView(ctx).apply {
                    text = k.code ?: "Kiosk #${k.id}"
                    textSize = 16f
                    setTypeface(null, android.graphics.Typeface.BOLD)
                    setTextColor(ctx.getColor(R.color.text_primary))
                    layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                })
                addView(TextView(ctx).apply {
                    text = if (actif) "Actif" else "Révoqué"
                    textSize = 11f
                    setPadding(16, 6, 16, 6)
                    setBackgroundResource(if (actif) R.drawable.bg_badge_success else R.drawable.bg_badge_error)
                    setTextColor(if (actif) Color.parseColor("#065F46") else Color.parseColor("#991B1B"))
                })
            })

            root.addView(TextView(ctx).apply {
                text = k.centreNom ?: "Centre #${k.centreId}"
                textSize = 13f
                setTextColor(ctx.getColor(R.color.text_secondary))
                setPadding(0, 6, 0, 4)
            })

            if (k.rotatedAt != null) {
                root.addView(TextView(ctx).apply {
                    text = "Renouvelé : ${k.rotatedAt.take(10)}"
                    textSize = 12f
                    setTextColor(ctx.getColor(R.color.text_secondary))
                })
            }

            if (actif) {
                val btnRow = LinearLayout(ctx).apply {
                    orientation = LinearLayout.HORIZONTAL
                    setPadding(0, 16, 0, 0)
                }
                fun btn(label: String, color: Int, click: () -> Unit) {
                    btnRow.addView(Button(ctx).apply {
                        text = label
                        setTextColor(Color.WHITE)
                        backgroundTintList = android.content.res.ColorStateList.valueOf(color)
                        textSize = 11f
                        layoutParams = LinearLayout.LayoutParams(0, 80).also { it.weight = 1f; it.marginEnd = 8 }
                        setOnClickListener { click() }
                    })
                }
                btn("Renouveler secret", Color.parseColor("#3B82F6")) { onRotate(k) }
                btn("Révoquer", Color.parseColor("#EF4444")) { onRevoke(k) }
                root.addView(btnRow)
            }
        }
    }
}
