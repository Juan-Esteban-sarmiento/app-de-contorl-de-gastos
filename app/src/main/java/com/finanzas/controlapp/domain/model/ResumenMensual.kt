package com.finanzas.controlapp.domain.model

/**
 * Resumen agregado de los gastos e ingresos de un mes específico.
 *
 * @property mesAnio Mes y año del resumen (formato "YYYY-MM").
 * @property totalIngresos Suma de todos los ingresos del mes.
 * @property totalGastos Suma de todos los gastos del mes.
 */
data class ResumenMensual(
    val mesAnio: String,
    val totalIngresos: Double,
    val totalGastos: Double
) {
    /** Balance actual (Ingresos - Gastos). Puede ser negativo. */
    val balance: Double
        get() = totalIngresos - totalGastos
        
    /** Indica si el balance es positivo o cero. */
    val esBalancePositivo: Boolean
        get() = balance >= 0.0
}
