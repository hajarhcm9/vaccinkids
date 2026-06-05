package com.example.vaccinkid

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import com.example.vaccinkid.viewmodel.InfirmierAuthViewModel

class MainActivity : AppCompatActivity() {

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
                    val destination = when (user.role.lowercase()) {
                        "admin" -> AdminActivity::class.java
                        "infirmier" -> MainInfirmierActivity::class.java
                        else -> null
                    }
                    if (destination == null) {
                        authViewModel.logout()
                        tvEmailError.text = "Role non autorise pour cette application."
                        tvEmailError.visibility = View.VISIBLE
                        return@fold
                    }
                    val intent = Intent(this, destination)
                    intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
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
