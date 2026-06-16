package com.example.vaccinkid

import android.os.Bundle

class AdminLoginActivity : BaseLoginActivity() {

    override val expectedRole = "admin"
    override val errorWrongRole = R.string.error_nurse_only
    override val destinationActivity = AdminActivity::class.java
    override val isAdminTab = true

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setupViews()
        findViewById<android.widget.TextView>(R.id.tvLoginSpace).text =
            getString(R.string.role_admin).uppercase()
        findViewById<android.widget.TextView>(R.id.tvLoginTitle).text =
            getString(R.string.login_admin_title)
        findViewById<android.widget.TextView>(R.id.tvLoginAccessBadge).text =
            getString(R.string.login_admin_badge)
    }
}
