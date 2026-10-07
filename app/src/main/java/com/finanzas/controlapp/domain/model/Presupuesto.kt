package com.finanzas.controlapp.domain.model

/**
 * Entidad de dominio que representa un presupuesto mensual para una categoría específica.
 *
 * @property id Identificador único auto-generado.
 * @property categoriaId ID de la categoría a la que aplica este presupuesto.
 * @property categoriaNombre Nombre de la categoría (desnormalizado).
 * @property montoLimite Límite máximo de gasto establecido por el usuario.
 * @property mesAnio Mes y año al que aplica este presupuesto (formato "YYYY-MM").
 */
data class Presupuesto(
    val id: Long = 0L,
    val categoriaId: Long,
    val categoriaNombre: String = "",
    val montoLimite: Double,
    val mesAnio: String
) {
    init {
        require(montoLimite > 0.0) { "El monto límite del presupuesto debe ser mayor a cero" }
        require(mesAnio.matches(Regex("\\d{4}-\\d{2}"))) { "El formato de mesAnio debe ser YYYY-MM" }
    }
}
