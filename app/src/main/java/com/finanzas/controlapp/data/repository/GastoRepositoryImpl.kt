package com.finanzas.controlapp.data.repository

import com.finanzas.controlapp.data.local.dao.GastoDao
import com.finanzas.controlapp.data.local.entity.GastoEntity
import com.finanzas.controlapp.domain.model.Gasto
import com.finanzas.controlapp.domain.repository.GastoRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.time.LocalDate
import javax.inject.Inject

/**
 * Implementación del repositorio de Gastos.
 * Conecta la base de datos Room (Data) con los casos de uso (Domain),
 * realizando el mapeo necesario entre Entity y Modelo de Dominio.
 */
class GastoRepositoryImpl @Inject constructor(
    private val gastoDao: GastoDao
) : GastoRepository {

    override suspend fun registrarGasto(gasto: Gasto): Result<Long> {
        return try {
            val entity = GastoEntity(
                id = gasto.id,
                monto = gasto.monto,
                categoriaId = gasto.categoriaId,
                nota = gasto.nota,
                fecha = gasto.fecha,
                creadoEn = gasto.creadoEn
            )
            val id = gastoDao.insert(entity)
            Result.success(id)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun eliminarGasto(gastoId: Long): Result<Unit> {
        return try {
            gastoDao.deleteById(gastoId)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override fun obtenerTodosLosGastos(): Flow<List<Gasto>> {
        return gastoDao.getAll().map { list ->
            list.map { dto ->
                Gasto(
                    id = dto.id,
                    monto = dto.monto,
                    categoriaId = dto.categoriaId,
                    categoriaNombre = dto.categoriaNombre,
                    nota = dto.nota,
                    fecha = LocalDate.parse(dto.fecha),
                    creadoEn = java.time.LocalDateTime.parse(dto.creadoEn)
                )
            }
        }
    }

    override fun obtenerGastosDelMes(mesAnio: String): Flow<List<Gasto>> {
        return gastoDao.getByMes(mesAnio).map { list ->
            list.map { dto ->
                Gasto(
                    id = dto.id,
                    monto = dto.monto,
                    categoriaId = dto.categoriaId,
                    categoriaNombre = dto.categoriaNombre,
                    nota = dto.nota,
                    fecha = LocalDate.parse(dto.fecha),
                    creadoEn = java.time.LocalDateTime.parse(dto.creadoEn)
                )
            }
        }
    }

    override suspend fun obtenerTotalPorCategoria(
        categoriaId: Long,
        fechaInicio: LocalDate,
        fechaFin: LocalDate
    ): Double {
        return gastoDao.getTotalByCategoriaAndDateRange(
            categoriaId = categoriaId,
            fechaInicio = fechaInicio.toString(),
            fechaFin = fechaFin.toString()
        )
    }

    override suspend fun obtenerPromedioMensualPorCategoria(categoriaId: Long): Double {
        return gastoDao.getPromedioMensualByCategoria(categoriaId)
    }
}
