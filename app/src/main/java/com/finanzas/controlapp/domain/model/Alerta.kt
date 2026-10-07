package com.finanzas.controlapp.domain.model

import java.time.LocalDateTime

/**
 * Tipo de alerta según la severidad del comportamiento financiero.
 */
enum class TipoAlerta {
    /** El usuario está gastando menos de lo esperado — refuerzo positivo. */
    POSITIVA,
    /** El gasto se acerca al límite del presupuesto (≥ 80%). */
    ADVERTENCIA,
    /** El gasto ha superado el presupuesto (≥ 100%). */
    EXCEDIDO
}

/**
 * Entidad de dominio que representa una alerta presupuestaria generada
 * por el sistema de evaluación inteligente.
 *
 * @property id Identificador único auto-generado.
 * @property tipo Severidad de la alerta.
 * @property titulo Título conciso de la alerta.
 * @property mensaje Mensaje descriptivo con contexto financiero.
 * @property categoriaId ID de la categoría relacionada.
 * @property categoriaNombre Nombre de la categoría.
 * @property porcentaje Porcentaje de consumo del presupuesto (ej. 85.0 = 85%).
 * @property montoActual Gasto acumulado actual en la categoría.
 * @property montoLimite Presupuesto definido para la categoría.
 * @property leida Indica si el usuario ya vio la alerta.
 * @property creadaEn Timestamp de generación de la alerta.
 */
data class Alerta(
    val id: Long = 0L,
    val tipo: TipoAlerta,
    val titulo: String,
    val mensaje: String,
    val categoriaId: Long,
    val categoriaNombre: String,
    val porcentaje: Double,
    val montoActual: Double,
    val montoLimite: Double,
    val leida: Boolean = false,
    val creadaEn: LocalDateTime = LocalDateTime.now()
)
