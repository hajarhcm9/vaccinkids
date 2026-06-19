package com.example.vaccinkid

import android.content.Intent
import android.content.res.ColorStateList
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import com.example.vaccinkid.network.ApiDiagnostics
import com.example.vaccinkid.viewmodel.InfirmierAuthViewModel
import com.google.android.material.button.MaterialButton
import java.net.ConnectException
import java.net.SocketTimeoutException
import java.net.UnknownHostException

abstract class BaseLoginActivity : AppCompatActivity() {

    protected lateinit var etCin: EditText
    protected lateinit var etPassword: EditText
    protected lateinit var btnLogin: Button
    protected lateinit var tvCinError: TextView
    protected lateinit var tvPasswordError: TextView
    protected lateinit var authViewModel: InfirmierAuthViewModel

    protected abstract val expectedRole: String
    protected abstract val errorWrongRole: Int
    protected abstract val destinationActivity: Class<*>
    protected abstract val isAdminTab: Boolean

    protected fun setupViews() {
        authViewModel = ViewModelProvider(this)[InfirmierAuthViewModel::class.java]
        setContentView(R.layout.activity_login_infirmier)

        etCin         = findViewById(R.id.etEmailInfirmier)
        etPassword    = findViewById(R.id.etPasswordInfirmier)
        btnLogin      = findViewById(R.id.btnLoginInfirmier)
        tvCinError    = findViewById(R.id.tvEmailErrorInfirmier)
        tvPasswordError = findViewById(R.id.tvPasswordErrorInfirmier)

        configureRoleSelector()

        btnLogin.setOnClickListener { handleLogin() }
        etCin.setOnFocusChangeListener     { _, _ -> tvCinError.visibility     = View.GONE }
        etPassword.setOnFocusChangeListener { _, _ -> tvPasswordError.visibility = View.GONE }
        etPassword.setOnEditorActionListener { _, _, _ -> handleLogin(); true }

        authViewModel.isLoading.observe(this) { loading ->
            btnLogin.isEnabled = !loading
            btnLogin.text = if (loading)
                getString(R.string.btn_login).uppercase() + "..."
            else
                getString(R.string.btn_login).uppercase()
        }

        authViewModel.loginResult.observe(this) { result ->
            result.fold(
                onSuccess = { user ->
                    if (user.role.lowercase() != expectedRole) {
                        authViewModel.logout()
                        tvCinError.text = getString(errorWrongRole)
                        tvCinError.visibility = View.VISIBLE
                        return@fold
                    }
                    startActivity(Intent(this, destinationActivity).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                    })
                    finish()
                },
                onFailure = { error ->
                    tvPasswordError.text = networkErrorMessage(error)
                    tvPasswordError.visibility = View.VISIBLE
                }
            )
        }
    }

    private fun configureRoleSelector() {
        val nurseButton = findViewById<MaterialButton>(R.id.btnRoleInfirmier)
        val adminButton = findViewById<MaterialButton>(R.id.btnRoleAdmin)
        styleRoleButton(nurseButton, selected = !isAdminTab)
        styleRoleButton(adminButton, selected = isAdminTab)
        if (isAdminTab) {
            nurseButton.setOnClickListener {
                startActivity(Intent(this, LoginInfirmierActivity::class.java))
                finish()
            }
        } else {
            adminButton.setOnClickListener {
                startActivity(Intent(this, AdminLoginActivity::class.java))
                finish()
            }
        }
    }

    private fun styleRoleButton(button: MaterialButton, selected: Boolean) {
        button.backgroundTintList = ColorStateList.valueOf(
            getColor(if (selected) R.color.brand_teal else android.R.color.transparent)
        )
        button.setTextColor(getColor(if (selected) R.color.white else R.color.text_secondary))
    }

    private fun networkErrorMessage(error: Throwable): String {
        val cause = error.cause ?: error
        return when {
            cause is ConnectException || cause is UnknownHostException -> {
                if (BuildConfig.DEBUG)
                    "Impossible de joindre le serveur.\n${ApiDiagnostics.apiBaseUrl}"
                else
                    getString(R.string.error_network_unreachable)
            }
            cause is SocketTimeoutException -> {
                if (BuildConfig.DEBUG)
                    "Délai d'attente dépassé.\n${ApiDiagnostics.apiBaseUrl}"
                else
                    getString(R.string.error_network_timeout)
            }
            else -> error.message ?: getString(R.string.error_invalid_credentials)
        }
    }

    protected fun handleLogin() {
        val cin      = etCin.text.toString().trim()
        val password = etPassword.text.toString()

        tvCinError.visibility      = View.GONE
        tvPasswordError.visibility = View.GONE

        if (cin.isEmpty()) {
            tvCinError.text      = getString(R.string.error_cin_empty)
            tvCinError.visibility = View.VISIBLE
            return
        }
        if (password.isEmpty()) {
            tvPasswordError.text      = getString(R.string.error_password_empty)
            tvPasswordError.visibility = View.VISIBLE
            return
        }
        authViewModel.login(cin, password)
    }
}
