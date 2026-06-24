package com.example.vaccinkid

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import com.example.vaccinkid.model.UserDto
import com.example.vaccinkid.network.ApiClient
import com.example.vaccinkid.viewmodel.InfirmierAuthViewModel
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import kotlinx.coroutines.launch

class StaffMoreFragment : Fragment(R.layout.fragment_staff_more) {

    private lateinit var authViewModel: InfirmierAuthViewModel

    private lateinit var tvName:      TextView
    private lateinit var tvInitials:  TextView
    private lateinit var tvRole:      TextView
    private lateinit var tvCentre:    TextView
    private lateinit var tvPhone:     TextView
    private lateinit var ivPhoneIcon: ImageView
    private lateinit var tvMessage:   TextView
    private lateinit var llErrorBand: LinearLayout
    private lateinit var tvRetry:     TextView
    private lateinit var tvVersion:   TextView

    private var profileLoaded = false

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        authViewModel = ViewModelProvider(this)[InfirmierAuthViewModel::class.java]
        bindViews(view)
        bindActions(view)
        loadProfile(force = false)
    }

    override fun onResume() {
        super.onResume()
        // Refresh only if not yet loaded (avoid re-fetching on every tab switch)
        if (!profileLoaded) loadProfile(force = true)
    }

    private fun bindViews(view: View) {
        tvName      = view.findViewById(R.id.moreUserName)
        tvInitials  = view.findViewById(R.id.moreAvatarInitials)
        tvRole      = view.findViewById(R.id.moreUserRole)
        tvCentre    = view.findViewById(R.id.moreUserCentre)
        tvPhone     = view.findViewById(R.id.moreUserPhone)
        ivPhoneIcon = view.findViewById(R.id.morePhoneIcon)
        tvMessage   = view.findViewById(R.id.moreMessage)
        llErrorBand = view.findViewById(R.id.moreErrorBand)
        tvRetry     = view.findViewById(R.id.moreRetryBtn)
        tvVersion   = view.findViewById(R.id.moreAppVersion)

        tvVersion.text = "VaccinKids STAFF v${BuildConfig.VERSION_NAME}"
    }

    private fun bindActions(view: View) {
        view.findViewById<View>(R.id.moreNotifications).setOnClickListener {
            (activity as? MainInfirmierActivity)?.naviguerVers(StaffNotificationsFragment())
        }
        view.findViewById<View>(R.id.moreStock).setOnClickListener {
            startActivity(Intent(requireContext(), GestionStocksActivity::class.java))
        }
        view.findViewById<View>(R.id.moreScan).setOnClickListener {
            selectNav(R.id.nav_scan)
        }
        view.findViewById<View>(R.id.moreQueue).setOnClickListener {
            selectNav(R.id.nav_queue)
        }
        view.findViewById<View>(R.id.moreLogout).setOnClickListener { confirmLogout() }
        tvRetry.setOnClickListener { loadProfile(force = true) }
    }

    private fun loadProfile(force: Boolean) {
        if (!force && profileLoaded) return
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.getMe()
                val user = response.data?.user
                if (response.status != "success" || user == null) {
                    throw Exception(response.message ?: "Profil indisponible")
                }
                displayUser(user)
                llErrorBand.visibility = View.GONE
                profileLoaded = true
            } catch (error: Exception) {
                tvMessage.text = error.message ?: "Profil indisponible"
                llErrorBand.visibility = View.VISIBLE
            }
        }
    }

    private fun displayUser(user: UserDto) {
        val fullName = listOfNotNull(user.prenom, user.nom).joinToString(" ")
            .ifBlank { "Personnel #${user.id}" }

        val initials = buildString {
            user.prenom?.firstOrNull()?.uppercaseChar()?.let { append(it) }
            user.nom?.firstOrNull()?.uppercaseChar()?.let { append(it) }
        }.ifBlank { "?" }

        val roleLabel = when (user.role.uppercase()) {
            "INFIRMIER" -> "Infirmier(ère)"
            "MEDECIN"   -> "Médecin"
            "ADMIN"     -> "Administrateur"
            else        -> user.role
        }

        val centreLabel = user.centreNom
            ?: user.centreId?.let { "Centre #$it" }
            ?: "Aucun centre affecté"

        tvName.text     = fullName
        tvInitials.text = initials
        tvRole.text     = roleLabel
        tvCentre.text   = centreLabel

        val phone = user.telephone
        if (!phone.isNullOrBlank()) {
            tvPhone.text        = formatPhone(phone)
            tvPhone.visibility  = View.VISIBLE
            ivPhoneIcon.visibility = View.VISIBLE
        } else {
            tvPhone.visibility     = View.GONE
            ivPhoneIcon.visibility = View.GONE
        }
    }

    private fun confirmLogout() {
        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Se déconnecter ?")
            .setMessage("Vous devrez vous reconnecter pour accéder à l'application.")
            .setNegativeButton("Annuler", null)
            .setPositiveButton("Se déconnecter") { _, _ -> performLogout() }
            .show()
    }

    private fun performLogout() {
        profileLoaded = false
        authViewModel.logout {
            startActivity(
                Intent(requireContext(), LoginInfirmierActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                }
            )
        }
    }

    private fun selectNav(itemId: Int) {
        (activity as? MainInfirmierActivity)
            ?.findViewById<com.google.android.material.bottomnavigation.BottomNavigationView>(R.id.bottomNav)
            ?.selectedItemId = itemId
    }

    companion object {
        fun formatPhone(raw: String): String {
            val digits = raw.removePrefix("+212").removePrefix("0").filter { it.isDigit() }
            return if (digits.length == 9)
                "+212 ${digits[0]} ${digits.substring(1, 3)} ${digits.substring(3, 5)} ${digits.substring(5, 7)} ${digits.substring(7, 9)}"
            else raw
        }
    }
}
