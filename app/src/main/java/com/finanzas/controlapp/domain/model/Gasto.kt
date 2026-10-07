package com.finanzas.controlapp.domain.model

import java.time.LocalDate
import java.time.LocalDateTime

/**
 * Entidad de dominio que representa un gasto registrado por el usuario.
 *
 * @property id Identificador único auto-generado.
 * @property monto Monto del gasto (siempre positivo).
 * @property categoriaId ID de la categoría asociada.
 * @property categoriaNombre Nombre de la categoría (desnormalizado para presentación).
 * @property nota Nota opcional descriptiva.
 * @property fecha Fecha en que se realizó el gasto.
 * @property creadoEn Timestamp de creación del registro.
 */
data class Gasto(
    val id: Long = 0L,
    val monto: Double,
    val categoriaId: Long,
    val categoriaNombre: String = "",
    val nota: String = "",
    val fecha: LocalDate = LocalDate.now(),
    val creadoEn: LocalDateTime = LocalDateTime.now()
) {
    init {
        require(monto > 0.0) { "El monto del gasto debe ser mayor a cero" }
    }
}
