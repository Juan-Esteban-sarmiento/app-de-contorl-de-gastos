package com.finanzas.controlapp.domain.repository

import com.finanzas.controlapp.domain.model.Presupuesto
import kotlinx.coroutines.flow.Flow

/**
 * Contrato para acceder a los datos de presupuestos mensuales.
 */
interface PresupuestoRepository {
    
    /** Guarda o actualiza un presupuesto. */
    suspend fun guardarPresupuesto(presupuesto: Presupuesto): Result<Long>
    
    /** Obtiene todos los presupuestos configurados para un mes específico. */
    fun obtenerPresupuestosDelMes(mesAnio: String): Flow<List<Presupuesto>>
    
    /** Obtiene el presupuesto de una categoría específica para un mes dado. Puede ser null. */
    suspend fun obtenerPresupuestoPorCategoria(categoriaId: Long, mesAnio: String): Presupuesto?
}
