package com.example.vaccinkid.db

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "rdv_cache")
data class RendezVousEntity(
    @PrimaryKey val id: Int,
    @ColumnInfo(name = "session_id") val sessionId: Int? = null,
    @ColumnInfo(name = "parent_id") val parentId: Int? = null,
    @ColumnInfo(name = "bebe_id") val bebeId: Int? = null,
    val statut: String? = null,
    @ColumnInfo(name = "bebe_prenom") val bebePrenom: String? = null,
    @ColumnInfo(name = "bebe_nom") val bebeNom: String? = null,
    @ColumnInfo(name = "bebe_date_naissance") val bebeDateNaissance: String? = null,
    @ColumnInfo(name = "bebe_sexe") val bebeSexe: String? = null,
    @ColumnInfo(name = "bebe_code_qr") val bebeCodeQr: String? = null,
    @ColumnInfo(name = "parent_nom") val parentNom: String? = null,
    @ColumnInfo(name = "parent_prenom") val parentPrenom: String? = null,
    @ColumnInfo(name = "parent_telephone") val parentTelephone: String? = null,
    @ColumnInfo(name = "heure_debut") val heureDebut: String? = null,
    @ColumnInfo(name = "vaccin_nom") val vaccinNom: String? = null,
    @ColumnInfo(name = "date_session") val dateSession: String? = null,
    @ColumnInfo(name = "numero_queue") val numeroQueue: Int? = null,
    @ColumnInfo(name = "updated_at") val updatedAt: String? = null,
    @ColumnInfo(name = "cached_at") val cachedAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "bebe_cache")
data class BebeEntity(
    @PrimaryKey val id: Int,
    @ColumnInfo(name = "parent_id") val parentId: Int? = null,
    val prenom: String? = null,
    val nom: String? = null,
    @ColumnInfo(name = "date_naissance") val dateNaissance: String? = null,
    val sexe: String? = null,
    @ColumnInfo(name = "code_qr") val codeQr: String? = null,
    @ColumnInfo(name = "numero_centre") val numeroCentre: String? = null,
    @ColumnInfo(name = "updated_at") val updatedAt: String? = null,
    @ColumnInfo(name = "cached_at") val cachedAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "session_cache")
data class SessionEntity(
    @PrimaryKey val id: Int,
    @ColumnInfo(name = "centre_id") val centreId: Int? = null,
    @ColumnInfo(name = "vaccin_id") val vaccinId: Int? = null,
    @ColumnInfo(name = "date_session") val dateSession: String? = null,
    @ColumnInfo(name = "heure_debut") val heureDebut: String? = null,
    @ColumnInfo(name = "heure_fin") val heureFin: String? = null,
    @ColumnInfo(name = "max_inscriptions") val maxInscriptions: Int? = null,
    val statut: String? = null,
    @ColumnInfo(name = "vaccin_nom") val vaccinNom: String? = null,
    @ColumnInfo(name = "updated_at") val updatedAt: String? = null,
    @ColumnInfo(name = "cached_at") val cachedAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "vaccination_cache")
data class VaccinationEntity(
    @PrimaryKey val id: Int,
    @ColumnInfo(name = "rendez_vous_id") val rendezVousId: Int? = null,
    @ColumnInfo(name = "bebe_id") val bebeId: Int? = null,
    @ColumnInfo(name = "date_heure") val dateHeure: String? = null,
    val poids: Double? = null,
    val taille: Double? = null,
    val reactions: String? = null,
    @ColumnInfo(name = "vaccin_nom") val vaccinNom: String? = null,
    @ColumnInfo(name = "updated_at") val updatedAt: String? = null,
    @ColumnInfo(name = "cached_at") val cachedAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "pending_ops")
data class PendingOpEntity(
    @PrimaryKey(autoGenerate = true) val localId: Long = 0,
    val operation: String,
    @ColumnInfo(name = "entity_type") val entityType: String,
    @ColumnInfo(name = "entity_id") val entityId: Int? = null,
    val payload: String,
    @ColumnInfo(name = "client_timestamp") val clientTimestamp: String,
    @ColumnInfo(name = "created_at") val createdAt: Long = System.currentTimeMillis()
)
