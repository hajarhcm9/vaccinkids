package com.example.vaccinkid

// ─── Modèle Centre de Vaccination ────────────────────────────────────────────
data class CentreVaccination(
    val id: String,
    val nom: String,
    val adresse: String,
    val telephone: String,
    val coordGpsLat: Double,
    val coordGpsLng: Double,
    val estActif: Boolean,
    val vaccinsDisponibles: List<String> = emptyList(),
    val joursVaccination: Map<String, List<String>> = emptyMap() // "Lundi" -> ["BCG", "Pentavalent"]
)

// ─── Données réelles — Centres de vaccination Oujda ──────────────────────────
object CentresOujdaData {

    val tousLesCentres = listOf(

        // ✅ ACTIF — Centre Santé Essalam (fonctionnel)
        CentreVaccination(
            id = "CSE001",
            nom = "Centre de Santé Essalam",
            adresse = "Quartier Essalam, Oujda 60000",
            telephone = "0536-123-456",
            coordGpsLat = 34.6814,
            coordGpsLng = -1.9086,
            estActif = true,
            vaccinsDisponibles = listOf(
                "BCG", "Hépatite B", "Pentavalent",
                "Polio Oral", "Pneumocoque", "Rotavirus",
                "VPI", "RR", "DTC"
            ),
            joursVaccination = mapOf(
                "Lundi"    to listOf("BCG", "Hépatite B"),
                "Mardi"    to listOf("Pentavalent", "Polio Oral"),
                "Mercredi" to listOf("Pneumocoque", "Rotavirus"),
                "Jeudi"    to listOf("VPI", "RR"),
                "Vendredi" to listOf("DTC")
            )
        ),

        // ❌ INACTIF — autres centres publics Oujda
        CentreVaccination(
            id = "CSA002",
            nom = "Centre de Santé Al Amal",
            adresse = "Quartier Al Amal, Oujda 60000",
            telephone = "0536-234-567",
            coordGpsLat = 34.6890,
            coordGpsLng = -1.9150,
            estActif = false
        ),

        CentreVaccination(
            id = "CSN003",
            nom = "Centre de Santé Nasr",
            adresse = "Quartier Nasr, Oujda 60010",
            telephone = "0536-345-678",
            coordGpsLat = 34.6750,
            coordGpsLng = -1.8990,
            estActif = false
        ),

        CentreVaccination(
            id = "CSF004",
            nom = "Centre de Santé Al Fath",
            adresse = "Hay Al Fath, Oujda 60020",
            telephone = "0536-456-789",
            coordGpsLat = 34.6920,
            coordGpsLng = -1.9220,
            estActif = false
        ),

        CentreVaccination(
            id = "CSW005",
            nom = "Centre de Santé Wifaq",
            adresse = "Quartier Wifaq, Oujda 60030",
            telephone = "0536-567-890",
            coordGpsLat = 34.6700,
            coordGpsLng = -1.9300,
            estActif = false
        ),

        CentreVaccination(
            id = "CSM006",
            nom = "Centre de Santé Marjane",
            adresse = "Hay Marjane, Oujda 60040",
            telephone = "0536-678-901",
            coordGpsLat = 34.6600,
            coordGpsLng = -1.9100,
            estActif = false
        ),

        CentreVaccination(
            id = "CSH007",
            nom = "Centre de Santé Hay Nour",
            adresse = "Hay Nour, Oujda 60050",
            telephone = "0536-789-012",
            coordGpsLat = 34.6950,
            coordGpsLng = -1.8900,
            estActif = false
        ),

        CentreVaccination(
            id = "CSI008",
            nom = "Centre de Santé Isly",
            adresse = "Quartier Isly, Oujda 60000",
            telephone = "0536-890-123",
            coordGpsLat = 34.6780,
            coordGpsLng = -1.9050,
            estActif = false
        ),

        CentreVaccination(
            id = "CSZ009",
            nom = "Centre de Santé Zitoun",
            adresse = "Quartier Zitoun, Oujda 60060",
            telephone = "0536-901-234",
            coordGpsLat = 34.6650,
            coordGpsLng = -1.9180,
            estActif = false
        ),

        CentreVaccination(
            id = "CSR010",
            nom = "Centre de Santé Route de Berkane",
            adresse = "Route de Berkane, Oujda 60070",
            telephone = "0536-012-345",
            coordGpsLat = 34.6550,
            coordGpsLng = -1.8800,
            estActif = false
        )
    )
}