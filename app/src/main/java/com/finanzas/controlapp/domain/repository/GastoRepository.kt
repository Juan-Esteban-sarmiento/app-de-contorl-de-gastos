package com.finanzas.controlapp.domain.repository

import com.finanzas.controlapp.domain.model.Gasto
import kotlinx.coroutines.flow.Flow
import java.time.LocalDate

/**
 * Contrato para acceder a los datos de los gastos.
 * Esta interfaz pertenece a la capa de Dominio y será implementada en la capa de Datos.
 */
interface GastoRepository {
    
    /** Inserta un nuevo gasto o actualiza uno existente. */
    suspend fun registrarGasto(gasto: Gasto): Result<Long>
    
    /** Elimina un gasto por su ID. */
    suspend fun eliminarGasto(gastoId: Long): Result<Unit>
    
    /** Obtiene un flujo con todos los gastos ordenados por fecha descendente. */
    fun obtenerTodosLosGastos(): Flow<List<Gasto>>
    
    /** Obtiene los gastos correspondientes a un mes específico (formato YYYY-MM). */
    fun obtenerGastosDelMes(mesAnio: String): Flow<List<Gasto>>
    
    /** Obtiene la suma total de gastos en una categoría específica y rango de fechas. */
    suspend fun obtenerTotalPorCategoria(categoriaId: Long, fechaInicio: LocalDate, fechaFin: LocalDate): Double
    
    /** Obtiene el promedio de gasto histórico mensual para una categoría específica. */
    suspend fun obtenerPromedioMensualPorCategoria(categoriaId: Long): Double
}
