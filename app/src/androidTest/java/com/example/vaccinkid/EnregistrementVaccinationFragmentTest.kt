package com.example.vaccinkid

import android.os.Bundle
import android.view.View
import android.widget.EditText
import android.widget.TextView
import androidx.fragment.app.testing.launchFragmentInContainer
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.clearText
import androidx.test.espresso.action.ViewActions.closeSoftKeyboard
import androidx.test.espresso.action.ViewActions.typeText
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.isEnabled
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.hamcrest.Matchers.not
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Nurse clinical action: recording a vaccination.
 * These tests run without a live backend — the fragment's own guard logic
 * (invalid rdvId / sessionId) is sufficient to exercise most paths.
 */
@RunWith(AndroidJUnit4::class)
class EnregistrementVaccinationFragmentTest {

    private fun launchWithArgs(
        nomBebe: String = "Youssef Amine",
        idBebe: String = "bebe-001",
        rdvId: Int = 0,
        sessionId: Int = 0
    ) = launchFragmentInContainer<EnregistrementVaccinationFragment>(
        themeResId = R.style.Theme_Vaccinkid,
        fragmentArgs = Bundle().apply {
            putString("nomBebe", nomBebe)
            putString("idBebe", idBebe)
            putInt("rdvId", rdvId)
            putInt("sessionId", sessionId)
        }
    )

    // ------------------------------------------------------------------
    // Layout integrity — all clinical form fields must be present
    // ------------------------------------------------------------------

    @Test
    fun vaccinationFormDisplaysAllInputFields() {
        val scenario = launchWithArgs()

        scenario.onFragment { fragment ->
            val view = requireNotNull(fragment.view)
            assertNotNull(view.findViewById<View>(R.id.spinnerVaccin))
            assertNotNull(view.findViewById<View>(R.id.etPoids))
            assertNotNull(view.findViewById<View>(R.id.etTaille))
            assertNotNull(view.findViewById<View>(R.id.etReactions))
            assertNotNull(view.findViewById<View>(R.id.btnNextReg))
            assertNotNull(view.findViewById<View>(R.id.regMessage))
            assertNotNull(view.findViewById<View>(R.id.btnBackEnregistrement))
        }
    }

    @Test
    fun patientNameIsBoundFromArguments() {
        val scenario = launchWithArgs(nomBebe = "Amira Benali")

        scenario.onFragment { fragment ->
            val nameView = requireNotNull(fragment.view)
                .findViewById<TextView>(R.id.tvRegPatientName)
            assertEquals("Amira Benali", nameView.text.toString())
        }
    }

    // ------------------------------------------------------------------
    // Guard: submit disabled when session/rdv IDs are missing (no network)
    // ------------------------------------------------------------------

    @Test
    fun submitButtonDisabledWithoutValidSessionOrRdv() {
        // rdvId=0 and sessionId=0 triggers the guard in onViewCreated
        val scenario = launchWithArgs(rdvId = 0, sessionId = 0)

        scenario.onFragment { fragment ->
            val btn = requireNotNull(fragment.view).findViewById<View>(R.id.btnNextReg)
            assertFalse("submit must be disabled without a valid session/rdv", btn.isEnabled)
        }
    }

    @Test
    fun restrictedMessageShownWithoutValidSessionOrRdv() {
        val scenario = launchWithArgs(rdvId = 0, sessionId = 0)

        scenario.onFragment { fragment ->
            val msg = requireNotNull(fragment.view).findViewById<TextView>(R.id.regMessage)
            assertEquals("Action restreinte aux RDV de session.", msg.text.toString())
        }
    }

    // ------------------------------------------------------------------
    // Espresso: form interaction
    // ------------------------------------------------------------------

    @Test
    fun poidsAndTailleFieldsAcceptNumericInput() {
        launchWithArgs(rdvId = 0, sessionId = 0)

        onView(withId(R.id.etPoids)).perform(typeText("8.5"), closeSoftKeyboard())
        onView(withId(R.id.etTaille)).perform(typeText("72"), closeSoftKeyboard())

        onView(withId(R.id.etPoids)).check(matches(isDisplayed()))
        onView(withId(R.id.etTaille)).check(matches(isDisplayed()))
    }

    @Test
    fun reactionsFieldIsOptionalAndEditable() {
        launchWithArgs(rdvId = 0, sessionId = 0)

        onView(withId(R.id.etReactions)).perform(
            typeText("Légère rougeur au site d'injection"),
            closeSoftKeyboard()
        )
        onView(withId(R.id.etReactions)).check(matches(isDisplayed()))
    }

    @Test
    fun backButtonIsDisplayed() {
        launchWithArgs()
        onView(withId(R.id.btnBackEnregistrement)).check(matches(isDisplayed()))
    }
}
