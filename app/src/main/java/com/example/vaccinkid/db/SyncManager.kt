package com.example.vaccinkid.db

import android.content.Context
import android.content.SharedPreferences
import com.example.vaccinkid.model.SyncItemDto
import com.example.vaccinkid.model.SyncPushRequest
import com.example.vaccinkid.network.ApiClient
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object SyncManager {

    private const val PREFS_NAME = "sync_prefs"
    private const val KEY_LAST_SYNC = "last_sync_timestamp"
    private val gson = Gson()

    private fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun getLastSync(context: Context): String? = prefs(context).getString(KEY_LAST_SYNC, null)

    private fun saveLastSync(context: Context, timestamp: String) {
        prefs(context).edit().putString(KEY_LAST_SYNC, timestamp).apply()
    }

    suspend fun pull(context: Context): SyncResult = withContext(Dispatchers.IO) {
        try {
            val since = getLastSync(context)
            val response = ApiClient.apiService.pullChanges(since)
            if (response.status != "success") return@withContext SyncResult.Failure("Pull failed: ${response.message}")

            val changes = response.data?.changes ?: emptyMap()
            val db = AppDatabase.getInstance(context)
            val timestamp = response.data?.timestamp

            applyRdvChanges(db, changes["rendez_vous"])
            applyBebeChanges(db, changes["bebe"])
            applySessionChanges(db, changes["session"])
            applyVaccinationChanges(db, changes["vaccination"])

            if (timestamp != null) saveLastSync(context, timestamp)

            SyncResult.Success(
                rdvCount = changes["rendez_vous"]?.size ?: 0,
                bebeCount = changes["bebe"]?.size ?: 0,
                sessionCount = changes["session"]?.size ?: 0
            )
        } catch (e: Exception) {
            SyncResult.Failure(e.message ?: "Erreur réseau")
        }
    }

    suspend fun push(context: Context): Int = withContext(Dispatchers.IO) {
        val db = AppDatabase.getInstance(context)
        val pending = db.pendingOpDao().getAll()
        if (pending.isEmpty()) return@withContext 0

        try {
            val items = pending.map { op ->
                val payloadMap: Map<String, Any?> = gson.fromJson(
                    op.payload,
                    object : TypeToken<Map<String, Any?>>() {}.type
                )
                SyncItemDto(
                    operation = op.operation,
                    entityType = op.entityType,
                    entityId = op.entityId,
                    payload = payloadMap,
                    clientTimestamp = op.clientTimestamp,
                    clientOperationId = "vaccinkids-${op.localId}-${op.entityType}-${op.entityId}"
                )
            }
            val response = ApiClient.apiService.pushChanges(SyncPushRequest(items))
            if (response.status == "success") {
                pending.forEach { db.pendingOpDao().delete(it.localId) }
                pending.size
            } else 0
        } catch (_: Exception) { 0 }
    }

    suspend fun queueRdvStatusUpdate(context: Context, rdvId: Int, newStatut: String) =
        withContext(Dispatchers.IO) {
            val db = AppDatabase.getInstance(context)
            db.rendezVousDao().updateStatut(rdvId, newStatut)
            db.pendingOpDao().insert(
                PendingOpEntity(
                    operation = "UPDATE",
                    entityType = "rendez_vous",
                    entityId = rdvId,
                    payload = gson.toJson(mapOf("statut" to newStatut)),
                    clientTimestamp = isoNow()
                )
            )
        }

    suspend fun hasPendingOps(context: Context): Boolean = withContext(Dispatchers.IO) {
        AppDatabase.getInstance(context).pendingOpDao().count() > 0
    }

    suspend fun evictStaleCache(context: Context) = withContext(Dispatchers.IO) {
        val cutoff = System.currentTimeMillis() - 7 * 24 * 60 * 60 * 1000L
        val db = AppDatabase.getInstance(context)
        db.rendezVousDao().evictOlderThan(cutoff)
        db.bebeDao().evictOlderThan(cutoff)
        db.sessionDao().evictOlderThan(cutoff)
        db.vaccinationDao().evictOlderThan(cutoff)
    }

    private fun isoNow(): String =
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
            .apply { timeZone = java.util.TimeZone.getTimeZone("UTC") }
            .format(Date())

    private suspend fun applyRdvChanges(db: AppDatabase, rows: List<Map<String, Any?>>?) {
        if (rows.isNullOrEmpty()) return
        val entities = rows.mapNotNull { row ->
            val id = (row["id"] as? Double)?.toInt() ?: return@mapNotNull null
            RendezVousEntity(
                id = id,
                sessionId = (row["session_id"] as? Double)?.toInt(),
                parentId = (row["parent_id"] as? Double)?.toInt(),
                bebeId = (row["bebe_id"] as? Double)?.toInt(),
                statut = row["statut"] as? String,
                bebePrenom = row["bebe_prenom"] as? String,
                bebeNom = row["bebe_nom"] as? String,
                bebeDateNaissance = row["bebe_date_naissance"] as? String,
                bebeSexe = row["bebe_sexe"] as? String,
                bebeCodeQr = row["bebe_code_qr"] as? String,
                parentNom = row["parent_nom"] as? String,
                parentPrenom = row["parent_prenom"] as? String,
                parentTelephone = row["parent_telephone"] as? String,
                heureDebut = row["heure_debut"] as? String,
                vaccinNom = row["vaccin_nom"] as? String,
                dateSession = row["date_session"] as? String,
                updatedAt = row["updated_at"] as? String
            )
        }
        db.rendezVousDao().insertAll(entities)
    }

    private suspend fun applyBebeChanges(db: AppDatabase, rows: List<Map<String, Any?>>?) {
        if (rows.isNullOrEmpty()) return
        val entities = rows.mapNotNull { row ->
            val id = (row["id"] as? Double)?.toInt() ?: return@mapNotNull null
            BebeEntity(
                id = id,
                parentId = (row["parent_id"] as? Double)?.toInt(),
                prenom = row["prenom"] as? String,
                nom = row["nom"] as? String,
                dateNaissance = row["date_naissance"] as? String,
                sexe = row["sexe"] as? String,
                codeQr = row["code_qr"] as? String,
                numeroCentre = row["numero_centre"] as? String,
                updatedAt = row["updated_at"] as? String
            )
        }
        db.bebeDao().insertAll(entities)
    }

    private suspend fun applySessionChanges(db: AppDatabase, rows: List<Map<String, Any?>>?) {
        if (rows.isNullOrEmpty()) return
        val entities = rows.mapNotNull { row ->
            val id = (row["id"] as? Double)?.toInt() ?: return@mapNotNull null
            SessionEntity(
                id = id,
                centreId = (row["centre_id"] as? Double)?.toInt(),
                vaccinId = (row["vaccin_id"] as? Double)?.toInt(),
                dateSession = row["date_session"] as? String,
                heureDebut = row["heure_debut"] as? String,
                heureFin = row["heure_fin"] as? String,
                maxInscriptions = (row["max_inscriptions"] as? Double)?.toInt(),
                statut = row["statut"] as? String,
                vaccinNom = row["vaccin_nom"] as? String,
                updatedAt = row["updated_at"] as? String
            )
        }
        db.sessionDao().insertAll(entities)
    }

    private suspend fun applyVaccinationChanges(db: AppDatabase, rows: List<Map<String, Any?>>?) {
        if (rows.isNullOrEmpty()) return
        val entities = rows.mapNotNull { row ->
            val id = (row["id"] as? Double)?.toInt() ?: return@mapNotNull null
            VaccinationEntity(
                id = id,
                rendezVousId = (row["rendez_vous_id"] as? Double)?.toInt(),
                bebeId = (row["bebe_id"] as? Double)?.toInt(),
                dateHeure = row["date_heure"] as? String,
                poids = row["poids"] as? Double,
                taille = row["taille"] as? Double,
                reactions = row["reactions"] as? String,
                vaccinNom = row["vaccin_nom"] as? String,
                updatedAt = row["updated_at"] as? String
            )
        }
        db.vaccinationDao().insertAll(entities)
    }

    sealed class SyncResult {
        data class Success(val rdvCount: Int, val bebeCount: Int, val sessionCount: Int) : SyncResult()
        data class Failure(val reason: String) : SyncResult()
    }
}
