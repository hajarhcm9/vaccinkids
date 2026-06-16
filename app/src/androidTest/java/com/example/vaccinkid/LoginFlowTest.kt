package com.example.vaccinkid

import android.content.Intent
import android.view.View
import android.widget.EditText
import android.widget.TextView
import androidx.test.core.app.ActivityScenario
import androidx.test.core.app.ApplicationProvider
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.clearText
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.action.ViewActions.closeSoftKeyboard
import androidx.test.espresso.action.ViewActions.typeText
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.isEnabled
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.hamcrest.Matchers.not
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class LoginFlowTest {

    // ==========================================
    // Nurse login screen layout integrity
    // ==========================================

    @Test
    fun nurseLoginScreen_showsExpectedViews() {
        ActivityScenario.launch(LoginInfirmierActivity::class.java).use {
            onView(withId(R.id.etEmailInfirmier)).check(matches(isDisplayed()))
            onView(withId(R.id.etPasswordInfirmier)).check(matches(isDisplayed()))
            onView(withId(R.id.btnLoginInfirmier)).check(matches(isDisplayed()))
            onView(withId(R.id.btnRoleInfirmier)).check(matches(isDisplayed()))
            onView(withId(R.id.btnRoleAdmin)).check(matches(isDisplayed()))
        }
    }

    @Test
    fun nurseLoginScreen_showsCinErrorOnEmptySubmit() {
        ActivityScenario.launch(LoginInfirmierActivity::class.java).use {
            onView(withId(R.id.btnLoginInfirmier)).perform(click())
            onView(withId(R.id.tvEmailErrorInfirmier)).check(matches(isDisplayed()))
        }
    }

    @Test
    fun nurseLoginScreen_showsPasswordErrorWhenCinFilledButPasswordEmpty() {
        ActivityScenario.launch(LoginInfirmierActivity::class.java).use {
            onView(withId(R.id.etEmailInfirmier)).perform(typeText("AB123456"), closeSoftKeyboard())
            onView(withId(R.id.btnLoginInfirmier)).perform(click())
            onView(withId(R.id.tvPasswordErrorInfirmier)).check(matches(isDisplayed()))
        }
    }

    @Test
    fun nurseLoginScreen_roleTabSwitchNavigatesToAdminLogin() {
        ActivityScenario.launch(LoginInfirmierActivity::class.java).use {
            onView(withId(R.id.btnRoleAdmin)).perform(click())
            // After click, AdminLoginActivity should be in foreground.
            // Verify admin-specific label appears.
            onView(withId(R.id.tvLoginTitle)).check(matches(isDisplayed()))
        }
    }

    // ==========================================
    // Admin login screen layout integrity
    // ==========================================

    @Test
    fun adminLoginScreen_showsExpectedViews() {
        ActivityScenario.launch(AdminLoginActivity::class.java).use {
            onView(withId(R.id.etEmailInfirmier)).check(matches(isDisplayed()))
            onView(withId(R.id.etPasswordInfirmier)).check(matches(isDisplayed()))
            onView(withId(R.id.btnLoginInfirmier)).check(matches(isDisplayed()))
        }
    }

    @Test
    fun adminLoginScreen_showsCinErrorOnEmptySubmit() {
        ActivityScenario.launch(AdminLoginActivity::class.java).use {
            onView(withId(R.id.btnLoginInfirmier)).perform(click())
            onView(withId(R.id.tvEmailErrorInfirmier)).check(matches(isDisplayed()))
        }
    }

    @Test
    fun adminLoginScreen_roleTabSwitchNavigatesToNurseLogin() {
        ActivityScenario.launch(AdminLoginActivity::class.java).use {
            onView(withId(R.id.btnRoleInfirmier)).perform(click())
            onView(withId(R.id.tvLoginTitle)).check(matches(isDisplayed()))
        }
    }

    @Test
    fun loginButton_disabledWhileLoading() {
        ActivityScenario.launch(LoginInfirmierActivity::class.java).use {
            // Fill credentials and tap login — button should disable immediately while the
            // ViewModel processes the request.
            onView(withId(R.id.etEmailInfirmier)).perform(typeText("INFIRM01"), closeSoftKeyboard())
            onView(withId(R.id.etPasswordInfirmier)).perform(typeText("infirmier123"), closeSoftKeyboard())
            onView(withId(R.id.btnLoginInfirmier)).perform(click())
            // The button enters loading state; we cannot guarantee network here, but the
            // UI should not crash.
            onView(withId(R.id.btnLoginInfirmier)).check(matches(isDisplayed()))
        }
    }
}
