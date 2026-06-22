package com.example.vaccinkid.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface RendezVousDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(items: List<RendezVousEntity>)

    @Query("SELECT * FROM rdv_cache WHERE session_id = :sessionId ORDER BY id ASC")
    suspend fun getBySession(sessionId: Int): List<RendezVousEntity>

    @Query("SELECT * FROM rdv_cache WHERE bebe_id = :bebeId ORDER BY id DESC")
    suspend fun getByBebe(bebeId: Int): List<RendezVousEntity>

    @Query("SELECT * FROM rdv_cache ORDER BY id DESC LIMIT 200")
    suspend fun getAll(): List<RendezVousEntity>

    @Query("UPDATE rdv_cache SET statut = :statut WHERE id = :id")
    suspend fun updateStatut(id: Int, statut: String)

    @Query("DELETE FROM rdv_cache WHERE cached_at < :before")
    suspend fun evictOlderThan(before: Long)
}

@Dao
interface BebeDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(items: List<BebeEntity>)

    @Query("SELECT * FROM bebe_cache WHERE id = :id")
    suspend fun getById(id: Int): BebeEntity?

    @Query("SELECT * FROM bebe_cache WHERE code_qr = :codeQr LIMIT 1")
    suspend fun getByQr(codeQr: String): BebeEntity?

    @Query("DELETE FROM bebe_cache WHERE cached_at < :before")
    suspend fun evictOlderThan(before: Long)
}

@Dao
interface SessionDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(items: List<SessionEntity>)

    @Query("SELECT * FROM session_cache WHERE centre_id = :centreId ORDER BY date_session ASC")
    suspend fun getByCentre(centreId: Int): List<SessionEntity>

    @Query("DELETE FROM session_cache WHERE cached_at < :before")
    suspend fun evictOlderThan(before: Long)
}

@Dao
interface VaccinationDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(items: List<VaccinationEntity>)

    @Query("SELECT * FROM vaccination_cache WHERE bebe_id = :bebeId ORDER BY date_heure DESC")
    suspend fun getByBebe(bebeId: Int): List<VaccinationEntity>

    @Query("DELETE FROM vaccination_cache WHERE cached_at < :before")
    suspend fun evictOlderThan(before: Long)
}

@Dao
interface PendingOpDao {
    @Insert
    suspend fun insert(op: PendingOpEntity): Long

    @Query("SELECT * FROM pending_ops ORDER BY created_at ASC")
    suspend fun getAll(): List<PendingOpEntity>

    @Query("DELETE FROM pending_ops WHERE localId = :localId")
    suspend fun delete(localId: Long)

    @Query("SELECT COUNT(*) FROM pending_ops")
    suspend fun count(): Int
}
