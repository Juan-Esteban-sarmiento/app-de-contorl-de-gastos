package com.finanzas.controlapp.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.finanzas.controlapp.data.local.entity.GastoEntity
import kotlinx.coroutines.flow.Flow

/**
 * Data Access Object para la tabla de Gastos.
 */
@Dao
interface GastoDao {
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(gasto: GastoEntity): Long
    
    @Update
    suspend fun update(gasto: GastoEntity)
    
    @Query("DELETE FROM gastos WHERE id = :id")
    suspend fun deleteById(id: Long)
    
    @Query("""
        SELECT g.*, c.nombre as categoriaNombre 
        FROM gastos g 
        INNER JOIN categorias c ON g.categoriaId = c.id 
        ORDER BY g.fecha DESC
    """)
    fun getAll(): Flow<List<GastoConCategoria>>
    
    @Query("""
        SELECT g.*, c.nombre as categoriaNombre 
        FROM gastos g 
        INNER JOIN categorias c ON g.categoriaId = c.id 
        WHERE strftime('%Y-%m', g.fecha) = :mesAnio
        ORDER BY g.fecha DESC
    """)
    fun getByMes(mesAnio: String): Flow<List<GastoConCategoria>>
    
    @Query("""
        SELECT COALESCE(SUM(monto), 0.0) 
        FROM gastos 
        WHERE categoriaId = :categoriaId 
        AND fecha >= :fechaInicio 
        AND fecha <= :fechaFin
    """)
    suspend fun getTotalByCategoriaAndDateRange(categoriaId: Long, fechaInicio: String, fechaFin: String): Double
    
    @Query("""
        SELECT COALESCE(SUM(monto) / COUNT(DISTINCT strftime('%Y-%m', fecha)), 0.0)
        FROM gastos
        WHERE categoriaId = :categoriaId
    """)
    suspend fun getPromedioMensualByCategoria(categoriaId: Long): Double
}

/**
 * Data class para proyectar el Gasto junto con el nombre de la categoría resuelto por el JOIN.
 */
data class GastoConCategoria(
    val id: Long,
    val monto: Double,
    val categoriaId: Long,
    val nota: String,
    val fecha: String,
    val creadoEn: String,
    val categoriaNombre: String
)
