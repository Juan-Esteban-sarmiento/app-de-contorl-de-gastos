package com.finanzas.controlapp.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.finanzas.controlapp.data.local.dao.CategoriaDao
import com.finanzas.controlapp.data.local.dao.GastoDao
import com.finanzas.controlapp.data.local.dao.PresupuestoDao
import com.finanzas.controlapp.data.local.entity.CategoriaEntity
import com.finanzas.controlapp.data.local.entity.GastoEntity
import com.finanzas.controlapp.data.local.entity.IngresoEntity
import com.finanzas.controlapp.data.local.entity.PresupuestoEntity

@Database(
    entities = [
        CategoriaEntity::class,
        GastoEntity::class,
        IngresoEntity::class,
        PresupuestoEntity::class
        // Falta DeudaEntity, pero nos enfocamos en el Sprint 1 y Presupuestos
    ],
    version = 1,
    exportSchema = false
)
@TypeConverters(DateConverters::class)
abstract class FinanzasDatabase : RoomDatabase() {
    abstract fun gastoDao(): GastoDao
    abstract fun categoriaDao(): CategoriaDao
    abstract fun presupuestoDao(): PresupuestoDao
}
