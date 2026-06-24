package com.example.vaccinkid

import android.animation.ObjectAnimator
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.view.animation.AccelerateDecelerateInterpolator
import android.view.animation.DecelerateInterpolator
import android.view.animation.OvershootInterpolator
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.example.vaccinkid.network.TokenManager
import com.google.android.material.button.MaterialButton
import com.google.android.material.dialog.MaterialAlertDialogBuilder

class WelcomeActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Redirect if already logged in
        if (TokenManager.isLoggedIn()) {
            val role = TokenManager.getUserRole()
            val dest = if (role?.lowercase() == "admin") AdminActivity::class.java
                       else MainInfirmierActivity::class.java
            startActivity(Intent(this, dest))
            finish()
            return
        }

        // Edge-to-edge — light status bar (dark icons on light bg)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.statusBarColor = Color.TRANSPARENT
        WindowInsetsControllerCompat(window, window.decorView).apply {
            isAppearanceLightStatusBars = true
        }

        setContentView(R.layout.activity_welcome)

        val llLogo      = findViewById<LinearLayout>(R.id.llWelcomeLogo)
        val tvTitle     = findViewById<TextView>(R.id.tvWelcomeTitle)
        val tvSubtitle  = findViewById<TextView>(R.id.tvWelcomeSubtitle)
        val vHeart      = findViewById<View>(R.id.vIllustrationHeart)
        val ivHero      = findViewById<ImageView>(R.id.ivHeroIllustration)
        val btnStart    = findViewById<MaterialButton>(R.id.btnCommencer)
        val tvMore      = findViewById<TextView>(R.id.tvEnSavoirPlus)
        val llDots      = findViewById<LinearLayout>(R.id.llPaginationDots)

        // Debug shortcut: long-press illustration → diagnostics
        if (BuildConfig.DEBUG) {
            ivHero.setOnLongClickListener {
                startActivity(Intent(this, ApiDiagnosticsActivity::class.java))
                true
            }
        }

        // Actions
        btnStart.setOnClickListener {
            btnStart.animate().scaleX(0.94f).scaleY(0.94f).setDuration(80)
                .withEndAction {
                    btnStart.animate().scaleX(1f).scaleY(1f).setDuration(120).start()
                    RoleSelectionSheet().show(supportFragmentManager, "roles")
                }.start()
        }

        tvMore.setOnClickListener { showAppInfoDialog() }

        // Entrance + floating animations
        runEntranceAnimations(llLogo, tvTitle, tvSubtitle, vHeart, ivHero, btnStart, tvMore, llDots)
    }

    // ── Animations ────────────────────────────────────────────────────────────

    private fun runEntranceAnimations(
        llLogo:     View,
        tvTitle:    View,
        tvSubtitle: View,
        vHeart:     View,
        ivHero:     ImageView,
        btnStart:   View,
        tvMore:     View,
        llDots:     View
    ) {
        val decel     = DecelerateInterpolator()
        val overshoot = OvershootInterpolator(1.2f)
        val dp        = resources.displayMetrics.density

        // Initial states
        llLogo.alpha     = 0f
        llLogo.translationY = -20f * dp
        tvTitle.alpha    = 0f
        tvTitle.translationY = 16f * dp
        tvSubtitle.alpha = 0f
        tvSubtitle.translationY = 16f * dp
        vHeart.alpha     = 0f
        vHeart.scaleX    = 0.5f
        vHeart.scaleY    = 0.5f
        ivHero.alpha     = 0f
        ivHero.scaleX    = 0.70f
        ivHero.scaleY    = 0.70f
        ivHero.translationY = 24f * dp
        btnStart.alpha   = 0f
        btnStart.translationY = 18f * dp
        tvMore.alpha     = 0f
        llDots.alpha     = 0f

        // 1. Logo slides down from top (t=0, 550ms)
        llLogo.animate()
            .alpha(1f).translationY(0f)
            .setDuration(550).setInterpolator(decel).start()

        // 2. Heart expands (t=120ms, 650ms, overshoot)
        vHeart.animate()
            .alpha(1f).scaleX(1f).scaleY(1f)
            .setStartDelay(120).setDuration(650).setInterpolator(overshoot).start()

        // 3. Illustration pops in (t=220ms, 700ms)
        ivHero.animate()
            .alpha(1f).scaleX(1f).scaleY(1f).translationY(0f)
            .setStartDelay(220).setDuration(700).setInterpolator(overshoot).start()

        // 4. Title fades up (t=380ms, 500ms)
        tvTitle.animate()
            .alpha(1f).translationY(0f)
            .setStartDelay(380).setDuration(500).setInterpolator(decel).start()

        // 5. Subtitle fades up (t=480ms, 500ms)
        tvSubtitle.animate()
            .alpha(1f).translationY(0f)
            .setStartDelay(480).setDuration(500).setInterpolator(decel).start()

        // 6. CTA button slides up (t=620ms, 520ms)
        btnStart.animate()
            .alpha(1f).translationY(0f)
            .setStartDelay(620).setDuration(520).setInterpolator(decel).start()

        // 7. Links + dots fade in (t=760ms, 400ms)
        tvMore.animate()
            .alpha(1f)
            .setStartDelay(760).setDuration(400).setInterpolator(decel).start()

        llDots.animate()
            .alpha(1f)
            .setStartDelay(820).setDuration(400).setInterpolator(decel).start()

        // 8. Floating loop on illustration (starts t=1050ms)
        ivHero.postDelayed({
            ObjectAnimator.ofFloat(ivHero, "translationY", 0f, -(14f * dp)).apply {
                duration = 2800
                repeatCount = ObjectAnimator.INFINITE
                repeatMode = ObjectAnimator.REVERSE
                interpolator = AccelerateDecelerateInterpolator()
            }.start()
        }, 1050)

        // 9. Gentle pulse on heart glow (starts t=1200ms)
        ivHero.postDelayed({
            ObjectAnimator.ofFloat(vHeart, "scaleX", 1f, 1.06f).apply {
                duration = 3200
                repeatCount = ObjectAnimator.INFINITE
                repeatMode = ObjectAnimator.REVERSE
                interpolator = AccelerateDecelerateInterpolator()
            }.start()
            ObjectAnimator.ofFloat(vHeart, "scaleY", 1f, 1.06f).apply {
                duration = 3200
                repeatCount = ObjectAnimator.INFINITE
                repeatMode = ObjectAnimator.REVERSE
                interpolator = AccelerateDecelerateInterpolator()
            }.start()
        }, 1200)
    }

    private fun showAppInfoDialog() {
        MaterialAlertDialogBuilder(this)
            .setTitle("VaccinKids Staff")
            .setMessage(
                "VaccinKids Staff est une application de gestion des campagnes de vaccination pédiatrique.\n\n" +
                "• Gestion des rendez-vous\n" +
                "• Suivi des vaccinations\n" +
                "• Gestion des stocks de vaccins\n" +
                "• Scanner QR pour les dossiers\n" +
                "• File d'attente en temps réel\n\n" +
                "Conçue pour les infirmiers et administrateurs de centres de santé."
            )
            .setPositiveButton("Commencer") { _, _ ->
                RoleSelectionSheet().show(supportFragmentManager, "roles")
            }
            .setNegativeButton("Fermer", null)
            .show()
    }
}
