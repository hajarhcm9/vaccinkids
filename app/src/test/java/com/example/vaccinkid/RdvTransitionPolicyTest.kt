package com.example.vaccinkid

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class RdvTransitionPolicyTest {
    @Test
    fun confirmedAppointmentCanBecomePresentOrAbsentOnly() {
        assertTrue(RdvTransitionPolicy.allows("CONFIRME", "PRESENT"))
        assertTrue(RdvTransitionPolicy.allows("CONFIRME", "ABSENT"))
        assertFalse(RdvTransitionPolicy.allows("CONFIRME", "CONFIRME"))
    }

    @Test
    fun completedOrUnknownAppointmentCannotTransition() {
        assertFalse(RdvTransitionPolicy.allows("PRESENT", "ABSENT"))
        assertFalse(RdvTransitionPolicy.allows("ABSENT", "PRESENT"))
        assertFalse(RdvTransitionPolicy.allows(null, "PRESENT"))
    }
}
