package com.example.vaccinkid.data

import android.content.Context
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import com.example.vaccinkid.model.BebeDto
import com.example.vaccinkid.model.CroissanceDto

@Entity(tableName = "cached_bebes")
data class CachedBebeEntity(
    @PrimaryKey val id: Int,
    val parentId: Int?,
    val prenom: String?,
    val nom: String?,
    val dateNaissance: String?,
    val sexe: String?,
    val photoUrl: String?,
    val codeQr: String,
    val cachedAt: Long = System.currentTimeMillis()
) {
    fun toDto(): BebeDto = BebeDto(
        id = id,
        parentId = parentId,
        prenom = prenom,
        nom = nom,
        dateNaissance = dateNaissance,
        sexe = sexe,
        photoUrl = photoUrl,
        codeQr = codeQr
    )

    companion object {
        fun fromDto(bebe: BebeDto, fallbackQr: String): CachedBebeEntity = CachedBebeEntity(
            id = bebe.id,
            parentId = bebe.parentId,
            prenom = bebe.prenom,
            nom = bebe.nom,
            dateNaissance = bebe.dateNaissance,
            sexe = bebe.sexe,
            photoUrl = bebe.photoUrl,
            codeQr = bebe.codeQr ?: fallbackQr
        )
    }
}

@Entity(tableName = "cached_growth")
data class CachedGrowthEntity(
    @PrimaryKey(autoGenerate = true) val localId: Long = 0,
    val remoteId: Int?,
    val bebeId: Int,
    val dateMesure: String?,
    val poids: Double?,
    val taille: Double?,
    val ageSemaines: Int?
) {
    fun toDto(): CroissanceDto = CroissanceDto(
        id = remoteId,
        bebeId = bebeId,
        dateMesure = dateMesure,
        poids = poids,
        taille = taille,
        ageSemaines = ageSemaines
    )

    companion object {
        fun fromDto(mesure: CroissanceDto, bebeId: Int): CachedGrowthEntity = CachedGrowthEntity(
            remoteId = mesure.id,
            bebeId = mesure.bebeId ?: bebeId,
            dateMesure = mesure.dateMesure,
            poids = mesure.poids,
            taille = mesure.taille,
            ageSemaines = mesure.ageSemaines
        )
    }
}

@Dao
interface CachedBebeDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(bebe: CachedBebeEntity)

    @Query("SELECT * FROM cached_bebes WHERE codeQr = :codeQr LIMIT 1")
    suspend fun findByQr(codeQr: String): CachedBebeEntity?
}

@Dao
interface CachedGrowthDao {
    @Query("DELETE FROM cached_growth WHERE bebeId = :bebeId")
    suspend fun deleteForBebe(bebeId: Int)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(growth: List<CachedGrowthEntity>)

    @Query("SELECT * FROM cached_growth WHERE bebeId = :bebeId ORDER BY COALESCE(ageSemaines, 999999), dateMesure")
    suspend fun findByBebe(bebeId: Int): List<CachedGrowthEntity>
}

@Database(
    entities = [CachedBebeEntity::class, CachedGrowthEntity::class],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun cachedBebeDao(): CachedBebeDao
    abstract fun cachedGrowthDao(): CachedGrowthDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getInstance(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "vaccinkids_offline.db"
                ).build().also { INSTANCE = it }
            }
        }
    }
}
