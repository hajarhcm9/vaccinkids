package com.example.vaccinkid.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [
        RendezVousEntity::class,
        BebeEntity::class,
        SessionEntity::class,
        VaccinationEntity::class,
        PendingOpEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun rendezVousDao(): RendezVousDao
    abstract fun bebeDao(): BebeDao
    abstract fun sessionDao(): SessionDao
    abstract fun vaccinationDao(): VaccinationDao
    abstract fun pendingOpDao(): PendingOpDao

    companion object {
        @Volatile private var INSTANCE: AppDatabase? = null

        fun getInstance(context: Context): AppDatabase =
            INSTANCE ?: synchronized(this) {
                INSTANCE ?: Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "vaccinkids_cache"
                ).fallbackToDestructiveMigration().build().also { INSTANCE = it }
            }
    }
}
