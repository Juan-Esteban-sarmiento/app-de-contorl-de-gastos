package com.finanzas.controlapp.domain.model

import java.time.LocalDate
import java.time.LocalDateTime

/**
 * Tipo de deuda según la perspectiva del usuario.
 */
enum class TipoDeuda {
    /** El usuario prestó dinero y le deben. */
    ME_DEBEN,
    /** El usuario tomó prestado y debe pagar. */
    DEBO
}

/**
 * Estado actual de la deuda.
 */
enum class EstadoDeuda {
    PENDIENTE,
    PAGADA_PARCIALMENTE,
    PAGADA,
    VENCIDA
}

/**
 * Entidad de dominio que representa una deuda o préstamo.
 *
 * @property id Identificador único auto-generado.
 * @property persona Nombre de la persona involucrada.
 * @property monto Monto original de la deuda.
 * @property montoPagado Monto que ya se ha pagado.
 * @property tipo Indica si el usuario debe o le deben.
 * @property estado Estado actual de la deuda.
 * @property descripcion Descripción o motivo de la deuda.
 * @property fechaCreacion Fecha en que se creó la deuda.
 * @property fechaLimite Fecha límite para el pago (opcional).
 * @property creadoEn Timestamp de creación del registro.
 */
data class Deuda(
    val id: Long = 0L,
    val persona: String,
    val monto: Double,
    val montoPagado: Double = 0.0,
    val tipo: TipoDeuda,
    val estado: EstadoDeuda = EstadoDeuda.PENDIENTE,
    val descripcion: String = "",
    val fechaCreacion: LocalDate = LocalDate.now(),
    val fechaLimite: LocalDate? = null,
    val creadoEn: LocalDateTime = LocalDateTime.now()
) {
    init {
        require(monto > 0.0) { "El monto de la deuda debe ser mayor a cero" }
        require(montoPagado >= 0.0) { "El monto pagado no puede ser negativo" }
        require(persona.isNotBlank()) { "El nombre de la persona no puede estar vacío" }
    }

    /** Monto restante por pagar/cobrar. */
    val montoRestante: Double
        get() = (monto - montoPagado).coerceAtLeast(0.0)

    /** Porcentaje de avance del pago. */
    val porcentajePagado: Double
        get() = if (monto > 0.0) (montoPagado / monto * 100.0).coerceIn(0.0, 100.0) else 0.0

    /** Días restantes hasta la fecha límite. Negativo si ya venció. Null si no tiene fecha límite. */
    val diasRestantes: Long?
        get() = fechaLimite?.let {
            java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), it)
        }

    /** Indica si la deuda está vencida. */
    val estaVencida: Boolean
        get() = fechaLimite != null &&
                LocalDate.now().isAfter(fechaLimite) &&
                estado != EstadoDeuda.PAGADA
}
