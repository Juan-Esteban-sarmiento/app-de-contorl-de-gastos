package com.finanzas.controlapp.di

import android.content.Context
import androidx.room.Room
import com.finanzas.controlapp.data.local.FinanzasDatabase
import com.finanzas.controlapp.data.local.dao.CategoriaDao
import com.finanzas.controlapp.data.local.dao.GastoDao
import com.finanzas.controlapp.data.local.dao.PresupuestoDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Módulo de Hilt responsable de proveer dependencias de terceros y constructores
 * que no podemos instanciar directamente con @Inject (ej. Room Database y DAOs).
 */
@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideFinanzasDatabase(
        @ApplicationContext context: Context
    ): FinanzasDatabase {
        return Room.databaseBuilder(
            context,
            FinanzasDatabase::class.java,
            "finanzas_db"
        )
        // .fallbackToDestructiveMigration() // Útil en desarrollo
        .build()
    }

    @Provides
    @Singleton
    fun provideGastoDao(database: FinanzasDatabase): GastoDao {
        return database.gastoDao()
    }

    @Provides
    @Singleton
    fun provideCategoriaDao(database: FinanzasDatabase): CategoriaDao {
        return database.categoriaDao()
    }

    @Provides
    @Singleton
    fun providePresupuestoDao(database: FinanzasDatabase): PresupuestoDao {
        return database.presupuestoDao()
    }
}
