package com.example.vaccinkid

import android.content.Intent
import android.content.res.ColorStateList
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import com.example.vaccinkid.viewmodel.InfirmierAuthViewModel
import com.google.android.material.button.MaterialButton

class LoginInfirmierActivity : AppCompatActivity() {

    private lateinit var etEmail: EditText
    private lateinit var etPassword: EditText
    private lateinit var btnLogin: Button
    private lateinit var tvEmailError: TextView
    private lateinit var tvPasswordError: TextView
    private lateinit var authViewModel: InfirmierAuthViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login_infirmier)
        authViewModel = ViewModelProvider(this)[InfirmierAuthViewModel::class.java]

        etEmail         = findViewById(R.id.etEmailInfirmier)
        etPassword      = findViewById(R.id.etPasswordInfirmier)
        btnLogin        = findViewById(R.id.btnLoginInfirmier)
        tvEmailError    = findViewById(R.id.tvEmailErrorInfirmier)
        tvPasswordError = findViewById(R.id.tvPasswordErrorInfirmier)
        configureRoleSelector()

        btnLogin.setOnClickListener { handleLogin() }

        etEmail.setOnFocusChangeListener    { _, _ -> tvEmailError.visibility    = View.GONE }
        etPassword.setOnFocusChangeListener { _, _ -> tvPasswordError.visibility = View.GONE }
        etPassword.setOnEditorActionListener { _, _, _ -> handleLogin(); true }

        authViewModel.isLoading.observe(this) { isLoading ->
            btnLogin.isEnabled = !isLoading
            btnLogin.text = if (isLoading) "CONNEXION..." else "SE CONNECTER"
        }
        authViewModel.loginResult.observe(this) { result ->
            result.fold(
                onSuccess = { user ->
                    if (user.role.lowercase() != "infirmier") {
                        authViewModel.logout()
                        tvEmailError.text = "Utilisez l'espace Admin pour ce compte."
                        tvEmailError.visibility = View.VISIBLE
                        return@fold
                    }
                    val intent = Intent(this, MainInfirmierActivity::class.java)
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
                    startActivity(intent)
                    finish()
                },
                onFailure = { error ->
                    tvPasswordError.text = error.message ?: "Connexion impossible."
                    tvPasswordError.visibility = View.VISIBLE
                }
            )
        }
    }

    private fun configureRoleSelector() {
        val nurseButton = findViewById<MaterialButton>(R.id.btnRoleInfirmier)
        val adminButton = findViewById<MaterialButton>(R.id.btnRoleAdmin)
        styleRoleButton(nurseButton, selected = true)
        styleRoleButton(adminButton, selected = false)
        adminButton.setOnClickListener {
            startActivity(Intent(this, MainActivity::class.java))
            finish()
        }
    }

    private fun styleRoleButton(button: MaterialButton, selected: Boolean) {
        button.backgroundTintList = ColorStateList.valueOf(
            getColor(if (selected) R.color.brand_teal else android.R.color.transparent)
        )
        button.setTextColor(getColor(if (selected) R.color.white else R.color.text_secondary))
    }

    private fun handleLogin() {
        val cin = etEmail.text.toString().trim()
        val password = etPassword.text.toString()

        tvEmailError.visibility    = View.GONE
        tvPasswordError.visibility = View.GONE

        if (cin.isEmpty()) {
            tvEmailError.text = "Veuillez entrer votre CIN."
            tvEmailError.visibility = View.VISIBLE
            return
        }

        if (password.isEmpty()) {
            tvPasswordError.text = "Veuillez entrer votre mot de passe."
            tvPasswordError.visibility = View.VISIBLE
            return
        }

        authViewModel.login(cin, password)
    }
}
