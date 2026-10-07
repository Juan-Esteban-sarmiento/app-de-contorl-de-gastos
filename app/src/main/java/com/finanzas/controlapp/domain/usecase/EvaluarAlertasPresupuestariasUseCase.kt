package com.finanzas.controlapp.domain.usecase

import com.finanzas.controlapp.domain.model.Alerta
import com.finanzas.controlapp.domain.model.TipoAlerta
import com.finanzas.controlapp.domain.repository.GastoRepository
import com.finanzas.controlapp.domain.repository.PresupuestoRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import javax.inject.Inject

/**
 * Caso de uso responsable de analizar los gastos actuales contra los presupuestos y promedios,
 * generando un flujo de Alertas proactivas para el usuario.
 */
class EvaluarAlertasPresupuestariasUseCase @Inject constructor(
    private val gastoRepository: GastoRepository,
    private val presupuestoRepository: PresupuestoRepository
) {

    /**
     * Evalúa las alertas del mes actual.
     * Retorna un Flow con la lista de alertas generadas en base a las reglas de negocio.
     */
    operator fun invoke(): Flow<List<Alerta>> {
        val hoy = LocalDate.now()
        val mesActual = YearMonth.now()
        val mesAnioStr = mesActual.format(DateTimeFormatter.ofPattern("yyyy-MM"))
        val inicioMes = mesActual.atDay(1)
        val finMes = mesActual.atEndOfMonth()

        return presupuestoRepository.obtenerPresupuestosDelMes(mesAnioStr).map { presupuestos ->
            val alertas = mutableListOf<Alerta>()

            for (presupuesto in presupuestos) {
                // 1. Obtener gasto acumulado en la categoría para este mes
                val gastoAcumulado = gastoRepository.obtenerTotalPorCategoria(
                    categoriaId = presupuesto.categoriaId,
                    fechaInicio = inicioMes,
                    fechaFin = finMes
                )

                // 2. Calcular porcentaje consumido
                val porcentajeConsumido = if (presupuesto.montoLimite > 0) {
                    (gastoAcumulado / presupuesto.montoLimite) * 100.0
                } else 0.0

                // 3. Evaluar reglas de sobregiro
                when {
                    porcentajeConsumido >= 100.0 -> {
                        val excedente = gastoAcumulado - presupuesto.montoLimite
                        alertas.add(
                            Alerta(
                                tipo = TipoAlerta.EXCEDIDO,
                                titulo = "Presupuesto Excedido",
                                mensaje = "Has excedido tu presupuesto en ${presupuesto.categoriaNombre} por $${String.format("%.2f", excedente)}.",
                                categoriaId = presupuesto.categoriaId,
                                categoriaNombre = presupuesto.categoriaNombre,
                                porcentaje = porcentajeConsumido,
                                montoActual = gastoAcumulado,
                                montoLimite = presupuesto.montoLimite
                            )
                        )
                    }
                    porcentajeConsumido >= 80.0 -> {
                        alertas.add(
                            Alerta(
                                tipo = TipoAlerta.ADVERTENCIA,
                                titulo = "Cerca del límite",
                                mensaje = "Llevas el ${porcentajeConsumido.toInt()}% de tu presupuesto en ${presupuesto.categoriaNombre} ($${String.format("%.2f", gastoAcumulado)} de $${String.format("%.2f", presupuesto.montoLimite)}).",
                                categoriaId = presupuesto.categoriaId,
                                categoriaNombre = presupuesto.categoriaNombre,
                                porcentaje = porcentajeConsumido,
                                montoActual = gastoAcumulado,
                                montoLimite = presupuesto.montoLimite
                            )
                        )
                    }
                }

                // 4. Evaluar comportamiento positivo (solo si estamos después del día 15 del mes para que sea significativo)
                if (hoy.dayOfMonth > 15 && porcentajeConsumido < 50.0) {
                    val promedioHistorico = gastoRepository.obtenerPromedioMensualPorCategoria(presupuesto.categoriaId)
                    if (promedioHistorico > 0 && gastoAcumulado < (promedioHistorico * 0.7)) {
                        alertas.add(
                            Alerta(
                                tipo = TipoAlerta.POSITIVA,
                                titulo = "¡Excelente control!",
                                mensaje = "Tus gastos en ${presupuesto.categoriaNombre} están 30% por debajo de tu promedio histórico.",
                                categoriaId = presupuesto.categoriaId,
                                categoriaNombre = presupuesto.categoriaNombre,
                                porcentaje = porcentajeConsumido,
                                montoActual = gastoAcumulado,
                                montoLimite = presupuesto.montoLimite
                            )
                        )
                    }
                }
            }

            // Ordenar alertas: EXCEDIDO primero, luego ADVERTENCIA, al final POSITIVA
            alertas.sortedByDescending { it.tipo.ordinal }
        }
    }
}
