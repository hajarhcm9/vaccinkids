package com.example.vaccinkid

import androidx.fragment.app.testing.launchFragmentInContainer
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.swipeDown
import androidx.test.espresso.action.ViewActions.scrollTo
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.withContentDescription
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class DashboardFragmentTest {
    @Test
    fun dashboardShowsOperationalInformationAndQuickActions() {
        launchFragmentInContainer<DashboardFragment>(themeResId = R.style.Theme_Vaccinkid)

        onView(withText("Activite du jour")).check(matches(isDisplayed()))
        onView(withId(R.id.dashboardConfirmedCount)).check(matches(isDisplayed()))
        onView(withId(R.id.dashboardPresentCount)).check(matches(isDisplayed()))
        onView(withId(R.id.dashboardWaitingCount)).check(matches(isDisplayed()))
        onView(withId(R.id.dashboardAbsentCount)).check(matches(isDisplayed()))
        onView(withText("Actions rapides")).perform(scrollTo()).check(matches(isDisplayed()))
        onView(withContentDescription("Notifications staff")).check(matches(isDisplayed()))
        onView(withContentDescription("Se deconnecter")).check(matches(isDisplayed()))
    }

    @Test
    fun dashboardSupportsPullToRefresh() {
        launchFragmentInContainer<DashboardFragment>(themeResId = R.style.Theme_Vaccinkid)

        onView(withId(R.id.dashboardRefresh)).perform(swipeDown())
        onView(withId(R.id.dashboardRefresh)).check(matches(isDisplayed()))
    }
}
