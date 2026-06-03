package com.example.vaccinkid.model

import com.google.gson.annotations.SerializedName

data class ApiResponse<T>(
    val status: String,
    val message: String? = null,
    val data: T? = null,
    val pagination: PaginationDto? = null
)

data class PaginationDto(
    val total: Int? = null,
    val page: Int? = null,
    val limit: Int? = null,
    val totalPages: Int? = null
)

data class LoginRequest(
    val cin: String,
    @SerializedName("mot_de_passe") val motDePasse: String
)

data class RefreshRequest(val refreshToken: String)

data class AuthResponse(
    val user: UserDto? = null,
    val tokens: TokenDto? = null,
    val accessToken: String? = null,
    val refreshToken: String? = null
)

data class TokenDto(
    val accessToken: String,
    val refreshToken: String,
    val expiresIn: Long? = null
)

data class UserDto(
    val id: Int,
    val cin: String? = null,
    val nom: String? = null,
    val prenom: String? = null,
    val role: String,
    @SerializedName("centre_id") val centreId: Int? = null,
    val telephone: String? = null
)

data class DashboardStatsDto(
    @SerializedName("centres_actifs") val centresActifs: Int? = null,
    @SerializedName("total_personnel") val totalPersonnel: Int? = null,
    @SerializedName("total_parents") val totalParents: Int? = null,
    @SerializedName("total_bebes") val totalBebes: Int? = null,
    @SerializedName("sessions_a_venir") val sessionsAVenir: Int? = null,
    @SerializedName("rdv_en_attente") val rdvEnAttente: Int? = null,
    @SerializedName("rdv_confirmes") val rdvConfirmes: Int? = null,
    @SerializedName("total_vaccinations") val totalVaccinations: Int? = null,
    @SerializedName("alertes_stock") val alertesStock: Int? = null
)

data class StockDto(
    val id: Int,
    @SerializedName("centre_id") val centreId: Int? = null,
    @SerializedName("vaccin_id") val vaccinId: Int? = null,
    @SerializedName("vaccin_nom") val vaccinNom: String? = null,
    val nom: String? = null,
    @SerializedName("quantite_disponible") val quantiteDisponible: Int? = null,
    @SerializedName("seuil_alerte") val seuilAlerte: Int? = null,
    @SerializedName("updated_at") val updatedAt: String? = null
)

data class UpdateStockRequest(
    @SerializedName("quantite_disponible") val quantiteDisponible: Int? = null,
    @SerializedName("seuil_alerte") val seuilAlerte: Int? = null
)

data class FlaconDto(
    val id: Int,
    @SerializedName("vaccin_id") val vaccinId: Int? = null,
    @SerializedName("session_id") val sessionId: Int? = null,
    @SerializedName("numero_lot") val numeroLot: String? = null,
    val fabricant: String? = null,
    @SerializedName("doses_utilisees") val dosesUtilisees: Int? = null,
    @SerializedName("doses_gaspillees") val dosesGaspillees: Int? = null,
    @SerializedName("date_ouverture") val dateOuverture: String? = null
)

data class CreateFlaconRequest(
    @SerializedName("vaccin_id") val vaccinId: Int,
    @SerializedName("session_id") val sessionId: Int?,
    @SerializedName("numero_lot") val numeroLot: String,
    val fabricant: String
)

data class VaccinationDto(
    val id: Int,
    @SerializedName("rendez_vous_id") val rendezVousId: Int? = null,
    @SerializedName("personnel_id") val personnelId: Int? = null,
    @SerializedName("flacon_id") val flaconId: Int? = null,
    @SerializedName("date_heure") val dateHeure: String? = null,
    val poids: Double? = null,
    val taille: Double? = null,
    val reactions: String? = null
)

data class CreateVaccinationRequest(
    @SerializedName("flacon_id") val flaconId: Int?,
    val poids: Double? = null,
    val taille: Double? = null,
    val reactions: String? = null
)

data class RendezVousDto(
    val id: Int,
    @SerializedName("session_id") val sessionId: Int? = null,
    @SerializedName("parent_id") val parentId: Int? = null,
    @SerializedName("bebe_id") val bebeId: Int? = null,
    val statut: String? = null,
    @SerializedName("bebe_prenom") val bebePrenom: String? = null,
    @SerializedName("bebe_nom") val bebeNom: String? = null,
    @SerializedName("parent_nom") val parentNom: String? = null,
    @SerializedName("parent_prenom") val parentPrenom: String? = null,
    @SerializedName("parent_telephone") val parentTelephone: String? = null
)

data class UpdateRendezVousRequest(val statut: String)

data class QueueEntryDto(
    val id: Int,
    @SerializedName("numero_attente") val numeroAttente: Int? = null,
    @SerializedName("rendez_vous_id") val rendezVousId: Int? = null,
    @SerializedName("centre_id") val centreId: Int? = null,
    @SerializedName("session_id") val sessionId: Int? = null,
    @SerializedName("parent_id") val parentId: Int? = null,
    @SerializedName("bebe_id") val bebeId: Int? = null,
    val statut: String? = null,
    @SerializedName("bebe_prenom") val bebePrenom: String? = null,
    @SerializedName("bebe_nom") val bebeNom: String? = null,
    @SerializedName("parent_telephone") val parentTelephone: String? = null,
    val position: Int? = null
)

data class QueueListDto(val entries: List<QueueEntryDto> = emptyList())

data class QueueStatsDto(
    val total: Int = 0,
    val enAttente: Int = 0,
    val enCours: Int = 0,
    val termine: Int = 0
)

data class JoinQueueRequest(
    @SerializedName("rendez_vous_id") val rendezVousId: Int? = null,
    @SerializedName("centre_id") val centreId: Int,
    @SerializedName("session_id") val sessionId: Int? = null,
    @SerializedName("bebe_id") val bebeId: Int
)

data class NotificationDto(
    val id: Int,
    val titre: String? = null,
    val message: String? = null,
    val type: String? = null,
    @SerializedName("est_lue") val estLue: Boolean? = null,
    @SerializedName("created_at") val createdAt: String? = null
)

data class NotificationCountDto(val count: Int = 0)

data class SyncStatusDto(
    val pendingCount: Int = 0,
    val conflictCount: Int = 0,
    val lastSync: String? = null
)

data class SyncPullDto(
    val changes: Map<String, List<Map<String, Any?>>> = emptyMap(),
    val timestamp: String? = null
)

data class SyncPushRequest(val items: List<SyncItemDto>)

data class SyncItemDto(
    val operation: String,
    @SerializedName("entity_type") val entityType: String,
    @SerializedName("entity_id") val entityId: Int? = null,
    val payload: Map<String, Any?>,
    @SerializedName("client_timestamp") val clientTimestamp: String? = null
)

data class SyncPushResultDto(
    val status: String,
    val error: String? = null
)
