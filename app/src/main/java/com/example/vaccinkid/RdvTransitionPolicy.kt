package com.example.vaccinkid

object RdvTransitionPolicy {
    fun allows(current: String?, target: String): Boolean = when (current) {
        "EN_ATTENTE" -> target == "CONFIRME" || target == "PRESENT" || target == "ABSENT"
        "EN_LISTE_ATTENTE" -> target == "CONFIRME"
        "CONFIRME" -> target == "PRESENT" || target == "ABSENT"
        else -> false
    }
}
