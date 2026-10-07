package com.finanzas.controlapp.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.finanzas.controlapp.data.local.entity.PresupuestoEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface PresupuestoDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(presupuesto: PresupuestoEntity): Long

    @Query("""
        SELECT p.*, c.nombre as categoriaNombre 
        FROM presupuestos p 
        INNER JOIN categorias c ON p.categoriaId = c.id 
        WHERE p.mesAnio = :mesAnio
    """)
    fun getByMes(mesAnio: String): Flow<List<PresupuestoConCategoria>>

    @Query("""
        SELECT p.*, c.nombre as categoriaNombre 
        FROM presupuestos p 
        INNER JOIN categorias c ON p.categoriaId = c.id 
        WHERE p.categoriaId = :categoriaId AND p.mesAnio = :mesAnio
        LIMIT 1
    """)
    suspend fun getByCategoriaYMes(categoriaId: Long, mesAnio: String): PresupuestoConCategoria?
}

data class PresupuestoConCategoria(
    val id: Long,
    val categoriaId: Long,
    val montoLimite: Double,
    val mesAnio: String,
    val categoriaNombre: String
)
