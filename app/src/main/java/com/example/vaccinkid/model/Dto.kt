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
    @SerializedName("centre_nom") val centreNom: String? = null,
    val telephone: String? = null
)

data class UserEnvelopeDto(val user: UserDto? = null)

data class DashboardStatsDto(
    @SerializedName("centres_actifs") val centresActifs: Int? = null,
    @SerializedName("total_personnel") val totalPersonnel: Int? = null,
    @SerializedName("total_parents") val totalParents: Int? = null,
    @SerializedName("total_bebes") val totalBebes: Int? = null,
    @SerializedName("sessions_a_venir") val sessionsAVenir: Int? = null,
    @SerializedName("rdv_en_attente") val rdvEnAttente: Int? = null,
    @SerializedName("rdv_confirmes") val rdvConfirmes: Int? = null,
    @SerializedName("rdv_presents") val rdvPresents: Int? = null,
    @SerializedName("rdv_absents") val rdvAbsents: Int? = null,
    @SerializedName("total_vaccinations") val totalVaccinations: Int? = null,
    @SerializedName("alertes_stock") val alertesStock: Int? = null
)

data class StockDto(
    val id: Int,
    @SerializedName("centre_id") val centreId: Int? = null,
    @SerializedName("centre_nom") val centreNom: String? = null,
    @SerializedName("vaccin_id") val vaccinId: Int? = null,
    @SerializedName("vaccin_nom") val vaccinNom: String? = null,
    val nom: String? = null,
    @SerializedName("quantite_disponible") val quantiteDisponible: Int? = null,
    @SerializedName("seuil_alerte") val seuilAlerte: Int? = null,
    @SerializedName("date_expiration") val dateExpiration: String? = null,
    @SerializedName("updated_at") val updatedAt: String? = null
)

data class SessionDto(
    val id: Int,
    @SerializedName("centre_id") val centreId: Int? = null,
    @SerializedName("vaccin_id") val vaccinId: Int? = null,
    @SerializedName("date_session") val dateSession: String? = null,
    @SerializedName("heure_debut") val heureDebut: String? = null,
    @SerializedName("heure_fin") val heureFin: String? = null,
    @SerializedName("max_inscriptions") val maxInscriptions: Int? = null,
    val statut: String? = null,
    @SerializedName("centre_nom") val centreNom: String? = null,
    @SerializedName("vaccin_nom") val vaccinNom: String? = null,
    val inscrits: Int? = null
)

data class SessionRequest(
    @SerializedName("centre_id") val centreId: Int? = null,
    @SerializedName("vaccin_id") val vaccinId: Int? = null,
    @SerializedName("date_session") val dateSession: String? = null,
    @SerializedName("heure_debut") val heureDebut: String? = null,
    @SerializedName("heure_fin") val heureFin: String? = null,
    @SerializedName("max_inscriptions") val maxInscriptions: Int? = null,
    val statut: String? = null
)

data class UpdateStockRequest(
    @SerializedName("quantite_disponible") val quantiteDisponible: Int? = null,
    @SerializedName("seuil_alerte") val seuilAlerte: Int? = null,
    @SerializedName("date_expiration") val dateExpiration: String? = null,
    val motif: String? = null
)

data class UpsertStockRequest(
    @SerializedName("centre_id") val centreId: Int,
    @SerializedName("vaccin_id") val vaccinId: Int,
    @SerializedName("quantite_disponible") val quantiteDisponible: Int,
    @SerializedName("seuil_alerte") val seuilAlerte: Int? = null,
    val motif: String? = null
)

data class FlaconDto(
    val id: Int,
    @SerializedName("vaccin_id") val vaccinId: Int? = null,
    @SerializedName("session_id") val sessionId: Int? = null,
    @SerializedName("numero_lot") val numeroLot: String? = null,
    val fabricant: String? = null,
    @SerializedName("doses_utilisees") val dosesUtilisees: Int? = null,
    @SerializedName("doses_gaspillees") val dosesGaspillees: Int? = null,
    @SerializedName("doses_par_flacon") val dosesParFlacon: Int? = null,
    @SerializedName("doses_restantes") val dosesRestantes: Int? = null,
    @SerializedName("date_ouverture") val dateOuverture: String? = null,
    @SerializedName("date_fermeture") val dateFermeture: String? = null
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
    @SerializedName("poids") val poids: Double? = null,
    @SerializedName("taille") val taille: Double? = null,
    @SerializedName("reactions") val reactions: String? = null
)

data class AddCroissanceRequest(
    val poids: Double? = null,
    val taille: Double? = null
)

data class RendezVousDto(
    val id: Int,
    @SerializedName("session_id") val sessionId: Int? = null,
    @SerializedName("parent_id") val parentId: Int? = null,
    @SerializedName("bebe_id") val bebeId: Int? = null,
    val statut: String? = null,
    @SerializedName("bebe_prenom") val bebePrenom: String? = null,
    @SerializedName("bebe_nom") val bebeNom: String? = null,
    @SerializedName("bebe_date_naissance") val bebeDateNaissance: String? = null,
    @SerializedName("bebe_sexe") val bebeSexe: String? = null,
    @SerializedName("bebe_code_qr") val bebeCodeQr: String? = null,
    @SerializedName("parent_nom") val parentNom: String? = null,
    @SerializedName("parent_prenom") val parentPrenom: String? = null,
    @SerializedName("parent_telephone") val parentTelephone: String? = null,
    @SerializedName("date_session") val dateSession: String? = null,
    @SerializedName("heure_debut") val heureDebut: String? = null,
    @SerializedName("vaccin_nom") val vaccinNom: String? = null,
    @SerializedName("numero_queue") val numeroQueue: Int? = null
)

data class UpdateRendezVousRequest(val statut: String)

data class BebeDto(
    val id: Int,
    @SerializedName("parent_id") val parentId: Int? = null,
    val prenom: String? = null,
    val nom: String? = null,
    @SerializedName("date_naissance") val dateNaissance: String? = null,
    val sexe: String? = null,
    @SerializedName("photo_url") val photoUrl: String? = null,
    @SerializedName("code_qr") val codeQr: String? = null
)

data class VaccinationHistoryDto(
    @SerializedName("vaccination_id") val vaccinationId: Int? = null,
    @SerializedName("date_heure") val dateHeure: String? = null,
    val poids: Double? = null,
    val taille: Double? = null,
    val reactions: String? = null,
    @SerializedName("vaccin_nom") val vaccinNom: String? = null,
    @SerializedName("numero_lot") val numeroLot: String? = null,
    val fabricant: String? = null,
    @SerializedName("infirmier_nom") val infirmierNom: String? = null,
    @SerializedName("infirmier_prenom") val infirmierPrenom: String? = null
)

data class QrCarnetDto(
    val bebe: BebeDto? = null,
    val eligibleAppointments: List<RendezVousDto> = emptyList(),
    val lastVaccinations: List<VaccinationHistoryDto> = emptyList()
)

data class CroissanceDto(
    val id: Int? = null,
    @SerializedName("bebe_id") val bebeId: Int? = null,
    @SerializedName("date_mesure") val dateMesure: String? = null,
    val poids: Double? = null,
    val taille: Double? = null,
    @SerializedName("age_semaines") val ageSemaines: Int? = null
)

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
    @SerializedName("client_timestamp") val clientTimestamp: String? = null,
    @SerializedName("client_operation_id") val clientOperationId: String
)

data class SyncPushResultDto(
    val status: String,
    val error: String? = null
)

data class AdminPersonnelDto(
    val id: Int,
    val cin: String? = null,
    val nom: String? = null,
    val prenom: String? = null,
    val role: String? = null,
    @SerializedName("centre_id") val centreId: Int? = null,
    @SerializedName("centre_nom") val centreNom: String? = null,
    @SerializedName("est_actif") val estActif: Boolean? = null
)

data class AdminPersonnelListDto(
    val personnel: List<AdminPersonnelDto> = emptyList(),
    val total: Int = 0,
    val page: Int = 1,
    val totalPages: Int = 1
)

data class AdminPersonnelEnvelopeDto(val personnel: AdminPersonnelDto? = null)

data class AdminPersonnelRequest(
    val cin: String? = null,
    val nom: String? = null,
    val prenom: String? = null,
    @SerializedName("mot_de_passe") val motDePasse: String? = null,
    val role: String? = null,
    @SerializedName("centre_id") val centreId: Int? = null,
    @SerializedName("est_actif") val estActif: Boolean? = null
)

data class AdminCentreDto(
    val id: Int,
    val nom: String? = null,
    val adresse: String? = null,
    val telephone: String? = null,
    @SerializedName("gps_lat") val gpsLat: Double? = null,
    @SerializedName("gps_lng") val gpsLng: Double? = null,
    @SerializedName("est_actif") val estActif: Boolean? = null,
    @SerializedName("nb_personnel") val nbPersonnel: Int? = null,
    @SerializedName("nb_sessions") val nbSessions: Int? = null,
    @SerializedName("alertes_stock") val alertesStock: Int? = null
)

data class AdminCentreListDto(
    val centres: List<AdminCentreDto> = emptyList(),
    val total: Int = 0,
    val page: Int = 1,
    val totalPages: Int = 1
)

data class AdminCentreEnvelopeDto(val centre: AdminCentreDto? = null)

data class AdminCentreRequest(
    val nom: String? = null,
    val adresse: String? = null,
    val telephone: String? = null,
    @SerializedName("gps_lat") val gpsLat: Double? = null,
    @SerializedName("gps_lng") val gpsLng: Double? = null,
    @SerializedName("est_actif") val estActif: Boolean? = null
)

data class VaccinDto(
    val id: Int,
    val nom: String? = null,
    @SerializedName("doses_par_flacon") val dosesParFlacon: Int? = null,
    @SerializedName("age_cible_semaines") val ageCibleSemaines: Int? = null,
    @SerializedName("maladies_ciblees") val maladiesCiblees: String? = null,
    @SerializedName("est_actif") val estActif: Boolean? = null
)

data class VaccinRequest(
    val nom: String? = null,
    @SerializedName("doses_par_flacon") val dosesParFlacon: Int? = null,
    @SerializedName("age_cible_semaines") val ageCibleSemaines: Int? = null,
    @SerializedName("maladies_ciblees") val maladiesCiblees: String? = null,
    @SerializedName("est_actif") val estActif: Boolean? = null
)

data class AdminAuditLogDto(
    val id: Int,
    @SerializedName("table_name") val tableName: String? = null,
    @SerializedName("record_id") val recordId: Int? = null,
    val action: String? = null,
    @SerializedName("user_id") val userId: Int? = null,
    @SerializedName("user_role") val userRole: String? = null,
    val timestamp: String? = null
)

data class AdminAuditLogListDto(
    val entries: List<AdminAuditLogDto> = emptyList(),
    val total: Int = 0,
    val page: Int = 1,
    val totalPages: Int = 1
)

data class AdminRefCentreDto(
    val id: Int,
    val nom: String? = null
)

data class AdminRefVaccinDto(
    val id: Int,
    val nom: String? = null
)

data class AdminReferencesDto(
    val centres: List<AdminRefCentreDto> = emptyList(),
    val vaccins: List<AdminRefVaccinDto> = emptyList()
)

data class StockMovementDto(
    val id: Int,
    @SerializedName("stock_id") val stockId: Int? = null,
    @SerializedName("centre_id") val centreId: Int? = null,
    @SerializedName("vaccin_id") val vaccinId: Int? = null,
    val type: String? = null,
    @SerializedName("quantite_avant") val quantiteAvant: Int? = null,
    @SerializedName("quantite_apres") val quantiteApres: Int? = null,
    @SerializedName("seuil_avant") val seuilAvant: Int? = null,
    @SerializedName("seuil_apres") val seuilApres: Int? = null,
    val motif: String? = null,
    @SerializedName("vaccin_nom") val vaccinNom: String? = null,
    @SerializedName("centre_nom") val centreNom: String? = null,
    @SerializedName("created_at") val createdAt: String? = null
)

data class KioskDto(
    val id: Int,
    val code: String? = null,
    @SerializedName("centre_id") val centreId: Int? = null,
    @SerializedName("centre_nom") val centreNom: String? = null,
    @SerializedName("est_actif") val estActif: Boolean? = null,
    @SerializedName("rotated_at") val rotatedAt: String? = null,
    @SerializedName("created_at") val createdAt: String? = null
)

data class CreateKioskRequest(
    val code: String,
    @SerializedName("centre_id") val centreId: Int
)

data class DelayVaccinDto(
    @SerializedName("vaccin_id") val vaccinId: Int? = null,
    @SerializedName("vaccin_nom") val vaccinNom: String? = null,
    @SerializedName("nb_enfants_retard") val nbEnfantsRetard: Int? = null,
    @SerializedName("avg_jours_retard") val avgJoursRetard: Int? = null,
    @SerializedName("age_cible_semaines") val ageCibleSemaines: Int? = null
)

data class DelayCentreDto(
    @SerializedName("centre_id") val centreId: Int? = null,
    @SerializedName("centre_nom") val centreNom: String? = null,
    @SerializedName("nb_enfants_retard") val nbEnfantsRetard: Int? = null
)

data class DelayDashboardDto(
    @SerializedName("total_delayed") val totalDelayed: Int? = null,
    @SerializedName("urgent_count") val urgentCount: Int? = null,
    @SerializedName("top_vaccines") val topVaccines: List<DelayVaccinDto>? = null,
    @SerializedName("by_centre") val byCentre: List<DelayCentreDto>? = null
)

data class SearchResultDto(
    val type: String? = null,
    val id: Int? = null,
    val label: String? = null,
    val detail: String? = null
)
