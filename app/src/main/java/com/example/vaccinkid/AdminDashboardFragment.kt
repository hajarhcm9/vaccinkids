package com.example.vaccinkid

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.example.vaccinkid.model.DashboardStatsDto
import com.example.vaccinkid.network.ApiClient
import com.example.vaccinkid.network.TokenManager
import com.google.android.material.card.MaterialCardView
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.progressindicator.LinearProgressIndicator
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

class AdminDashboardFragment : Fragment(R.layout.fragment_admin_dashboard) {

    private lateinit var refreshView: SwipeRefreshLayout

    // Header
    private lateinit var tvAdminAvatarInitials: TextView
    private lateinit var tvAdminGreeting: TextView
    private lateinit var tvAdminName: TextView
    private lateinit var tvAdminDateBadge: TextView
    private lateinit var tvAdminPeriod: TextView
    private lateinit var tvLastUpdated: TextView

    // KPI strip
    private lateinit var totalVaccinesView: TextView
    private lateinit var centresCountView: TextView
    private lateinit var staffCountView: TextView
    private lateinit var sessionsCountView: TextView
    private lateinit var cvKpiCentres: MaterialCardView
    private lateinit var cvKpiStaff: MaterialCardView
    private lateinit var cvKpiSessions: MaterialCardView

    // Alert banner
    private lateinit var alertBanner: LinearLayout
    private lateinit var alertBannerText: TextView

    // Quick actions
    private lateinit var cvQuickAlertesStock: LinearLayout
    private lateinit var cvQuickRetards: LinearLayout
    private lateinit var cvQuickRdv: LinearLayout
    private lateinit var cvQuickSearch: LinearLayout

    // Stats progress
    private lateinit var tvStatPresentsCount: TextView
    private lateinit var tvStatConfirmesCount: TextView
    private lateinit var tvStatEnAttenteCount: TextView
    private lateinit var tvStatAbsentsCount: TextView
    private lateinit var progressStatPresents: LinearProgressIndicator
    private lateinit var progressStatConfirmes: LinearProgressIndicator
    private lateinit var progressStatEnAttente: LinearProgressIndicator
    private lateinit var progressStatAbsents: LinearProgressIndicator

    // Bilan global
    private lateinit var tvStatBebes: TextView
    private lateinit var tvStatParents: TextView

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        bindViews(view)
        setupQuickActions()
        loadDashboard()
    }

    private fun bindViews(view: View) {
        refreshView             = view.findViewById(R.id.adminRefresh)
        tvAdminAvatarInitials   = view.findViewById(R.id.tvAdminAvatarInitials)
        tvAdminGreeting         = view.findViewById(R.id.tvAdminGreeting)
        tvAdminName             = view.findViewById(R.id.tvAdminName)
        tvAdminDateBadge        = view.findViewById(R.id.tvAdminDateBadge)
        tvAdminPeriod           = view.findViewById(R.id.tvAdminPeriod)
        tvLastUpdated           = view.findViewById(R.id.tvLastUpdated)
        totalVaccinesView       = view.findViewById(R.id.tvTotalVaccines)
        centresCountView        = view.findViewById(R.id.tvKpiCentres)
        staffCountView          = view.findViewById(R.id.tvKpiStaff)
        sessionsCountView       = view.findViewById(R.id.tvKpiSessions)
        cvKpiCentres            = view.findViewById(R.id.cvKpiCentres)
        cvKpiStaff              = view.findViewById(R.id.cvKpiStaff)
        cvKpiSessions           = view.findViewById(R.id.cvKpiSessions)
        alertBanner             = view.findViewById(R.id.llAlertBanner)
        alertBannerText         = view.findViewById(R.id.tvAlertBannerText)
        cvQuickAlertesStock     = view.findViewById(R.id.cvQuickAlertesStock)
        cvQuickRetards          = view.findViewById(R.id.cvQuickRetards)
        cvQuickRdv              = view.findViewById(R.id.cvQuickRdv)
        cvQuickSearch           = view.findViewById(R.id.cvQuickSearch)
        tvStatPresentsCount     = view.findViewById(R.id.tvStatPresentsCount)
        tvStatConfirmesCount    = view.findViewById(R.id.tvStatConfirmesCount)
        tvStatEnAttenteCount    = view.findViewById(R.id.tvStatEnAttenteCount)
        tvStatAbsentsCount      = view.findViewById(R.id.tvStatAbsentsCount)
        progressStatPresents    = view.findViewById(R.id.progressStatPresents)
        progressStatConfirmes   = view.findViewById(R.id.progressStatConfirmes)
        progressStatEnAttente   = view.findViewById(R.id.progressStatEnAttente)
        progressStatAbsents     = view.findViewById(R.id.progressStatAbsents)
        tvStatBebes             = view.findViewById(R.id.tvStatBebes)
        tvStatParents           = view.findViewById(R.id.tvStatParents)

        refreshView.setOnRefreshListener { loadDashboard() }
        view.findViewById<View>(R.id.btnAdminLogout).setOnClickListener { confirmLogout() }

        // Date badge
        val cal = Calendar.getInstance()
        val days = listOf("Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi")
        val months = listOf("Janvier","Février","Mars","Avril","Mai","Juin",
                            "Juillet","Août","Septembre","Octobre","Novembre","Décembre")
        tvAdminDateBadge.text = "${days[cal.get(Calendar.DAY_OF_WEEK) - 1]} ${cal.get(Calendar.DAY_OF_MONTH)} ${months[cal.get(Calendar.MONTH)]}"
        tvAdminPeriod.text    = "${months[cal.get(Calendar.MONTH)]} ${cal.get(Calendar.YEAR)}"

        // Greeting (set early; correct time-of-day value)
        val hour = cal.get(Calendar.HOUR_OF_DAY)
        tvAdminGreeting.text = when {
            hour < 12 -> "Bonjour,"
            hour < 18 -> "Bon après-midi,"
            else      -> "Bonsoir,"
        }

        // Loading placeholders
        totalVaccinesView.text    = "—"
        centresCountView.text     = "—"
        staffCountView.text       = "—"
        sessionsCountView.text    = "—"
        tvStatPresentsCount.text  = "—"
        tvStatConfirmesCount.text = "—"
        tvStatEnAttenteCount.text = "—"
        tvStatAbsentsCount.text   = "—"
        tvStatBebes.text          = "—"
        tvStatParents.text        = "—"
        tvLastUpdated.text        = "—"
    }

    private fun setupQuickActions() {
        cvQuickAlertesStock.setOnClickListener {
            (activity as? AdminActivity)?.naviguerVers(AdminAlertesFragment())
        }
        cvQuickRetards.setOnClickListener {
            (activity as? AdminActivity)?.naviguerVers(AdminDelayAlertsFragment())
        }
        cvQuickRdv.setOnClickListener {
            (activity as? AdminActivity)?.naviguerVers(AdminRendezVousFragment())
        }
        cvQuickSearch.setOnClickListener {
            (activity as? AdminActivity)?.naviguerVers(AdminSearchFragment())
        }
        cvKpiCentres.setOnClickListener {
            (activity as? AdminActivity)?.naviguerVers(AdminSearchFragment())
        }
        cvKpiStaff.setOnClickListener {
            (activity as? AdminActivity)?.naviguerVers(GestionPersonnelFragment())
        }
        cvKpiSessions.setOnClickListener {
            (activity as? AdminActivity)?.naviguerVers(GestionSessionsFragment())
        }
        alertBanner.setOnClickListener {
            (activity as? AdminActivity)?.naviguerVers(AdminAlertesFragment())
        }
    }

    // ── Data loading ─────────────────────────────────────────────────────────

    private fun loadDashboard() {
        refreshView.isRefreshing = true
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val (statsResponse, meResponse) = coroutineScope {
                    val s = async { ApiClient.apiService.getDashboardStats() }
                    val m = async { runCatching { ApiClient.apiService.getMe() }.getOrNull() }
                    s.await() to m.await()
                }

                // Admin name + initials
                val user = meResponse?.data?.user
                val prenom = user?.prenom?.trim().orEmpty()
                val nom    = user?.nom?.trim().orEmpty()
                val displayName = listOfNotNull(prenom.ifBlank { null }, nom.ifBlank { null })
                    .joinToString(" ").ifBlank { "Administrateur" }
                tvAdminName.text          = displayName
                tvAdminAvatarInitials.text = buildInitials(prenom, nom)

                // Stats
                val stats = statsResponse.data
                if (statsResponse.status == "success" && stats != null) {
                    totalVaccinesView.text = formatCount(stats.totalVaccinations)
                    centresCountView.text  = formatCount(stats.centresActifs)
                    staffCountView.text    = formatCount(stats.totalPersonnel)
                    sessionsCountView.text = formatCount(stats.sessionsAVenir)
                    tvStatBebes.text       = formatCount(stats.totalBebes)
                    tvStatParents.text     = formatCount(stats.totalParents)
                    updateStatsProgress(stats)
                    updateAlertBanner(stats)
                }

                tvLastUpdated.text = SimpleDateFormat("HH:mm", Locale.FRANCE).format(Date())

            } catch (e: Exception) {
                com.google.android.material.snackbar.Snackbar
                    .make(requireView(), e.message ?: "Tableau de bord indisponible",
                          com.google.android.material.snackbar.Snackbar.LENGTH_LONG)
                    .show()
            } finally {
                refreshView.isRefreshing = false
            }
        }
    }

    // ── Stats progress bars ───────────────────────────────────────────────────

    private fun updateStatsProgress(stats: DashboardStatsDto) {
        val presents  = stats.rdvPresents  ?: 0
        val confirmes = stats.rdvConfirmes ?: 0
        val enAttente = stats.rdvEnAttente ?: 0
        val absents   = stats.rdvAbsents   ?: 0
        val total     = (presents + confirmes + enAttente + absents).coerceAtLeast(1)

        tvStatPresentsCount.text  = presents.toString()
        tvStatConfirmesCount.text = confirmes.toString()
        tvStatEnAttenteCount.text = enAttente.toString()
        tvStatAbsentsCount.text   = absents.toString()

        progressStatPresents.max  = total
        progressStatConfirmes.max = total
        progressStatEnAttente.max = total
        progressStatAbsents.max   = total

        progressStatPresents.setProgressCompat(presents, true)
        progressStatConfirmes.setProgressCompat(confirmes, true)
        progressStatEnAttente.setProgressCompat(enAttente, true)
        progressStatAbsents.setProgressCompat(absents, true)
    }

    // ── Alert banner ──────────────────────────────────────────────────────────

    private fun updateAlertBanner(stats: DashboardStatsDto) {
        val stockAlerts = stats.alertesStock ?: 0
        if (stockAlerts > 0) {
            alertBanner.visibility = View.VISIBLE
            alertBannerText.text = "$stockAlerts alerte(s) de stock critique — Voir →"
        } else {
            alertBanner.visibility = View.GONE
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun buildInitials(prenom: String, nom: String): String {
        val p = prenom.firstOrNull()?.uppercaseChar()
        val n = nom.firstOrNull()?.uppercaseChar()
        return when {
            p != null && n != null -> "$p$n"
            p != null              -> "$p"
            n != null              -> "$n"
            else                   -> "A"
        }
    }

    private fun formatCount(value: Int?): String = value?.toString() ?: "0"

    // ── Logout ────────────────────────────────────────────────────────────────

    private fun confirmLogout() {
        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Déconnexion")
            .setMessage("Voulez-vous fermer la session administrateur ?")
            .setNegativeButton("Annuler", null)
            .setPositiveButton("Déconnexion") { _, _ -> doLogout() }
            .show()
    }

    private fun doLogout() {
        viewLifecycleOwner.lifecycleScope.launch {
            val refreshToken = TokenManager.getRefreshToken()
            try { ApiClient.apiService.logout(mapOf("refreshToken" to refreshToken)) } catch (_: Exception) {}
            finally {
                TokenManager.clearTokens()
                startActivity(Intent(requireContext(), AdminLoginActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                })
            }
        }
    }
}
