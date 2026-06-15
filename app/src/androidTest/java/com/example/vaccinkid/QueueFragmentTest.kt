package com.example.vaccinkid

import android.view.View
import androidx.fragment.app.testing.launchFragmentInContainer
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertNotNull
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class QueueFragmentTest {
    @Test
    fun queueScreenExposesTabsListRefreshAndCallAction() {
        val scenario = launchFragmentInContainer<QueueFragment>(themeResId = R.style.Theme_Vaccinkid)

        scenario.onFragment { fragment ->
            val view = requireNotNull(fragment.view)
            assertNotNull(view.findViewById<View>(R.id.queueWaitingTab))
            assertNotNull(view.findViewById<View>(R.id.queueCalledTab))
            assertNotNull(view.findViewById<View>(R.id.queueList))
            assertNotNull(view.findViewById<View>(R.id.queueCallNext))
        }
    }
}
