package com.example.vaccinkid

import android.view.View
import androidx.fragment.app.testing.launchFragmentInContainer
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class AdminDashboardFragmentTest {

    @Test
    fun adminDashboardDisplaysAllKpiCards() {
        val scenario = launchFragmentInContainer<AdminDashboardFragment>(
            themeResId = R.style.Theme_Vaccinkid
        )

        scenario.onFragment { fragment ->
            val view = requireNotNull(fragment.view)
            // KPI cards must be wired up
            assertNotNull(view.findViewById<View>(R.id.tvTotalVaccines))
            assertNotNull(view.findViewById<View>(R.id.tvKpiCentres))
            assertNotNull(view.findViewById<View>(R.id.tvKpiStaff))
            assertNotNull(view.findViewById<View>(R.id.tvKpiSessions))
            // Activity feed container
            assertNotNull(view.findViewById<View>(R.id.llAdminActivities))
        }
    }

    @Test
    fun adminDashboardSupportsPullToRefresh() {
        val scenario = launchFragmentInContainer<AdminDashboardFragment>(
            themeResId = R.style.Theme_Vaccinkid
        )

        scenario.onFragment { fragment ->
            val refresh = requireNotNull(fragment.view)
                .findViewById<SwipeRefreshLayout>(R.id.adminRefresh)
            assertTrue(refresh.isEnabled)
            assertNotNull(refresh.getChildAt(0))
        }
    }

    @Test
    fun adminDashboardExposesLogoutButton() {
        val scenario = launchFragmentInContainer<AdminDashboardFragment>(
            themeResId = R.style.Theme_Vaccinkid
        )

        scenario.onFragment { fragment ->
            val view = requireNotNull(fragment.view)
            assertNotNull(view.findViewById<View>(R.id.btnAdminLogout))
        }
    }

    @Test
    fun adminDashboardBarChartIsPresent() {
        val scenario = launchFragmentInContainer<AdminDashboardFragment>(
            themeResId = R.style.Theme_Vaccinkid
        )

        scenario.onFragment { fragment ->
            val view = requireNotNull(fragment.view)
            assertNotNull(view.findViewById<View>(R.id.barChartSummary))
        }
    }
}
