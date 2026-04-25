package com.example.vaccinkid

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    // Identifiants admin fixes du centre
    private val ADMIN_EMAIL    = "admin@centre-essalaam.ma"
    private val ADMIN_PASSWORD = "Admin2024!"

    private lateinit var etEmail: EditText
    private lateinit var etPassword: EditText
    private lateinit var btnLogin: Button
    private lateinit var tvEmailError: TextView
    private lateinit var tvPasswordError: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.main)

        bindViews()
        setupListeners()
    }

    private fun bindViews() {
        etEmail       = findViewById(R.id.etEmail)
        etPassword    = findViewById(R.id.etPassword)
        btnLogin      = findViewById(R.id.btnLogin)
        tvEmailError  = findViewById(R.id.tvEmailError)
        tvPasswordError = findViewById(R.id.tvPasswordError)
    }

    private fun setupListeners() {
        btnLogin.setOnClickListener {
            handleLogin()
        }

        // Connexion rapide via clavier (touche "Entrée" sur le mot de passe)
        etPassword.setOnEditorActionListener { _, _, _ ->
            handleLogin()
            true
        }

        // Effacer l'erreur email dès que l'utilisateur retape
        etEmail.setOnFocusChangeListener { _, _ ->
            tvEmailError.visibility = View.GONE
        }

        // Effacer l'erreur mot de passe dès que l'utilisateur retape
        etPassword.setOnFocusChangeListener { _, _ ->
            tvPasswordError.visibility = View.GONE
        }
    }

    private fun handleLogin() {
        val emailSaisi    = etEmail.text.toString().trim()
        val passwordSaisi = etPassword.text.toString()

        // Réinitialiser les erreurs
        tvEmailError.visibility    = View.GONE
        tvPasswordError.visibility = View.GONE

        // Vérification : champs vides
        if (emailSaisi.isEmpty() && passwordSaisi.isEmpty()) {
            tvEmailError.text    = "Veuillez entrer l'email de votre centre."
            tvEmailError.visibility = View.VISIBLE
            tvPasswordError.text = "Veuillez entrer votre mot de passe."
            tvPasswordError.visibility = View.VISIBLE
            return
        }

        // Vérification : email vide uniquement
        if (emailSaisi.isEmpty()) {
            tvEmailError.text    = "Veuillez entrer l'email de votre centre."
            tvEmailError.visibility = View.VISIBLE
            return
        }

        // Vérification : format email invalide
        if (!android.util.Patterns.EMAIL_ADDRESS.matcher(emailSaisi).matches()) {
            tvEmailError.text    = "Format d'email invalide."
            tvEmailError.visibility = View.VISIBLE
            return
        }

        // Vérification : mot de passe vide
        if (passwordSaisi.isEmpty()) {
            tvPasswordError.text = "Veuillez entrer votre mot de passe."
            tvPasswordError.visibility = View.VISIBLE
            return
        }

        // Vérification : email incorrect
        if (emailSaisi != ADMIN_EMAIL) {
            tvEmailError.text    = "L'email du centre est invalide ou non autorisé."
            tvEmailError.visibility = View.VISIBLE
            return
        }

        // Vérification : mot de passe incorrect
        if (passwordSaisi != ADMIN_PASSWORD) {
            tvPasswordError.text = "Mot de passe incorrect."
            tvPasswordError.visibility = View.VISIBLE
            return
        }

        // ✅ Connexion réussie
        Toast.makeText(this, "Bienvenue ! Connexion réussie.", Toast.LENGTH_SHORT).show()

        // Redirection vers le tableau de bord admin
        val intent = Intent(this, DashboardActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }
}