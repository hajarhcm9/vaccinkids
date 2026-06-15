package com.example.vaccinkid

import android.view.View
import androidx.fragment.app.testing.launchFragmentInContainer
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class DashboardFragmentTest {
    @Test
    fun dashboardShowsOperationalInformationAndQuickActions() {
        val scenario = launchFragmentInContainer<DashboardFragment>(themeResId = R.style.Theme_Vaccinkid)

        scenario.onFragment { fragment ->
            val view = requireNotNull(fragment.view)
            assertNotNull(view.findViewById<View>(R.id.dashboardConfirmedCount))
            assertNotNull(view.findViewById<View>(R.id.dashboardPresentCount))
            assertNotNull(view.findViewById<View>(R.id.dashboardWaitingCount))
            assertNotNull(view.findViewById<View>(R.id.dashboardAbsentCount))
            assertNotNull(view.findViewById<View>(R.id.dashboardOpenRdv))
            assertNotNull(view.findViewById<View>(R.id.dashboardOpenQueue))
            assertNotNull(view.findViewById<View>(R.id.dashboardOpenScan))
            assertEquals(
                "Notifications staff",
                view.findViewById<View>(R.id.dashboardNotifications).contentDescription
            )
            assertEquals(
                "Se deconnecter",
                view.findViewById<View>(R.id.dashboardLogout).contentDescription
            )
        }
    }

    @Test
    fun dashboardSupportsPullToRefresh() {
        val scenario = launchFragmentInContainer<DashboardFragment>(themeResId = R.style.Theme_Vaccinkid)

        scenario.onFragment { fragment ->
            val refresh = requireNotNull(fragment.view)
                .findViewById<SwipeRefreshLayout>(R.id.dashboardRefresh)
            assertTrue(refresh.isEnabled)
            assertNotNull(refresh.getChildAt(0))
        }
    }
}
