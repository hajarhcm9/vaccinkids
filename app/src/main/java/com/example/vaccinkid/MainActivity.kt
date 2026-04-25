package com.example.vaccinkid

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private val ADMIN_EMAIL    = "admin@centre-essalaam.ma"
    private val ADMIN_PASSWORD = "Admin2024!"

    private lateinit var etEmail: EditText
    private lateinit var etPassword: EditText
    private lateinit var btnLogin: Button
    private lateinit var tvEmailError: TextView
    private lateinit var tvPasswordError: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login_infirmier)  // ton fichier XML existant

        etEmail         = findViewById(R.id.etEmailInfirmier)
        etPassword      = findViewById(R.id.etPasswordInfirmier)
        btnLogin        = findViewById(R.id.btnLoginInfirmier)
        tvEmailError    = findViewById(R.id.tvEmailErrorInfirmier)
        tvPasswordError = findViewById(R.id.tvPasswordErrorInfirmier)

        btnLogin.setOnClickListener { handleLogin() }

        etEmail.setOnFocusChangeListener    { _, _ -> tvEmailError.visibility    = View.GONE }
        etPassword.setOnFocusChangeListener { _, _ -> tvPasswordError.visibility = View.GONE }

        etPassword.setOnEditorActionListener { _, _, _ ->
            handleLogin()
            true
        }
    }

    private fun handleLogin() {
        val email    = etEmail.text.toString().trim()
        val password = etPassword.text.toString()

        tvEmailError.visibility    = View.GONE
        tvPasswordError.visibility = View.GONE

        if (email.isEmpty()) {
            tvEmailError.text = "Veuillez entrer l'email de votre centre."
            tvEmailError.visibility = View.VISIBLE
            return
        }

        if (!android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            tvEmailError.text = "Format d'email invalide."
            tvEmailError.visibility = View.VISIBLE
            return
        }

        if (password.isEmpty()) {
            tvPasswordError.text = "Veuillez entrer votre mot de passe."
            tvPasswordError.visibility = View.VISIBLE
            return
        }

        if (email != ADMIN_EMAIL) {
            tvEmailError.text = "Email du centre non reconnu."
            tvEmailError.visibility = View.VISIBLE
            return
        }

        if (password != ADMIN_PASSWORD) {
            tvPasswordError.text = "Mot de passe incorrect."
            tvPasswordError.visibility = View.VISIBLE
            return
        }

        // Connexion reussie -> MainInfirmierActivity (Dashboard + BottomNav)
        val intent = Intent(this, MainInfirmierActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }
}