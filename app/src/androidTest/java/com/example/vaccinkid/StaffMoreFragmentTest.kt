package com.example.vaccinkid

import android.view.View
import androidx.fragment.app.testing.launchFragmentInContainer
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertNotNull
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class StaffMoreFragmentTest {
    @Test
    fun moreScreenExposesProfileToolsAndLogout() {
        val scenario = launchFragmentInContainer<StaffMoreFragment>(themeResId = R.style.Theme_Vaccinkid)

        scenario.onFragment { fragment ->
            val view = requireNotNull(fragment.view)
            assertNotNull(view.findViewById<View>(R.id.moreUserName))
            assertNotNull(view.findViewById<View>(R.id.moreNotifications))
            assertNotNull(view.findViewById<View>(R.id.moreStock))
            assertNotNull(view.findViewById<View>(R.id.moreLogout))
        }
    }
}
