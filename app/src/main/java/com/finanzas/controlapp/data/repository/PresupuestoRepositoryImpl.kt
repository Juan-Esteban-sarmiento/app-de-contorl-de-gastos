package com.finanzas.controlapp.data.repository

import com.finanzas.controlapp.data.local.dao.PresupuestoDao
import com.finanzas.controlapp.data.local.entity.PresupuestoEntity
import com.finanzas.controlapp.domain.model.Presupuesto
import com.finanzas.controlapp.domain.repository.PresupuestoRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject

class PresupuestoRepositoryImpl @Inject constructor(
    private val presupuestoDao: PresupuestoDao
) : PresupuestoRepository {

    override suspend fun guardarPresupuesto(presupuesto: Presupuesto): Result<Long> {
        return try {
            val entity = PresupuestoEntity(
                id = presupuesto.id,
                categoriaId = presupuesto.categoriaId,
                montoLimite = presupuesto.montoLimite,
                mesAnio = presupuesto.mesAnio
            )
            val id = presupuestoDao.insert(entity)
            Result.success(id)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override fun obtenerPresupuestosDelMes(mesAnio: String): Flow<List<Presupuesto>> {
        return presupuestoDao.getByMes(mesAnio).map { list ->
            list.map { dto ->
                Presupuesto(
                    id = dto.id,
                    categoriaId = dto.categoriaId,
                    categoriaNombre = dto.categoriaNombre,
                    montoLimite = dto.montoLimite,
                    mesAnio = dto.mesAnio
                )
            }
        }
    }

    override suspend fun obtenerPresupuestoPorCategoria(
        categoriaId: Long,
        mesAnio: String
    ): Presupuesto? {
        val dto = presupuestoDao.getByCategoriaYMes(categoriaId, mesAnio) ?: return null
        return Presupuesto(
            id = dto.id,
            categoriaId = dto.categoriaId,
            categoriaNombre = dto.categoriaNombre,
            montoLimite = dto.montoLimite,
            mesAnio = dto.mesAnio
        )
    }
}
