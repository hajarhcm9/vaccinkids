package com.example.vaccinkid

import android.view.View
import androidx.fragment.app.testing.launchFragmentInContainer
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.google.android.material.chip.ChipGroup
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class RdvFragmentTest {
    @Test
    fun rdvScreenExposesFiltersActionsListAndRefresh() {
        val scenario = launchFragmentInContainer<RdvFragment>(themeResId = R.style.Theme_Vaccinkid)

        scenario.onFragment { fragment ->
            val view = requireNotNull(fragment.view)
            assertNotNull(view.findViewById<View>(R.id.rdvSessionSpinner))
            assertNotNull(view.findViewById<View>(R.id.rdvSearch))
            assertNotNull(view.findViewById<View>(R.id.rdvOpenQueue))
            assertNotNull(view.findViewById<View>(R.id.rdvOpenVials))
            assertNotNull(view.findViewById<View>(R.id.rdvList))
            assertTrue(view.findViewById<ChipGroup>(R.id.rdvStatusFilters).childCount >= 5)
            assertTrue(view.findViewById<SwipeRefreshLayout>(R.id.rdvRefresh).isEnabled)
        }
    }
}
