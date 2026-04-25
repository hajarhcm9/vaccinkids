package com.example.vaccinkid

import android.app.AlertDialog
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.fragment.app.Fragment

class GestionPersonnelFragment : Fragment() {

    data class Infirmier(
        val id: String, val nom: String, val prenom: String,
        val email: String, val telephone: String, val role: String,
        val centreAssigne: String, var estActif: Boolean
    )

    private val infirmiers = mutableListOf(
        Infirmier("INF001", "Benali", "Fatima", "fatima@essalam.ma", "0661-111-222", "Infirmier(e)", "Centre Essalam", true),
        Infirmier("INF002", "Tazi", "Mohammed", "m.tazi@essalam.ma", "0661-333-444", "Infirmier(e) Chef", "Centre Essalam", true),
        Infirmier("INF003", "Alami", "Khadija", "k.alami@essalam.ma", "0661-555-666", "Infirmier(e)", "Centre Essalam", false)
    )

    private lateinit var listViewPersonnel: ListView
    private lateinit var btnAjouterInfirmier: Button
    private lateinit var tvTotalPersonnel: TextView

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View? {
        val view = inflater.inflate(R.layout.fragment_gestion_personnel, container, false)
        listViewPersonnel = view.findViewById(R.id.listViewPersonnel)
        btnAjouterInfirmier = view.findViewById(R.id.btnAjouterInfirmier)
        tvTotalPersonnel = view.findViewById(R.id.tvTotalPersonnel)
        afficherPersonnel()
        btnAjouterInfirmier.setOnClickListener { afficherDialogAjout() }
        return view
    }

    private fun afficherPersonnel() {
        val actifs = infirmiers.count { it.estActif }
        tvTotalPersonnel.text = "Personnel actif : $actifs / ${infirmiers.size}"
        val adapter = object : ArrayAdapter<Infirmier>(requireContext(), R.layout.item_infirmier, infirmiers) {
            override fun getView(position: Int, convertView: View?, parent: ViewGroup): View {
                val itemView = convertView ?: LayoutInflater.from(context).inflate(R.layout.item_infirmier, parent, false)
                val inf = infirmiers[position]
                itemView.findViewById<TextView>(R.id.tvNomInfirmier).text = "${inf.prenom} ${inf.nom}"
                itemView.findViewById<TextView>(R.id.tvRoleInfirmier).text = inf.role
                itemView.findViewById<TextView>(R.id.tvCentreInfirmier).text = "🏥 ${inf.centreAssigne}"
                itemView.findViewById<TextView>(R.id.tvEmailInfirmier).text = inf.email
                val tvStatut = itemView.findViewById<TextView>(R.id.tvStatutInfirmier)
                val cardView = itemView.findViewById<androidx.cardview.widget.CardView>(R.id.cardInfirmier)
                if (inf.estActif) { tvStatut.text = "✅ Actif"; cardView.alpha = 1.0f }
                else { tvStatut.text = "🔒 Inactif"; cardView.alpha = 0.6f }
                itemView.findViewById<Button>(R.id.btnModifierInfirmier).setOnClickListener { afficherDialogModifier(inf, position) }
                itemView.findViewById<Button>(R.id.btnToggleInfirmier).apply {
                    text = if (inf.estActif) "Désactiver" else "Activer"
                    setOnClickListener { infirmiers[position] = inf.copy(estActif = !inf.estActif); afficherPersonnel() }
                }
                return itemView
            }
        }
        listViewPersonnel.adapter = adapter
    }

    private fun afficherDialogAjout() {
        val dialogView = LayoutInflater.from(requireContext()).inflate(R.layout.dialog_form_infirmier, null)
        dialogView.findViewById<TextView>(R.id.tvTitreFormInfirmier).text = "Ajouter un infirmier"
        val roles = listOf("Infirmier(e)", "Infirmier(e) Chef")
        val spinner = dialogView.findViewById<Spinner>(R.id.spinnerRoleInfirmier)
        spinner.adapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_dropdown_item, roles)
        val dialog = AlertDialog.Builder(requireContext()).setView(dialogView).create()
        dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)
        dialogView.findViewById<Button>(R.id.btnAnnulerFormInfirmier).setOnClickListener { dialog.dismiss() }
        dialogView.findViewById<Button>(R.id.btnValiderFormInfirmier).setOnClickListener {
            val nom = dialogView.findViewById<EditText>(R.id.etNomInfirmier).text.toString().trim()
            val prenom = dialogView.findViewById<EditText>(R.id.etPrenomInfirmier).text.toString().trim()
            val email = dialogView.findViewById<EditText>(R.id.etEmailInfirmierForm).text.toString().trim()
            val tel = dialogView.findViewById<EditText>(R.id.etTelInfirmier).text.toString().trim()
            if (nom.isEmpty() || prenom.isEmpty() || email.isEmpty()) {
                Toast.makeText(requireContext(), "Champs obligatoires manquants", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            infirmiers.add(Infirmier("INF${System.currentTimeMillis()}", nom, prenom, email, tel, spinner.selectedItem.toString(), "Centre Essalam", true))
            afficherPersonnel()
            dialog.dismiss()
        }
        dialog.show()
    }

    private fun afficherDialogModifier(inf: Infirmier, position: Int) {
        val dialogView = LayoutInflater.from(requireContext()).inflate(R.layout.dialog_form_infirmier, null)
        dialogView.findViewById<TextView>(R.id.tvTitreFormInfirmier).text = "Modifier infirmier"
        dialogView.findViewById<EditText>(R.id.etNomInfirmier).setText(inf.nom)
        dialogView.findViewById<EditText>(R.id.etPrenomInfirmier).setText(inf.prenom)
        dialogView.findViewById<EditText>(R.id.etEmailInfirmierForm).setText(inf.email)
        dialogView.findViewById<EditText>(R.id.etTelInfirmier).setText(inf.telephone)
        val roles = listOf("Infirmier(e)", "Infirmier(e) Chef")
        val spinner = dialogView.findViewById<Spinner>(R.id.spinnerRoleInfirmier)
        spinner.adapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_dropdown_item, roles)
        val dialog = AlertDialog.Builder(requireContext()).setView(dialogView).create()
        dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)
        dialogView.findViewById<Button>(R.id.btnAnnulerFormInfirmier).setOnClickListener { dialog.dismiss() }
        dialogView.findViewById<Button>(R.id.btnValiderFormInfirmier).setOnClickListener {
            val nom = dialogView.findViewById<EditText>(R.id.etNomInfirmier).text.toString().trim()
            val prenom = dialogView.findViewById<EditText>(R.id.etPrenomInfirmier).text.toString().trim()
            val email = dialogView.findViewById<EditText>(R.id.etEmailInfirmierForm).text.toString().trim()
            val tel = dialogView.findViewById<EditText>(R.id.etTelInfirmier).text.toString().trim()
            infirmiers[position] = inf.copy(nom = nom, prenom = prenom, email = email, telephone = tel)
            afficherPersonnel()
            dialog.dismiss()
        }
        dialog.show()
    }
}
