package com.example.vaccinkid

import android.os.Bundle

class LoginInfirmierActivity : BaseLoginActivity() {

    override val expectedRole = "infirmier"
    override val errorWrongRole = R.string.error_admin_only
    override val destinationActivity = MainInfirmierActivity::class.java
    override val isAdminTab = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setupViews()
        findViewById<android.widget.TextView>(R.id.tvLoginTitle).text =
            getString(R.string.login_nurse_title)
        findViewById<android.widget.TextView>(R.id.tvLoginAccessBadge).text =
            getString(R.string.login_nurse_badge)
    }
}
