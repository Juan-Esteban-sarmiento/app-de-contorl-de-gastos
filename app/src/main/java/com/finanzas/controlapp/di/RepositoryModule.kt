package com.finanzas.controlapp.di

import com.finanzas.controlapp.data.repository.GastoRepositoryImpl
import com.finanzas.controlapp.data.repository.PresupuestoRepositoryImpl
import com.finanzas.controlapp.domain.repository.GastoRepository
import com.finanzas.controlapp.domain.repository.PresupuestoRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Módulo de Hilt responsable de enlazar las interfaces de los repositorios (Dominio)
 * con sus implementaciones concretas (Datos).
 */
@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    @Binds
    @Singleton
    abstract fun bindGastoRepository(
        gastoRepositoryImpl: GastoRepositoryImpl
    ): GastoRepository

    @Binds
    @Singleton
    abstract fun bindPresupuestoRepository(
        presupuestoRepositoryImpl: PresupuestoRepositoryImpl
    ): PresupuestoRepository
}
